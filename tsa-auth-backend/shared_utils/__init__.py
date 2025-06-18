"""
TSA Authentication Shared Utilities
Centralized utility functions for JWT, authentication, profiles, and responses
"""

# JWT utilities
from .jwt_utils import (
    get_jwt_secret,
    generate_magic_link_jwt,
    verify_magic_link_jwt,
    extract_jwt_payload
)

# Authentication utilities
from .auth_utils import (
    create_cognito_user,
    generate_cognito_tokens,
    generate_secure_password,
    get_cognito_user_attributes,
    validate_user_exists
)

# Profile utilities
from .profile_utils import (
    get_profile_by_email,
    get_coach_profile,
    get_parent_profile,
    get_admin_profile,
    create_parent_profile,
    get_invitation_data,
    update_profile
)

# Response utilities
from .response_utils import (
    create_response,
    create_success_response,
    create_error_response,
    create_validation_error_response,
    create_unauthorized_response,
    create_health_response,
    handle_cors_preflight
)

# Role validator and SendGrid utilities (already existing)
from .role_validator import RoleValidator, validate_user_role
from .sendgrid_utils import *

__all__ = [
    # JWT utilities
    'get_jwt_secret',
    'generate_magic_link_jwt', 
    'verify_magic_link_jwt',
    'extract_jwt_payload',
    
    # Auth utilities
    'create_cognito_user',
    'generate_cognito_tokens',
    'generate_secure_password',
    'get_cognito_user_attributes',
    'validate_user_exists',
    
    # Profile utilities
    'get_profile_by_email',
    'get_coach_profile',
    'get_parent_profile', 
    'get_admin_profile',
    'create_parent_profile',
    'get_invitation_data',
    'update_profile',
    
    # Response utilities
    'create_response',
    'create_success_response',
    'create_error_response',
    'create_validation_error_response',
    'create_unauthorized_response',
    'create_health_response',
    'handle_cors_preflight',
    
    # Role validation utilities
    'RoleValidator',
    'validate_user_role'
]
