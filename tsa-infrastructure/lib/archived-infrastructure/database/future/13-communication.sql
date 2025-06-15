-- =====================================================
-- COMMUNICATION
-- Multi-channel communication system
-- =====================================================

CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id),
    sender_type VARCHAR(50),
    recipient_ids UUID[] NOT NULL,
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('individual', 'class', 'school', 'all_parents', 'all_coaches')),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_id VARCHAR(100),
    template_variables JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_communications_recipient ON communications USING gin(recipient_ids);
CREATE INDEX idx_communications_sent ON communications(sent_at DESC) WHERE sent_at IS NOT NULL; 