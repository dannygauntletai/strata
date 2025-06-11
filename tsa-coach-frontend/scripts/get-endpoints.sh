#!/bin/bash

# 🔧 TSA Coach Portal - Get Current API Endpoints
# This script retrieves the latest API endpoints from AWS CloudFormation stacks

set -e

echo "🚀 Getting current API endpoints from AWS..."
echo "================================================="

# Function to get stack output value
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

# Get API endpoints
echo "📡 Fetching API endpoints..."

COACH_API=$(get_stack_output "tsa-coach-backend-dev" "CoachPortalServiceCoachOnboardingAPIEndpoint2ED358FF")
ADMIN_API=$(get_stack_output "tsa-admin-backend-dev" "AdminPortalServiceAdminPortalAPIEndpointCD77C31D")
AUTH_API=$(get_stack_output "tsa-infra-auth-dev" "PasswordlessAPIEndpointDC931873")

# Clean up URLs (remove trailing slashes)
COACH_API=${COACH_API%/}
ADMIN_API=${ADMIN_API%/}
AUTH_API=${AUTH_API%/}

echo ""
echo "✅ Current API Endpoints (from CDK deployment):"
echo "================================================="
echo "🏃 Coach Portal API:    $COACH_API"
echo "🛠️  Admin Portal API:    $ADMIN_API"
echo "🔐 Passwordless Auth:   $AUTH_API"
echo ""

# Generate .env.local content
echo "📝 Environment Variables for .env.local:"
echo "================================================="
cat << EOF
# TSA Coach Portal - Local Development Environment
# Generated on $(date)

# API Endpoints (from CDK deployment)
NEXT_PUBLIC_API_URL=$COACH_API
NEXT_PUBLIC_ADMIN_API_URL=$ADMIN_API
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE=dev
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Coach Portal (DEV)
NEXT_PUBLIC_COGNITO_REGION=us-east-1

# Feature Flags
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF

echo ""
echo "💡 Usage:"
echo "================================================="
echo "1. Copy the environment variables above to your .env.local file"
echo "2. Or run: ./scripts/get-endpoints.sh > .env.local"
echo "3. Then start development: npm run dev"
echo ""

# Optional: Verify endpoints are accessible
echo "🔍 Testing endpoint connectivity..."
echo "================================================="

test_endpoint() {
    local name=$1
    local url=$2
    echo -n "Testing $name... "
    if curl -s --max-time 5 "$url/health" >/dev/null 2>&1; then
        echo "✅ OK"
    elif curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo "✅ OK (no health endpoint)"
    else
        echo "⚠️  No response (may be normal if no health endpoint)"
    fi
}

test_endpoint "Coach API" "$COACH_API"
test_endpoint "Admin API" "$ADMIN_API"
test_endpoint "Auth API" "$AUTH_API"

echo ""
echo "🎉 Setup complete! Copy the environment variables to .env.local to get started." 