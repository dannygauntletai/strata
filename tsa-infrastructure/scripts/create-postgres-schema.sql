-- PostgreSQL Schema Creation for TSA Coach Portal
-- EdFi and OneRoster Compliant Tables
-- Execute this script on the PostgreSQL database

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- EdFi Compliant Academic Database Tables
-- ==============================================

-- Schools Table (EdFi Compliant)
CREATE TABLE IF NOT EXISTS schools (
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
    internet_access_descriptor VARCHAR(50), -- EdFi InternetAccessDescriptor
    
    -- EdFi required metadata
    _etag VARCHAR(50), -- EdFi ETag for change tracking
    _last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- EdFi LastModifiedDate
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EdFi required indexes for schools
CREATE INDEX IF NOT EXISTS idx_schools_lea ON schools(local_education_agency_id);
CREATE INDEX IF NOT EXISTS idx_schools_state_org ON schools(state_organization_id);
CREATE INDEX IF NOT EXISTS idx_schools_operational_status ON schools(operational_status_descriptor);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type_descriptor);

-- Students Table (EdFi Compliant)
CREATE TABLE IF NOT EXISTS students (
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

-- EdFi required indexes for students
CREATE INDEX IF NOT EXISTS idx_students_person ON students(person_id);
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);
CREATE INDEX IF NOT EXISTS idx_students_ethnicity ON students(hispanic_latino_ethnicity);

-- Student School Associations Table (EdFi Compliant)
CREATE TABLE IF NOT EXISTS student_school_associations (
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
CREATE INDEX IF NOT EXISTS idx_student_school_student ON student_school_associations(student_unique_id);
CREATE INDEX IF NOT EXISTS idx_student_school_school ON student_school_associations(school_id);
CREATE INDEX IF NOT EXISTS idx_student_school_year ON student_school_associations(school_year);
CREATE INDEX IF NOT EXISTS idx_student_school_grade ON student_school_associations(entry_grade_level_descriptor);
CREATE INDEX IF NOT EXISTS idx_student_school_active ON student_school_associations(school_id, school_year) 
    WHERE exit_withdraw_date IS NULL;

-- ==============================================
-- OneRoster Compliant Enrollment Database Tables
-- ==============================================

-- Organizations Table (OneRoster)
CREATE TABLE IF NOT EXISTS organizations (
    sourced_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'active',
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- school, district, department
    identifier VARCHAR(255),
    parent_id VARCHAR(255) REFERENCES organizations(sourced_id)
);

-- OneRoster indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Users Table (OneRoster)
CREATE TABLE IF NOT EXISTS users (
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
    
    -- Link to DynamoDB profiles for educational professionals
    profile_id VARCHAR(255), -- Links to DynamoDB profiles table for extended functionality
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OneRoster indexes for users
CREATE INDEX IF NOT EXISTS idx_users_role_org ON users(role, (org_ids->>0));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_identifier ON users(identifier);
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users(profile_id);

-- ==============================================
-- Data Sync Tables for DynamoDB Integration
-- ==============================================

-- Profile sync tracking table
CREATE TABLE IF NOT EXISTS profile_sync_log (
    sync_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id VARCHAR(255) NOT NULL,
    user_sourced_id VARCHAR(255),
    sync_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    sync_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_status ON profile_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_profile_sync_profile ON profile_sync_log(profile_id);

-- ==============================================
-- Initial Data Setup
-- ==============================================

-- Insert default organization types
INSERT INTO organizations (sourced_id, name, type, status) VALUES 
    ('org_district_001', 'TSA Coach Portal District', 'district', 'active'),
    ('org_department_001', 'Athletic Department', 'department', 'active')
ON CONFLICT (sourced_id) DO NOTHING;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.date_last_modified = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schools_modtime BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_student_school_associations_modtime BEFORE UPDATE ON student_school_associations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_organizations_modtime BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT; 