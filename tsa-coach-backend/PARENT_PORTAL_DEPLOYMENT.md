# TSA Parent Portal Deployment Guide

This guide explains how to deploy the new parent authentication and enrollment system as part of the unified TSA platform with EdFi/OneRoster compliance using SQLAlchemy ORM.

## Overview

The parent portal extends the existing TSA Coach infrastructure to support parents with:
- **Magic link authentication** for parents via unified frontend
- **Multi-step enrollment process** with EdFi-compliant student data via SQLAlchemy ORM
- **Dashboard and profile management** with OneRoster user compliance
- **Integration with existing coach invitation system**

## New Frontend Structure (UPDATED)

The platform now uses **unified frontend with role-based routing**:
- **Unified Frontend**: `app.sportsacademy.school` (both coaches and parents)
- **Role Detection**: Automatic routing based on user role after authentication
- **Coach Experience**: Same URL shows coach-specific dashboard and navigation
- **Parent Experience**: Same URL shows parent-specific dashboard and navigation

**Key Change**: NO separate `/parent` or `/coach` routes - both user types use `/` with role-based rendering.

## Database Architecture

### SQLAlchemy Integration

The system uses **SQLAlchemy 2.0** for PostgreSQL operations with EdFi/OneRoster compliance:

- **SQLAlchemy Core**: Database connectivity and transaction management
- **SQLAlchemy ORM**: Object-relational mapping for EdFi/OneRoster models
- **Session Management**: Proper session lifecycle in Lambda functions
- **Model Definitions**: Pre-defined models in `shared_utils/database_models.py`

### Database Strategy
- **PostgreSQL (via SQLAlchemy ORM)**: EdFi student records + OneRoster user management
- **DynamoDB**: Operational enrollment data + extended profiles  
- **Cognito**: Unified authentication for both roles

## New Lambda Functions

### 1. Enhanced Authentication (`lambda_passwordless/`)
- **Modified**: `magic_link_handler.py` - Now supports both coaches and parents
- **Modified**: `verify_token_handler.py` - Role-based authentication with EdFi/OneRoster profile creation via SQLAlchemy

### 2. Parent Enrollment (`lambda_parent_enrollment/`)
- **New**: `handler.py` - Complete enrollment workflow management with EdFi student data compliance
- **Features**: 
  - Enrollment initialization from coach invitations
  - Multi-step process handling (6 steps)
  - Document upload management
  - Scheduling for consultations and shadow days
  - EdFi-compliant student record creation via SQLAlchemy ORM

### 3. Parent Dashboard (`lambda_parent_dashboard/`)
- **New**: `handler.py` - Parent-specific dashboard and profile management
- **Features**:
  - Dashboard data aggregation
  - OneRoster-compliant parent profile management via SQLAlchemy
  - Enrollment status tracking
  - Recent activity and pending tasks

## Infrastructure Requirements

### Lambda Dependencies

#### SQLAlchemy Requirements
```text
# Add to requirements.txt for all parent portal Lambda functions
sqlalchemy==2.0.23
psycopg2-binary==2.9.9  # PostgreSQL adapter
boto3==1.35.36
botocore==1.35.36
```

#### Shared Layer Update
```bash
# Update shared_layer/python/requirements.txt
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0  # For data validation
```

### DynamoDB Tables (Extend Existing)

```typescript
// Add to existing tsa-infrastructure CDK stack

// 1. Enrollments Table (EdFi Integration Ready)
const enrollmentsTable = new dynamodb.Table(this, 'EnrollmentsTable', {
  tableName: `tsa-parent-enrollments-v3-${stage}`,
  partitionKey: { name: 'enrollment_id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN
});

// Add GSI for invitation token lookup
enrollmentsTable.addGlobalSecondaryIndex({
  indexName: 'invitation-token-index',
  partitionKey: { name: 'invitation_token', type: dynamodb.AttributeType.STRING }
});

// Add GSI for parent email lookup (OneRoster compliance)
enrollmentsTable.addGlobalSecondaryIndex({
  indexName: 'parent-email-index',
  partitionKey: { name: 'parent_email', type: dynamodb.AttributeType.STRING }
});

// 2. Documents Table (EdFi Document Management)
const documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
  tableName: `tsa-parent-documents-v3-${stage}`,
  partitionKey: { name: 'document_id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN
});

// Add GSI for enrollment lookup
documentsTable.addGlobalSecondaryIndex({
  indexName: 'enrollment-id-index',
  partitionKey: { name: 'enrollment_id', type: dynamodb.AttributeType.STRING }
});

// 3. Scheduling Table
const schedulingTable = new dynamodb.Table(this, 'SchedulingTable', {
  tableName: `tsa-parent-scheduling-v3-${stage}`,
  partitionKey: { name: 'schedule_id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN
});

// Add GSI for enrollment lookup
schedulingTable.addGlobalSecondaryIndex({
  indexName: 'enrollment-id-index',
  partitionKey: { name: 'enrollment_id', type: dynamodb.AttributeType.STRING }
});
```

### Lambda Functions (Add to CDK Stack)

```typescript
// Add to tsa-infrastructure/lib/services/parent_portal_service.py

// 1. Parent Enrollment Lambda
const parentEnrollmentFunction = new lambda.Function(this, 'ParentEnrollmentFunction', {
  functionName: `tsa-parent-enrollment-${stage}`,
  runtime: lambda.Runtime.PYTHON_3_11,
  handler: 'handler.lambda_handler',
  code: lambda.Code.fromAsset('../tsa-coach-backend/lambda_parent_enrollment'),
  layers: [sharedLayer], // Use existing shared layer with SQLAlchemy
  timeout: Duration.seconds(30),
  memorySize: 512, // Increased for SQLAlchemy operations
  environment: {
    ENROLLMENTS_TABLE: enrollmentsTable.tableName,
    DOCUMENTS_TABLE: documentsTable.tableName,
    SCHEDULING_TABLE: schedulingTable.tableName,
    PROFILES_TABLE: profilesTable.tableName, // Existing DynamoDB profiles table
    COACH_API_URL: coachApiUrl,
    STAGE: stage,
    DB_SECRET_ARN: dbSecret.secretArn, // PostgreSQL connection for SQLAlchemy
    SQLALCHEMY_DATABASE_URL: `postgresql://\${token[Token[TOKEN.106]]}\:${token[Token[TOKEN.107]]}@\${token[Token[TOKEN.108]]}:5432/tsa_coach` // SQLAlchemy connection string
  }
});

// 2. Parent Dashboard Lambda  
const parentDashboardFunction = new lambda.Function(this, 'ParentDashboardFunction', {
  functionName: `tsa-parent-dashboard-${stage}`,
  runtime: lambda.Runtime.PYTHON_3_11,
  handler: 'handler.lambda_handler', 
  code: lambda.Code.fromAsset('../tsa-coach-backend/lambda_parent_dashboard'),
  layers: [sharedLayer], // Includes SQLAlchemy
  timeout: Duration.seconds(30),
  memorySize: 512, // Increased for SQLAlchemy operations
  environment: {
    PROFILES_TABLE: profilesTable.tableName, // DynamoDB profiles
    ENROLLMENTS_TABLE: enrollmentsTable.tableName,
    MAGIC_LINK_FUNCTION_NAME: magicLinkFunction.functionName,
    STAGE: stage,
    DB_SECRET_ARN: dbSecret.secretArn, // PostgreSQL connection
    SQLALCHEMY_DATABASE_URL: `postgresql://\${token[Token[TOKEN.109]]}\:${token[Token[TOKEN.110]]}@\${token[Token[TOKEN.111]]}:5432/tsa_coach`
  }
});

// Grant access to PostgreSQL secret
dbSecret.grantRead(parentEnrollmentFunction);
dbSecret.grantRead(parentDashboardFunction);

// Grant VPC access for RDS connectivity
parentEnrollmentFunction.connections.allowToDefaultPort(rdsInstance);
parentDashboardFunction.connections.allowToDefaultPort(rdsInstance);
```

### API Gateway Integration (UPDATED Routes - No /parent or /coach prefixes)

```typescript
// Updated API Gateway routes for unified frontend structure

// 1. Unified Magic Link Authentication (role-based)
const auth = api.root.addResource('auth');
auth.addResource('magic-link').addMethod('POST', 
  new apigateway.LambdaIntegration(magicLinkFunction, {
    requestTemplates: {
      'application/json': JSON.stringify({
        httpMethod: '$context.httpMethod',
        body: '$input.body',
        headers: '$input.params().header'
      })
    }
  })
);

// 2. Parent Dashboard Routes (unified under /dashboard with role detection)
const dashboard = api.root.addResource('dashboard');
dashboard.addMethod('GET',
  new apigateway.LambdaIntegration(parentDashboardFunction)
);

// 3. Parent Enrollment Routes (unified under /admissions)
const admissions = api.root.addResource('admissions');
admissions.addResource('validate-invitation').addMethod('POST',
  new apigateway.LambdaIntegration(parentEnrollmentFunction)
);
admissions.addResource('enrollments').addMethod('POST',
  new apigateway.LambdaIntegration(parentEnrollmentFunction)
);

const enrollmentResource = admissions.addResource('enrollments').addResource('{enrollment_id}');
enrollmentResource.addMethod('GET',
  new apigateway.LambdaIntegration(parentEnrollmentFunction)
);
enrollmentResource.addMethod('PUT',
  new apigateway.LambdaIntegration(parentEnrollmentFunction)
);

// 4. Parent Invitation Routes (updated to match frontend calls)
const parentInvitations = api.root.addResource('parent-invitations');
parentInvitations.addMethod('GET',
  new apigateway.LambdaIntegration(parentInvitationFunction)
);
parentInvitations.addMethod('POST',
  new apigateway.LambdaIntegration(parentInvitationFunction)
);
```

## Environment Variables

### Magic Link Handler (Updated for Unified Frontend)
```bash
# Updated environment variables for unified frontend:
FRONTEND_URL=https://app.sportsacademy.school  # Single frontend for both roles
```

### Parent Enrollment Handler (Unified Frontend)
```bash
# DynamoDB Tables
ENROLLMENTS_TABLE=tsa-parent-enrollments-v3-dev
DOCUMENTS_TABLE=tsa-parent-documents-v3-dev  
SCHEDULING_TABLE=tsa-parent-scheduling-v3-dev
PROFILES_TABLE=profiles-v3-dev

# SQLAlchemy Configuration
SQLALCHEMY_DATABASE_URL=postgresql://username:password@host:5432/tsa_coach
DB_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:tsa-db-credentials

# API Integration
COACH_API_URL=https://api.sportsacademy.school/prod
DOCUMENTS_BUCKET=tsa-documents

# Unified Frontend (same for all roles)
FRONTEND_URL=https://app.sportsacademy.school

# Application
STAGE=dev
```

### Parent Dashboard Handler (Unified Frontend)
```bash
# DynamoDB
PROFILES_TABLE=profiles-v3-dev
ENROLLMENTS_TABLE=tsa-parent-enrollments-v3-dev

# SQLAlchemy Configuration
SQLALCHEMY_DATABASE_URL=postgresql://username:password@host:5432/tsa_coach
DB_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:tsa-db-credentials

# Functions
MAGIC_LINK_FUNCTION_NAME=tsa-coach-magic-link-handler

# Unified Frontend (same for all roles)
FRONTEND_URL=https://app.sportsacademy.school

# Application
STAGE=dev
```

## Route Mapping (FIXED)

### Frontend Route Calls (What frontend actually calls):
```javascript
// Dashboard data
fetch(`${API_BASE_URL}/dashboard`)  // Role-based dashboard

// Parent invitations (for coach dashboard)
fetch(`${API_BASE_URL}/parent-invitations`)

// Parent enrollment
fetch(`${API_BASE_URL}/admissions/validate-invitation`)
fetch(`${API_BASE_URL}/admissions/enrollments`)

// Authentication
fetch(`${API_BASE_URL}/auth/magic-link`)
```

### Backend API Routes (What needs to be implemented):
```
POST /auth/magic-link              -> magic_link_handler.py
GET  /dashboard                    -> role-based (parent_dashboard OR coach_dashboard)
GET  /parent-invitations           -> parent_invitations_handler.py
POST /admissions/validate-invitation -> parent_enrollment_handler.py
POST /admissions/enrollments       -> parent_enrollment_handler.py
GET  /admissions/enrollments/{id}  -> parent_enrollment_handler.py
PUT  /admissions/enrollments/{id}  -> parent_enrollment_handler.py
```

## SQLAlchemy Integration Patterns

### 1. Database Connection Management

```python
# shared_utils/sqlalchemy_manager.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
import json
import boto3
import os

class SQLAlchemyManager:
    """SQLAlchemy session manager optimized for AWS Lambda"""
    
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self._initialize_engine()
    
    def _get_database_credentials(self):
        """Get database credentials from AWS Secrets Manager"""
        secret_arn = os.environ.get('DB_SECRET_ARN')
        if not secret_arn:
            raise ValueError("DB_SECRET_ARN environment variable not set")
        
        secrets_client = boto3.client('secretsmanager')
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        return json.loads(response['SecretString'])
    
    def _initialize_engine(self):
        """Initialize SQLAlchemy engine for Lambda environment"""
        try:
            # Get database credentials
            db_credentials = self._get_database_credentials()
            
            # Build connection URL
            database_url = (
                f"postgresql://{db_credentials['username']}:"
                f"{db_credentials['password']}@"
                f"{db_credentials['host']}:"
                f"{db_credentials.get('port', 5432)}/"
                f"{db_credentials['dbname']}"
            )
            
            # Create engine optimized for Lambda
            self.engine = create_engine(
                database_url,
                poolclass=NullPool,  # No connection pooling in Lambda
                echo=False,  # Set to True for debugging
                connect_args={
                    "connect_timeout": 10,
                    "application_name": "tsa_parent_portal"
                }
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
        except Exception as e:
            print(f"Error initializing SQLAlchemy engine: {str(e)}")
            raise
    
    def get_session(self) -> Session:
        """Get a new database session"""
        if not self.SessionLocal:
            raise Exception("SQLAlchemy not initialized")
        return self.SessionLocal()

# Global instance
db_manager = SQLAlchemyManager()
```

## Deployment Steps

### 1. Update Shared Layer with SQLAlchemy

```bash
# Navigate to shared layer directory
cd tsa-coach-backend/shared_layer/python

# Update requirements.txt
echo "sqlalchemy==2.0.23" >> requirements.txt
echo "psycopg2-binary==2.9.9" >> requirements.txt

# Install dependencies locally for testing
pip install -r requirements.txt

# Update shared layer in CDK
cd ../../../tsa-infrastructure
cdk deploy SharedLayerStack --context stage=dev
```

### 2. Deploy Lambda Functions

```bash
# Navigate to infrastructure directory
cd tsa-infrastructure

# Deploy updated authentication stack (includes parent support)
cdk deploy tsa-infra-auth-dev --context stage=dev

# Deploy parent enrollment and dashboard functions with SQLAlchemy
cdk deploy tsa-parent-backend-dev --context stage=dev
```

### 3. Test Unified Frontend Integration

```bash
# Test unified magic link authentication
curl -X POST https://api.sportsacademy.school/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "user_role": "parent",
    "invitation_token": "invitation-token-here"
  }'

# Test role-based dashboard (same endpoint, different data based on role)  
curl -X GET https://api.sportsacademy.school/dashboard \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Test enrollment initialization
curl -X POST https://api.sportsacademy.school/admissions/validate-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "invitation_token": "invitation-token",
    "parent_email": "parent@example.com"
  }'
```

## Integration Points

### 1. Unified Frontend Integration
- **Same URL**: Both coaches and parents use same frontend URL
- **Role Detection**: Frontend detects user role from authentication token
- **Role-Based Routing**: Same components render different content based on role
- **API Calls**: Same API endpoints with role-based responses

### 2. Parent Profile System (OneRoster Compliant via SQLAlchemy)
- **Extends**: Existing profiles table with `role_type: "parent"`
- **Integrates**: OneRoster compliant user records in PostgreSQL via SQLAlchemy ORM
- **Links**: Parent profiles connect to enrollment records

### 3. Student Data Management (EdFi Compliant via SQLAlchemy)
- **Creates**: EdFi-compliant student records in PostgreSQL via SQLAlchemy ORM
- **Manages**: Student-school associations with proper descriptors
- **Maintains**: Academic data integrity and compliance

### 4. Shared Infrastructure
- **Database**: Uses existing PostgreSQL (via SQLAlchemy) and DynamoDB setup
- **Authentication**: Extends existing Cognito user pool
- **Storage**: Uses existing S3 bucket for documents
- **Monitoring**: Inherits existing CloudWatch logging

## Security Considerations

### 1. CORS Configuration (Updated for Unified Frontend)
```typescript
// Environment-specific CORS origins
const corsOrigins = {
  dev: [
    "http://localhost:3000"  // Single frontend for both roles
  ],
  staging: [
    "https://staging-app.sportsacademy.school"  // Single frontend for both roles
  ],
  prod: [
    "https://app.sportsacademy.school"  // Single frontend for both roles
  ]
};
```

### 2. Authentication
- Parents and coaches use same Cognito user pool
- Role-based access control via custom attributes
- Magic link security maintained (15-minute expiration, single use)

### 3. Data Access & Compliance
- Parents can only access their own enrollment data
- EdFi data access follows FERPA requirements
- OneRoster data follows proper role-based access
- Document access secured with pre-signed URLs

### 4. SQLAlchemy Security Best Practices
- **Connection Pooling**: Disabled in Lambda (NullPool) to prevent connection leaks
- **Session Management**: Proper session closing in finally blocks
- **SQL Injection Prevention**: Using ORM methods and parameterized queries
- **Connection Timeouts**: 10-second timeout to prevent hanging connections

## Testing Checklist

### Authentication Flow
- [ ] Parent can request magic link via unified `/auth/magic-link` endpoint
- [ ] Coach can request magic link via unified `/auth/magic-link` endpoint
- [ ] Parent magic link redirects to unified frontend with role detection
- [ ] Coach magic link redirects to unified frontend with role detection
- [ ] Magic link creates OneRoster-compliant parent user record via SQLAlchemy
- [ ] Parent authentication returns proper role and permissions

### Enrollment Flow (EdFi Compliance via SQLAlchemy)
- [ ] Enrollment initializes from valid invitation via `/admissions/validate-invitation`
- [ ] Student information step creates EdFi-compliant student record via SQLAlchemy ORM
- [ ] Student-school association created with proper descriptors
- [ ] Each of 6 steps can be completed via `/admissions/enrollments/{id}`
- [ ] Progress calculation works correctly
- [ ] Document upload functions properly
- [ ] Scheduling creates records correctly

### Dashboard & Data Compliance (SQLAlchemy Integration)
- [ ] Role-based dashboard loads via unified `/dashboard` endpoint
- [ ] Parent dashboard loads with correct OneRoster data via SQLAlchemy queries
- [ ] Coach dashboard loads with coach-specific data
- [ ] Profile updates save to both DynamoDB and PostgreSQL
- [ ] Enrollment list shows all parent's enrollments
- [ ] EdFi student data properly linked to enrollment records
- [ ] Recent activity displays properly
- [ ] SQLAlchemy session management works correctly (no connection leaks)

### Integration
- [ ] Coach invitation validation works
- [ ] Parent invitation API accessible via `/parent-invitations`
- [ ] Database queries perform adequately with new indexes
- [ ] All API endpoints return proper CORS headers for unified frontend
- [ ] SQLAlchemy ORM operations complete within Lambda timeout limits

---

**Created**: December 2024  
**Last Updated**: December 2024  
**Version**: 3.0  
**Status**: ✅ **COMPLETED - Successfully Deployed with Restructured Architecture**
**Frontend Structure**: Unified app.sportsacademy.school with role-based routing (no /parent or /coach routes)
**Database**: PostgreSQL via SQLAlchemy 2.0 ORM + DynamoDB operational data

## 🎉 Deployment Complete!

### ✅ Successfully Deployed Infrastructure:

**Coach Portal Service** (`tsa-coach-backend-dev`):
- **API Gateway**: `https://deibk5wgx1.execute-api.us-east-2.amazonaws.com/prod/`
- **Tables Created**: `profiles-v3-dev`, `parent-invitations-v3-dev`, `onboarding-sessions-v3-dev`
- **Functionality**: Coach onboarding, parent invitation management, coach dashboard

**Parent Portal Service** (`tsa-parent-backend-dev`):
- **API Gateway**: `https://4ojhuzmaie.execute-api.us-east-2.amazonaws.com/prod/`
- **Tables Created**: `tsa-parent-enrollments-v3-dev`, `tsa-parent-documents-v3-dev`, `tsa-parent-scheduling-v3-dev`
- **Functionality**: Parent enrollment, document management, unified dashboard, communication

### ✅ Architecture Benefits Achieved:

1. **Clean Separation**: Each portal owns its specific tables and functionality
2. **Unified Frontend**: Both portals support the same frontend URL with role-based routing
3. **Scalable**: Independent scaling and development for each portal
4. **Compliant**: EdFi/OneRoster ready with SQLAlchemy 2.0 support

### 📋 Next Steps:

1. **Frontend Integration**: Update frontend API calls to use the correct portal endpoints
2. **Testing**: Verify all enrollment workflows and dashboard functionality
3. **Documentation**: Update API documentation for each portal
4. **Monitoring**: Set up CloudWatch dashboards for each portal

---

## 🛠️ Implementation Summary

The parent portal has been successfully deployed following the **Restructured Architecture Guide** with complete separation between coach and parent functionality. All infrastructure is in place and ready for frontend integration.