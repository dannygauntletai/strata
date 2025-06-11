# 🚀 LLC Incorporation Docker Lambda - CDK Deployment

This implementation uses AWS CDK to deploy a Docker container Lambda function for automated LLC incorporation using Playwright.

## 📋 **Overview**

Based on [Dr. Luiz Verçosa's proven approach](https://medium.com/@luizfelipeverosa/serverless-web-scraping-with-playwright-and-aws-lambda-450b7a3fa42e), this solution provides:

- ✅ **Docker Container Lambda** (up to 10GB vs 250MB ZIP limit)
- ✅ **Full Playwright API** with browser automation
- ✅ **Infrastructure as Code** using AWS CDK
- ✅ **Auto-managed ECR repository** and image building
- ✅ **API Gateway integration** with CORS
- ✅ **S3 screenshot debugging** for troubleshooting
- ✅ **DynamoDB integration** for status tracking

## 🏗️ **Architecture**

```
📦 CDK Stack Components:
├── 🐳 Docker Image Asset (ECR)
├── ⚡ Lambda Function (Container)
├── 🌐 API Gateway (REST API)
├── 🔐 IAM Roles & Policies
├── 📊 CloudWatch Logs
└── 📸 S3 Screenshot Storage
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ installed
- AWS CLI configured
- Docker running locally
- CDK bootstrap completed: `cdk bootstrap`

### **Deploy to Development**
```bash
# Deploy to dev environment
./deploy-llc-cdk.sh dev
```

### **Deploy to Other Environments**
```bash
# Deploy to staging
./deploy-llc-cdk.sh staging

# Deploy to production
./deploy-llc-cdk.sh prod
```

### **Test Deployment**
```bash
# Test the deployed function
./test-llc-cdk.sh dev
```

## 📁 **Project Structure**

```
tsa-coach-backend/
├── 📦 package.json                     # CDK dependencies
├── 🔧 tsconfig.json                   # TypeScript config
├── ⚙️ cdk.json                        # CDK configuration
├── 🏗️ lib/
│   └── llc-incorporation-stack.ts      # Main CDK stack
├── 🚀 bin/
│   └── llc-incorporation-app.ts        # CDK app entry point
└── 🐳 lambda_llc_incorporation/
    ├── Dockerfile                      # Container definition
    ├── docker_handler.py               # Python Lambda handler
    ├── requirements.txt                # Python dependencies
    ├── handler.py                      # Compatibility layer
    └── .dockerignore                   # Build optimization
```

## 🔧 **CDK Commands Reference**

### **Development Workflow**
```bash
cd tsa-coach-backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Synthesize CloudFormation
npm run synth -- --context stage=dev

# View changes before deploy
npm run diff -- --context stage=dev

# Deploy stack
npm run deploy -- --context stage=dev

# Destroy stack (careful!)
npm run destroy -- --context stage=dev
```

### **Environment-Specific Deployments**
```bash
# Development
npm run deploy:dev

# Staging  
npm run deploy:staging

# Production
npm run deploy:prod
```

## 📊 **Stack Outputs**

After deployment, CDK provides these outputs:

| Output | Description | Usage |
|--------|-------------|-------|
| `LambdaFunctionArn` | Function ARN | Direct Lambda invocation |
| `DockerImageUri` | ECR image URI | Container image reference |
| `ApiEndpoint` | API Gateway URL | HTTP endpoint testing |
| `LambdaFunctionName` | Function name | CloudWatch logs, testing |

## 🧪 **Testing**

### **Direct Lambda Testing**
```bash
# Test with our script
./test-llc-cdk.sh dev

# Manual testing
aws lambda invoke \
  --function-name tsa-llc-incorporation-dev \
  --payload file://test-payload.json \
  response.json
```

### **API Gateway Testing**
```bash
# Get API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name TsaLlcIncorporation-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test via HTTP
curl -X POST ${API_URL}incorporation \
  -H "Content-Type: application/json" \
  -d '{"coach_id": "test@example.com", ...}'
```

## 📸 **Debugging**

### **CloudWatch Logs**
```bash
# Real-time log monitoring
aws logs tail /aws/lambda/tsa-llc-incorporation-dev --follow

# View recent logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/tsa-llc-incorporation"
```

### **S3 Screenshots**
Screenshots are automatically saved during execution:
- **Bucket**: `tsa-coach-portal-v2-{stage}-{account-id}`
- **Path**: `llc-incorporation-screenshots/{session-id}/`

### **Container Debugging**
```bash
# Build and test locally
cd tsa-coach-backend/lambda_llc_incorporation
docker build --platform linux/amd64 -t llc-test .
docker run -p 9000:8080 llc-test

# Test Lambda Runtime Interface
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"httpMethod": "POST", "body": "{\"test\": \"data\"}"}'
```

## 🔄 **Updates & Redeployment**

### **Code Changes**
```bash
# After modifying docker_handler.py or Dockerfile
cd tsa-coach-backend
npm run deploy -- --context stage=dev
```

### **Infrastructure Changes**
```bash
# After modifying llc-incorporation-stack.ts
npm run build
npm run deploy -- --context stage=dev
```

### **Force Rebuild**
```bash
# Force CDK to rebuild everything
cdk deploy --force --context stage=dev
```

## 🛠️ **Configuration**

### **Environment Variables**
Set via CDK stack:
- `STAGE`: Environment (dev/staging/prod)
- `HOME`: `/tmp` (required for Lambda containers)
- `SCREENSHOTS_BUCKET`: S3 bucket for debugging
- `PLAYWRIGHT_BROWSERS_PATH`: `/tmp/.playwright`

### **Lambda Configuration**
- **Memory**: 3008 MB (maximum for containers)
- **Timeout**: 15 minutes (maximum)
- **Concurrent Executions**: 5 (to control costs)

### **Security**
- **IAM**: Minimal required permissions
- **CORS**: Environment-specific origins
- **VPC**: Optional (not required for this use case)

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Docker Build Fails**
   ```bash
   # Check Docker is running
   docker ps
   
   # Clear Docker cache
   docker system prune -f
   ```

2. **CDK Deploy Fails**
   ```bash
   # Check bootstrap
   cdk doctor
   
   # Re-bootstrap if needed
   cdk bootstrap
   ```

3. **Lambda Cold Starts**
   - First execution takes 10-15 seconds
   - Subsequent warm invocations: 2-5 minutes

4. **Playwright Errors**
   - Check CloudWatch logs for browser launch issues
   - Verify Lambda memory is set to 3008 MB
   - Review S3 screenshots for debugging

### **Performance Optimization**

1. **Reserved Concurrency**: Set to 5 to control costs
2. **Memory**: 3008 MB for optimal Playwright performance  
3. **Timeout**: 15 minutes for complex automation
4. **Image Optimization**: Use `.dockerignore` to reduce build time

## 💰 **Cost Considerations**

| Component | Estimated Cost (per month) |
|-----------|----------------------------|
| Lambda (3GB, 5 min avg) | $2-5 per 100 executions |
| ECR Storage | $0.10 per GB |
| API Gateway | $3.50 per million requests |
| CloudWatch Logs | $0.50 per GB |
| S3 Screenshots | $0.023 per GB |

**Total**: ~$0.50-$1.00 per LLC incorporation execution

## 📚 **References**

- [Dr. Luiz Verçosa's Playwright Lambda Guide](https://medium.com/@luizfelipeverosa/serverless-web-scraping-with-playwright-and-aws-lambda-450b7a3fa42e)
- [AWS CDK Container Images Documentation](https://docs.aws.amazon.com/cdk/v2/guide/build-containers.html)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Playwright Documentation](https://playwright.dev/docs/)

## 🆘 **Support**

For issues or questions:
1. Check CloudWatch logs first
2. Review S3 screenshots for visual debugging
3. Test locally with Docker container
4. Compare with Dr. Verçosa's reference implementation

---

**Created**: Based on proven Docker + Playwright + CDK approach  
**Last Updated**: December 2024  
**Deployment Method**: AWS CDK Infrastructure as Code 