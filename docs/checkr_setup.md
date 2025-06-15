# Checkr Background Check Integration Setup Guide

This guide walks through the complete setup process for transitioning from mock mode to production Checkr API integration.

## 📋 Prerequisites

### 1. Checkr Account Setup
- Sign up for a Checkr account at [https://checkr.com](https://checkr.com)
- Complete business verification process
- Choose appropriate background check packages
- Obtain API credentials from Checkr dashboard

### 2. Required Information
- **API Key**: Production API key from Checkr
- **Webhook URL**: Will be `https://your-api-domain/background-check/webhook`
- **Package Types**: Standard background check package configuration

## 🔑 Step 1: Configure Checkr API Key

### Using the Setup Script
```bash
# Navigate to infrastructure directory
cd tsa-infrastructure

# Make the script executable
chmod +x scripts/setup-checkr-secret.sh

# Run the setup script
./scripts/setup-checkr-secret.sh

# Follow the prompts:
# - Enter your stage (dev/staging/prod)
# - Enter your Checkr API key
# - Confirm the configuration
```

### Manual Configuration (Alternative)
```bash
# Create the secret in AWS Secrets Manager
aws secretsmanager create-secret \
    --name "checkr-api-key-dev" \
    --description "Checkr API key for background check integration" \
    --secret-string '{"api_key":"your-actual-checkr-api-key-here"}'

# Verify the secret was created
aws secretsmanager describe-secret --secret-id "checkr-api-key-dev"
```

## 🏗️ Step 2: Update Infrastructure Configuration

### Update CoachPortalService
Edit `tsa-infrastructure/lib/services/coach_portal_service.py`:

```python
# Change MOCK_MODE from true to false
environment={
    # ... other environment variables ...
    "MOCK_MODE": "false",  # Disable mock mode for production
    # ... rest of environment variables ...
}
```

### Uncomment Secrets Manager Permissions
In the same file, uncomment the Secrets Manager permissions:

```python
# Grant Secrets Manager permissions for Checkr API key to background check function
self.background_check_function.add_to_role_policy(
    iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        actions=[
            "secretsmanager:GetSecretValue"
        ],
        resources=[
            f"arn:aws:secretsmanager:*:*:secret:checkr-api-key-{self.stage}-*"
        ]
    )
)
```

## 🚀 Step 3: Deploy Updated Infrastructure

```bash
# Navigate to infrastructure directory
cd tsa-infrastructure

# Deploy the updated backend
cdk deploy tsa-coach-backend-dev

# For staging/production environments
cdk deploy tsa-coach-backend-staging
cdk deploy tsa-coach-backend-prod
```

## 🧪 Step 4: Test the Integration

### 1. Health Check
```bash
# Test the background check health endpoint
curl -X GET "https://your-api-url/background-check/health" | jq

# Expected response should show:
# {
#   "status": "healthy",
#   "checkr_integration": "active",
#   "mock_mode": false
# }
```

### 2. Test Background Check Initiation
- Go to the onboarding flow: `/onboarding/background-check`
- Fill out the form with test data
- Click "Start Background Check"
- Verify that a real Checkr invitation is created

### 3. Webhook Testing
```bash
# Test webhook endpoint (this will be called by Checkr)
curl -X POST "https://your-api-url/background-check/webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"report.completed","data":{"object":{"id":"test_report_id","status":"complete"}}}'
```

## 🔧 Configuration Details

### Environment Variables
After setup, these environment variables will be active:
```
MOCK_MODE=false
CHECKR_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:checkr-api-key-stage-*
API_BASE_URL=https://your-api-domain
BACKGROUND_CHECKS_TABLE=background-checks-stage
```

### API Endpoints
The following endpoints will be using real Checkr API:
- `POST /background-check/initiate` - Creates real candidates and invitations
- `GET /background-check/status` - Queries real background check status
- `POST /background-check/webhook` - Receives real Checkr webhooks
- `GET /background-check/health` - Shows integration status

### Checkr Webhook Configuration
In your Checkr dashboard, configure the webhook URL:
```
Webhook URL: https://your-api-domain/background-check/webhook
Events: report.completed, invitation.completed_by_candidate
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Secret Not Found Error
```
Error: The request failed because the specified secret doesn't exist
```
**Solution**: Verify the secret was created correctly:
```bash
aws secretsmanager describe-secret --secret-id "checkr-api-key-dev"
```

#### 2. Unauthorized API Calls
```
Error: 401 Unauthorized from Checkr API
```
**Solutions**:
- Verify API key is correct in AWS Secrets Manager
- Check that the API key has proper permissions in Checkr dashboard
- Ensure you're using the production API key, not test keys

#### 3. Lambda Permission Errors
```
Error: User is not authorized to perform secretsmanager:GetSecretValue
```
**Solution**: Ensure Secrets Manager permissions are uncommented and deployed:
```bash
# Redeploy after uncommenting permissions
cdk deploy tsa-coach-backend-dev
```

#### 4. Webhook Not Receiving Events
- Verify webhook URL is correctly configured in Checkr dashboard
- Check CloudWatch logs for the background check Lambda function
- Test webhook endpoint manually with curl

### Debugging Commands

```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/tsa-background-check-handler-dev --follow

# Test secret retrieval
aws secretsmanager get-secret-value --secret-id "checkr-api-key-dev"

# Check DynamoDB table contents
aws dynamodb scan --table-name "background-checks-dev"

# Test API endpoints
curl -X GET "https://your-api-url/background-check/health"
```

## 🔄 Rollback to Mock Mode

If you need to rollback to mock mode:

1. **Update CoachPortalService**:
   ```python
   "MOCK_MODE": "true",  # Re-enable mock mode
   ```

2. **Comment out Secrets Manager permissions**:
   ```python
   # self.background_check_function.add_to_role_policy(...)
   ```

3. **Redeploy**:
   ```bash
   cdk deploy tsa-coach-backend-dev
   ```

## 📚 Additional Resources

- [Checkr API Documentation](https://docs.checkr.com/)
- [Checkr Webhook Guide](https://docs.checkr.com/docs/webhooks)
- [FCRA Compliance Guide](https://docs.checkr.com/docs/fcra-compliance)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)

## 🔐 Security Best Practices

1. **API Key Management**:
   - Never commit API keys to version control
   - Use different API keys for different environments
   - Rotate API keys regularly

2. **Webhook Security**:
   - Verify webhook signatures if Checkr provides them
   - Use HTTPS only for webhook endpoints
   - Log all webhook events for audit trails

3. **Data Protection**:
   - All PII is encrypted in transit and at rest
   - Background check results are stored with TTL for automatic cleanup
   - Access to background check data is logged and monitored

## ✅ Verification Checklist

- [ ] Checkr account setup completed
- [ ] API key configured in AWS Secrets Manager
- [ ] Infrastructure updated (MOCK_MODE=false)
- [ ] Secrets Manager permissions uncommented
- [ ] Infrastructure deployed successfully
- [ ] Health check shows "active" integration
- [ ] Test background check flow works
- [ ] Webhook URL configured in Checkr dashboard
- [ ] CloudWatch logs show successful API calls
- [ ] Mock mode disabled completely

---

**Note**: Keep this document updated as the Checkr integration evolves or if additional configuration steps are needed. 