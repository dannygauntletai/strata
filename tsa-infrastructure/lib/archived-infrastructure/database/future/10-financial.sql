-- =====================================================
-- FINANCIAL MANAGEMENT
-- Accounts, transactions, invoices, and ESA
-- =====================================================

CREATE TABLE financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('student', 'coach', 'organization', 'platform')),
    account_holder_id UUID NOT NULL, -- References users or organizations
    account_holder_type VARCHAR(50) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0,
    pending_balance DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255), -- For coach payouts
    bank_account_last4 VARCHAR(4),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_holder ON financial_accounts(account_holder_id, account_holder_type);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('tuition', 'esa_payment', 'referral_fee', 'coach_payout', 'platform_fee', 'refund', 'adjustment')),
    amount DECIMAL(10, 2) NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2),
    description TEXT,
    reference_id UUID, -- References related entity
    reference_type VARCHAR(50),
    -- Payment details
    payment_method VARCHAR(50),
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_account ON transactions(account_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_transactions_reference ON transactions(reference_id, reference_type);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    account_id UUID NOT NULL REFERENCES financial_accounts(id),
    student_id UUID REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    line_items JSONB NOT NULL DEFAULT '[]',
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_account ON invoices(account_id, status);
CREATE INDEX idx_invoices_due ON invoices(due_date, status) WHERE status NOT IN ('paid', 'cancelled');

-- ESA Applications
CREATE TABLE esa_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    application_number VARCHAR(255) UNIQUE,
    application_type VARCHAR(50) DEFAULT 'new' CHECK (application_type IN ('new', 'renewal', 'transfer')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'additional_info_needed', 'approved', 'denied', 'withdrawn')),
    -- Dates
    submission_date DATE,
    review_start_date DATE,
    approval_date DATE,
    denial_date DATE,
    -- Amounts
    requested_amount DECIMAL(10, 2),
    approved_amount DECIMAL(10, 2),
    -- Prediction
    predicted_approval_probability DECIMAL(3, 2),
    prediction_factors JSONB DEFAULT '{}',
    -- Documentation
    documents JSONB DEFAULT '[]',
    missing_documents JSONB DEFAULT '[]',
    -- Review process
    reviewer_notes TEXT,
    denial_reason VARCHAR(255),
    appeal_status VARCHAR(50),
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_esa_student ON esa_applications(student_id, status);
CREATE INDEX idx_esa_status ON esa_applications(status, submission_date); 