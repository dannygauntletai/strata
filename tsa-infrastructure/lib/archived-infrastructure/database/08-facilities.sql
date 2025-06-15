-- =====================================================
-- REAL ESTATE & FACILITIES
-- Facility management and tracking
-- =====================================================

CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(2) DEFAULT 'US',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    -- Status tracking
    status VARCHAR(50) DEFAULT 'prospect' CHECK (status IN ('prospect', 'negotiating', 'under_contract', 'leased', 'active', 'inactive', 'rejected')),
    property_type VARCHAR(50) CHECK (property_type IN ('church', 'community_center', 'commercial', 'school', 'sports_facility', 'other')),
    -- Property details
    square_footage INTEGER,
    outdoor_space_sqft INTEGER,
    capacity INTEGER,
    parking_spaces INTEGER,
    monthly_rent DECIMAL(10, 2),
    lease_start_date DATE,
    lease_end_date DATE,
    -- Zoning and permits
    zoning_status VARCHAR(50) CHECK (zoning_status IN ('not_started', 'pending', 'approved', 'denied', 'appealing')),
    zoning_type VARCHAR(100),
    permit_status VARCHAR(50) CHECK (permit_status IN ('not_started', 'in_progress', 'submitted', 'approved', 'denied')),
    occupancy_certificate_date DATE,
    inspection_dates JSONB DEFAULT '[]',
    -- Documents and features
    documents JSONB DEFAULT '[]',
    amenities JSONB DEFAULT '[]',
    sports_facilities JSONB DEFAULT '[]', -- ['basketball_court', 'soccer_field', 'gym']
    -- Contact info
    landlord_name VARCHAR(255),
    landlord_phone VARCHAR(50),
    landlord_email VARCHAR(255),
    -- Pipeline tracking
    pipeline_stage VARCHAR(50),
    next_action VARCHAR(255),
    next_action_date DATE,
    assigned_to UUID REFERENCES users(id),
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facilities_status ON facilities(status, state, city);
CREATE INDEX idx_facilities_location ON facilities USING gist(ll_to_earth(latitude, longitude));
CREATE INDEX idx_facilities_pipeline ON facilities(pipeline_stage, next_action_date);

-- Facility requirements checklist
CREATE TABLE facility_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    requirement_type VARCHAR(100) NOT NULL,
    description TEXT,
    is_met BOOLEAN DEFAULT false,
    verified_date DATE,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    documents JSONB DEFAULT '[]'
); 