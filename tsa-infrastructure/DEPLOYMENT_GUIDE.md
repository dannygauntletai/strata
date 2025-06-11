# TSA Infrastructure Deployment Guide

## Overview

This guide walks you through deploying the TSA Coach multi-service infrastructure using AWS CDK. The architecture separates concerns into three main services with shared infrastructure.

## Pre-Deployment Checklist

### ✅ **Requirements Verification**

- [ ] AWS CLI installed and configured
- [ ] Node.js 16+ and npm installed
- [ ] Python 3.8+ and pip installed
- [ ] AWS CDK 2.x installed globally: `npm install -g aws-cdk`
- [ ] Appropriate AWS permissions (IAM admin or equivalent)
- [ ] Domain/SSL certificates prepared (if using custom domains)

### ✅ **Backend Services Structure**

Ensure the following backend services are properly organized:

```
tsa-coach/ (Root directory)
├── tsa-infrastructure/           # This CDK infrastructure
├── tsa-coach-backend/            # Coach Portal Backend
├── tsa-lead-backend/             # Lead Management Backend (standalone service)
├── tsa-admissions-backend/       # Admissions Portal Backend (enrollment focused)
├── tsa-analytics-backend/        # Analytics Service Backend
├── tsa-coach-frontend/           # Coach Portal Frontend
└── tsa-admissions-frontend/      # Admissions Portal Frontend (for parents)
```

**Note**: Lead management is now a dedicated service separate from admissions for better flexibility and reusability.

### ✅ **Account Preparation**

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check CDK version
cdk --version

# Bootstrap CDK (one-time per account/region)
cdk bootstrap
```

## Deployment Strategy

### 🎯 **Deployment Order**

The infrastructure must be deployed in this specific order due to dependencies:

1. **Shared Infrastructure** (Networking, Security, Data)
2. **Service Layer** (Coach Portal, Admissions Portal, Analytics)
3. **Frontend Layer** (CloudFront, S3, CI/CD)

## Step-by-Step Deployment

### **Step 1: Environment Setup**

```bash
# Clone and navigate to infrastructure
cd tsa-infrastructure

# Install Python dependencies
pip install -r requirements.txt

# Validate CDK configuration
cdk doctor
```

### **Step 2: Configuration**

Choose your deployment environment:

```bash
# Development environment (default)
export STAGE=dev

# Staging environment
export STAGE=staging

# Production environment
export STAGE=prod
```

### **Step 3: Deploy Shared Infrastructure**

Deploy the foundation layers that all services depend on:

```bash
# Deploy networking (VPC, subnets, routing)
cdk deploy TSA-Networking-$STAGE

# Deploy security (IAM roles, security groups)
cdk deploy TSA-Security-$STAGE

# Deploy data layer (RDS PostgreSQL)
cdk deploy TSA-Data-$STAGE
```

**Expected Outputs:**
- VPC ID and subnet configurations
- Security group IDs
- RDS cluster endpoint
- Database connection string (stored in Parameter Store)

### **Step 4: Deploy Service Layer**

Deploy each service independently:

```bash
# Deploy Coach Portal Service
cdk deploy TSA-CoachPortal-$STAGE

# Deploy Lead Management Service
cdk deploy TSA-LeadManagement-$STAGE

# Deploy Admissions Portal Service  
cdk deploy TSA-AdmissionsPortal-$STAGE

# Deploy Analytics Service
cdk deploy TSA-Analytics-$STAGE
```

**Expected Outputs:**
- API Gateway URLs for each service
- DynamoDB table names (Coach Portal)
- S3 bucket names (Admissions, Analytics)
- Kinesis stream ARNs (Analytics)
- Lead management queues and topics

### **Step 5: Deploy Frontend Infrastructure**

```bash
# Deploy frontend infrastructure
cdk deploy TSA-Frontend-$STAGE
```

**Expected Outputs:**
- CloudFront distribution URL
- S3 bucket for static hosting
- CI/CD pipeline configuration

### **Step 6: Verification**

Verify all services are running correctly:

```bash
# Check all stacks
cdk ls

# Get stack outputs
aws cloudformation describe-stacks --stack-name TSA-CoachPortal-$STAGE --query 'Stacks[0].Outputs'

# Test API endpoints
curl https://{coach-portal-api-url}/health
curl https://{admissions-portal-api-url}/health  
curl https://{analytics-api-url}/health
```

## One-Command Deployment

For development environments, you can deploy everything at once:

```bash
# Deploy all stacks in correct order
cdk deploy --all --context stage=dev

# With approval prompts disabled (use with caution)
cdk deploy --all --context stage=dev --require-approval never
```

## Environment-Specific Deployments

### **Development Environment**

```bash
# Minimal resources for development
cdk deploy --all --context stage=dev
```

**Characteristics:**
- Smaller RDS instances (t3.micro)
- Basic Lambda configurations
- Standard S3 storage
- Minimal monitoring

### **Staging Environment**

```bash
# Production-like environment for testing
cdk deploy --all --context stage=staging
```

**Characteristics:**
- Medium RDS instances (t3.small)
- Enhanced Lambda configurations
- Intelligent S3 tiering
- Full monitoring enabled

### **Production Environment**

```bash
# Full production deployment
cdk deploy --all --context stage=prod
```

**Characteristics:**
- High-availability RDS clusters
- Optimized Lambda memory/concurrency
- Multi-AZ deployments
- Comprehensive monitoring and alerting
- Reserved capacity where applicable

## Post-Deployment Configuration

### **Step 1: Database Schema Setup**

```bash
# Connect to RDS and create schemas
# (Connection details available in AWS Systems Manager Parameter Store)

psql -h {rds-endpoint} -U postgres -d tsa_coach

# Run schema files from tsa-coach-frontend/database/
\i 01-organizations.sql
\i 02-users.sql  
\i 03-coaches.sql
\i 04-leads.sql
# ... other schema files
```

### **Step 2: Service Configuration**

Update each service with environment-specific configuration:

```bash
# Update Lambda environment variables if needed
aws lambda update-function-configuration \
  --function-name coach-portal-timeline-handler \
  --environment Variables='{
    "DATABASE_URL":"postgresql://...",
    "LOG_LEVEL":"INFO"
  }'
```

### **Step 3: Frontend Environment Variables**

Update frontend applications with API endpoints:

```javascript
// tsa-coach-frontend/.env.production
NEXT_PUBLIC_COACH_PORTAL_API=https://{coach-portal-api-url}
NEXT_PUBLIC_ADMISSIONS_API=https://{admissions-portal-api-url}
NEXT_PUBLIC_ANALYTICS_API=https://{analytics-api-url}
```

## Migration from Previous Architecture

### **Migration Strategy**

If migrating from a previous monolithic setup:

#### **Phase 1: Parallel Deployment**
```bash
# Deploy new architecture alongside existing
cdk deploy --all --context stage=migration
```

#### **Phase 2: Data Migration**
```bash
# Export data from existing system
# Import to new PostgreSQL database
# Verify data integrity
```

#### **Phase 3: Traffic Switching**
```bash
# Update DNS/load balancer to point to new services
# Monitor performance and error rates
# Rollback plan ready
```

#### **Phase 4: Cleanup**
```bash
# Remove old infrastructure after successful migration
# Clean up unused resources
```

## Troubleshooting

### **Common Deployment Issues**

#### **1. CDK Bootstrap Issues**
```bash
# If bootstrap fails
cdk bootstrap --force
```

#### **2. Dependency Conflicts**
```bash
# If stack dependencies fail
cdk deploy TSA-Networking-$STAGE --force
```

#### **3. Resource Limits**
```bash
# Check AWS service limits
aws service-quotas list-service-quotas --service-code lambda
```

#### **4. Permission Issues**
```bash
# Verify IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/USERNAME \
  --action-names cloudformation:CreateStack
```

### **Rollback Procedures**

#### **Complete Rollback**
```bash
# Destroy all stacks in reverse order
cdk destroy TSA-Frontend-$STAGE
cdk destroy TSA-Analytics-$STAGE
cdk destroy TSA-AdmissionsPortal-$STAGE
cdk destroy TSA-CoachPortal-$STAGE
cdk destroy TSA-Data-$STAGE
cdk destroy TSA-Security-$STAGE
cdk destroy TSA-Networking-$STAGE
```

#### **Service-Specific Rollback**
```bash
# Rollback specific service
cdk destroy TSA-CoachPortal-$STAGE

# Redeploy previous version
git checkout previous-tag
cdk deploy TSA-CoachPortal-$STAGE
```

## Performance Optimization

### **Post-Deployment Tuning**

#### **Lambda Optimization**
```bash
# Monitor Lambda performance
aws logs filter-log-events \
  --log-group-name /aws/lambda/coach-portal-timeline-handler \
  --filter-pattern "REPORT"

# Adjust memory if needed
aws lambda update-function-configuration \
  --function-name coach-portal-timeline-handler \
  --memory-size 1024
```

#### **Database Optimization**
```bash
# Monitor RDS performance
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier {cluster-id}

# Enable performance insights
aws rds modify-db-cluster \
  --db-cluster-identifier {cluster-id} \
  --enable-performance-insights
```

#### **API Gateway Optimization**
```bash
# Enable caching if needed
aws apigateway put-method-response \
  --rest-api-id {api-id} \
  --resource-id {resource-id} \
  --http-method GET \
  --status-code 200 \
  --response-parameters method.response.header.Cache-Control=true
```

## Monitoring Setup

### **CloudWatch Dashboards**

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "TSA-Coach-$STAGE" \
  --dashboard-body file://cloudwatch-dashboard.json
```

### **Alerting Configuration**

```bash
# Set up critical alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "TSA-CoachPortal-HighErrorRate-$STAGE" \
  --alarm-description "High error rate in Coach Portal" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Security Hardening

### **Post-Deployment Security**

#### **1. Update Default Passwords**
```bash
# Change RDS master password
aws rds modify-db-cluster \
  --db-cluster-identifier {cluster-id} \
  --master-user-password {new-password} \
  --apply-immediately
```

#### **2. Enable Additional Logging**
```bash
# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids {vpc-id} \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name VPCFlowLogs
```

#### **3. Configure WAF (if applicable)**
```bash
# Create WAF rules for API Gateway
aws wafv2 create-web-acl \
  --name TSA-Coach-WAF-$STAGE \
  --scope CLOUDFRONT \
  --default-action Allow={}
```

## Maintenance Procedures

### **Regular Maintenance Tasks**

#### **Weekly**
- Review CloudWatch metrics and alarms
- Check for failed Lambda executions
- Monitor database performance
- Review cost optimization opportunities

#### **Monthly**
- Update CDK and dependencies
- Review and rotate credentials
- Analyze usage patterns for optimization
- Backup critical data

#### **Quarterly**
- Security audit and penetration testing
- Disaster recovery testing
- Performance benchmarking
- Cost analysis and budget review

## Support and Documentation

### **Getting Help**

- **Infrastructure Issues**: Check CloudFormation stack events
- **CDK Issues**: Review CDK documentation and GitHub issues
- **AWS Service Issues**: Check AWS status page and support cases
- **Application Issues**: Review service-specific logs and metrics

### **Useful Commands Reference**

```bash
# Common CDK commands
cdk ls                          # List all stacks
cdk synth                       # Synthesize templates
cdk diff                        # Show changes
cdk deploy --all               # Deploy all stacks
cdk destroy --all              # Destroy all stacks

# Common AWS CLI commands  
aws cloudformation list-stacks
aws lambda list-functions
aws rds describe-db-clusters
aws s3 ls
```

---

For additional support, consult the main README.md or contact the TSA Coach infrastructure team. 