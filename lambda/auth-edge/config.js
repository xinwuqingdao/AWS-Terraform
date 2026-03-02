'use strict';

/**
 * Lambda@Edge configuration.
 *
 * ⚠️  THIS FILE IS OVERWRITTEN BY TERRAFORM at `terraform apply` time.
 *     Do not edit manually — changes will be lost on the next apply.
 *
 * Template: infrastructures/modules/lambda-edge/main.tf
 *
 * Values below are illustrative placeholders only.
 * Committed to source control so the handler can be linted locally.
 */
module.exports = {
  /** AWS region where the Cognito User Pool lives (must be us-east-1 for Lambda@Edge in govcloud, else any). */
  REGION:       'us-east-1',

  /** Cognito User Pool ID — e.g. us-east-1_ABC123 */
  USER_POOL_ID: 'REPLACE_BY_TERRAFORM',

  /** Cognito App Client ID (public client — no secret) */
  CLIENT_ID:    'REPLACE_BY_TERRAFORM',

  /**
   * Cognito Hosted UI domain prefix.
   * Full login URL: https://<COGNITO_DOMAIN>.auth.<REGION>.amazoncognito.com/login
   */
  COGNITO_DOMAIN: 'REPLACE_BY_TERRAFORM',

  /** OAuth scopes requested at login (space-separated string). */
  SCOPES: 'openid email phone',
};
