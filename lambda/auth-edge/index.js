'use strict';

/**
 * Lambda@Edge — Viewer Request authorizer
 *
 * Triggered on every CloudFront viewer request.
 * Validates a Cognito-issued JWT (RS256) from either:
 *   • Authorization: Bearer <token>  header  (API calls from Angular HttpClient)
 *   • Cookie: id_token=<token>               (set by Angular after OIDC callback)
 *
 * Public paths (no auth required):
 *   /auth/callback, /favicon.ico, /robots.txt, /manifest.json,
 *   /assets/*, /static/*, /icons/*
 *
 * All other paths require a valid, non-expired Cognito id_token or access_token.
 * Invalid / missing token → 302 redirect to Cognito Hosted UI.
 *
 * Config is injected by Terraform into config.js (no env vars — Lambda@Edge
 * does not support environment variables).
 *
 * Runtime: Node.js 18.x
 * Trigger:  CloudFront Viewer Request
 * Dependencies: NONE — uses only Node.js built-in `https` and `crypto`.
 */

const https  = require('https');
const crypto = require('crypto');

// Populated by Terraform template rendering
const config = require('./config');

// ── Path rules ────────────────────────────────────────────────────────────────

/** Exact paths that are always public (no token check). */
const PUBLIC_EXACT = new Set([
  '/auth/callback',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
]);

/** Path prefixes that are always public. */
const PUBLIC_PREFIXES = ['/assets/', '/static/', '/icons/'];

// ── JWKS cache ────────────────────────────────────────────────────────────────

let _jwksCache   = null;
let _jwksExpires = 0;
const JWKS_TTL   = 60 * 60 * 1000; // 1 hour in ms

/**
 * Fetch (and cache) the JWKS from Cognito's well-known endpoint.
 * @returns {Promise<{keys: object[]}>}
 */
function fetchJwks() {
  return new Promise((resolve, reject) => {
    const url = `https://cognito-idp.${config.REGION}.amazonaws.com`
              + `/${config.USER_POOL_ID}/.well-known/jwks.json`;
    https.get(url, (res) => {
      let body = '';
      res.on('data',  (chunk) => (body += chunk));
      res.on('end',   ()      => {
        try   { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Failed to parse JWKS: ' + e.message)); }
      });
    }).on('error', (e) => reject(new Error('JWKS fetch error: ' + e.message)));
  });
}

/**
 * Return the JWKS, using an in-memory cache to avoid a round-trip on
 * every request.  The cache is scoped to the Lambda execution context
 * (i.e. shared across warm invocations on the same edge node).
 */
async function getJwks() {
  if (_jwksCache && Date.now() < _jwksExpires) {
    return _jwksCache;
  }
  _jwksCache   = await fetchJwks();
  _jwksExpires = Date.now() + JWKS_TTL;
  return _jwksCache;
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Decode a base64url string into a Buffer.
 * @param {string} b64url
 * @returns {Buffer}
 */
function decodeBase64Url(b64url) {
  return Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * Convert a JWK (RSA public key) to a PEM string using Node.js built-in crypto.
 * Requires Node.js ≥ 15 (available in Lambda nodejs18.x).
 * @param {object} jwk
 * @returns {string} PEM-encoded public key
 */
function jwkToPem(jwk) {
  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return keyObject.export({ type: 'spki', format: 'pem' });
}

/**
 * Verify a JWT token against a Cognito User Pool.
 * Checks: structure, expiry, issuer, token_use, RS256 signature.
 * @param {string} token  - Raw JWT string
 * @throws {Error} if validation fails for any reason
 * @returns {Promise<object>} Decoded JWT payload
 */
async function verifyToken(token) {
  // 1. Split & decode
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT: expected 3 parts');

  let header, payload;
  try {
    header  = JSON.parse(decodeBase64Url(parts[0]));
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch (e) {
    throw new Error('Cannot parse JWT claims: ' + e.message);
  }

  // 2. Expiry
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new Error(`Token expired (exp=${payload.exp}, now=${now})`);
  }

  // 3. Issuer
  const expectedIss = `https://cognito-idp.${config.REGION}.amazonaws.com/${config.USER_POOL_ID}`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }

  // 4. token_use (Cognito-specific claim)
  if (payload.token_use !== 'id' && payload.token_use !== 'access') {
    throw new Error(`Unexpected token_use: ${payload.token_use}`);
  }

  // 5. Audience / client_id
  const tokenClientId = payload.aud || payload.client_id;
  if (tokenClientId !== config.CLIENT_ID) {
    throw new Error(`Client-id mismatch: ${tokenClientId}`);
  }

  // 6. Signature
  const jwks = await getJwks();
  const jwk  = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    throw new Error(`KID "${header.kid}" not found in JWKS`);
  }

  const pem       = jwkToPem(jwk);
  const sigInput  = `${parts[0]}.${parts[1]}`;
  const signature = decodeBase64Url(parts[2]);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(sigInput, 'ascii');
  if (!verifier.verify(pem, signature)) {
    throw new Error('Signature verification failed');
  }

  return payload;
}

// ── Token extraction ──────────────────────────────────────────────────────────

/**
 * Extract a JWT from either the Authorization header or cookies.
 *
 * Cookie keys tried (in order):
 *   id_token, access_token
 *
 * The angular-auth-oidc-client library stores tokens in localStorage by
 * default.  To use cookie-based enforcement, configure the library to also
 * write an `id_token` cookie in the AuthCallbackComponent after a successful
 * checkAuth() call:
 *   document.cookie = `id_token=${idToken}; Secure; SameSite=Strict; Path=/`;
 *
 * @param {object} request - CloudFront request object
 * @returns {string|null}
 */
function extractToken(request) {
  // Authorization: Bearer <token>
  const authHeaders = request.headers['authorization'];
  if (authHeaders && authHeaders.length > 0) {
    const value = authHeaders[0].value;
    if (value.startsWith('Bearer ')) {
      return value.slice(7).trim();
    }
  }

  // Cookie: id_token=<token>  or  access_token=<token>
  const cookieHeaders = request.headers['cookie'];
  if (cookieHeaders && cookieHeaders.length > 0) {
    const cookies = {};
    cookieHeaders[0].value.split(';').forEach((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const k = pair.slice(0, eqIdx).trim();
        const v = pair.slice(eqIdx + 1).trim();
        cookies[k] = v;
      }
    });
    return cookies['id_token'] || cookies['access_token'] || null;
  }

  return null;
}

// ── Redirect builder ──────────────────────────────────────────────────────────

/**
 * Build a 302 redirect response to the Cognito Hosted UI login page.
 *
 * The `redirect_uri` is dynamically derived from the request Host header so
 * that the same Lambda version works for both localhost (dev) and the
 * production CloudFront domain — matching the callback URLs registered in the
 * Cognito App Client.
 *
 * @param {object} request - CloudFront request object
 * @returns {object} CloudFront response object
 */
function buildLoginRedirect(request) {
  const host        = ((request.headers.host || [])[0] || {}).value || config.COGNITO_DOMAIN;
  const originalUri = request.uri || '/';

  const redirectUri = encodeURIComponent(`https://${host}/auth/callback`);
  const state       = encodeURIComponent(originalUri);
  const scope       = encodeURIComponent(config.SCOPES);

  const loginUrl = [
    `https://${config.COGNITO_DOMAIN}.auth.${config.REGION}.amazoncognito.com/login`,
    `?client_id=${config.CLIENT_ID}`,
    `&response_type=code`,
    `&scope=${scope}`,
    `&redirect_uri=${redirectUri}`,
    `&state=${state}`,
  ].join('');

  return {
    status:            '302',
    statusDescription: 'Found',
    headers: {
      location:        [{ key: 'Location',      value: loginUrl }],
      'cache-control': [{ key: 'Cache-Control', value: 'no-store, no-cache' }],
      pragma:          [{ key: 'Pragma',         value: 'no-cache' }],
    },
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

/**
 * CloudFront Viewer Request handler.
 *
 * Returns either:
 *   • The original request (pass-through) when auth passes or path is public.
 *   • A 302 redirect to Cognito login when auth is missing / invalid.
 */
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const uri     = request.uri || '/';

  // ── 1. Allow public paths without auth ─────────────────────────────────────
  if (PUBLIC_EXACT.has(uri) || PUBLIC_PREFIXES.some((p) => uri.startsWith(p))) {
    return request;
  }

  // ── 2. Extract token ────────────────────────────────────────────────────────
  const token = extractToken(request);

  if (!token) {
    console.log(`[auth-edge] No token — path="${uri}" → redirect to login`);
    return buildLoginRedirect(request);
  }

  // ── 3. Verify token ─────────────────────────────────────────────────────────
  try {
    const claims = await verifyToken(token);
    console.log(`[auth-edge] OK sub="${claims.sub}" path="${uri}"`);
    return request;   // ✅ pass through to origin
  } catch (err) {
    console.log(`[auth-edge] Token rejected: ${err.message} — path="${uri}" → redirect`);
    return buildLoginRedirect(request);
  }
};
