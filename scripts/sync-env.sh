#!/bin/bash

# Script to sync environment variables from AWS SSM Parameter Store

set -e

# Get the STAGE from first argument or default to 'dev'
STAGE=${1:-dev}

echo "🔄 Syncing environment variables for stage: $STAGE"
echo "📍 Working directory: $(pwd)"

# Define the .env.local file path (assuming script is run from project root)
ENV_FILE=".env.local"

# Function to get SSM parameter value
get_ssm_parameter() {
    local param_name=$1
    local env_var_name=$2
    
    echo "🔍 Fetching: $param_name"
    
    # Try to get the parameter value
    local value=$(aws ssm get-parameter --name "$param_name" --query 'Parameter.Value' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$value" = "NOT_FOUND" ]; then
        echo "❌ Parameter not found: $param_name"
        return 1
    else
        echo "✅ Found: $env_var_name=$value"
        echo "$env_var_name=$value" >> "$ENV_FILE"
        return 0
    fi
}

# Create/clear the .env.local file
echo "📝 Creating $ENV_FILE..."
> "$ENV_FILE"

# Add header
echo "# Auto-generated environment variables from AWS SSM Parameter Store" >> "$ENV_FILE"
echo "# Stage: $STAGE" >> "$ENV_FILE"
echo "# Generated at: $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo ""
echo "🎯 Fetching API endpoints..."

# Fetch API endpoints with original infrastructure paths
get_ssm_parameter "/tsa/$STAGE/api-endpoints/coach" "NEXT_PUBLIC_TSA_COACH_API_URL"
get_ssm_parameter "/tsa-admin/$STAGE/api-urls/admin" "NEXT_PUBLIC_TSA_ADMIN_API_URL"
get_ssm_parameter "/tsa-coach/$STAGE/api-urls/passwordlessAuth" "NEXT_PUBLIC_TSA_AUTH_API_URL"

# Add placeholder for parent API (not deployed yet)
echo "📝 Adding placeholder for parent API..."
echo "NEXT_PUBLIC_TSA_PARENT_API_URL=https://placeholder-parent-api.tsa.dev/" >> "$ENV_FILE"

echo ""
echo "📋 Current .env.local contents:"
echo "═══════════════════════════════"
cat "$ENV_FILE"
echo "═══════════════════════════════"

echo ""
echo "✅ Environment synchronization complete!"
echo "🎯 You can now run your Next.js application" 