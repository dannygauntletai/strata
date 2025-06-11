# TSA Unified Platform Backend Service

## Overview

The **TSA Unified Platform** provides comprehensive management for the complete Texas Sports Academy ecosystem, supporting both coaches and parents through their respective journeys within the TSA community.

## Platform Scope

### **TSA Unified Platform Responsibilities**

#### Coach Portal Features
- **Timeline Management**: Flexible, customizable timelines for microschool launch
- **Event Management**: Coach-created events and activities (not registration events)
- **Coach Onboarding**: Workflow automation for new coach recruitment
- **Quiz & Assessment Systems**: Coach training and evaluation
- **Invitation Management**: Coach recruitment and team building
- **Coach-Specific Operations**: Profile management, performance tracking

#### **🆕 Parent Portal Features**
- **Magic Link Authentication**: Secure, passwordless authentication for parents
- **Multi-Step Enrollment**: Complete 6-step enrollment process from coach invitations
- **Document Management**: Secure upload and verification of required documents
- **Scheduling System**: Consultation and shadow day appointment booking
- **Progress Tracking**: Real-time enrollment status and progress monitoring
- **Parent Dashboard**: Comprehensive view of all children's enrollments

### **What This Service Does NOT Handle**
- ❌ **Lead Management**: Moved to separate `tsa-lead-backend` service
- ❌ **Cross-Service Analytics**: Handled by `tsa-analytics-backend` service

## Architecture

```
┌─────────────────────────────────────────┐
│         TSA UNIFIED PLATFORM             │
├─────────────────┬───────────────────────┤
│   PostgreSQL    │       DynamoDB        │
│   (Users/Orgs)  │   (Timelines/Events)  │
│   EdFi/OneRoster│   (Enrollments/Docs)  │
└─────────────────┴───────────────────────┘
                   │
            ┌──────▼──────┐
            │    Cognito  │
            │ (Coaches &  │
            │  Parents)   │
            └─────────────┘
```

### Data Strategy
- **PostgreSQL (RDS)**: Users, organizations, coach/parent profiles (OneRoster/Ed-Fi compliance)
- **DynamoDB**: Dynamic timelines, events, enrollments, documents (high-speed, flexible)
- **Cognito**: Unified authentication for both coaches and parents

## Directory Structure

```
tsa-coach-backend/
├── shared_layer/              # Shared database client and models
│   ├── python/
│   │   ├── database_client.py # Unified PostgreSQL + DynamoDB client
│   │   ├── event_models.py    # Pydantic models for events/timelines
│   │   └── requirements.txt   # Shared dependencies
├── shared_utils/              # 🆕 Enhanced shared utilities
│   ├── shared_utils.py        # Extended with parent/enrollment functions
│   ├── database_models.py     # EdFi/OneRoster compliant models
│   ├── dynamodb_models.py     # DynamoDB data models
│   └── postgresql_models.py   # PostgreSQL schema models
├── lambda_passwordless/       # 🔄 Enhanced authentication
│   ├── magic_link_handler.py  # Now supports both coaches & parents
│   └── verify_token_handler.py # Role-based authentication
├── lambda_parent_enrollment/  # 🆕 Parent enrollment system
│   ├── handler.py             # Multi-step enrollment workflow
│   └── requirements.txt
├── lambda_parent_dashboard/   # 🆕 Parent dashboard & profile
│   ├── handler.py             # Parent-specific dashboard operations
│   └── requirements.txt
├── lambda_timeline/           # Timeline management and customization
├── lambda_events/             # Coach event creation and management
├── lambda_onboard/            # Coach onboarding workflow automation
├── lambda_quizzes/            # Quiz and assessment systems
├── lambda_invitations/        # Coach recruitment invitations
├── lambda_admissions_validate/ # 🔄 Enhanced admissions validation
└── README.md                  # This file
```

## Lambda Functions

### **Enhanced Authentication System**

#### **Magic Link Handler** (`lambda_passwordless/magic_link_handler.py`) 🔄
- **Purpose**: Passwordless authentication for coaches and parents
- **Enhanced Features**:
  - Role-based email templates (coach vs parent)
  - Parent invitation token integration
  - Environment-specific frontend URLs
  - Enhanced security with invitation validation

#### **Token Verification** (`lambda_passwordless/verify_token_handler.py`) 🔄
- **Purpose**: Token validation and Cognito integration
- **Enhanced Features**:
  - Role-based profile creation (coach vs parent)
  - Automatic parent profile initialization
  - Integration with coach invitation API
  - Support for returning users

### **🆕 Parent Portal System**

#### **Parent Enrollment** (`lambda_parent_enrollment/`) 🆕
- **Purpose**: Complete multi-step enrollment workflow for parents
- **Key Features**:
  - Enrollment initialization from coach invitations
  - 6-step process: Program Info → Consultation → Shadow Day → Student Info → Documents → Payment
  - Document upload with S3 integration
  - Scheduling system for consultations and shadow days
  - Progress tracking and analytics

#### **Parent Dashboard** (`lambda_parent_dashboard/`) 🆕
- **Purpose**: Parent-specific dashboard and profile management
- **Key Features**:
  - Unified dashboard showing all child enrollments
  - Profile management and updates
  - Recent activity tracking
  - Pending tasks and next steps
  - Communication preferences

### **Coach Portal Features** (Existing)

#### **Timeline Management** (`lambda_timeline/`)
- **Purpose**: Flexible timeline system for microschool launch
- **Key Features**:
  - Customizable timeline templates
  - Dynamic step addition/modification
  - Progress tracking and analytics
  - Dependency management
  - Change history and rollback

#### **Event Management** (`lambda_events/`)
- **Purpose**: Coach-created events and activities
- **Key Features**:
  - Event creation and scheduling
  - Registration management (for coach events)
  - Calendar integration
  - Event analytics and reporting

#### **Coach Onboarding** (`lambda_onboard/`)
- **Purpose**: Automated coach recruitment and training workflows
- **Key Features**:
  - Onboarding wizard sessions
  - Progress tracking
  - Document collection
  - Background check integration

#### **Quiz & Assessments** (`lambda_quizzes/`)
- **Purpose**: Coach training and evaluation systems
- **Key Features**:
  - Quiz creation and management
  - Assessment scoring
  - Progress tracking
  - Certification workflows

#### **Invitation Management** (`lambda_invitations/`)
- **Purpose**: Coach recruitment and team building
- **Key Features**:
  - Invitation creation and tracking
  - Referral management
  - Team building workflows
  - Coach network expansion

#### **Admissions Validation** (`lambda_admissions_validate/`) 🔄
- **Purpose**: Enhanced invitation validation and enrollment initialization
- **Enhanced Features**:
  - Integration with parent enrollment system
  - Security-focused input validation
  - Production-safe error handling
  - Comprehensive logging and monitoring

## 🆕 Shared Infrastructure Enhancements

### **Enhanced Database Client** (`shared_layer/python/database_client.py`)
Unified client that handles both PostgreSQL and DynamoDB operations with enrollment support:

```python
from shared_layer.python.database_client import with_database, DatabaseError

@with_database
def lambda_handler(event, context, db):
    # PostgreSQL operations (EdFi/OneRoster compliant)
    user = db.get_user(user_id)
    organization = db.get_organization(org_id)
    
    # DynamoDB operations (timelines, events, enrollments)
    timeline_data = db.get_timeline(timeline_id)
    enrollment_data = db.get_enrollment(enrollment_id)
    
    return {'statusCode': 200}
```

### **🆕 Extended Shared Utilities** (`shared_utils/shared_utils.py`)
Enhanced utilities supporting both coach and parent operations:

```python
from shared_utils import (
    create_response,                    # CORS-enabled API responses
    create_enrollment_response,         # Parent-specific responses
    validate_enrollment_step,           # Multi-step validation
    generate_enrollment_id,             # Unique ID generation
    process_document_upload,            # Secure file handling
    calculate_enrollment_progress       # Progress tracking
)
```

## API Endpoints

### **🆕 Parent Portal APIs**
```
# Authentication
POST   /parent/auth/magic-link                     # Parent magic link request

# Enrollment Management  
POST   /enrollment/initialize                      # Initialize from invitation
POST   /enrollment/step                            # Complete enrollment step
GET    /enrollment/status/{enrollment_id}          # Get enrollment status
POST   /enrollment/documents                       # Upload documents
POST   /enrollment/schedule                        # Schedule appointments

# Parent Dashboard
GET    /parent/dashboard                           # Parent dashboard data
GET    /parent/profile                             # Get parent profile
PUT    /parent/profile                             # Update parent profile
GET    /parent/enrollments                         # Get all enrollments
```

### **Enhanced Authentication APIs** 🔄
```
# Magic Link (now supports coaches & parents)
POST   /auth/magic-link                            # Request magic link
POST   /auth/verify-token                          # Verify magic link token

# Admissions (enhanced validation)
POST   /admissions/validate-invitation             # Enhanced invitation validation
```

### **Coach Portal APIs** (Existing)
```
GET    /coach-portal/timelines/{coach_id}          # Get coach timelines
POST   /coach-portal/timelines                     # Create timeline
PUT    /coach-portal/timelines/{timeline_id}/steps # Update timeline steps

GET    /coach-portal/events/{org_id}               # Get organization events
POST   /coach-portal/events                        # Create event
PUT    /coach-portal/events/{event_id}             # Update event

POST   /coach-portal/onboard/start                 # Start onboarding
GET    /coach-portal/onboard/status/{session_id}   # Get onboarding status

GET    /coach-portal/quizzes/{coach_id}            # Get coach quizzes
POST   /coach-portal/quizzes/{quiz_id}/submit      # Submit quiz answers

POST   /coach-portal/invitations                   # Send invitation
GET    /coach-portal/invitations/{coach_id}        # Get sent invitations
```

## 🆕 Parent Enrollment Workflow

### The Complete Parent Journey

```
1. Coach Invitation → 2. Magic Link Auth → 3. Enrollment Process → 4. Parent Dashboard
     │                     │                    │                      │
     ▼                     ▼                    ▼                      ▼
Coach sends              Parent receives       6-step enrollment      Ongoing access
invitation via           magic link email      workflow completion    to child's status
existing portal          (role-specific)       with progress tracking and communications
```

### 6-Step Enrollment Process

1. **Program Information** - Review TSA programs and confirm interest
2. **Phone Consultation** - Schedule and complete consultation with coach
3. **Shadow Day** - Schedule and attend trial day at TSA
4. **Student Information** - Complete detailed student enrollment forms (EdFi compliant)
5. **Document Submission** - Upload required documents with verification
6. **Payment Processing** - Complete enrollment deposit and setup payment plan

## Integration Architecture

### **Cross-Service Integration**
The TSA Unified Platform integrates coach and parent workflows:

```python
# Example: Coach invitation triggers parent enrollment
def handle_coach_invitation(invitation_data):
    # 1. Existing coach invitation API creates invitation
    invitation = create_invitation(invitation_data)
    
    # 2. Send magic link to parent with invitation token
    send_parent_magic_link(
        email=invitation_data['parent_email'],
        invitation_token=invitation['token']
    )
    
    # 3. Parent authenticates and starts enrollment
    # 4. Coach dashboard shows enrollment progress
```

### **Database Synchronization**
- **EdFi Compliance**: Student academic records in PostgreSQL
- **OneRoster Compliance**: User and organization data in PostgreSQL  
- **Operational Data**: Enrollments, timelines, events in DynamoDB
- **Profile Sync**: Automatic synchronization between databases

## Development

### **Prerequisites**
- Python 3.9+
- AWS CLI configured
- Access to shared RDS PostgreSQL instance
- DynamoDB tables: `tsa-coach-*` and `tsa-coach-enrollments-*`
- Cognito User Pool configured for both coaches and parents

### **Local Development**
```bash
# Install dependencies
pip install -r shared_layer/python/requirements.txt
pip install -r shared_utils/requirements.txt

# Set environment variables
export RDS_HOST=your-rds-endpoint
export RDS_DATABASE=tsa_coach
export RDS_USERNAME=your-username
export RDS_PASSWORD=your-password
export DYNAMODB_TABLE_PREFIX=tsa-coach
export PARENT_FRONTEND_URL=http://localhost:3000/parent

# Run tests
python -m pytest tests/
```

### **Deployment**
The TSA Unified Platform is deployed as part of the overall TSA infrastructure:

```bash
# Deploy from infrastructure directory
cd ../tsa-infrastructure

# Deploy authentication stack (includes parent support)
cdk deploy PasswordlessAuthStack --context stage=dev

# Deploy unified platform backend
cdk deploy CoachPortalServiceStack --context stage=dev
```

For detailed deployment instructions, see [PARENT_PORTAL_DEPLOYMENT.md](./PARENT_PORTAL_DEPLOYMENT.md).

## Monitoring

### **Key Metrics**

#### Coach Portal Metrics
- Timeline completion rates
- Event creation/registration volumes
- Onboarding progress and bottlenecks
- Quiz completion and success rates
- Invitation response rates

#### **🆕 Parent Portal Metrics**
- Parent authentication success rates
- Enrollment initialization from invitations
- Step completion rates by enrollment phase
- Document upload success rates
- Consultation and shadow day scheduling rates
- Overall invitation → enrollment conversion

### **Health Checks**
```bash
# Check service health
curl https://{api-gateway-url}/coach-portal/health
curl https://{api-gateway-url}/parent/dashboard  # With auth headers

# Monitor logs
aws logs tail /aws/lambda/tsa-coach-parent-enrollment-dev --follow
aws logs tail /aws/lambda/tsa-coach-parent-dashboard-dev --follow
aws logs tail /aws/lambda/coach-portal-timeline-handler --follow
```

## Security

- **Unified Authentication**: Single Cognito User Pool for coaches and parents
- **Role-Based Access**: Coaches and parents can only access their respective data
- **Magic Link Security**: 15-minute expiration, single-use tokens
- **Data Encryption**: All data encrypted in transit and at rest
- **Input Validation**: Enhanced Pydantic models with security checks
- **CORS Configuration**: Environment-specific origin restrictions
- **Document Security**: Signed URLs with expiration for document access

## Implementation Status

### ✅ Phase 1 Complete (Months 1-2)
- [x] Enhanced magic link authentication for coaches and parents
- [x] Parent enrollment system with 6-step workflow
- [x] Document upload and management system
- [x] Parent dashboard and profile management
- [x] Integration with existing coach invitation system
- [x] EdFi/OneRoster compliant data models

### 🚧 Phase 2 Planned (Months 3-4)
- [ ] Payment processing integration (Stripe)
- [ ] Enhanced scheduling with calendar integration
- [ ] Real-time notifications and communication
- [ ] Coach dashboard enrollment status display
- [ ] Advanced analytics and reporting

### 🔮 Phase 3 Future (Months 5-6)
- [ ] Mobile app support
- [ ] AI-powered enrollment optimization
- [ ] Multi-language support
- [ ] Advanced workflow automation

## Future Enhancements

1. **🆕 Unified Analytics**: Cross-coach and parent journey analytics
2. **🆕 Real-Time Communication**: In-app messaging between coaches and parents
3. **🆕 Payment Integration**: Comprehensive payment processing and financial aid
4. **🆕 Mobile App**: Native mobile app for both coaches and parents
5. **AI-Powered Recommendations**: Smart suggestions for both coach timelines and parent enrollment

---

**The TSA Unified Platform provides comprehensive support for both coaches and parents, creating a seamless experience from coach recruitment through student enrollment while maintaining clear role-based access and data security.** 