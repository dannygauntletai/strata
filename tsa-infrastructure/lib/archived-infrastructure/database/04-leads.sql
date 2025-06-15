-- =====================================================
-- LEAD TRACKING & FUNNEL MANAGEMENT
-- Marketing attribution and conversion tracking
-- =====================================================

-- Marketing sources and campaigns
CREATE TABLE marketing_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('google_ads', 'facebook_ads', 'instagram_ads', 'organic', 'referral', 'direct', 'email')),
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    medium VARCHAR(100),
    content JSONB DEFAULT '{}',
    budget DECIMAL(10, 2),
    spent DECIMAL(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead tracking with full attribution
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Contact info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    -- Lead details
    type VARCHAR(50) NOT NULL CHECK (type IN ('parent', 'coach')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'sales_qualified', 'converted', 'lost', 'inactive')),
    score INTEGER DEFAULT 0,
    source_id UUID REFERENCES marketing_sources(id),
    -- Attribution fields
    first_touch_source VARCHAR(255),
    first_touch_medium VARCHAR(100),
    first_touch_campaign VARCHAR(255),
    first_touch_timestamp TIMESTAMP WITH TIME ZONE,
    last_touch_source VARCHAR(255),
    last_touch_medium VARCHAR(100),
    last_touch_campaign VARCHAR(255),
    last_touch_timestamp TIMESTAMP WITH TIME ZONE,
    -- UTM tracking
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    -- Additional tracking
    referrer_url TEXT,
    landing_page TEXT,
    ip_address INET,
    user_agent TEXT,
    -- Conversion tracking
    converted_at TIMESTAMP WITH TIME ZONE,
    converted_to_id UUID, -- References users(id) or organizations(id)
    conversion_value DECIMAL(10, 2),
    -- Metadata
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lead queries
CREATE INDEX CONCURRENTLY idx_leads_email ON leads(email);
CREATE INDEX CONCURRENTLY idx_leads_status ON leads(status, score DESC) WHERE status != 'converted';
CREATE INDEX CONCURRENTLY idx_leads_created ON leads(created_at DESC);
CREATE INDEX CONCURRENTLY idx_leads_conversion ON leads(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_leads_score ON leads(score DESC) WHERE status IN ('qualified', 'sales_qualified');

-- Partitioned table for lead touchpoints (optimized for high-volume data)
CREATE TABLE lead_touchpoints (
    id UUID DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    touchpoint_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50),
    source VARCHAR(255),
    medium VARCHAR(100),
    campaign VARCHAR(255),
    page_url TEXT,
    event_name VARCHAR(255),
    event_properties JSONB DEFAULT '{}',
    duration_seconds INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions using pg_partman
SELECT partman.create_parent(
    p_parent_table => 'public.lead_touchpoints',
    p_control => 'timestamp',
    p_type => 'range',
    p_interval => 'monthly',
    p_premake => 3
);

-- Indexes for touchpoints
CREATE INDEX idx_touchpoints_lead_timestamp ON lead_touchpoints(lead_id, timestamp DESC);
CREATE INDEX idx_touchpoints_session ON lead_touchpoints(session_id, timestamp);
CREATE INDEX idx_touchpoints_event ON lead_touchpoints(event_name, timestamp) WHERE event_name IS NOT NULL;

-- Lead scoring rules
CREATE TABLE lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('behavior', 'demographic', 'engagement', 'negative')),
    condition_details JSONB NOT NULL,
    points INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead score history
CREATE TABLE lead_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES lead_scoring_rules(id),
    points_added INTEGER NOT NULL,
    reason VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_score_history_lead ON lead_score_history(lead_id, timestamp DESC);

-- Funnel stages configuration
CREATE TABLE funnel_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_type VARCHAR(50) NOT NULL CHECK (funnel_type IN ('parent', 'coach')),
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    description TEXT,
    conversion_actions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_funnel_stage UNIQUE(funnel_type, stage_order)
);

-- Lead stage history
CREATE TABLE lead_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES funnel_stages(id),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exited_at TIMESTAMP WITH TIME ZONE,
    time_in_stage_hours DECIMAL(10, 2),
    exit_reason VARCHAR(255)
);

CREATE INDEX idx_stage_history_lead ON lead_stage_history(lead_id, entered_at DESC); 