-- =====================================================
-- ACADEMIC STRUCTURE
-- Ed-Fi & OneRoster compliant academic system
-- =====================================================

-- Academic sessions
CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('schoolYear', 'term', 'semester', 'gradingPeriod', 'quarter')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parent_session_id UUID REFERENCES academic_sessions(id),
    school_year INTEGER NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_org ON academic_sessions(org_id, school_year);
CREATE INDEX idx_sessions_current ON academic_sessions(is_current) WHERE is_current = true;
CREATE INDEX idx_sessions_dates ON academic_sessions USING btree(start_date, end_date);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    ed_fi_unique_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    description TEXT,
    grades VARCHAR(20)[],
    subjects VARCHAR(100)[],
    credits DECIMAL(3, 2),
    -- Microschool specific
    is_two_hour_learning BOOLEAN DEFAULT false,
    sport_focus VARCHAR(50),
    max_class_size INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_org_course_code UNIQUE(org_id, course_code)
);

CREATE INDEX idx_courses_org ON courses(org_id);
CREATE INDEX idx_courses_sport ON courses(sport_focus) WHERE sport_focus IS NOT NULL;

-- Classes/Sections
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    ed_fi_section_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    class_code VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    room VARCHAR(50),
    periods VARCHAR(50)[],
    terms UUID[], -- References to academic_sessions
    teacher_id UUID REFERENCES users(id),
    assistant_ids UUID[],
    max_students INTEGER,
    current_students INTEGER DEFAULT 0,
    -- Microschool specific
    time_slot VARCHAR(50), -- 'morning_academic', 'afternoon_sport'
    start_time TIME,
    end_time TIME,
    days_of_week VARCHAR(10)[], -- ['MON', 'TUE', 'WED', 'THU', 'FRI']
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_course ON classes(course_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_classes_status ON classes(status, current_students) WHERE status = 'active';

-- Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'aide', 'guardian')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dropped', 'completed')),
    begin_date DATE NOT NULL,
    end_date DATE,
    -- Grades
    grade_level VARCHAR(20),
    -- ESA specific fields
    esa_application_id UUID,
    esa_status VARCHAR(50),
    esa_amount DECIMAL(10, 2),
    -- Metadata
    exit_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_class_role UNIQUE(user_id, class_id, role)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id, status);
CREATE INDEX idx_enrollments_class ON enrollments(class_id, status);
CREATE INDEX idx_enrollments_active ON enrollments(status, begin_date, end_date) WHERE status = 'active'; 