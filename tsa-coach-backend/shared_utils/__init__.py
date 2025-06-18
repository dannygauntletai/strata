# Shared layer for common dependencies and utilities

# Import core utilities from shared_utils.py
from .shared_utils import (
    create_response,
    parse_event_body,
    get_current_timestamp,
    format_error_response,
    get_dynamodb_table,
    validate_email_format
)

# Import user identifier utilities
from .user_identifier import UserIdentifier

# Import data models
from .dynamodb_models import CoachProfile

# Import authentication utilities
from .auth_utils import extract_user_from_auth_token

# Import profile sync utilities  
from .profile_sync import ensure_profile_exists_for_email, create_profile_sync_manager

# Create aliases for functions with different expected names
create_api_response = create_response
get_current_time = get_current_timestamp
standardize_error_response = format_error_response
validate_email = validate_email_format

# Define get_table_name function for table name resolution using shared config
def get_table_name(table_key: str) -> str:
    """Get table name using shared configuration (no hardcoded fallbacks)"""
    try:
        from shared_config import get_config
        config = get_config()
        return config.get_table_name(table_key)
    except ImportError:
        # Fallback to environment variables only if shared_config not available
    import os
    
        # Environment variable mapping (no hardcoded defaults)
        env_var_mapping = {
            'profiles': 'PROFILES_TABLE',
            'users': 'USERS_TABLE', 
            'invitations': 'INVITATIONS_TABLE',
            'event_invitations': 'EVENT_INVITATIONS_TABLE',
            'events': 'EVENTS_TABLE',
            'enrollments': 'ENROLLMENTS_TABLE',
            'documents': 'DOCUMENTS_TABLE',
            'onboarding_sessions': 'ONBOARDING_SESSIONS_TABLE',
            'background_checks': 'BACKGROUND_CHECKS_TABLE',
            'legal_requirements': 'LEGAL_REQUIREMENTS_TABLE',
            'eventbrite_config': 'EVENTBRITE_CONFIG_TABLE',
            'event_attendees': 'EVENT_ATTENDEES_TABLE',
        }
        
        env_var = env_var_mapping.get(table_key)
        if env_var and os.environ.get(env_var):
            return os.environ[env_var]
        else:
            raise ValueError(f"Table name for '{table_key}' not found in environment or shared config")

# Make generate_id more generic
def generate_id(prefix: str = "item") -> str:
    """Generate unique ID with prefix"""
    import uuid
    from datetime import datetime
    
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}" 