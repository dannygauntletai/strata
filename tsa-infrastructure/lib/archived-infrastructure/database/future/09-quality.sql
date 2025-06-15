-- =====================================================
-- QUALITY METRICS & MONITORING
-- Quality tracking and reviews system
-- =====================================================

CREATE TABLE quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('love_school', 'learn_2x', 'life_skills', 'fitness', 'parent_satisfaction')),
    measurement_date DATE NOT NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    sample_size INTEGER,
    response_rate DECIMAL(5, 2),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_org_metric_date UNIQUE(org_id, metric_type, measurement_date)
);

CREATE INDEX idx_metrics_org_date ON quality_metrics(org_id, measurement_date DESC);
CREATE INDEX idx_metrics_type_date ON quality_metrics(metric_type, measurement_date DESC);

-- Reviews system
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewer_type VARCHAR(50) NOT NULL CHECK (reviewer_type IN ('student', 'parent')),
    org_id UUID NOT NULL REFERENCES organizations(id),
    coach_id UUID REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50) CHECK (category IN ('overall', 'academic', 'coaching', 'facilities', 'communication')),
    title VARCHAR(255),
    comments TEXT,
    sentiment_score DECIMAL(3, 2), -- -1 to 1
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    response TEXT, -- School response
    response_by UUID REFERENCES users(id),
    response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_org ON reviews(org_id, created_at DESC);
CREATE INDEX idx_reviews_coach ON reviews(coach_id, created_at DESC) WHERE coach_id IS NOT NULL;
CREATE INDEX idx_reviews_public ON reviews(is_public, rating) WHERE is_public = true;

-- Survey responses
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_type VARCHAR(50) NOT NULL CHECK (survey_type IN ('love_school', 'learn_2x', 'life_skills', 'onboarding', 'exit')),
    respondent_id UUID NOT NULL REFERENCES users(id),
    respondent_type VARCHAR(50) NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id),
    questions JSONB NOT NULL,
    score DECIMAL(5, 2),
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_survey_org ON survey_responses(org_id, survey_type, created_at DESC);
CREATE INDEX idx_survey_respondent ON survey_responses(respondent_id); 