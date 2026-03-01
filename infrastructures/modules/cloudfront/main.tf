# ============================================================
# CloudFront Module — Simple S3 origin via OAC
# ============================================================

variable "environment" {}
variable "s3_bucket_domain_name" {
  description = "Regional domain name of the S3 bucket"
}
variable "s3_bucket_id" {
  description = "ID (name) of the S3 bucket"
}
variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
}
variable "backend_alb_domain_name" {
  description = "Backend ALB DNS name for API origin"
  type        = string
}

# --------------------------------------------------
# Origin Access Control (OAC) — replaces legacy OAI
# --------------------------------------------------
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "s3-oac-${var.environment}"
  description                       = "OAC for S3 frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --------------------------------------------------
# CloudFront Distribution
# --------------------------------------------------
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "S3 frontend - ${var.environment}"

  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  origin {
    domain_name = var.backend_alb_domain_name
    origin_id   = "backend-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "backend-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # SPA support — serve index.html for 403/404
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "cloudfront-${var.environment}"
  }
}

# --------------------------------------------------
# S3 Bucket Policy — allow CloudFront OAC to read
# --------------------------------------------------
resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${var.s3_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })
}

# --------------------------------------------------
# Outputs
# --------------------------------------------------
output "distribution_domain_name" {
  description = "CloudFront domain name (use this URL to access your site)"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.this.id
}
