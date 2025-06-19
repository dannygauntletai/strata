"""
Shared Database Utilities for TSA Coach Portal
Provides SQLAlchemy models and database management for EdFi/OneRoster compliance
"""

from .models import *
from .database import DatabaseManager
from .migrations import MigrationManager, create_schema, migrate_profiles
from .db_utils import *

__all__ = [
    # Models
    'School', 'Student', 'StudentSchoolAssociation', 
    'Organization', 'User', 'ProfileSyncLog',
    
    # Database Management
    'DatabaseManager', 'MigrationManager',
    
    # Convenience Functions
    'create_schema', 'migrate_profiles',

    # DB Utils
    'upsert_user', 'delete_user', 'upsert_organization', 'delete_organization'
] 