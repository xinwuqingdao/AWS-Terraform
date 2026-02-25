# ============================================================
# S3 Module — Frontend SPA, File Storage
# ============================================================

variable "environment" {}

resource "aws_s3_bucket" "frontend" {
  bucket = "s3-prototype-frontend-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_s3_bucket" "file_storage" {
  bucket = "s3-prototype-file-storage-${var.environment}"
}

resource "aws_s3_bucket_versioning" "file_storage" {
  bucket = aws_s3_bucket.file_storage.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "file_storage" {
  bucket = aws_s3_bucket.file_storage.id
  rule { 
    apply_server_side_encryption_by_default { 
        sse_algorithm = "AES256" 
    } 
  }
}


output "frontend_bucket_domain" { value = aws_s3_bucket.frontend.bucket_regional_domain_name }
output "frontend_bucket_name"   { value = aws_s3_bucket.frontend.id }
output "frontend_bucket_arn"    { value = aws_s3_bucket.frontend.arn }
output "file_storage_bucket"    { value = aws_s3_bucket.file_storage.id }