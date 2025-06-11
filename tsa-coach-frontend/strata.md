# Microschool Management Platform Product Requirements Document

## Executive Summary

### Project Overview
Develop a comprehensive microschool management platform that enables coaches to launch and operate high-quality microschools, with an initial focus on Texas Sports Academy (TSA) model. The platform will automate the entire journey from coach recruitment through student enrollment and ongoing operations.

### Business Objective
Create a scalable platform that can support the launch and management of 1,200+ microschool locations while maintaining quality standards and automating repetitive operational tasks.

### Target Users
- **Primary**: Coaches looking to start their own sports-focused microschool
- **Secondary**: Parents seeking quality microschool options for their children
- **Tertiary**: Platform administrators managing the network

## Core Value Propositions

### For Coaches
- Zero-cost LLC incorporation and legal setup
- Automated administrative tasks
- Built-in student acquisition pipeline
- Quality control and support systems

### For Parents
- Transparent quality metrics
- Simplified enrollment and ESA submission
- Real-time visibility into school performance
- Guaranteed outcomes (Love school, Learn 2x in 2 hours, Life skills)

### For Platform Operators
- Scalable model for 1,200+ locations
- Automated quality enforcement
- Real-time network visibility
- Integrated financial management

## Functional Requirements

### 1. Full Funnel Management

#### 1.1 Upper Funnel - Marketing & Lead Generation
**Mini-HubSpot Functionality**

- **Lead Tracking**
  - Source attribution
  - Multi-touch journey mapping
  - Conversion funnel analytics
  - Lead scoring and qualification

- **Customer Pipelines**
  - Separate pipelines for coaches and parents
  - Automated stage progression
  - Task automation and reminders
  - Integration with communication tools

#### 1.2 Mid Funnel - Conversion Events
**In-Person Event Management**
- Event scheduling and registration
- Shadow day checklist automation
- Attendance tracking
- Follow-up automation
- 2-hour learning session playbooks

#### 1.3 Lower Funnel - Enrollment
**Fully Automated Enrollment**
- Online application submission
- Document collection and verification
- ESA (Education Savings Account) submission
  - Predictive approval modeling
  - Status tracking
  - Document preparation assistance
- Automated acceptance/rejection workflows
- Tuition agreement generation

### 2. Coach Onboarding & Management

#### 2.1 Coach Acquisition Pipeline
- Interest form capture
- Background check integration
- Skills assessment
- Training module tracking
- Certification management

#### 2.2 Onboarding Flow
**Step 1: Basic Information**
- Legal name collection (First, Middle, Last)
- Contact information

**Step 2: School Setup**
- School name selection
- Focus area selection:
  - Basketball
  - Football (6/7/8/11 man options)
  - Soccer
  - Other sports
- Location preferences
- Background verification consent

**Step 3: 2 Hour Learning Introduction**
- Educational content delivery
- Acknowledgment tracking
- Resource provisioning

**Step 4: Student Pipeline**
- Existing student invitation system
- Student referral program ($3k per referred student)
- Parent communication tools

#### 2.3 Legal & Compliance Automation
**Zero-Cost Business Setup**
- 1-Click LLC incorporation (AI-powered form filling)
- EIN registration automation
- State tax registration
- Business banking setup assistance

**Document Management**
- Health forms tracking
- Transcript management
- Admissions paperwork
- Automated form generation
- Digital signature integration

**Compliance Tracking**
- FERPA compliance monitoring
- COPPA adherence
- CCPA requirements
- State-specific education regulations

### 3. Real Estate Management

#### 3.1 Facility Acquisition Pipeline
**Property Discovery**
- Database of 1,200+ potential locations
- Zoning compliance verification
- Automated suitability scoring
- Virtual tour integration

**Pipeline Management**
- Lead tracking for properties
- Automated outreach sequences
- Document management
- Lease negotiation tracking

#### 3.2 Permitting & Zoning
- Automated permit application generation
- Zoning requirement validation
- Municipal requirement tracking
- Inspection scheduling
- Certificate of occupancy management

### 4. Quality Assurance & Metrics

#### 4.1 Three Core Commitments Tracking
**Love School**
- Student sentiment surveys
- Engagement metrics
- Attendance correlation
- Survey question: "Would you prefer staying in school or going on vacation?"

**Learn 2x in 2 Hours**
- Academic progress tracking
- Time efficiency metrics
- Curriculum effectiveness measurement
- Comparative performance data

**Learn Life Skills**
- Skill development assessments
- Project-based learning tracking
- Real-world application metrics
- Parent feedback integration

#### 4.2 FitnessGram Guarantee
- Physical fitness baseline testing
- Progress tracking
- Improvement guarantees
- Automated reporting

#### 4.3 Real-Time Quality Monitoring
**Review System**
- Real-time student reviews
- Real-time parent reviews
- Transparent rating display
- Automated alert system for issues

**Coach Performance Management**
- Performance dashboard
- Quality threshold enforcement
- Decommission process for underperforming coaches
- Improvement plan tracking

### 5. Real-Time Network Dashboard

#### 5.1 Geographic Overview
- Interactive map of Texas (expandable to other states)
- School location markers
- Performance heat maps
- Enrollment density visualization

#### 5.2 Performance Metrics Display
- Network-wide metrics:
  - % of kids who love school
  - % achieving 2x learning in 2 hours
  - % developing life skills
- Drill-down capabilities by:
  - Individual school
  - Coach
  - Sport/focus area
  - Time period

#### 5.3 Survey Response Tracking
- Live survey results
- Response rate monitoring
- Trend analysis
- Predictive modeling

### 6. Financial Management

#### 6.1 Tuition Billing
- Automated invoicing
- Payment processing
- ESA payment integration
- Late payment management
- Financial reporting

#### 6.2 Coach Compensation
- Revenue sharing calculations
- Automated payouts
- Tax document generation
- Financial performance tracking

#### 6.3 Platform Economics
- Referral fee tracking ($3k per student)
- Platform fee management
- Financial forecasting
- Audit trail maintenance

### 7. Scheduling & Operations

#### 7.1 Academic Scheduling
- 2-hour learning block management
- Sports practice scheduling
- Special event coordination
- Calendar synchronization

#### 7.2 Attendance Management
- Automated check-in/check-out
- Parent notifications
- Absence tracking
- Make-up session scheduling

#### 7.3 Parent Booking System
- Online booking portal
- Availability management
- Automated confirmations
- Reminder notifications

### 8. Communication Platform

#### 8.1 Multi-Channel Messaging
- In-app messaging
- SMS integration
- Email automation
- Push notifications

#### 8.2 Content Sharing
- Photo gallery management
- Video sharing capabilities
- Progress report distribution

## Technical Requirements

### 1. OneRoster Compliance

#### Core OneRoster Resources Implementation
- **Organizations**: Microschool entities with hierarchical support
- **Academic Sessions**: Flexible session management for 2-hour learning blocks
- **Courses/Classes**: Sports and academic program definitions
- **Users**: Coach, student, parent, administrator roles
- **Enrollments**: Dynamic enrollment tracking with ESA integration
- **Demographics**: Extended demographics for reporting

### 2. Integration Requirements

#### Required Integrations
- **Payment Processing**: Stripe/Square for tuition and fees
- **Background Checks**: Checkr for coach verification
- **Digital Signatures**: DocuSign
- **SMS/Communications**: Twilio
- **Email**: SendGrid
- **Maps/Location**: Google Maps API

### 3. Architecture Requirements

#### Scalability
- Support for 1,200+ concurrent schools
- 50,000+ active users
- Real-time data processing
- Multi-tenant architecture

#### Performance
- Page load times < 2 seconds
- Real-time dashboard updates < 500ms
- API response times < 200ms
- 99.9% uptime SLA

#### Security
- SOC 2 Type II compliance
- FERPA compliance
- End-to-end encryption
- Role-based access control
- Multi-factor authentication

### 4. Mobile Requirements
- Native iOS and Android apps for parents
- Progressive web app for coaches
- Offline capability for attendance
- Push notification support

## Data Model Requirements

### Core Entities
- **Organization**: Microschool entities
- **User**: Multi-role support (coach, parent, student)
- **Enrollment**: Student-school associations
- **Facility**: Real estate and location data
- **Quality Metrics**: Performance tracking
- **Financial**: Transactions and billing
- **Communication**: Message history and preferences

### Data Exchange
- REST API with JSON
- GraphQL for complex queries
- Webhook support for events
- Bulk import/export capabilities
- Real-time data streaming

## Success Metrics

### Platform Growth
- Number of active microschools
- Student enrollment rate
- Coach retention rate
- Geographic expansion

### Quality Metrics
- Average "Love School" score
- 2x learning achievement rate
- Life skills development scores
- Parent satisfaction ratings

### Operational Efficiency
- Time to launch new school
- Automation rate for administrative tasks
- Cost per student acquisition
- Platform profitability per school

## Implementation Priorities

### Phase 1 (MVP)
1. Coach onboarding flow
2. Basic school setup
3. LLC incorporation automation
4. Student enrollment
5. Basic scheduling

### Phase 2
1. Full funnel management
2. Real estate pipeline
3. Quality monitoring system
4. Financial management

### Phase 3
1. Real-time dashboard
2. Advanced analytics
3. Mobile applications
4. Geographic expansion tools

## Risk Mitigation

### Regulatory Risks
- State-by-state compliance tracking
- Legal review process
- Automated regulation updates

### Quality Risks
- Automated coach performance monitoring
- Early warning systems
- Rapid intervention protocols

### Technical Risks
- Redundant systems
- Automated backups
- Disaster recovery plan
- Security audit schedule