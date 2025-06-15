-- =====================================================
-- POSTGRESQL DATABASE SETUP
-- Extensions and Configuration
-- =====================================================

-- Enable standard PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgaudit";
CREATE EXTENSION IF NOT EXISTS "pg_partman";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================
-- POSTGRESQL CONFIGURATION
-- =====================================================

-- Standard PostgreSQL configuration parameters
-- These can be set at the database or session level:
-- shared_preload_libraries = 'pgaudit,pg_stat_statements,pg_partman_bgw'
-- pg_partman_bgw.interval = 3600
-- pg_partman_bgw.role = 'postgres'
-- max_connections = 100
-- shared_buffers = '256MB'
-- effective_cache_size = '1GB'
-- maintenance_work_mem = '64MB'
-- checkpoint_completion_target = 0.9
-- wal_buffers = '16MB'
-- default_statistics_target = 100 