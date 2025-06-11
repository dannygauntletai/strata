# Core Database Models (MVP)

## Overview
This document defines the essential data models for MVP implementation, including:
- **PostgreSQL**: EdFi and OneRoster compliant academic data (users, students, schools)
- **DynamoDB**: Educational platform operational data (profiles)

Additional features are documented in `archived_database.md` for future implementation.

## PostgreSQL Database Models

### 1. Academic Database (EdFi Compliant)

#### Schools Table
```sql
CREATE TABLE schools (
    school_id INTEGER PRIMARY KEY, -- EdFi SchoolId (integer)
    state_organization_id VARCHAR(60) NOT NULL, -- EdFi StateOrganizationId  
    name_of_institution VARCHAR(255) NOT NULL, -- EdFi NameOfInstitution
    short_name_of_institution VARCHAR(100), -- EdFi ShortNameOfInstitution
    web_site VARCHAR(255), -- EdFi WebSite
    operational_status_descriptor VARCHAR(50), -- EdFi OperationalStatusDescriptor
    type_descriptor VARCHAR(50), -- EdFi SchoolTypeDescriptor
    charter_status_descriptor VARCHAR(50), -- EdFi CharterStatusDescriptor
    title_i_part_a_school_designation_descriptor VARCHAR(50), -- EdFi TitleIPartASchoolDesignationDescriptor
    magnet_special_program_emphasis_school_descriptor VARCHAR(50), -- EdFi MagnetSpecialProgramEmphasisSchoolDescriptor
    administrative_funding_control_descriptor VARCHAR(50), -- EdFi AdministrativeFundingControlDescriptor
    
    -- Education Organization Network Associations
    local_education_agency_id INTEGER, -- EdFi LocalEducationAgencyId
    
    -- Contact Information (EdFi Address structure)
    addresses JSONB DEFAULT '[]', -- EdFi Address array
    -- Structure: [{"addressTypeDescriptor": "Physical", "streetNumberName": "", "city": "", "stateAbbreviationDescriptor": "", "postalCode": "", "nameOfCounty": ""}]
    
    telephones JSONB DEFAULT '[]', -- EdFi Telephone array  
    -- Structure: [{"telephoneNumberTypeDescriptor": "Main", "telephoneNumber": ""}]
    
    -- School Categories (many-to-many)
    school_categories JSONB DEFAULT '[]', -- EdFi SchoolCategoryDescriptor array
    -- Values: ["Elementary School", "Middle School", "High School", "Combined", etc.]
    
    -- Grade Levels (many-to-many) 
    grade_levels JSONB DEFAULT '[]', -- EdFi GradeLevelDescriptor array
    -- Values: ["Kindergarten", "First grade", "Second grade", ..., "Twelfth grade"]
    
    -- Institution Telephones
    institution_telephones JSONB DEFAULT '[]', -- EdFi InstitutionTelephone array
    
    -- Federal Program Information
    title_i_part_a_school_designation_descriptor VARCHAR(50),
    internet_access_descriptor VARCHAR(50), -- EdFi InternetAccessDescriptor
    
    -- EdFi required metadata
    _etag VARCHAR(50), -- EdFi ETag for change tracking
    _last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- EdFi LastModifiedDate
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EdFi required indexes
CREATE INDEX idx_schools_lea ON schools(local_education_agency_id);
CREATE INDEX idx_schools_state_org ON schools(state_organization_id);
CREATE INDEX idx_schools_operational_status ON schools(operational_status_descriptor);
CREATE INDEX idx_schools_type ON schools(type_descriptor);
```

#### Students Table (EdFi Compliant)
```sql
CREATE TABLE students (
    student_unique_id VARCHAR(50) PRIMARY KEY, -- EdFi StudentUniqueId
    student_usi INTEGER UNIQUE NOT NULL, -- EdFi StudentUSI (Unique Student Identifier)
    
    -- Personal Information (EdFi Name structure)
    first_name VARCHAR(100) NOT NULL, -- EdFi FirstName
    last_name VARCHAR(100) NOT NULL, -- EdFi LastSurname
    middle_name VARCHAR(100), -- EdFi MiddleName
    generation_code_suffix VARCHAR(10), -- EdFi GenerationCodeSuffix (Jr., Sr., III, etc.)
    maiden_name VARCHAR(100), -- EdFi MaidenName
    
    -- Demographics (EdFi Demographics)
    birth_date DATE, -- EdFi BirthDate
    birth_city VARCHAR(100), -- EdFi BirthCity  
    birth_state_abbreviation_descriptor VARCHAR(50), -- EdFi BirthStateAbbreviationDescriptor
    birth_country_descriptor VARCHAR(50), -- EdFi BirthCountryDescriptor
    date_entered_us DATE, -- EdFi DateEnteredUS
    multiplebirth_status BOOLEAN, -- EdFi MultipleBirthStatus
    birth_sex_descriptor VARCHAR(50), -- EdFi BirthSexDescriptor
    
    -- Ethnicity and Race (EdFi structure)
    hispanic_latino_ethnicity BOOLEAN, -- EdFi HispanicLatinoEthnicity
    races JSONB DEFAULT '[]', -- EdFi Race array with RaceDescriptor values
    
    -- Other Identifiers
    person_id VARCHAR(50), -- EdFi PersonId
    source_system_descriptor VARCHAR(50), -- EdFi SourceSystemDescriptor
    
    -- EdFi required metadata
    _etag VARCHAR(50), -- EdFi ETag for change tracking
    _last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- EdFi LastModifiedDate
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EdFi required indexes
CREATE INDEX idx_students_person ON students(person_id);
CREATE INDEX idx_students_birth_date ON students(birth_date);
CREATE INDEX idx_students_ethnicity ON students(hispanic_latino_ethnicity);
```

#### Student School Associations Table (EdFi Compliant)
```sql
CREATE TABLE student_school_associations (
    student_unique_id VARCHAR(50) NOT NULL, -- EdFi StudentUniqueId
    school_id INTEGER NOT NULL, -- EdFi SchoolId
    entry_date DATE NOT NULL, -- EdFi EntryDate
    
    -- Primary Keys (composite)
    PRIMARY KEY (student_unique_id, school_id, entry_date),
    
    -- Foreign Keys
    FOREIGN KEY (student_unique_id) REFERENCES students(student_unique_id),
    FOREIGN KEY (school_id) REFERENCES schools(school_id),
    
    -- Entry Information
    entry_grade_level_descriptor VARCHAR(50), -- EdFi EntryGradeLevelDescriptor
    entry_grade_level_reason_descriptor VARCHAR(50), -- EdFi EntryGradeLevelReasonDescriptor  
    entry_type_descriptor VARCHAR(50), -- EdFi EntryTypeDescriptor
    repeat_grade_indicator BOOLEAN, -- EdFi RepeatGradeIndicator
    school_choice_transfer BOOLEAN, -- EdFi SchoolChoiceTransfer
    
    -- Exit Information  
    exit_withdraw_date DATE, -- EdFi ExitWithdrawDate
    exit_withdraw_type_descriptor VARCHAR(50), -- EdFi ExitWithdrawTypeDescriptor
    
    -- Enrollment Status
    primary_school BOOLEAN DEFAULT true, -- EdFi PrimarySchool
    
    -- Academic Information
    class_of_school_year INTEGER, -- EdFi ClassOfSchoolYear (graduation year)
    school_year INTEGER NOT NULL, -- EdFi SchoolYear
    graduation_plan_type_descriptor VARCHAR(50), -- EdFi GraduationPlanTypeDescriptor
    graduation_school_year INTEGER, -- EdFi GraduationSchoolYear
    
    -- Calendar Information
    calendar_code VARCHAR(50), -- EdFi CalendarCode
    
    -- Educational Environment
    school_choice_basis_descriptor VARCHAR(50), -- EdFi SchoolChoiceBasisDescriptor
    
    -- EdFi required metadata
    _etag VARCHAR(50), -- EdFi ETag for change tracking
    _last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- EdFi LastModifiedDate
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EdFi required indexes for StudentSchoolAssociation
CREATE INDEX idx_student_school_student ON student_school_associations(student_unique_id);
CREATE INDEX idx_student_school_school ON student_school_associations(school_id);
CREATE INDEX idx_student_school_year ON student_school_associations(school_year);
CREATE INDEX idx_student_school_grade ON student_school_associations(entry_grade_level_descriptor);
CREATE INDEX idx_student_school_active ON student_school_associations(school_id, school_year) 
    WHERE exit_withdraw_date IS NULL;
```

### 2. Enrollment Database (OneRoster Compliant)

#### Organizations Table (OneRoster)
```sql
CREATE TABLE organizations (
    sourced_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'active',
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- school, district, department
    identifier VARCHAR(255),
    parent_id VARCHAR(255) REFERENCES organizations(sourced_id)
);
```

#### Users Table (OneRoster)
```sql
CREATE TABLE users (
    sourced_id VARCHAR(255) PRIMARY KEY, -- OneRoster sourcedId
    status VARCHAR(20) DEFAULT 'active', -- OneRoster status
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- OneRoster dateLastModified
    metadata JSONB, -- OneRoster metadata
    username VARCHAR(255) UNIQUE, -- OneRoster username
    user_ids JSONB, -- OneRoster userIds array
    enabled_user BOOLEAN DEFAULT true, -- OneRoster enabledUser
    
    -- Name fields (OneRoster)
    given_name VARCHAR(255), -- OneRoster givenName
    family_name VARCHAR(255), -- OneRoster familyName
    middle_name VARCHAR(255), -- OneRoster middleName
    
    -- Role (OneRoster)
    role VARCHAR(50) NOT NULL, -- OneRoster role: student, teacher, administrator, parent, guardian
    
    -- Contact Information (OneRoster)
    identifier VARCHAR(255), -- OneRoster identifier
    email VARCHAR(255), -- OneRoster email
    sms VARCHAR(20), -- OneRoster sms
    phone VARCHAR(20), -- OneRoster phone
    
    -- Demographics (OneRoster)
    birth_date DATE, -- For age verification, compliance
    
    -- Organizational (OneRoster)
    agents JSONB, -- OneRoster agents array
    org_ids JSONB, -- OneRoster orgs array (schools/organizations user belongs to)
    grades JSONB, -- OneRoster grades array
    
    -- Authentication
    password VARCHAR(255), -- OneRoster password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OneRoster indexes
CREATE INDEX idx_users_role_org ON users(role, (org_ids->>0));
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

## DynamoDB NoSQL Models

### 1. Profiles Database

#### Profiles Table
*Contains all educational professional roles, data, and functionality. Users table handles OneRoster compliance only.*

```json
{
  "TableName": "profiles",
  "KeySchema": [
    {
      "AttributeName": "profile_id", 
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "profile_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "school_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "email",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "school-index",
      "KeySchema": [
        {
          "AttributeName": "school_id",
          "KeyType": "HASH"
        }
      ]
    },
    {
      "IndexName": "email-index", 
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ]
    }
  ],
  "Sample Item": {
    "profile_id": "profile_12345",
    "school_id": "school_001",
    
    // Basic profile info
    "first_name": "John",
    "last_name": "Smith", 
    "middle_name": "Michael",
    "email": "john.smith@school.edu",
    "phone": "+1234567890",
    "birth_date": "1985-06-15",
    "gender": "male",
    
    // Role and experience  
    "role_type": "school_owner", // Educational roles: school_owner, instructor, administrator, coach, director, principal, counselor
    "specializations": ["STEM", "Engineering", "Technology"],
    "certification_level": "Master",
    "years_experience": 10,
    
    // Onboarding wizard progress
    "onboarding_progress": {
      "current_step": 3,
      "is_completed": false
    },
    
    // Bootcamp progress
    "bootcamp_progress": {
      "enrolled_courses": ["tsa_prep", "career_planning", "advanced_coaching"],
      "quiz_attempts": [
        {
          "quiz_id": "fundamentals_quiz",
          "score": 85,
          "attempted_at": "2024-01-02T14:00:00Z",
          "passed": true,
          "time_spent": 1800
        },
        {
          "quiz_id": "leadership_quiz", 
          "score": 92,
          "attempted_at": "2024-01-03T15:00:00Z",
          "passed": true,
          "time_spent": 2100
        },
        {
          "quiz_id": "technical_quiz",
          "score": 78,
          "attempted_at": "2024-01-04T16:00:00Z",
          "passed": true,
          "time_spent": 2400
        }
      ],
      "modules_completed": [
        {
          "module_id": "basics",
          "module_name": "TSA Fundamentals",
          "completed_at": "2024-01-02T12:00:00Z",
          "score": 88
        },
        {
          "module_id": "leadership",
          "module_name": "Leadership Development", 
          "completed_at": "2024-01-03T13:00:00Z",
          "score": 94
        }
      ],
      "certifications_earned": [
        {
          "certification_id": "basic_coaching",
          "certification_name": "Basic TSA Coaching",
          "earned_at": "2024-01-05T10:00:00Z",
          "expires_at": "2025-01-05T10:00:00Z"
        },
        {
          "certification_id": "tsa_fundamentals",
          "certification_name": "TSA Fundamentals",
          "earned_at": "2024-01-04T11:00:00Z",
          "expires_at": "2025-01-04T11:00:00Z"
        }
      ],
      "current_module": "advanced_coaching_techniques",
      "completion_percentage": 67,
      "total_hours_completed": 24.5
    },
    
    // Assignment and relationships  
    "students_assigned": ["student_001", "student_002", "student_003"],
    
    // Preferences and settings
    "preferences": {
      "communication_method": "email",
      "meeting_frequency": "weekly",
      "notification_settings": {
        "email_notifications": true,
        "sms_notifications": false,
        "push_notifications": true,
        "reminder_frequency": "daily"
      },
      "dashboard_layout": "cards",
      "timezone": "America/Chicago"
    },
    
    // Documents and uploads
    "documents": [
      {
        "document_id": "doc_001",
        "document_type": "business_plan",
        "document_url": "s3://docs/business-plan-v2.pdf",
        "uploaded_at": "2024-01-01T10:00:00Z",
        "status": "approved"
      },
      {
        "document_id": "doc_002", 
        "document_type": "certification",
        "document_url": "s3://docs/coaching-cert.pdf",
        "uploaded_at": "2024-01-02T09:00:00Z",
        "status": "verified"
      }
    ],
    
    // Timestamps
    "onboarded_date": "2024-01-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## Data Relationships and Constraints

### Table Separation Strategy
- **Users Table**: OneRoster compliant user management (student, teacher, administrator, parent/guardian)
- **Profiles Table**: Educational professional roles and functionality (school_owner, instructor, coach, director, principal, counselor)
- **Relationship**: Users with professional roles link to profiles via profile_id for extended functionality

### Key Relationships
1. **Academic → Enrollment**: Students link via `student_unique_id` ↔ `identifier`
2. **Enrollment → Users**: Users connect through `org_ids` and role assignments (OneRoster compliance)
3. **Users → Profiles**: Educational professional data separated into profiles table  

### User Role Types (OneRoster)
- **student**: Students enrolled in programs
- **teacher**: Teaching staff and instructors
- **administrator**: School administrators
- **parent/guardian**: Student parents and guardians

*Note: Users can have multiple roles and be associated with multiple organizations via `org_ids`*

### Data Integrity Rules
- All student data must comply with FERPA requirements
- EdFi descriptor values must follow standard taxonomies
- OneRoster sourced_ids must be globally unique
- Audit trails maintained for all data modifications

This schema supports educational platforms with proper compliance and scalability. Additional features (messaging, payments, analytics, etc.) are documented in `archived_database.md` for future implementation. 