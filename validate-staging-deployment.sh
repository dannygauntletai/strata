#!/bin/bash

# 🔍 TSA Staging Deployment Validation Script
# Validates that staging deployment will work without actually deploying

set -e

echo "🔍 TSA Staging Deployment Validation"
echo "================================================="
echo "🎯 Checking if staging deployment will work correctly"
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

VALIDATION_PASSED=true

# Check AWS CLI
echo "🔍 Checking AWS Prerequisites..."
echo "================================================="

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    VALIDATION_PASSED=false
else
    print_status "AWS CLI installed"
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    VALIDATION_PASSED=false
else
    CALLER_IDENTITY=$(aws sts get-caller-identity --output text --query 'Account')
    print_status "AWS credentials configured (Account: $CALLER_IDENTITY)"
fi

# Check AWS region
DEFAULT_REGION=$(aws configure get region 2>/dev/null || echo "us-east-2")
print_info "Default AWS region: $DEFAULT_REGION"

# Check Python and pip
echo ""
echo "🐍 Checking Python Prerequisites..."
echo "================================================="

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    VALIDATION_PASSED=false
else
    PYTHON_VERSION=$(python3 --version)
    print_status "$PYTHON_VERSION installed"
fi

if ! command -v pip3 &> /dev/null; then
    print_error "pip3 is not installed"
    VALIDATION_PASSED=false
else
    print_status "pip3 installed"
fi

# Check Node.js and npm
echo ""
echo "📦 Checking Node.js Prerequisites..."
echo "================================================="

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    VALIDATION_PASSED=false
else
    NODE_VERSION=$(node --version)
    print_status "Node.js $NODE_VERSION installed"
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    VALIDATION_PASSED=false
else
    NPM_VERSION=$(npm --version)
    print_status "npm $NPM_VERSION installed"
fi

# Check CDK
echo ""
echo "🏗️  Checking CDK Prerequisites..."
echo "================================================="

if ! command -v cdk &> /dev/null; then
    print_warning "CDK is not installed (will be installed during deployment)"
else
    CDK_VERSION=$(cdk --version)
    print_status "CDK installed: $CDK_VERSION"
fi

# Check project structure
echo ""
echo "📁 Checking Project Structure..."
echo "================================================="

if [ -d "tsa-infrastructure" ]; then
    print_status "Infrastructure directory exists"
else
    print_error "Infrastructure directory missing"
    VALIDATION_PASSED=false
fi

if [ -f "tsa-infrastructure/app.py" ]; then
    print_status "CDK app.py exists"
else
    print_error "CDK app.py missing"
    VALIDATION_PASSED=false
fi

if [ -f "tsa-infrastructure/cdk.json" ]; then
    print_status "CDK configuration exists"
else
    print_error "CDK configuration missing"
    VALIDATION_PASSED=false
fi

if [ -f "tsa-infrastructure/requirements.txt" ]; then
    print_status "Python requirements file exists"
else
    print_error "Python requirements file missing"
    VALIDATION_PASSED=false
fi

if [ -f "sync-endpoints.sh" ]; then
    print_status "Endpoint sync script exists"
else
    print_error "Endpoint sync script missing"
    VALIDATION_PASSED=false
fi

# Check infrastructure dependencies
echo ""
echo "🔧 Checking Infrastructure Dependencies..."
echo "================================================="

cd tsa-infrastructure

# Check if we can import the CDK app
if python3 -c "import app" 2>/dev/null; then
    print_status "CDK app can be imported successfully"
else
    print_warning "CDK app import failed (dependencies may need installation)"
fi

# Check CDK syntax
if python3 -m py_compile app.py 2>/dev/null; then
    print_status "CDK app syntax is valid"
else
    print_error "CDK app has syntax errors"
    VALIDATION_PASSED=false
fi

cd ..

# Test CDK commands (dry run)
echo ""
echo "🧪 Testing CDK Commands..."
echo "================================================="

cd tsa-infrastructure

# Test CDK list
if cdk list --context stage=staging &>/dev/null; then
    print_status "CDK can list staging stacks"
    STACK_COUNT=$(cdk list --context stage=staging | wc -l)
    print_info "Found $STACK_COUNT stacks to deploy"
else
    print_error "CDK cannot list staging stacks"
    VALIDATION_PASSED=false
fi

# Test CDK synth (dry run)
if cdk synth --context stage=staging &>/dev/null; then
    print_status "CDK can synthesize staging stacks"
else
    print_error "CDK cannot synthesize staging stacks"
    VALIDATION_PASSED=false
fi

cd ..

# Final validation result
echo ""
echo "📊 Validation Summary"
echo "================================================="

if [ "$VALIDATION_PASSED" = true ]; then
    print_status "All validation checks passed!"
    echo ""
    print_info "Your staging deployment is ready to run:"
    print_info "• Use: npm run deploy:staging"
    print_info "• Or use: ./deploy-staging.sh"
    echo ""
    print_info "Estimated deployment time: 15-25 minutes"
    print_info "Resources that will be created:"
    print_info "• VPC with public/private subnets"
    print_info "• RDS PostgreSQL database"
    print_info "• Lambda functions for each backend"
    print_info "• API Gateway endpoints"
    print_info "• S3 buckets for storage"
    print_info "• Cognito user pools"
    print_info "• CloudWatch logs"
else
    print_error "Validation failed! Please fix the issues above before deploying."
    exit 1
fi

echo ""
print_status "Validation complete! 🎉" 