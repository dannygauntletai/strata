# TSA Infrastructure - Coach Portal MVP

## 🎯 Current Status: Simplified Coach Portal MVP

This infrastructure has been simplified to focus **exclusively on coach management** for the MVP deployment. All other services have been archived but can be restored when needed.

### **✅ Active Service (MVP)**
- **Coach Portal Service**: Timeline management, coach tools, events, onboarding

### **📦 Archived Services** 
Moved to `../archived-infrastructure/` for later use:
- **Lead Management Service**: Lead collection, attribution, scoring, analytics
- **Admissions Portal Service**: Enrollment processes, registration workflows, communications  
- **Analytics Service**: Data ingestion, processing, reporting across all services
- **Communication Service**: SMS, email, push notifications, messaging
- **Payment Service**: Stripe integration, billing, subscriptions
- **Document Management Service**: Document storage, e-signatures, compliance  
- **Academic Management Service**: Student information, grades, attendance
- **Advanced Monitoring Service**: Business intelligence, custom metrics, alerting

> **Note**: See `../archived-infrastructure/README.md` for complete service details and restoration instructions.

## Overview

This simplified CDK infrastructure provides a focused **coach management platform** with minimal complexity and cost, while maintaining the foundation for future scaling.

## Architecture

### 🏗️ **Simplified MVP Design**

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Networking    │    Security     │      Data Layer         │
│   (VPC, etc.)   │  (IAM, etc.)    │  (RDS PostgreSQL)       │
└─────────────────┴─────────────────┴─────────────────────────┘
                               │
                               │
                    ┌──────────▼──────────┐
                    │    COACH PORTAL     │
                    │      SERVICE        │
                    │                     │
                    │ • Timeline Mgmt     │
                    │ • Event Mgmt        │
                    │ • Coach Onboarding  │
                    │ • Quizzes/Tasks     │
                    │ • Invitations       │
                    └─────────────────────┘
                               │
                               │
                    ┌──────────▼──────────┐
                    │     FRONTEND        │
                    │   Coach Portal UI   │
                    │   (CloudFront/S3)   │
                    └─────────────────────┘
```

### 🎯 **Coach Portal Service**

**Purpose**: Complete coach lifecycle management
- **Data**: DynamoDB (timeline/events), PostgreSQL (user/org data)
- **Components**: Timeline management, onboarding, quizzes, invitations, events
- **API**: `/coach-portal/*`

**Key Features:**
- 📋 **Timeline Management**: Flexible progression tracking with dynamic steps
- 📅 **Event Management**: Event creation, registration, and tracking
- 🎓 **Coach Onboarding**: Automated workflow with step dependencies
- 📝 **Quizzes & Assessments**: Knowledge validation and progress tracking
- 📧 **Invitation Management**: Coach recruitment and follow-up

## Simplified Directory Structure

```
tsa-coach/ (Root project directory)
├── tsa-infrastructure/             # Simplified CDK Infrastructure
│   ├── app.py                      # Coach Portal only orchestrator
│   ├── requirements.txt            # Python dependencies
│   ├── lib/
│   │   ├── shared/                 # Shared infrastructure
│   │   │   ├── networking_stack.py # VPC, subnets, routing
│   │   │   ├── security_stack.py   # IAM, security groups
│   │   │   └── data_stack.py       # RDS PostgreSQL
│   │   ├── services/               # Single service
│   │   │   └── coach_portal_service.py # Coach portal infrastructure
│   │   └── frontend_stack.py       # Frontend (CloudFront, S3)
│   └── README.md                   # This file
├── tsa-coach-backend/              # Coach Portal Backend Service
│   ├── shared_layer/               # Shared models and utilities
│   ├── lambda_timeline/            # Timeline management
│   ├── lambda_events/              # Event management
│   ├── lambda_onboard/             # Coach onboarding
│   ├── lambda_quizzes/             # Quiz and assessments
│   └── lambda_invitations/         # Invitation management
├── tsa-coach-frontend/             # Coach Portal Frontend (Next.js)
│   ├── src/                        # Coach-facing application
│   ├── components/                 # UI components
│   ├── pages/                      # Coach portal pages
│   └── database/                   # Database schemas and migrations
└── archived-infrastructure/        # Archived services for later use
    ├── services/                   # All archived service stacks
    └── README.md                   # Restoration instructions
```

## Coach Portal Service Details

### **Resources Created:**
- **Lambda Functions**: Timeline, events, onboarding, quizzes, invitations handlers
- **DynamoDB Tables**: Timeline tracking, event management, onboarding sessions
- **API Gateway**: RESTful APIs for coach portal functionality
- **EventBridge Rules**: Automated cleanup and analytics

### **Database Schema:**
- **PostgreSQL**: Users, organizations, coach profiles (shared data)
- **DynamoDB**: Timelines, events, onboarding sessions, quizzes (dynamic data)

### **API Endpoints:**
```
GET  /coach-portal/timeline/{coach_id}     # Get coach timeline
POST /coach-portal/timeline/update         # Update timeline step
GET  /coach-portal/events                  # List events
POST /coach-portal/events                  # Create event
GET  /coach-portal/onboarding/{session_id} # Get onboarding status
POST /coach-portal/quiz/submit             # Submit quiz results
```

## Deployment

### Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Node.js and npm** installed
3. **Python 3.8+** and pip
4. **AWS CDK** installed globally: `npm install -g aws-cdk`

### Setup

```bash
# Install Python dependencies
cd tsa-infrastructure
pip install -r requirements.txt

# Bootstrap CDK (one-time setup per account/region)
cdk bootstrap

# Synthesize CloudFormation templates (optional, for review)
cdk synth
```

### Deploy Coach Portal MVP

```bash
# Deploy all stacks in dependency order
cdk deploy --all

# Or deploy specific environment
cdk deploy --all --context stage=dev
cdk deploy --all --context stage=prod
```

### Individual Stack Deployment

```bash
# Deploy only shared infrastructure
cdk deploy TSA-Networking-dev TSA-Security-dev TSA-Data-dev

# Deploy coach portal service
cdk deploy TSA-CoachPortal-dev

# Deploy frontend
cdk deploy TSA-Frontend-dev
```

## MVP Benefits

### ✅ **Simplified Deployment**
- **Single Service**: Only coach portal infrastructure to manage
- **Reduced Complexity**: No inter-service communication complexity
- **Fast Deployment**: Minimal resources to provision

### ✅ **Cost Optimization**
- **Minimal Resources**: Only necessary AWS services provisioned
- **No Unused Services**: No analytics, communication, or payment overhead
- **Focused Scaling**: Resources scale with coach usage only

### ✅ **Development Focus**
- **Clear Scope**: Development team focuses only on coach functionality
- **Faster Iteration**: No cross-service dependencies to manage
- **Easier Testing**: Single service integration testing

### ✅ **Future-Ready Architecture**
- **Shared Foundation**: Networking, security, and data layer ready for expansion
- **Service Architecture**: Easy to add back archived services
- **Database Schema**: All tables remain, ready for service restoration

## Monitoring & Operations

### **CloudWatch Integration**
- **Log Groups**: Structured logging for all Lambda functions
- **Metrics**: API Gateway, Lambda, and DynamoDB metrics
- **Alarms**: Basic error rate and latency monitoring

### **Key Metrics to Monitor**
- Timeline completion rates
- Event registration volumes
- Onboarding progress metrics
- Quiz completion rates
- API error rates and latency

### **Operational Commands**

```bash
# View coach portal stack status
cdk ls
aws cloudformation describe-stacks --stack-name TSA-CoachPortal-dev

# Monitor coach portal logs
aws logs tail /aws/lambda/tsa-coach-timeline-handler --follow
aws logs tail /aws/lambda/tsa-coach-events-handler --follow

# Check API health
curl https://{api-gateway-url}/coach-portal/health
```

## Security

### **Implemented Security**
- **VPC**: Private subnets for Lambda functions and database
- **IAM**: Least privilege roles for all resources
- **API Gateway**: Request/response logging and throttling
- **RDS**: Encryption at rest and in transit
- **DynamoDB**: Server-side encryption enabled

### **Authentication**
- **Cognito User Pool**: Coach authentication and authorization
- **JWT Tokens**: Secure API access with user context
- **Role-Based Access**: Different permissions for coach levels

## Scaling Path

When ready to expand beyond coach management:

### **Phase 1: Add Communication** (First Priority)
```bash
mv archived-infrastructure/services/communication_service.py tsa-infrastructure/lib/services/
# Update app.py to include communication service
cdk deploy
```

### **Phase 2: Add Analytics** (Second Priority)
- Restore analytics service for coach performance insights
- Add basic reporting and dashboards

### **Phase 3: Add Lead Management** (Third Priority)
- Begin customer acquisition workflows
- Lead collection and attribution

### **Phase 4: Add Remaining Services** (As Needed)
- Admissions portal for student enrollment
- Payment service for monetization
- Document management for compliance
- Advanced monitoring for business intelligence

## Cost Estimates

### **Development Environment** (~$50-100/month)
- RDS PostgreSQL (t3.micro): ~$15/month
- Lambda (minimal usage): ~$5/month
- DynamoDB (on-demand): ~$10/month
- API Gateway: ~$5/month
- CloudFront: ~$5/month
- Other services: ~$10/month

### **Production Environment** (~$150-300/month)
- RDS PostgreSQL (t3.small with backup): ~$50/month
- Lambda (moderate usage): ~$25/month
- DynamoDB (on-demand): ~$30/month
- API Gateway: ~$20/month
- CloudFront: ~$15/month
- Other services: ~$20/month

> **Note**: Costs scale with usage. Coach portal MVP should remain very cost-effective.

## Support & Next Steps

### **For Questions:**
- **Infrastructure Issues**: Infrastructure team
- **Coach Portal Features**: Product team
- **Security Concerns**: Security team

### **Next Development Priorities:**
1. Complete coach portal frontend
2. Implement coach authentication flow
3. Add basic coach dashboard and timeline UI
4. Test end-to-end coach onboarding workflow
5. Add basic monitoring and alerting

### **When to Restore Services:**
- **Communication**: When coach notifications become necessary
- **Analytics**: When coach performance insights are needed
- **Lead Management**: When scaling coach recruitment
- **Admissions**: When scaling student enrollment
- **Payment**: When monetizing coach services

---

**This simplified architecture provides a solid foundation for the TSA Coach platform while maintaining focus on the core coach management functionality.** 