#!/bin/bash

# Setup Checkr API key in AWS Secrets Manager
# Usage: ./scripts/setup-checkr-secret.sh <stage> <checkr-api-key>

set -e

STAGE=${1:-dev}
CHECKR_API_KEY=${2}

if [ -z "$CHECKR_API_KEY" ]; then
    echo "Usage: $0 <stage> <checkr-api-key>"
    echo "Example: $0 dev test_1234567890abcdef"
    exit 1
fi

SECRET_NAME="checkr-api-key-${STAGE}"

echo "Setting up Checkr API key for stage: $STAGE"

# Check if secret exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
    echo "Secret $SECRET_NAME already exists. Updating..."
    aws secretsmanager update-secret \
        --secret-id "$SECRET_NAME" \
        --secret-string "{\"api_key\":\"$CHECKR_API_KEY\"}"
else
    echo "Creating new secret $SECRET_NAME..."
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "Checkr API key for background check integration ($STAGE environment)" \
        --secret-string "{\"api_key\":\"$CHECKR_API_KEY\"}"
fi

echo "✅ Checkr API key successfully configured for stage: $STAGE"
echo "Secret ARN: $(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --query 'ARN' --output text)"

echo ""
echo "Next steps:"
echo "1. Deploy the infrastructure: cd tsa-infrastructure && cdk deploy"
echo "2. Test the background check endpoints"
echo "3. Configure Checkr webhook URL in your Checkr dashboard" 