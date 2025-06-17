"""
Shared Database Utilities for TSA Coach Portal
Provides SQLAlchemy models and database management for EdFi/OneRoster compliance
"""

from .models import *
from .database import DatabaseManager
from .migrations import MigrationManager, create_schema, migrate_profiles

__all__ = [
    # Models
    'School', 'Student', 'StudentSchoolAssociation', 
    'Organization', 'User', 'ProfileSyncLog',
    
    # Database Management
    'DatabaseManager', 'MigrationManager',
    
    # Convenience Functions
    'create_schema', 'migrate_profiles'
] 