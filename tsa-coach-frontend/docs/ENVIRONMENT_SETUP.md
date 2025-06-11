# 🔧 Environment Management - TSA Coach Portal

## Overview
This document explains how to manage API endpoints and environment-specific configurations across dev, staging, and production environments.

## 🏗️ Architecture

### 1. **Centralized Configuration** (`src/config/environments.ts`)
- Single source of truth for all environment configs
- Type-safe environment management
- Automatic fallbacks and overrides

### 2. **Environment Variables** (`.env` files)
- Runtime configuration for local development
- Build-time injection via CDK for deployments
- Secure secret management

## 🚀 Quick Setup

### For Local Development:

1. **Create `.env.local` file:**
```bash
# Copy the template
cp .env.example .env.local

# Edit with your current API endpoints
# Get latest endpoints from CDK deployment outputs
```

2. **Current API Endpoints (from latest CDK deployment):**
```bash
# Coach Portal API
NEXT_PUBLIC_API_URL=https://91te7407dl.execute-api.us-east-1.amazonaws.com/prod

# Admin Portal API  
NEXT_PUBLIC_ADMIN_API_URL=https://7e3zgj3cl5.execute-api.us-east-1.amazonaws.com/prod

# Passwordless Auth API
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1

# Environment
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG_MODE=true
```

## 📁 Environment Files Structure

```
tsa-coach-frontend/
├── .env.example          # Template with all variables
├── .env.local           # Local development (gitignored)
├── .env.development     # Development defaults
├── .env.staging         # Staging configuration
└── .env.production      # Production configuration
```

## 🔄 Environment Priority

1. **CDK Environment Variables** (highest - for deployments)
2. **`.env.local`** (local development)
3. **`.env.[environment]`** (environment defaults)
4. **`environments.ts`** (code defaults - lowest)

## 🛠️ Getting Current API Endpoints

### From CDK Deployment:
```bash
cd tsa-infrastructure

# Get all stack outputs
cdk deploy --outputs-file outputs.json

# View specific stack outputs
aws cloudformation describe-stacks --stack-name tsa-coach-backend-dev --query 'Stacks[0].Outputs'
aws cloudformation describe-stacks --stack-name tsa-admin-backend-dev --query 'Stacks[0].Outputs'
aws cloudformation describe-stacks --stack-name tsa-infra-auth-dev --query 'Stacks[0].Outputs'
```

### Current Endpoints (as of latest deployment):
- **Coach Backend:** `https://91te7407dl.execute-api.us-east-1.amazonaws.com/prod`
- **Admin Backend:** `https://7e3zgj3cl5.execute-api.us-east-1.amazonaws.com/prod`
- **Passwordless Auth:** `https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1`

## 🔍 Debugging Environment Issues

### 1. Check Configuration in Browser Console:
```javascript
// The config is automatically logged in development mode
// Look for: "🚀 TSA Coach Portal Environment Config"
```

### 2. Verify Environment Detection:
```typescript
import { config, isDevelopment } from '@/config/environments'

console.log('Current environment:', config.environment)
console.log('Is development:', isDevelopment())
console.log('API endpoints:', config.apiEndpoints)
```

### 3. Common Issues:

#### **"Network Error" in Login:**
- Check API endpoints in config
- Verify CORS settings
- Check browser network tab for actual URLs being called

#### **Wrong Environment Detected:**
- Check `NEXT_PUBLIC_ENVIRONMENT` variable
- Verify `NODE_ENV` setting
- Clear browser cache and restart dev server

## 🚀 Deployment Process

### 1. **Automatic via CDK:**
```bash
cd tsa-infrastructure
cdk deploy tsa-infra-frontend-dev
```
This automatically:
- Injects correct API endpoints from CDK outputs
- Sets environment variables in Amplify
- Triggers rebuild with new configuration

### 2. **Manual Environment Update:**
```bash
# Update frontend stack with new endpoints
cdk deploy tsa-infra-frontend-dev --force

# Or update specific environment variables in AWS Amplify console
```

## 🎯 Environment-Specific Features

### Development:
- Debug logging enabled
- Performance metrics visible
- Detailed error messages
- Hot reload

### Staging:
- Debug logging disabled
- Analytics enabled
- Staging API endpoints
- Production-like settings

### Production:
- All debugging disabled
- Analytics enabled
- Production API endpoints
- Optimized builds

## 📝 Adding New Environment Variables

1. **Add to `environments.ts`:**
```typescript
// Add to EnvironmentConfig interface
newFeature: {
  enabled: boolean
  apiKey?: string
}

// Add to each environment config
development: {
  // ...
  newFeature: {
    enabled: true,
    apiKey: process.env.NEXT_PUBLIC_NEW_FEATURE_API_KEY
  }
}
```

2. **Add to CDK deployment:**
```python
# In frontend_stack.py
environment_variables={
  # ...
  "NEXT_PUBLIC_NEW_FEATURE_API_KEY": "dev-api-key",
}
```

3. **Add to `.env.example`:**
```bash
# New Feature Configuration
NEXT_PUBLIC_NEW_FEATURE_API_KEY=your-api-key-here
```

## 🔐 Security Notes

- Never commit `.env.local` to git
- Use CDK for production secrets
- Rotate API keys regularly
- Use AWS Secrets Manager for sensitive data

## 🆘 Troubleshooting

### Network Errors:
1. Check API endpoint URLs
2. Verify CORS configuration
3. Check AWS API Gateway logs
4. Test endpoints with curl/Postman

### Environment Detection Issues:
1. Clear browser cache
2. Restart Next.js dev server
3. Check environment variable spelling
4. Verify CDK deployment completed

### Build Issues:
1. Check all required environment variables are set
2. Verify TypeScript types match configuration
3. Check for circular imports in config files 