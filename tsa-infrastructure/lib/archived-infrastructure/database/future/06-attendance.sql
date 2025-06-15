-- =====================================================
-- ATTENDANCE & SCHEDULING
-- Student attendance and calendar management
-- =====================================================

CREATE TABLE attendance_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id),
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused', 'half_day')),
    arrival_time TIME,
    departure_time TIME,
    duration_minutes INTEGER,
    recorded_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_attendance UNIQUE(student_id, class_id, date)
);

CREATE INDEX idx_attendance_student_date ON attendance_events(student_id, date DESC);
CREATE INDEX idx_attendance_class_date ON attendance_events(class_id, date DESC);
CREATE INDEX idx_attendance_date ON attendance_events(date DESC);

-- Calendar events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('holiday', 'no_school', 'early_release', 'event', 'game', 'practice')),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    location VARCHAR(255),
    recurring_rule JSONB, -- iCal RRULE format
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_org_dates ON calendar_events(org_id, start_datetime, end_datetime);

-- Parent bookings
CREATE TABLE parent_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id),
    student_id UUID NOT NULL REFERENCES users(id),
    booking_type VARCHAR(50) NOT NULL CHECK (booking_type IN ('conference', 'pickup', 'event', 'meeting')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_parent ON parent_bookings(parent_id, start_time);
CREATE INDEX idx_bookings_time ON parent_bookings(start_time, end_time); 