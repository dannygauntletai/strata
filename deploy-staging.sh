#!/bin/bash

# 🚀 TSA Staging Deployment Script
# Comprehensive staging deployment with validation and error handling

set -e

echo "🎯 TSA Staging Backend Deployment"
echo "================================================="
echo "🌟 Deploying stable build for coworker testing"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Validate prerequisites
echo "🔍 Validating prerequisites..."
echo "================================================="

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install AWS CLI first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 is not installed. Please install pip3 first."
    exit 1
fi

print_status "AWS CLI and Python prerequisites validated"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_warning "CDK not found. Installing CDK..."
    npm install -g aws-cdk
    print_status "CDK installed successfully"
else
    print_status "CDK is already installed"
fi

# Install Python dependencies
echo ""
echo "📦 Installing infrastructure dependencies..."
echo "================================================="

cd tsa-infrastructure

if [ -f "requirements.txt" ]; then
    print_info "Installing Python dependencies from requirements.txt..."
    pip3 install -r requirements.txt
    print_status "Python dependencies installed"
else
    print_warning "requirements.txt not found, installing basic CDK dependencies..."
    pip3 install aws-cdk-lib constructs
fi

# Bootstrap CDK for staging if needed
echo ""
echo "🏗️  Bootstrapping CDK for staging environment..."
echo "================================================="

# Set default region if not set
export CDK_DEFAULT_REGION=${CDK_DEFAULT_REGION:-us-east-2}

# Check if CDK is already bootstrapped for staging
if aws cloudformation describe-stacks --stack-name CDKToolkit --region $CDK_DEFAULT_REGION &> /dev/null; then
    print_status "CDK is already bootstrapped for region $CDK_DEFAULT_REGION"
else
    print_info "Bootstrapping CDK for staging environment..."
    cdk bootstrap --context stage=staging
    print_status "CDK bootstrapped successfully"
fi

# Show deployment plan
echo ""
echo "📋 Deployment Plan - Staging Environment"
echo "================================================="
print_info "The following stacks will be deployed:"
print_info "• Infrastructure Layer:"
print_info "  - tsa-infra-networking-staging (VPC, subnets, security groups)"
print_info "  - tsa-infra-security-staging (Cognito, IAM roles)"
print_info "  - tsa-infra-data-staging (PostgreSQL, S3 buckets)"
print_info "  - tsa-infra-auth-staging (Passwordless authentication)"
print_info "• Application Layer:"
print_info "  - tsa-admin-backend-staging (Admin portal backend)"
print_info "  - tsa-coach-backend-staging (Coach portal backend)"
print_info "  - tsa-parent-backend-staging (Parent portal backend)"
print_info "• Frontend Layer:"
print_info "  - tsa-infra-frontend-staging (React/Next.js deployment)"
echo ""
print_info "Staging URLs will be:"
print_info "• Frontend: https://staging.sportsacademy.tech"
print_info "• Admin: https://admin-staging.sportsacademy.tech"
print_info "• API: https://api-staging.sportsacademy.tech"

echo ""
read -p "Continue with staging deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# Start deployment
echo ""
echo "🚀 Starting staging deployment..."
echo "================================================="

# Deploy all stacks
print_info "Deploying all infrastructure and application stacks..."
if cdk deploy --all --context stage=staging --require-approval never; then
    print_status "All stacks deployed successfully!"
else
    print_error "Deployment failed. Check the output above for details."
    exit 1
fi

# Sync endpoints after deployment
echo ""
echo "🔄 Syncing endpoints for staging environment..."
echo "================================================="

cd ..
if ./sync-endpoints.sh staging; then
    print_status "Endpoints synchronized successfully"
else
    print_warning "Endpoint synchronization failed, but deployment completed"
fi

# Final status and next steps
echo ""
echo "🎉 Staging Deployment Complete!"
echo "================================================="
print_status "Your staging backend is now live and ready for testing!"
echo ""
print_info "Staging Environment URLs:"
print_info "• Frontend: https://staging.sportsacademy.tech"
print_info "• Admin Portal: https://admin-staging.sportsacademy.tech"
print_info "• API Base: https://api-staging.sportsacademy.tech"
echo ""
print_info "Next Steps:"
print_info "1. Test the staging environment thoroughly"
print_info "2. Share staging URLs with your coworkers"
print_info "3. Monitor CloudWatch logs for any issues"
print_info "4. Update DNS records if needed"
echo ""
print_info "Useful Commands:"
print_info "• View logs: aws logs tail /aws/lambda/tsa-*-staging --follow"
print_info "• Check stack status: cdk list --context stage=staging"
print_info "• Update endpoints: ./sync-endpoints.sh staging"
echo ""
print_status "Happy testing! 🚀" 