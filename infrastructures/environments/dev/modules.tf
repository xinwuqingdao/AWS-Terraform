# ==========================================================
# Wire all Terraform modules together for the dev environment
# =============================================================


module "s3" {
  source      = "../../modules/s3"
  environment = var.environment
}

module "lambda_edge" {
  source         = "../../modules/lambda-edge"
  environment    = var.environment
  region         = var.aws_region

  # Use explicit variables to avoid a circular dependency:
  #   cloudfront → lambda_edge → cognito → cloudfront (callback URLs need CF domain)
  # Populate these from `terraform output` after the first cognito apply,
  # or via terraform.tfvars / -var flags.
  user_pool_id   = var.cognito_user_pool_id
  client_id      = var.cognito_user_pool_client_id

  cognito_domain = "${var.cognito_domain_prefix_base}-${var.environment}"
  oauth_scopes   = join(" ", var.cognito_oauth_scopes)
}

module "cloudfront" {
  source                      = "../../modules/cloudfront"
  environment                 = var.environment
  s3_bucket_domain_name       = module.s3.frontend_bucket_domain
  s3_bucket_id                = module.s3.frontend_bucket_name
  s3_bucket_arn               = module.s3.frontend_bucket_arn
  backend_alb_domain_name     = module.backend_service.backend_alb_dns_name
  web_acl_arn                 = module.waf.web_acl_arn
  auth_lambda_qualified_arn   = module.lambda_edge.lambda_qualified_arn
}

module "backend_service" {
  source                 = "../../modules/backend_service"
  environment            = var.environment
  aws_region             = var.aws_region
  backend_image_uri      = var.backend_image_uri
  backend_container_port = var.backend_container_port
  backend_cpu            = var.backend_cpu
  backend_memory         = var.backend_memory
  backend_desired_count  = var.backend_desired_count
}

module "waf" {
  source      = "../../modules/waf"
  environment = var.environment
}

module "cognito" {
  source                = "../../modules/cognito"
  environment           = var.environment
  aws_region            = var.aws_region
  cognito_domain_prefix = "${var.cognito_domain_prefix_base}-${var.environment}"
  cognito_callback_urls = concat([
    "http://localhost:4200/auth/callback",
    format("https://%s/auth/callback", module.cloudfront.distribution_domain_name)
  ], var.cognito_additional_callback_urls)
  cognito_logout_urls = concat([
    "http://localhost:4200",
    format("https://%s", module.cloudfront.distribution_domain_name)
  ], var.cognito_additional_logout_urls)
  cognito_oauth_scopes = var.cognito_oauth_scopes
}