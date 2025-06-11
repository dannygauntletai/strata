#!/bin/bash

# Update Frontend URLs Script
# Simple script to sync frontend .env.local files with current CDK deployments
# SECURITY: This creates local .env files that are gitignored and never committed

set -e

echo "🔄 Updating frontend URLs from CDK deployments..."

# Get the absolute path to the project root (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Project Root: $PROJECT_ROOT"
echo "🔐 Security Note: Creating local .env files (gitignored, never committed)"

# Function to get API Gateway URL from CloudFormation output
get_api_url() {
    local stack_name=$1
    local output_key=$2
    local stage=${3:-prod}
    
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

# Get current CDK deployment outputs (using prod stage by default)
STAGE="${1:-prod}"
echo "🚀 Getting API endpoints for stage: $STAGE"

# Get API URLs from CloudFormation stacks
ADMIN_API_URL=$(get_api_url "tsa-admin-backend-$STAGE" "AdminApiUrl" "$STAGE")
COACH_API_URL=$(get_api_url "tsa-coach-backend-$STAGE" "CoachApiUrl" "$STAGE")
PASSWORDLESS_URL=$(get_api_url "tsa-coach-backend-$STAGE" "PasswordlessApiUrl" "$STAGE")

# Validate URLs
if [[ -z "$ADMIN_API_URL" || -z "$COACH_API_URL" || -z "$PASSWORDLESS_URL" ]]; then
    echo "❌ Error: Could not retrieve all API URLs from CDK deployment"
    echo "   Admin API: $ADMIN_API_URL"
    echo "   Coach API: $COACH_API_URL"
    echo "   Passwordless: $PASSWORDLESS_URL"
    echo ""
    echo "💡 Make sure CDK stacks are deployed and try again"
    exit 1
fi

echo "✅ Retrieved API URLs:"
echo "   Admin API: $ADMIN_API_URL"
echo "   Coach API: $COACH_API_URL"
echo "   Passwordless: $PASSWORDLESS_URL"
echo ""

# Create single .env file at project root
cat > "$PROJECT_ROOT/.env" << EOF
# === TSA MONOREPO ENVIRONMENT VARIABLES ===
# Generated on $(date)
# Single .env file for both admin and coach frontends

# API Endpoints (consolidated naming)
NEXT_PUBLIC_TSA_ADMIN_API_URL=$ADMIN_API_URL
NEXT_PUBLIC_TSA_COACH_API_URL=$COACH_API_URL
NEXT_PUBLIC_TSA_AUTH_API_URL=$PASSWORDLESS_URL

# Backwards compatibility (can be removed later)
NEXT_PUBLIC_ADMIN_API_URL=$ADMIN_API_URL
NEXT_PUBLIC_COACH_API_URL=$COACH_API_URL
NEXT_PUBLIC_API_URL=$COACH_API_URL
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$PASSWORDLESS_URL

# Google Services (consolidated naming)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA_ViglJnReu97sVF_jAVrV1OQb0rq3jeQ
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyA_ViglJnReu97sVF_jAVrV1OQb0rq3jeQ

# Google OAuth & AI (backend only, but included for completeness)
GOOGLE_CLIENT_ID=235403886268-f2s585025sr5p4la4e9ar9qrbighlpe5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_AI_API_KEY=AIzaSyArj6KYaWa6a7RLIXcU9i0yJsZeNPQEoME

# Mapbox Services
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZGFubnlhbW90YSIsImEiOiJjbWJwNjFpeXEwMTQwMnJvOTRhMnBjeXZjIn0.vlbe5hguGZhGcGoH7hnwNA

# Environment Settings
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE=$STAGE
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_APP_NAME=TSA Portal (${STAGE^^})
NEXT_PUBLIC_ADMIN_EMAIL=admin@texassportsacademy.com
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF

echo "✅ Created single .env file at project root"

echo ""
echo "🎯 Environment setup complete!"
echo "   API URLs have been automatically configured"
echo "   Both admin and coach frontends will read from the single .env file"
echo ""
echo "🚀 Ready to start development:"
echo "   npm run dev:admin    # Start admin frontend"
echo "   npm run dev:coach    # Start coach frontend"
echo "   npm run dev          # Start both frontends" 