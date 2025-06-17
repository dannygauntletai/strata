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

# Create aliases for functions with different expected names
create_api_response = create_response
get_current_time = get_current_timestamp
standardize_error_response = format_error_response
validate_email = validate_email_format

# Define get_table_name function for table name resolution
def get_table_name(table_key: str) -> str:
    """Get table name from environment variables with fallback"""
    import os
    
    # Standard table name mapping with environment variable fallback
    table_mapping = {
        'profiles': os.environ.get('PROFILES_TABLE', 'profiles-dev'),
        'users': os.environ.get('USERS_TABLE', 'users-dev'),
        'invitations': os.environ.get('INVITATIONS_TABLE', 'invitations-dev'),
        'event_invitations': os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations-dev'),
        'events': os.environ.get('EVENTS_TABLE', 'events-dev'),
        'enrollments': os.environ.get('ENROLLMENTS_TABLE', 'enrollments-dev'),
        'documents': os.environ.get('DOCUMENTS_TABLE', 'documents-dev'),
        'onboarding_sessions': os.environ.get('ONBOARDING_SESSIONS_TABLE', 'coach-onboarding-sessions-dev'),
        'background_checks': os.environ.get('BACKGROUND_CHECKS_TABLE', 'background-checks-dev'),
        'legal_requirements': os.environ.get('LEGAL_REQUIREMENTS_TABLE', 'legal-requirements-dev'),
        'eventbrite_config': os.environ.get('EVENTBRITE_CONFIG_TABLE', 'eventbrite-config-dev'),
        'event_attendees': os.environ.get('EVENT_ATTENDEES_TABLE', 'event-attendees-dev'),
    }
    
    return table_mapping.get(table_key, f"{table_key}-dev")

# Make generate_id more generic
def generate_id(prefix: str = "item") -> str:
    """Generate unique ID with prefix"""
    import uuid
    from datetime import datetime
    
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}" 