-- =====================================================
-- MASTER DEPLOYMENT SCRIPT
-- Execute all database schema files in correct order
-- =====================================================

-- This script executes all database schema files in the correct dependency order
-- Run this from the database/ directory with: psql -f 00-deploy.sql

\echo 'Starting PostgreSQL Database Deployment...'
\echo ''

-- 1. Setup and Configuration
\echo 'Step 1: Setting up extensions and configuration...'
\i 01-setup.sql
\echo 'Extensions and configuration complete.'
\echo ''

-- 2. Core Tables (order matters due to foreign keys)
\echo 'Step 2: Creating core organizational structure...'
\i 02-organizations.sql
\echo 'Organizations table created.'
\echo ''

\echo 'Step 3: Creating user management system...'
\i 03-users.sql
\echo 'User management system created.'
\echo ''

\echo 'Step 4: Creating lead tracking system...'
\i 04-leads.sql
\echo 'Lead tracking system created.'
\echo ''

\echo 'Step 5: Creating academic structure...'
\i 05-academic.sql
\echo 'Academic structure created.'
\echo ''

\echo 'Step 6: Creating attendance and scheduling...'
\i 06-attendance.sql
\echo 'Attendance and scheduling created.'
\echo ''

\echo 'Step 7: Creating grades and academic records...'
\i 07-grades.sql
\echo 'Grades and academic records created.'
\echo ''

\echo 'Step 8: Creating facilities management...'
\i 08-facilities.sql
\echo 'Facilities management created.'
\echo ''

\echo 'Step 9: Creating quality metrics system...'
\i 09-quality.sql
\echo 'Quality metrics system created.'
\echo ''

\echo 'Step 10: Creating financial management...'
\i 10-financial.sql
\echo 'Financial management created.'
\echo ''

\echo 'Step 11: Creating coach management...'
\i 11-coaches.sql
\echo 'Coach management created.'
\echo ''

\echo 'Step 12: Creating automation and workflows...'
\i 12-automation.sql
\echo 'Automation and workflows created.'
\echo ''

\echo 'Step 13: Creating communication system...'
\i 13-communication.sql
\echo 'Communication system created.'
\echo ''

\echo 'Step 14: Creating audit and compliance...'
\i 14-audit.sql
\echo 'Audit and compliance created.'
\echo ''

-- 3. Performance Optimizations
\echo 'Step 15: Creating materialized views...'
\i 15-views.sql
\echo 'Materialized views created.'
\echo ''

\echo 'Step 16: Creating functions and triggers...'
\i 16-functions.sql
\echo 'Functions and triggers created.'
\echo ''

-- 4. Initial Data and Security
\echo 'Step 17: Loading initial data...'
\i 17-data.sql
\echo 'Initial data loaded.'
\echo ''

\echo 'Step 18: Setting up security policies...'
\i 18-security.sql
\echo 'Security policies configured.'
\echo ''

-- 5. Final Setup
\echo 'Step 19: Running final optimizations...'

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY school_metrics_current;
REFRESH MATERIALIZED VIEW CONCURRENTLY lead_funnel_metrics;

-- Analyze tables for query planner
ANALYZE;

\echo 'Final optimizations complete.'
\echo ''
\echo '🎉 PostgreSQL Database Deployment Complete!'
\echo ''
\echo 'Summary:'
\echo '- 18 schema files executed successfully'
\echo '- All tables, indexes, and constraints created'
\echo '- Materialized views refreshed'
\echo '- Security policies enabled'
\echo '- Database optimized and ready for use'
\echo ''
\echo 'Next steps:'
\echo '1. Configure PostgreSQL parameters'
\echo '2. Set up monitoring and alerting'
\echo '3. Configure backup and recovery'
\echo '4. Test application connectivity' 