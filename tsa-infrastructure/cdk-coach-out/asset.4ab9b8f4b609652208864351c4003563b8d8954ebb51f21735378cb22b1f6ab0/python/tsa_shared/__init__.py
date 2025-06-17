"""
TSA Shared Utilities - Lambda Layer
Provides common utilities for all TSA backend services

Key principles:
- NO CORS headers (API Gateway handles CORS)
- Centralized ID mapping (email ↔ profile_id)
- Standardized error handling
- Security-first validation
- Consistent data models
"""

# Core utilities - CORS-free API responses
from .api import (
    create_api_response,
    parse_event_body,
    standardize_error_response,
    log_api_event
)

# Database utilities
from .database import (
    get_dynamodb_table,
    get_table_name,
    get_current_time,
    get_current_timestamp
)

# Validation utilities
from .validation import (
    validate_email,
    validate_required_fields,
    sanitize_string,
    validate_input_security
)

# User/ID utilities
from .users import (
    UserIdentifier,
    get_coach_profile,
    get_user_by_email
)

# Data models
from .models import (
    CoachProfile,
    Event,
    TimelineEvent,
    ParentInvitation,
    BootcampModule,
    BootcampProgress
)

# Services
from .services import (
    SendGridEmailService,
    get_email_service
)

# Security utilities
from .security import (
    log_security_event,
    create_production_safe_error,
    sanitize_response
)

# Utility function for ID generation
from .utils import (
    generate_id,
    hash_string,
    get_frontend_url
)

__all__ = [
    # API utilities (CORS-free)
    'create_api_response',
    'parse_event_body', 
    'standardize_error_response',
    'log_api_event',
    
    # Database utilities
    'get_dynamodb_table',
    'get_table_name',
    'get_current_time',
    'get_current_timestamp',
    
    # Validation utilities
    'validate_email',
    'validate_required_fields',
    'sanitize_string',
    'validate_input_security',
    
    # User/ID utilities
    'UserIdentifier',
    'get_coach_profile',
    'get_user_by_email',
    
    # Data models
    'CoachProfile',
    'Event', 
    'TimelineEvent',
    'ParentInvitation',
    'BootcampModule',
    'BootcampProgress',
    
    # Services
    'SendGridEmailService',
    'get_email_service',
    
    # Security utilities
    'log_security_event',
    'create_production_safe_error', 
    'sanitize_response',
    
    # Utility functions
    'generate_id',
    'hash_string',
    'get_frontend_url'
] 