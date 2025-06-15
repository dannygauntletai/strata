#!/bin/bash

# TSA Infrastructure Deployment Script
# Fast iterations with --force (free) and --hotswap fallback

set -e  # Exit on any error

STAGE=${1:-dev}
STACK=${2:-""}

echo "🚀 TSA Infrastructure Deployment"
echo "Stage: $STAGE"
echo "Force deployment enabled for fast iterations"

# Set CDK context for stage
export CDK_DEFAULT_REGION=us-east-2

# Function to deploy with force flag
deploy_with_force() {
    local stack_name=$1
    echo "📦 Deploying $stack_name with --force..."
    cdk deploy "$stack_name" --force --require-approval never
    echo "✅ $stack_name deployed successfully"
}

# Function to deploy with hotswap (for Lambda updates)
deploy_with_hotswap() {
    local stack_name=$1
    echo "🔥 Deploying $stack_name with --hotswap..."
    cdk deploy "$stack_name" --hotswap --require-approval never
    echo "✅ $stack_name hotswap deployed successfully"
}

# Deployment order for clean v1 architecture
if [ -z "$STACK" ]; then
    echo "🏗️  Deploying all stacks in dependency order..."
    
    # Infrastructure Layer (parallel where possible)
    deploy_with_force "tsa-infra-networking-$STAGE"
    deploy_with_force "tsa-infra-security-$STAGE" 
    deploy_with_force "tsa-infra-data-$STAGE"
    deploy_with_force "tsa-infra-auth-$STAGE"
    deploy_with_force "tsa-infra-migration-$STAGE"
    
    # Application Layer (with dependencies)
    deploy_with_force "tsa-coach-backend-$STAGE"
    deploy_with_force "tsa-parent-backend-$STAGE"
    deploy_with_force "tsa-admin-backend-$STAGE"
    
    # Frontend Layer
    deploy_with_force "tsa-infra-frontend-$STAGE"
    
    echo "🎉 All stacks deployed successfully!"
    
else
    echo "📦 Deploying single stack: $STACK"
    
    # Check if this looks like a Lambda-heavy stack for hotswap consideration
    if [[ "$STACK" == *"backend"* ]]; then
        echo "⚡ Backend stack detected. Trying force first, hotswap as fallback..."
        deploy_with_force "$STACK" || {
            echo "⚠️  Force failed, trying hotswap..."
            deploy_with_hotswap "$STACK"
        }
    else
        deploy_with_force "$STACK"
    fi
fi

echo "✨ Deployment complete!"
echo "🔧 Remember to set environment variables manually:"
echo "   • SENDGRID_API_KEY"
echo "   • Update any domain configurations" 