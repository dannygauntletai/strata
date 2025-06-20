#!/bin/bash

# Update Frontend URLs Script
# Fetches current API URLs from SSM Parameter Store and updates frontend configurations

set -e

STAGE=${1:-dev}
REGION=${2:-us-east-2}

echo "🔄 Updating frontend URLs for stage: $STAGE"

# Get current API URLs from SSM Parameter Store
echo "📡 Fetching current API URLs from SSM..."

COACH_API=$(aws ssm get-parameter --name "/tsa-coach/$STAGE/api-urls/coachApi" --region $REGION --output text --query 'Parameter.Value' 2>/dev/null || echo "")
PARENT_API=$(aws ssm get-parameter --name "/tsa-coach/$STAGE/api-urls/parentApi" --region $REGION --output text --query 'Parameter.Value' 2>/dev/null || echo "")
ADMIN_API=$(aws ssm get-parameter --name "/tsa-coach/$STAGE/api-urls/adminApi" --region $REGION --output text --query 'Parameter.Value' 2>/dev/null || echo "")
AUTH_API=$(aws ssm get-parameter --name "/tsa-coach/$STAGE/api-urls/passwordlessAuth" --region $REGION --output text --query 'Parameter.Value' 2>/dev/null || echo "")

# Fallback: Get from CloudFormation outputs if SSM fails
if [ -z "$AUTH_API" ]; then
    echo "⚠️  SSM lookup failed, trying CloudFormation outputs..."
    AUTH_API=$(aws cloudformation describe-stacks --stack-name "tsa-infra-auth-$STAGE" --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PasswordlessApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
fi

# Clean up URLs (remove trailing slashes)
COACH_API=${COACH_API%/}
PARENT_API=${PARENT_API%/}
ADMIN_API=${ADMIN_API%/}
AUTH_API=${AUTH_API%/}

echo "✅ Current API URLs:"
echo "   Coach API: $COACH_API"
echo "   Parent API: $PARENT_API" 
echo "   Admin API: $ADMIN_API"
echo "   Auth API: $AUTH_API"

# No longer updating TypeScript files - using .env.local approach only
echo "📝 Skipping TypeScript file updates - using .env.local approach"

# Create environment file for coach frontend
echo "📝 Creating coach frontend .env.local..."
cat > "../tsa-platform-frontend/.env.local" << EOF
# Auto-generated environment file - $(date)
# Generated by update-frontend-urls.sh from SSM parameters

# API Endpoints
NEXT_PUBLIC_TSA_AUTH_API_URL=$AUTH_API
NEXT_PUBLIC_TSA_COACH_API_URL=$COACH_API
NEXT_PUBLIC_TSA_PARENT_API_URL=$PARENT_API
NEXT_PUBLIC_TSA_ADMIN_API_URL=$ADMIN_API
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API

# Legacy environment variables (for backward compatibility)
NEXT_PUBLIC_API_URL=$COACH_API
NEXT_PUBLIC_ADMIN_API_URL=$ADMIN_API

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE=$STAGE
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Coach Portal (DEV)
NEXT_PUBLIC_COGNITO_REGION=us-east-2

# Feature Flags
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF

echo "✅ Created coach frontend .env.local"

# Create environment file for admin frontend  
echo "📝 Creating admin frontend .env.local..."
cat > "../tsa-admin-frontend/.env.local" << EOF
# Auto-generated environment file - $(date)
# Generated by update-frontend-urls.sh from SSM parameters

# API Endpoints
NEXT_PUBLIC_TSA_AUTH_API_URL=$AUTH_API
NEXT_PUBLIC_TSA_ADMIN_API_URL=$ADMIN_API
NEXT_PUBLIC_TSA_COACH_API_URL=$COACH_API
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API

# Legacy environment variables (for backward compatibility)
NEXT_PUBLIC_ADMIN_API_URL=$ADMIN_API
NEXT_PUBLIC_COACH_API_URL=$COACH_API

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE=$STAGE
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Admin Portal (DEV)
EOF

echo "✅ Created admin frontend .env.local"

echo ""
echo "🎉 Frontend URL update complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart your frontend dev servers"
echo "   2. Clear browser cache"
echo "   3. Test login functionality"
echo ""
echo "🔧 If you need to revert changes, backup files are available with .backup extension" 