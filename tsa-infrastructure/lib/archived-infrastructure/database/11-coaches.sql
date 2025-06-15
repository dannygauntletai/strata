-- =====================================================
-- COACH MANAGEMENT
-- Coach profiles and performance tracking
-- =====================================================

CREATE TABLE coach_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    -- Specialties and qualifications
    sport_specialties VARCHAR(50)[],
    coaching_experience_years INTEGER,
    highest_level_coached VARCHAR(100),
    certifications JSONB DEFAULT '[]',
    -- Background check
    background_check_status VARCHAR(50) DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'processing', 'cleared', 'flagged', 'denied')),
    background_check_date DATE,
    background_check_expires DATE,
    -- Training and onboarding
    training_modules_completed JSONB DEFAULT '[]',
    training_modules_required JSONB DEFAULT '[]',
    onboarding_status VARCHAR(50) DEFAULT 'started' CHECK (onboarding_status IN ('started', 'documents_pending', 'training_pending', 'ready_to_launch', 'completed')),
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    -- Performance and capacity
    performance_score DECIMAL(5, 2), -- 0-100
    student_capacity INTEGER DEFAULT 20,
    current_students INTEGER DEFAULT 0,
    max_schools INTEGER DEFAULT 1,
    current_schools INTEGER DEFAULT 0,
    -- Financial
    commission_rate DECIMAL(3, 2) DEFAULT 0.70, -- 70% default
    minimum_students INTEGER DEFAULT 10,
    -- School preferences
    preferred_locations JSONB DEFAULT '[]',
    preferred_age_groups VARCHAR(20)[],
    available_time_slots JSONB DEFAULT '{}',
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason TEXT,
    reactivation_date DATE,
    -- LLC and business
    has_llc BOOLEAN DEFAULT false,
    llc_name VARCHAR(255),
    ein VARCHAR(20),
    business_insurance_expires DATE,
    -- Metadata
    notes TEXT,
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coach_status ON coach_profiles(status, performance_score DESC);
CREATE INDEX idx_coach_capacity ON coach_profiles(current_students, student_capacity);
CREATE INDEX idx_coach_onboarding ON coach_profiles(onboarding_status) WHERE onboarding_status != 'completed';

-- Coach performance metrics
CREATE TABLE coach_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id),
    metric_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    benchmark DECIMAL(10, 2),
    percentile INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_coach_metric UNIQUE(coach_id, metric_date, metric_type)
); 