# Archived Infrastructure Services

This directory contains infrastructure services that were moved out of the main TSA coaching platform to create a minimal MVP focused solely on coach management. These services can be restored later when the platform scales.

## Current Active Service

Only the **Coach Portal Service** remains active in the main infrastructure for the MVP.

## Archived Services

### 1. Lead Management Service (`services/lead_management_service.py`)
**Purpose**: Lead collection, attribution, scoring, analytics

**Features**:
- Lead capture from multiple sources
- Attribution tracking across touchpoints
- Lead scoring algorithms
- Lead analytics and reporting
- Integration with marketing systems

**Why Archived**: 
- MVP focuses purely on coach management
- Lead generation can be handled manually initially
- Can be restored when customer acquisition becomes priority

### 2. Admissions Portal Service (`services/admissions_portal_service.py`)
**Purpose**: Enrollment processes, registration workflows, communications

**Features**:
- Registration form management
- Enrollment workflow automation
- Email automation and follow-ups
- Document processing and storage
- Parent communication systems

**Why Archived**: 
- Complex enrollment workflows not needed for coach-focused MVP
- Simple manual enrollment process sufficient initially
- Can be restored when scaling student enrollment

### 3. Analytics Service (`services/analytics_service.py`)
**Purpose**: Data ingestion, processing, reporting across all services

**Features**:
- Real-time data ingestion with Kinesis
- ETL pipelines and data processing
- Cross-service analytics and reporting
- Data lake with S3, Glue, and Athena
- Dashboard APIs for business intelligence

**Why Archived**: 
- Complex analytics overkill for coach-only MVP
- Simple coach portal metrics sufficient initially
- Can be restored when advanced reporting becomes critical

### 4. Communication Service (`services/communication_service.py`)
**Purpose**: SMS, email, push notifications, messaging

**Features**:
- Multi-channel communication (SMS, email, push)
- Template management and personalization
- Message queuing and delivery tracking
- Integration with external providers
- Automated notification workflows

**Why Archived**: 
- Coach communication can be handled manually initially
- Email/SMS not critical for coach portal MVP
- Can be restored when automated communication becomes necessary

### 5. Payment Service (`services/payment_service.py`)
**Purpose**: Stripe integration, billing, subscriptions, invoicing

**Features**:
- Stripe payment processing
- Subscription and recurring billing
- Invoice generation and management
- Payment plan handling
- Financial reporting and analytics

**Why Archived**: 
- Payment processing not needed for coach management MVP
- Coach compensation can be handled externally
- Can be restored when monetization becomes priority

### 6. Document Management Service (`services/document_management_service.py`)
**Purpose**: Comprehensive document storage, e-signature workflows, and compliance tracking

**Features**:
- Document storage with S3
- E-signature workflows
- Document versioning and audit trails
- Compliance reporting
- File categorization and search

**Why Archived**: 
- Complex document workflows not needed for coach portal
- Simple file sharing sufficient for coach resources
- Can be restored when document compliance becomes critical

### 7. Academic Management Service (`services/academic_management_service.py`)
**Purpose**: Full academic information system with grades, attendance, and transcripts

**Features**:
- Student information management
- Grade book functionality
- Attendance tracking
- Transcript generation
- Academic calendar management
- Course catalog

**Why Archived**: 
- Comprehensive academic system more suited for formal education
- Coach portal focuses on timeline/progress tracking
- Can be restored if formal academic tracking becomes necessary

### 8. Advanced Monitoring Service (`services/advanced_monitoring_service.py`)
**Purpose**: Business intelligence, custom metrics, and advanced alerting

**Features**:
- Custom business metrics
- Advanced alerting systems
- Business intelligence dashboards
- Performance monitoring
- Custom analytics workflows

**Why Archived**: 
- Advanced BI overkill for simple coach portal
- Basic CloudWatch monitoring sufficient for MVP
- Can be restored when business intelligence becomes critical

## Restoring Archived Services

To restore any of these services:

1. **Move the service file back**:
   ```bash
   mv archived-infrastructure/services/[service_name].py tsa-infrastructure/lib/services/
   ```

2. **Update app.py**:
   - Add the import statement
   - Add the stack definition
   - Add dependencies
   - Update frontend endpoints
   - Add output configuration

3. **Update frontend_stack.py** (if needed):
   - Add API endpoint to the configuration

4. **Deploy**:
   ```bash
   cd tsa-infrastructure
   cdk deploy
   ```

## Current MVP Focus

The infrastructure now provides a **minimal, focused coach management platform**:

- **Coach Portal Service**: Essential timeline management, events, onboarding
- **Shared Infrastructure**: Networking, security, PostgreSQL database
- **Frontend**: CloudFront distribution for coach portal only

This simplified architecture:
- ✅ Reduces deployment complexity
- ✅ Minimizes AWS costs
- ✅ Focuses development effort on core coach functionality
- ✅ Provides clear foundation for future scaling

## Restoration Priority

When scaling the platform, consider restoring services in this order:

1. **Communication Service** - Enable automated coach notifications
2. **Analytics Service** - Add reporting and insights
3. **Lead Management Service** - Begin customer acquisition
4. **Admissions Portal Service** - Scale student enrollment
5. **Payment Service** - Add monetization capabilities
6. **Document Management Service** - Add compliance features
7. **Academic Management Service** - Add formal academic tracking
8. **Advanced Monitoring Service** - Add advanced business intelligence

## Notes

- All archived services were fully functional and tested
- The main app.py has been completely simplified to only include coach portal
- Shared infrastructure (networking, security, data) remains unchanged
- Services can be restored individually as needed
- Database schemas for archived services remain in place for easy restoration 