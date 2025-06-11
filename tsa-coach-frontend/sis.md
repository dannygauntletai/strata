# Student Information System (SIS) Product Requirements Document

## Executive Summary

### Project Overview
Alpha Schools is evaluating commercial Student Information Systems to replace the current internally-built solution. The goal is to deliver a world-class K-12 experience for parents and students throughout their entire journey with the school.

### Business Objective
Select and implement a commercial SIS that provides best-in-class family experience, or definitively determine why a commercial solution cannot meet our needs and justify continuing with the in-house system.

## Business Context

### Current State Challenges
- Internally built SIS provides minimal functionality
- No admissions portal
- No parent portal
- Basic online forms support only
- Requires custom code for all features
- Continuous bug fix cycles
- Family experience is far from world-class

### Target State
A comprehensive SIS solution that provides:
- Built-in admissions and parent portals
- Application processing workflows
- Re-enrollment workflows
- Online forms and file uploads
- Tuition agreements
- Payment processing for application fees and deposits

## Functional Requirements

### 1. Core K-12 Functionality (Non-Negotiable)
- **Rostering**: Student enrollment and class assignments
- **Attendance Tracking**: Daily and period-based attendance
- **Gradebook**: Grade entry, calculation, and management
- **Transcripts**: Official transcript generation and management
- **Schedule Management**: Master scheduling and student schedules
- **Report Cards**: Configurable report card generation

### 2. Portal Requirements

#### 2.1 Admissions Portal (Required)
- **User Experience**
  - Modern, intuitive design
  - Mobile-responsive interface
  - Excitement-generating interface that keeps families engaged
- **Features**
  - Online application submission
  - Document upload capabilities
  - Application status tracking
  - Application fee payment processing
  - Deposit payment processing
  - Communication tools for applicant families
- **AI Integration**
  - Ability to integrate concierge-level AI support
  - API access for custom AI agent integration

#### 2.2 Parent Portal (Required)
- **User Experience**
  - Modern design consistent with brand
  - Intuitive navigation
  - Full mobile compatibility
- **Features**
  - Student information access
  - Grade viewing
  - Attendance tracking
  - Communication with teachers/staff
  - Online forms submission
  - Payment processing
  - Re-enrollment workflows
  - Document management

#### 2.3 Student Portal (Optional)
- Not required as covered by existing education tech stack
- Must allow disabling or customization if included

### 3. CRM and Marketing Integration

#### 3.1 Internal CRM Requirements
- Applicant management (SQL stage and beyond)
- Application workflow management
- Communication tracking
- Pipeline management for admissions

#### 3.2 HubSpot Integration (Critical)
- Bi-directional data sync capabilities
- Lead handoff from HubSpot to SIS
- Support for dual-CRM approach (HubSpot for marketing, SIS for operations)
- API access for custom integration development

### 4. Multi-Entity Architecture Support
System must support or be configurable for:
- **Multiple Sites**: Different physical locations
- **Multiple Brands**: Different school brands under one organization
- **Multiple Delivery Models**:
  - On-site instruction
  - Online instruction
  - Hybrid models
- **Multiple Programs**:
  - Pre-K through 12th grade
  - Tutoring programs
  - Summer camps
  - After-school programs

## Non-Functional Requirements

### 1. Scalability
- Proven track record of supporting growing organizations
- Ability to handle multiple schools/sites
- Performance at scale (specify minimum student counts)

### 2. User Experience Standards
- Modern, intuitive interface design
- Mobile-first approach for parent-facing features
- Accessibility compliance (WCAG 2.1 AA minimum)
- Page load times under 3 seconds

### 3. Reliability
- 99.9% uptime SLA
- Disaster recovery capabilities
- Data backup and recovery procedures

## Technical Requirements

### 1. API and Integration (Critical)
- **Comprehensive REST API**
  - Full CRUD operations on all major entities
  - Webhook support for real-time events
  - Rate limiting appropriate for enterprise use
- **Data Model Access**
  - Direct database access or comprehensive data export
  - Real-time or near-real-time data availability
  - Documented data model

### 2. Security
- SOC 2 Type II certification
- FERPA compliance
- Role-based access control
- Multi-factor authentication support
- Data encryption at rest and in transit

### 3. Extensibility
- Custom field support
- Workflow customization
- Custom reporting capabilities
- Ability to build external automations

## Integration Requirements

### Required Integrations
1. **HubSpot**: Marketing automation and upper funnel management
2. **Payment Processing**: Application fees and deposits
3. **Education Apps**: Internal education technology stack
4. **AI Services**: Custom AI agent integration capability

### Integration Methods
- REST API preferred
- Webhook support for event-driven integrations
- Batch data export/import capabilities
- Real-time sync where appropriate

## Vendor Evaluation Criteria

### 1. Market Focus
- **Preferred**: Vendors specializing in private schools
- **Consideration**: Charter school support (if required for Valenta)
- **Avoid**: Public school-focused systems with limited private school features

### 2. AI Readmap
- Current AI capabilities (if any)
- Documented AI roadmap
- Openness to AI integration
- API flexibility for custom AI development

### 3. Implementation and Support
- Implementation timeline
- Training resources
- Ongoing support model
- User community

## Success Criteria

### Must Have
1. All core K-12 functionality
2. Admissions Portal with excellent UX
3. Parent Portal with excellent UX
4. HubSpot integration capability
5. Open API architecture
6. Multi-site/multi-brand support
7. Proven scalability

### Should Have
1. Native AI capabilities
2. Advanced reporting tools
3. Mobile apps for parents
4. Built-in communication tools

### Could Have
1. Student portal (if easily disabled)
2. Advanced analytics
3. Learning management system integration

## Constraints and Assumptions

### Constraints
- Must be more cost-effective than continued internal development
- Cannot be a closed system regardless of features
- Must support private school operations primarily

### Assumptions
- Perfect AI-native solution unlikely to exist currently
- Dual-CRM approach will be necessary
- Some customization/configuration will be required
- Student-facing features will continue to use internal tech stack

## Risk Mitigation

### Technical Risks
- **Risk**: Vendor lock-in
- **Mitigation**: Require open API and data export capabilities

### Business Risks
- **Risk**: Poor family experience
- **Mitigation**: Extensive UX evaluation during vendor selection

### Integration Risks
- **Risk**: HubSpot integration complexity
- **Mitigation**: Evaluate integration capabilities early in selection process

## Decision Framework

If evaluation determines no commercial SIS meets requirements, document:
1. Specific gaps in each evaluated system
2. Cost-benefit analysis of building vs. buying
3. Roadmap for internal system development to achieve parity
4. Resource requirements for continued internal development

## Data Model Requirements

### Ed-Fi Compliance

The SIS must support Ed-Fi Data Standard compliance for interoperability with other education systems. Required Ed-Fi domains and entities include:

#### Core Domains

**1. Student Information**
- Student (UniqueId, FirstName, LastName, BirthDate, etc.)
- StudentSchoolAssociation (EntryDate, ExitWithdrawDate, GradeLevel)
- StudentEducationOrganizationAssociation
- StudentContactAssociation
- StudentParentAssociation

**2. Enrollment and Attendance**
- StudentSectionAssociation
- StudentAttendanceEvent
- CalendarDate
- Session
- GradingPeriod
- Calendar

**3. Academic Records**
- Grade
- StudentAcademicRecord
- CourseTranscript
- ReportCard
- StudentGradebookEntry
- Diploma

**4. Education Organization**
- School
- LocalEducationAgency
- Course
- CourseOffering
- Section
- ClassPeriod
- Location

**5. Staff Information**
- Staff
- StaffSchoolAssociation
- StaffSectionAssociation
- Teacher
- Principal

**6. Assessment (Optional)**
- Assessment
- StudentAssessment
- AssessmentItem
- StudentAssessmentItem

### OneRoster Compliance

The SIS must support OneRoster v1.2 specification for rostering data exchange:

#### Core OneRoster Resources

**1. Organizations**
- org (sourcedId, name, type, identifier, parent)
- Types: school, district, department

**2. Academic Sessions**
- academicSession (sourcedId, title, startDate, endDate, type, parent, year)
- Types: term, gradingPeriod, semester, schoolYear

**3. Courses and Classes**
- course (sourcedId, title, courseCode, grades, subjects, org)
- class (sourcedId, title, classCode, classType, location, grades, subjects, course, school, terms)

**4. Users**
- user (sourcedId, enabledUser, orgSourcedIds, role, username, givenName, familyName, email, phone, grades)
- Roles: student, teacher, parent, guardian, administrator, aide

**5. Enrollments**
- enrollment (sourcedId, user, class, school, role, primary, beginDate, endDate)

**6. Demographics (Extended)**
- demographics (sourcedId, birthDate, sex, americanIndianOrAlaskaNative, asian, blackOrAfricanAmerican, nativeHawaiianOrOtherPacificIslander, white, hispanicOrLatinoEthnicity)

### Data Model Architecture Requirements

**1. Multi-Tenancy Support**
- Tenant isolation at database level
- Shared schema with tenant identifiers
- Support for multiple schools/organizations within single tenant

**2. Extensibility**
- Custom fields on all major entities
- Ability to add custom entities
- Metadata-driven field definitions
- Support for complex data types (JSON, arrays)

**3. Audit and Compliance**
- Full audit trail on all data changes
- FERPA-compliant data access logging
- Data retention policies by entity type
- Soft delete capabilities

**4. Relationships and Hierarchies**
- Support for complex organizational hierarchies
- Multiple relationship types between entities
- Temporal relationships (date-effective associations)
- Many-to-many relationships with attributes

**5. Data Exchange Formats**
- REST API with JSON payloads
- CSV bulk import/export
- XML support for Ed-Fi
- Real-time event streaming

### API Data Model Requirements

**1. Standard Endpoints**
- All Ed-Fi entities exposed via REST endpoints
- OneRoster compliant endpoints
- Bulk operations support
- Filtering, sorting, and pagination

**2. Custom Extensions**
- Ability to extend standard entities
- Custom entity creation
- Webhook configuration for data changes
- GraphQL support (optional)

**3. Data Validation**
- Schema validation on all inputs
- Business rule validation
- Referential integrity enforcement
- Custom validation rules
