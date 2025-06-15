-- =====================================================
-- USER MANAGEMENT
-- Ed-Fi & OneRoster compliant user system
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    ed_fi_unique_id VARCHAR(255) UNIQUE, -- Ed-Fi UniqueId
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    -- Name fields
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    preferred_name VARCHAR(255),
    -- Demographics
    birth_date DATE,
    gender VARCHAR(20),
    ethnicity JSONB DEFAULT '{}', -- OneRoster demographics
    -- Contact
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    address JSONB DEFAULT '{}',
    -- User type and status
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'student', 
        'parent', 
        'guardian',
        'teacher', 
        'coach', 
        'guide',
        'head_coach',
        'assistant_coach',
        'network_admin', 
        'regional_admin',
        'school_admin', 
        'staff',
        'super_admin'
    )),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    -- Academic
    grades VARCHAR(50)[], -- Array of grade levels
    -- Auth and settings
    cognito_sub VARCHAR(255) UNIQUE,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user queries
CREATE INDEX CONCURRENTLY idx_users_type ON users(type) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_cognito ON users(cognito_sub) WHERE cognito_sub IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_users_name ON users USING btree(lower(last_name), lower(first_name));

-- User organization associations (OneRoster compliant)
CREATE TABLE user_org_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'student', 
        'teacher', 
        'parent', 
        'guardian', 
        'coach',
        'guide',
        'head_coach',
        'assistant_coach',
        'network_administrator', 
        'regional_administrator',
        'school_administrator',
        'staff',
        'aide'
    )),
    primary_association BOOLEAN DEFAULT false,
    begin_date DATE NOT NULL,
    end_date DATE,
    grade_level VARCHAR(20), -- For students
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_org_role UNIQUE(user_id, org_id, role)
);

CREATE INDEX CONCURRENTLY idx_user_org_assoc ON user_org_associations(user_id, org_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_org_users ON user_org_associations(org_id, role) WHERE status = 'active'; 