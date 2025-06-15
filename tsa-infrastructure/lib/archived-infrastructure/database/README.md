# TSA Coach Database Schema

This directory contains the complete PostgreSQL database schema for the TSA Coach platform, modularized into focused, maintainable files.

## 📁 File Structure

The database schema is organized into 19 files, each handling a specific domain:

### Core Setup
- **`00-deploy.sql`** - Master deployment script (run this to deploy everything)
- **`01-setup.sql`** - Extensions and PostgreSQL configuration

### Entity Management
- **`02-organizations.sql`** - Multi-level organizational hierarchy (networks, regions, schools)
- **`03-users.sql`** - User management with Ed-Fi/OneRoster compliance
- **`04-leads.sql`** - Lead tracking, funnel management, and marketing attribution

### Academic System
- **`05-academic.sql`** - Academic structure (sessions, courses, classes, enrollments)
- **`06-attendance.sql`** - Attendance tracking and calendar management
- **`07-grades.sql`** - Grades, transcripts, and academic records

### Operations
- **`08-facilities.sql`** - Real estate and facility management
- **`09-quality.sql`** - Quality metrics and review system
- **`10-financial.sql`** - Financial accounts, transactions, invoices, and ESA

### Management Systems
- **`11-coaches.sql`** - Coach profiles and performance tracking
- **`12-automation.sql`** - Workflow automation and task scheduling
- **`13-communication.sql`** - Multi-channel communication system
- **`14-audit.sql`** - Security auditing and compliance tracking

### Performance & Data
- **`15-views.sql`** - Materialized views for dashboards and analytics
- **`16-functions.sql`** - Database functions and triggers
- **`17-data.sql`** - Initial seed data (funnel stages, scoring rules)
- **`18-security.sql`** - Row-level security policies and permissions

## 🚀 Deployment

### Quick Start
```bash
# From the database/ directory
psql -h your-postgres-host -U your-username -d your-database -f 00-deploy.sql
```

### Prerequisites
- PostgreSQL 15+ server
- Superuser privileges for extension installation
- Required extensions: uuid-ossp, pg_stat_statements, pgaudit, pg_partman, btree_gist

### Step-by-Step Deployment

1. **Configure PostgreSQL parameters:**
   ```sql
   shared_preload_libraries = 'pgaudit,pg_stat_statements,pg_partman_bgw'
   pg_partman_bgw.interval = 3600
   pg_partman_bgw.role = 'postgres'
   ```

2. **Run the deployment script:**
   ```bash
   psql -f 00-deploy.sql
   ```

3. **Verify deployment:**
   ```sql
   SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';
   SELECT matviewname FROM pg_matviews;
   ```

### Individual File Deployment
If you need to deploy files individually (for development or debugging):

```bash
# Deploy in dependency order
psql -f 01-setup.sql
psql -f 02-organizations.sql
psql -f 03-users.sql
# ... continue in order
```

## 🏗️ Schema Overview

### Key Features

**🔄 Multi-Tenancy:** Full support for networks → regions → districts → schools → microschools

**📊 Standards Compliance:** Ed-Fi and OneRoster compliant for data interoperability

**⚡ PostgreSQL Optimized:** 
- Efficient indexing strategies
- Partitioned tables for large datasets
- Optimized materialized views
- Standard PostgreSQL best practices

**📈 Marketing & Sales:**
- Full lead attribution and touchpoint tracking
- Funnel stage management with conversion analytics
- Automated lead scoring system

**💰 Financial Management:**
- ESA application tracking with approval predictions
- Multi-party transaction system (students, coaches, platform)
- Payment processing integration support

**🎯 Quality Tracking:**
- Love School, Learn 2x, Life Skills metrics
- Parent satisfaction and review system
- Coach performance analytics

### Data Architecture

```
Organizations (Multi-level hierarchy)
├── Users (Students, Parents, Coaches, Staff)
├── Academic System
│   ├── Sessions & Terms
│   ├── Courses & Classes
│   ├── Enrollments
│   ├── Attendance
│   └── Grades
├── Financial System
│   ├── Accounts & Transactions
│   ├── Invoices & Payments
│   └── ESA Applications
└── Operations
    ├── Facilities & Real Estate
    ├── Quality Metrics
    ├── Communications
    └── Workflows
```

## 🔧 Maintenance

### Partition Management
The schema uses pg_partman for automated partition management:
- `lead_touchpoints` - Monthly partitions for high-volume marketing data
- `audit_logs` - Monthly partitions for compliance data

### Materialized View Refresh
```sql
-- Refresh views (typically via cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY school_metrics_current;
REFRESH MATERIALIZED VIEW CONCURRENTLY lead_funnel_metrics;
```

### Performance Monitoring
Key views for monitoring:
- `pg_stat_statements` for query performance
- `pg_stat_user_tables` for table usage
- Custom metrics in `quality_metrics` table

## 🔐 Security

### Row-Level Security (RLS)
Enabled on sensitive tables:
- `users` - Users can only see themselves and associated organization members
- `financial_accounts` - Account holders can only see their own data
- `transactions` - Users can only see their own transactions
- `grades` - Students/parents can only see relevant grades

### Audit Trail
All significant actions are logged to `audit_logs` with:
- User identification
- Entity and action tracking
- IP address and session information
- Change history

## 📊 Analytics & Reporting

### Real-Time Dashboards
- `school_metrics_current` - Live school performance metrics
- `lead_funnel_metrics` - Marketing funnel performance

### Data Export
- Audit log entries for tracking export requests via `log_daily_metrics_export()` function
- CSV export capabilities through standard PostgreSQL tools
- Partitioned for efficient querying

## 🚨 Important Notes

1. **Foreign Key Dependencies:** Files must be executed in order due to foreign key constraints
2. **Standard Extensions:** Uses only standard PostgreSQL extensions
3. **External Integrations:** Audit logs track events for external system integration
4. **Partitioning:** pg_partman requires background worker configuration
5. **Security Policies:** RLS policies may need customization based on your access patterns

## 📞 Support

For questions about the database schema:
1. Check the inline comments in each SQL file
2. Review the materialized views for performance insights
3. Use the audit logs for debugging data changes
4. Monitor partition health with pg_partman views

---

**Total Schema Size:** 19 files, ~1,200 lines of optimized PostgreSQL DDL
**Target Platform:** PostgreSQL 15+
**Compliance:** Ed-Fi, OneRoster, FERPA-ready with audit trails 