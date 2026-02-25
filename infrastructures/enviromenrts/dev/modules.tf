# ==========================================================
# Wire all Terraform modules together for the dev environment
# =============================================================


module "s3" {
  source      = "../../modules/s3"
  environment = var.environment
}

module "cloudfront" {
  source                = "../../modules/cloudfront"
  environment           = var.environment
  s3_bucket_domain_name = module.s3.frontend_bucket_domain
  s3_bucket_id          = module.s3.frontend_bucket_name
  s3_bucket_arn         = module.s3.frontend_bucket_arn
}