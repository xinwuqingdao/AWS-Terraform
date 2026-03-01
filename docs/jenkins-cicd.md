# Jenkins CI/CD for AWS-Terraform

This repository includes a root `Jenkinsfile` that handles:

1. Angular build (`frontend`)
2. Spring Boot build (`backend`)
3. Terraform plan/apply (`infrastructures/environments/dev` by default)
4. Frontend deploy to S3
5. CloudFront invalidation
6. Backend Docker image build/push to ECR
7. ECS service rollout with updated task definition image

## Prerequisites on Jenkins Agent

- Git
- Node.js 16+
- npm
- Terraform 1.5+
- AWS CLI v2
- Docker
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
  - `DEPLOY_BACKEND`: `true`/`false`
   - `TF_DIR`: defaults to `infrastructures/environments/dev`
   - `AWS_REGION`: defaults to `us-east-1`
   - `AWS_CREDENTIALS_ID`: defaults to `aws-jenkins`

> Frontend deployment stages run only when `TF_ACTION=apply` and `DEPLOY_FRONTEND=true`.
> Backend deployment stages run only when `TF_ACTION=apply` and `DEPLOY_BACKEND=true`.

## Typical Runs

- Infra plan only:
  - `TF_ACTION=plan`
  - `DEPLOY_FRONTEND=false`
  - `DEPLOY_BACKEND=false`

- Full deployment (infra + frontend + backend ECS):
  - `TF_ACTION=apply`
  - `DEPLOY_FRONTEND=true`
  - `DEPLOY_BACKEND=true`
