# Jenkins CI/CD for AWS-Terraform

This repository includes a root `Jenkinsfile` that handles:

1. Angular build (`frontend`)
2. Terraform plan/apply (`infrastructures/environments/dev` by default)
3. Frontend deploy to S3
4. CloudFront invalidation

## Prerequisites on Jenkins Agent

- Git
- Node.js 16+
- npm
- Terraform 1.5+
- AWS CLI v2
- Linux agent with shell support (`sh`), because the pipeline uses shell steps

## Required Jenkins Plugins

- Pipeline
- AWS Credentials

## Credentials

Create an AWS credential in Jenkins and note the credential ID (default expected by pipeline: `aws-jenkins`).

The credential user/role must be allowed to:

- `s3:*` on the frontend bucket
- `cloudfront:CreateInvalidation`
- Terraform-managed AWS resources (for plan/apply)
- S3 backend state bucket + DynamoDB lock table access

## Job Setup

1. Create a **Pipeline** job.
2. Configure SCM to this repository.
3. Set script path to `Jenkinsfile`.
4. Run with parameters:
   - `TF_ACTION`: `plan` or `apply`
   - `DEPLOY_FRONTEND`: `true`/`false`
   - `TF_DIR`: defaults to `infrastructures/environments/dev`
   - `AWS_REGION`: defaults to `us-east-1`
   - `AWS_CREDENTIALS_ID`: defaults to `aws-jenkins`

> Frontend deployment stages run only when `TF_ACTION=apply` and `DEPLOY_FRONTEND=true`.

## Typical Runs

- Infra plan only:
  - `TF_ACTION=plan`
  - `DEPLOY_FRONTEND=false`

- Full deployment (infra + frontend):
  - `TF_ACTION=apply`
  - `DEPLOY_FRONTEND=true`
