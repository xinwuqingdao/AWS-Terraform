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