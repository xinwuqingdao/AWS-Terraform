# AWS-Terraform

Terraform project for managing AWS infrastructure as code.

## Project Structure

```
├── providers.tf          # AWS provider configuration
├── variables.tf          # Global variables
├── iam_variables.tf      # IAM-specific variables
├── main.tf               # IAM resources (Revision 1)
├── outputs.tf            # Output values
├── terraform.tfvars      # Variable values (gitignored)
├── terraform.tfvars.example  # Example variable values
└── .gitignore
```

## Revision 1 — IAM Resources

- **IAM User** — a Terraform-managed IAM user
- **IAM Group** — a group the user belongs to
- **IAM Policy** — S3 read-only access policy
- **Group Policy Attachment** — attaches the policy to the group

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- AWS CLI configured with credentials (`aws configure`)

## Usage

```bash
terraform init      # Initialize providers
terraform plan      # Preview changes
terraform apply     # Deploy resources
terraform destroy   # Tear down resources
```

## Revision 2 — CloudFront + S3 (Static Site Hosting)

A modular setup under `infrastructures/` to serve a static frontend (SPA) from S3 via CloudFront.

### Architecture

```
User → CloudFront (HTTPS) → S3 Bucket (private, OAC-only access)
```

### Module Structure

```
infrastructures/
├── environments/
│   └── dev/
│       ├── main.tf          # Provider & backend config
│       ├── variables.tf     # Environment variables
│       └── modules.tf       # Wires S3 + CloudFront modules
└── modules/
    ├── s3/
    │   └── main.tf          # S3 buckets (frontend + file storage)
    └── cloudfront/
        └── main.tf          # CloudFront distribution + OAC + bucket policy
```

### What's Deployed

| Resource | Purpose |
|---|---|
| `aws_s3_bucket.frontend` | Private S3 bucket for static site files |
| `aws_s3_bucket_public_access_block` | Blocks all public access to the bucket |
| `aws_cloudfront_origin_access_control` | OAC — allows only CloudFront to read S3 |
| `aws_cloudfront_distribution` | CDN with HTTPS, compression, SPA error handling |
| `aws_s3_bucket_policy` | Grants CloudFront OAC read access to S3 objects |
| `aws_s3_bucket.file_storage` | Versioned, encrypted bucket for file uploads |

### Design Decisions

- **Origin Access Control (OAC)** is used instead of the legacy OAI. OAC is AWS's recommended approach for CloudFront → S3.
- **The S3 bucket policy lives in the CloudFront module**, not the S3 module. This is because the policy's `Condition` references the CloudFront distribution ARN, which only exists inside the CloudFront module. Placing it there avoids circular module dependencies.
- **SPA support**: Custom error responses return `/index.html` for 403/404, so client-side routing works.
- **No custom domain or WAF** — kept simple for now. Can be added later.

### Verification Commands

```powershell
# Install Terraform (Windows)
winget install Hashicorp.Terraform

# IAM verification
terraform output -raw iam_user_password
aws iam get-user --user-name terraform-managed-user
aws iam get-group --group-name terraform-managed-group
aws iam list-attached-group-policies --group-name terraform-managed-group

# CloudFront verification
terraform output distribution_domain_name   # Your site URL
terraform output distribution_id            # Distribution ID
aws cloudfront get-distribution --id <distribution-id>
```

### Deploying Files to S3 / CloudFront

```powershell
# Upload a single file
aws s3 cp path/to/file.html s3://s3-prototype-frontend-dev/ --content-type "text/html"

# Upload an entire folder (e.g., a build output)
aws s3 sync ./build/ s3://s3-prototype-frontend-dev/

# Upload and delete files from S3 that no longer exist locally
aws s3 sync ./build/ s3://s3-prototype-frontend-dev/ --delete

# Invalidate CloudFront cache after uploading (so changes appear immediately)
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"

# List files in the bucket
aws s3 ls s3://s3-prototype-frontend-dev/

# Remove a file
aws s3 rm s3://s3-prototype-frontend-dev/filename.html
```


After deploying
Your site will be accessible at the CloudFront URL output, e.g.:
https://d1234abcdef.cloudfront.net

Upload files to the S3 bucket and they'll be served through CloudFront with HTTPS automatically.

## CI/CD (Jenkins)

A ready-to-use pipeline is included in `Jenkinsfile`.

- Builds Angular app under `frontend/`
- Runs Terraform plan/apply for `infrastructures/environments/dev`
- Deploys frontend to S3
- Invalidates CloudFront cache

Setup details: see `docs/jenkins-cicd.md`