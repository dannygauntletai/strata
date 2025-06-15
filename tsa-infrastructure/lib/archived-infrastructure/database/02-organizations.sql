-- =====================================================
-- CORE ORGANIZATIONAL ENTITIES
-- Organizations structure for multi-level hierarchy
-- =====================================================

-- Organizations with PostgreSQL optimization
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(255) UNIQUE NOT NULL, -- OneRoster sourcedId
    ed_fi_id VARCHAR(255) UNIQUE, -- Ed-Fi unique identifier
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('network', 'region', 'district', 'school', 'microschool')),
    parent_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
    -- Network level
    network_code VARCHAR(50), -- 'alpha', 'tsa'
    -- Region level  
    state VARCHAR(2),
    city VARCHAR(100),
    -- School specific
    focus_area VARCHAR(100), -- 'basketball', 'football', 'soccer'
    coach_id UUID,
    facility_id UUID,
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) WITH (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- Optimized indexes
CREATE INDEX CONCURRENTLY idx_org_type ON organizations(type);
CREATE INDEX CONCURRENTLY idx_org_network ON organizations(network_code) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_org_location ON organizations USING btree(state, city) WHERE type = 'microschool';
CREATE INDEX CONCURRENTLY idx_org_hierarchy ON organizations(parent_id, type);
CREATE INDEX CONCURRENTLY idx_org_coach ON organizations(coach_id) WHERE coach_id IS NOT NULL; 