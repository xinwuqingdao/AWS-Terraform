output "frontend_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = module.s3.frontend_bucket_name
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "backend_service_url" {
  description = "Backend service URL via ALB"
  value       = module.backend_service.backend_service_url
}

output "backend_alb_dns_name" {
  description = "Backend ALB DNS name"
  value       = module.backend_service.backend_alb_dns_name
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for backend image"
  value       = module.backend_service.backend_ecr_repository_url
}

output "backend_ecs_cluster_name" {
  description = "ECS cluster name for backend service"
  value       = module.backend_service.backend_ecs_cluster_name
}

output "backend_ecs_service_name" {
  description = "ECS service name for backend"
  value       = module.backend_service.backend_ecs_service_name
}
