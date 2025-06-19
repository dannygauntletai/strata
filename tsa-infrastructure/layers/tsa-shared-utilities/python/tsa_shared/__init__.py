"""
TSA Shared Utilities Layer
Centralized utilities for all TSA Lambda functions
"""

# Configuration
from .config import get_config

# Table Models
from .table_models import (
    # Coach Models
    CoachProfile, ProgressTracking, WizardFlow,
    # Event Models
    Event, EventbriteConfig, EventbriteOAuthStatus, EventAttendee,
    EventStatus, EventCategory, TicketType,
    # Communication Models
    Message, Notification, MessageType, NotificationType,
    # Analytics Models
    EventTracking, EventProperties, UTMTracking,
    # Lead Models
    LeadProfile, LeadStatus, ReferralData,
    # Payment Models
    Transaction, Subscription, PaymentMethod, BillingCycle, 
    TransactionStatus, SubscriptionStatus,
    # Document Models
    Document, DocumentTemplate, ComplianceTracking, 
    DocumentType, DocumentStatus, ComplianceStatus,
    # Session Models
    UserSession, DeviceInfo, Location, SessionStatus,
    # Attribution Models
    AttributionTracking, FirstTouch, LastTouch,
    # System Models
    SystemMetric, MetricType,
    # Utility functions
    get_current_timestamp, validate_model_data
)

# SendGrid Service
from .sendgrid_service import SendGridService

# Authentication Utils
from .auth_utils import (
    # Cognito utilities
    create_cognito_user, generate_cognito_tokens, 
    get_cognito_user_attributes, validate_user_exists,
    # JWT utilities
    get_jwt_secret, get_sendgrid_api_key, generate_magic_link_jwt, 
    verify_magic_link_jwt, extract_jwt_payload,
    # Token extraction
    extract_user_from_auth_token, extract_email_from_jwt,
    # Session management
    extract_session_id_from_event, restore_from_server_session,
    create_auth_session, invalidate_auth_sessions,
    # Utility functions
    generate_secure_password, create_lambda_response,
    validate_required_fields
)

# Response Utils
from .response_utils import (
    # CORS & responses
    get_allowed_origin, create_response, create_cors_response,
    handle_cors_preflight,
    # Event parsing
    parse_event_body,
    # Validation
    validate_required_fields, validate_email_format,
    validate_input_security, sanitize_string, sanitize_response,
    # Logging & audit
    log_security_event, log_admin_action, log_api_event,
    # Error handling
    format_error_response, create_production_safe_error,
    # Utilities
    get_current_timestamp, get_client_ip, is_this_week,
    generate_unique_id
)

# Enrollment Utils
from .enrollment_utils import (
    # Response utilities
    create_enrollment_response,
    # Validation
    validate_enrollment_step, validate_phone_format, validate_date_format,
    # Progress calculation
    calculate_enrollment_progress,
    # Document processing
    process_document_upload,
    # Invitation handling
    validate_invitation_token,
    # Notifications
    format_enrollment_notification_data,
    # Logging
    log_enrollment_event,
    # Database
    get_database_secret, get_dynamodb_table,
    # ID generation
    generate_enrollment_id
)

__version__ = "1.0.0"

__all__ = [
    # Configuration
    'get_config',
    
    # Table Models - Coach
    'CoachProfile', 'ProgressTracking', 'WizardFlow',
    
    # Table Models - Events
    'Event', 'EventbriteConfig', 'EventbriteOAuthStatus', 'EventAttendee',
    'EventStatus', 'EventCategory', 'TicketType',
    
    # Table Models - Communication
    'Message', 'Notification', 'MessageType', 'NotificationType',
    
    # Table Models - Analytics
    'EventTracking', 'EventProperties', 'UTMTracking',
    
    # Table Models - Leads
    'LeadProfile', 'LeadStatus', 'ReferralData',
    
    # Table Models - Payments
    'Transaction', 'Subscription', 'PaymentMethod', 'BillingCycle',
    'TransactionStatus', 'SubscriptionStatus',
    
    # Table Models - Documents
    'Document', 'DocumentTemplate', 'ComplianceTracking',
    'DocumentType', 'DocumentStatus', 'ComplianceStatus',
    
    # Table Models - Sessions
    'UserSession', 'DeviceInfo', 'Location', 'SessionStatus',
    
    # Table Models - Attribution
    'AttributionTracking', 'FirstTouch', 'LastTouch',
    
    # Table Models - System
    'SystemMetric', 'MetricType',
    
    # SendGrid Service
    'SendGridService',
    
    # Authentication
    'create_cognito_user', 'generate_cognito_tokens', 
    'get_cognito_user_attributes', 'validate_user_exists',
    'get_jwt_secret', 'get_sendgrid_api_key', 'generate_magic_link_jwt',
    'verify_magic_link_jwt', 'extract_jwt_payload',
    'extract_user_from_auth_token', 'extract_email_from_jwt',
    'extract_session_id_from_event', 'restore_from_server_session',
    'create_auth_session', 'invalidate_auth_sessions',
    'generate_secure_password', 'create_lambda_response',
    
    # Response & API
    'get_allowed_origin', 'create_response', 'create_cors_response',
    'handle_cors_preflight', 'parse_event_body',
    'validate_required_fields', 'validate_email_format',
    'validate_input_security', 'sanitize_string', 'sanitize_response',
    'log_security_event', 'log_admin_action', 'log_api_event',
    'format_error_response', 'create_production_safe_error',
    'get_current_timestamp', 'get_client_ip', 'is_this_week',
    'generate_unique_id',
    
    # Enrollment
    'create_enrollment_response', 'validate_enrollment_step',
    'validate_phone_format', 'validate_date_format',
    'calculate_enrollment_progress', 'process_document_upload',
    'validate_invitation_token', 'format_enrollment_notification_data',
    'log_enrollment_event', 'get_database_secret', 'get_dynamodb_table',
    'generate_enrollment_id',
    
    # Model utilities
    'validate_model_data'
] 