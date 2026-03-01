variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "dev"
}

variable "backend_image_uri" {
  description = "Backend container image URI used by ECS task definition"
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:latest"
}

variable "backend_container_port" {
  description = "Backend application port"
  type        = number
  default     = 8080
}

variable "backend_cpu" {
  description = "Fargate task CPU"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of running backend tasks"
  type        = number
  default     = 0
}