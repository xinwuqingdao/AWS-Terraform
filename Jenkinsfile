pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    choice(name: 'TF_ACTION', choices: ['plan', 'apply'], description: 'Terraform action to run')
    booleanParam(name: 'DEPLOY_FRONTEND', defaultValue: true, description: 'Deploy Angular dist to S3 + invalidate CloudFront')
    string(name: 'TF_DIR', defaultValue: 'infrastructures/environments/dev', description: 'Terraform environment directory')
    string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region')
    string(name: 'AWS_CREDENTIALS_ID', defaultValue: 'aws-jenkins', description: 'Jenkins AWS credential ID')
  }

  environment {
    TF_IN_AUTOMATION = 'true'
    AWS_DEFAULT_REGION = "${params.AWS_REGION}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Frontend') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('Terraform Init Validate Plan') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: params.AWS_CREDENTIALS_ID]]) {
          dir("${params.TF_DIR}") {
            sh 'terraform init -input=false'
            sh 'terraform validate'
            sh 'terraform plan -input=false -out=tfplan'
          }
        }
      }
    }

    stage('Terraform Apply') {
      when {
        expression { params.TF_ACTION == 'apply' }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: params.AWS_CREDENTIALS_ID]]) {
          dir("${params.TF_DIR}") {
            sh 'terraform apply -input=false -auto-approve tfplan'
          }
        }
      }
    }

    stage('Resolve Deploy Targets') {
      when {
        expression { params.DEPLOY_FRONTEND && params.TF_ACTION == 'apply' }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: params.AWS_CREDENTIALS_ID]]) {
          dir("${params.TF_DIR}") {
            script {
              env.FRONTEND_BUCKET_NAME = sh(script: 'terraform output -raw frontend_bucket_name 2>/dev/null || true', returnStdout: true).trim()
              env.CLOUDFRONT_DISTRIBUTION_ID = sh(script: 'terraform output -raw distribution_id 2>/dev/null || true', returnStdout: true).trim()

              if (!env.FRONTEND_BUCKET_NAME || !env.FRONTEND_BUCKET_NAME.matches('^[a-zA-Z0-9.\\-_]{1,255}$')) {
                error('Terraform output frontend_bucket_name is missing/invalid. Run Terraform apply first and verify outputs in ' + params.TF_DIR)
              }

              if (!env.CLOUDFRONT_DISTRIBUTION_ID || !env.CLOUDFRONT_DISTRIBUTION_ID.matches('^[A-Z0-9]{10,20}$')) {
                error('Terraform output distribution_id is missing/invalid. Run Terraform apply first and verify outputs in ' + params.TF_DIR)
              }
            }
          }
        }
      }
    }

    stage('Deploy Frontend To S3') {
      when {
        expression { params.DEPLOY_FRONTEND && params.TF_ACTION == 'apply' }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: params.AWS_CREDENTIALS_ID]]) {
          dir('frontend') {
            sh '''#!/usr/bin/env bash
set -euo pipefail

DIST_ROOT=$(find dist -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "${DIST_ROOT}" ]; then
  echo "Build output not found under frontend/dist"
  exit 1
fi

if [ -d "${DIST_ROOT}/browser" ]; then
  DIST_PATH="${DIST_ROOT}/browser"
else
  DIST_PATH="${DIST_ROOT}"
fi

if [ -z "${FRONTEND_BUCKET_NAME:-}" ]; then
  echo "FRONTEND_BUCKET_NAME is empty; Terraform outputs were not resolved."
  exit 1
fi

aws s3 sync "${DIST_PATH}/" "s3://${FRONTEND_BUCKET_NAME}/" --delete
'''
          }
        }
      }
    }

    stage('CloudFront Invalidation') {
      when {
        expression { params.DEPLOY_FRONTEND && params.TF_ACTION == 'apply' }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: params.AWS_CREDENTIALS_ID]]) {
          sh 'aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"'
        }
      }
    }
  }

  post {
    success {
      echo 'Pipeline completed successfully.'
      echo "TF action: ${params.TF_ACTION}"
      echo "Frontend deploy: ${params.DEPLOY_FRONTEND}"
    }
  }
}
