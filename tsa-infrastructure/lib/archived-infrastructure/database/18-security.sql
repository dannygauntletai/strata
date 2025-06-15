-- =====================================================
-- PERMISSIONS AND ROW LEVEL SECURITY
-- Database security and access control
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Create policies (example for users table)
CREATE POLICY users_self_view ON users
    FOR SELECT
    TO application_user
    USING (id = current_setting('app.current_user_id')::uuid OR 
           EXISTS (
               SELECT 1 FROM user_org_associations uoa1
               JOIN user_org_associations uoa2 ON uoa1.org_id = uoa2.org_id
               WHERE uoa1.user_id = current_setting('app.current_user_id')::uuid
               AND uoa2.user_id = users.id
               AND uoa1.role IN ('administrator', 'teacher', 'coach')
           )); 