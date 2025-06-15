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

COACH_API=$(get_stack_output "tsa-coach-backend-dev" "CoachAPIUrlDev")
ADMIN_API=$(get_stack_output "tsa-admin-backend-dev" "AdminAPIUrlDev")
AUTH_API=$(get_stack_output "tsa-infra-auth-dev" "PasswordlessApiUrl")

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

# Check if passwordless auth is available (required)
if [ "$AUTH_API" = "NOT_FOUND" ]; then
    echo "❌ ERROR: Passwordless Auth API not found!"
    echo "🔧 Deploy auth infrastructure: cd tsa-infrastructure && cdk deploy tsa-infra-auth-dev"
    exit 1
fi

# Generate .env.local file
ENV_FILE="../.env.local"
echo "📝 Writing environment variables to $ENV_FILE..."
echo "================================================="

cat > "$ENV_FILE" << EOF
# TSA Coach Portal - Local Development Environment
# Generated on $(date)

# API Endpoints (from CDK deployment)
EOF

# Only add environment variables for APIs that are deployed
if [ "$COACH_API" != "NOT_FOUND" ]; then
    echo "NEXT_PUBLIC_TSA_COACH_API_URL=$COACH_API" >> "$ENV_FILE"
    echo "NEXT_PUBLIC_API_URL=$COACH_API" >> "$ENV_FILE"
fi

if [ "$ADMIN_API" != "NOT_FOUND" ]; then
    echo "NEXT_PUBLIC_TSA_ADMIN_API_URL=$ADMIN_API" >> "$ENV_FILE"
    echo "NEXT_PUBLIC_ADMIN_API_URL=$ADMIN_API" >> "$ENV_FILE"
fi

# Always add passwordless auth (required)
echo "NEXT_PUBLIC_TSA_AUTH_API_URL=$AUTH_API" >> "$ENV_FILE"
echo "NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API" >> "$ENV_FILE"

cat >> "$ENV_FILE" << EOF

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE=dev
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Coach Portal (DEV)
NEXT_PUBLIC_COGNITO_REGION=us-east-2

# Feature Flags
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF

echo "✅ Environment file written to: $ENV_FILE"
echo ""
echo "💡 Next steps:"
echo "================================================="
echo "1. Start development: npm run dev"
echo "2. The app will now use the correct API endpoints"
echo ""

# Optional: Verify endpoints are accessible
echo "🔍 Testing endpoint connectivity..."
echo "================================================="

test_endpoint() {
    local name=$1
    local url=$2
    if [ "$url" = "NOT_FOUND" ]; then
        echo "$name... ⚠️  Not deployed (will use placeholder)"
        return
    fi
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