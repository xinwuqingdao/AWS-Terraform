variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "cognito_domain_prefix" {
  description = "Hosted UI domain prefix for Cognito"
  type        = string
}

variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito app client"
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito app client"
  type        = list(string)
}

variable "cognito_oauth_scopes" {
  description = "Allowed OAuth scopes for Cognito app client"
  type        = list(string)
  default     = ["openid", "email", "phone"]
}

resource "aws_cognito_user_pool" "this" {
  name = "student-app-user-pool-${var.environment}"

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  schema {
    attribute_data_type = "String"
    mutable             = true
    name                = "email"
    required            = true

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name         = "student-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = var.cognito_oauth_scopes
  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls
  supported_identity_providers         = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.this.id
}

output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.this.id
}

output "user_pool_issuer_url" {
  value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
}

output "hosted_ui_domain" {
  value = "${aws_cognito_user_pool_domain.this.domain}.auth.${var.aws_region}.amazoncognito.com"
}
