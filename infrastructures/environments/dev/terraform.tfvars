# =============================================================
# Dev environment — variable overrides
# =============================================================
# These values correspond to the manually-created Cognito resources.
# Used by the Lambda@Edge module to bake Cognito config into config.js
# (Lambda@Edge does not support environment variables).
#
# After `terraform import` for Cognito/WAF, these will also drive
# the cognito + waf module resources.
# =============================================================

aws_region  = "us-east-1"
environment = "dev"

# ── Cognito ───────────────────────────────────────────────────
# Used by module.lambda_edge to generate config.js at apply time.
# Also used by module.cognito if you terraform import the existing pool.
cognito_user_pool_id        = "us-east-1_Y77NCkU0t"
cognito_user_pool_client_id = "1gh7jsrdee4oo85lcl3g8kqqvf"
cognito_domain_prefix_base  = "s3-prototype-auth"

cognito_oauth_scopes = ["openid", "email", "phone"]
