-- =====================================================
-- ACADEMIC RECORDS & GRADES
-- Student grades and transcript management
-- =====================================================

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id),
    grading_period_id UUID REFERENCES academic_sessions(id),
    grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('letter', 'numeric', 'pass_fail', 'standards_based')),
    grade_value VARCHAR(10) NOT NULL,
    numeric_value DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    credits_earned DECIMAL(3, 2),
    comments TEXT,
    teacher_id UUID REFERENCES users(id),
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grades_student ON grades(student_id, grading_period_id);
CREATE INDEX idx_grades_class ON grades(class_id, is_final);

-- Grade items/assignments
CREATE TABLE grade_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('homework', 'quiz', 'test', 'project', 'participation', 'final')),
    points_possible DECIMAL(5, 2) NOT NULL,
    weight DECIMAL(3, 2) DEFAULT 1.0,
    due_date DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student grade items
CREATE TABLE student_grade_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_item_id UUID NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
    points_earned DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES users(id),
    comments TEXT,
    CONSTRAINT uk_student_grade_item UNIQUE(student_id, grade_item_id)
);

-- Transcripts
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    gpa DECIMAL(3, 2),
    total_credits DECIMAL(5, 2),
    class_rank INTEGER,
    class_size INTEGER,
    is_official BOOLEAN DEFAULT false,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES users(id)
); 