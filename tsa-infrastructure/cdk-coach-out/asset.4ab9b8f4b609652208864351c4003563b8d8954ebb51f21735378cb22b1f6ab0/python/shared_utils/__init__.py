"""
Centralized Shared Models and Utilities for TSA Backend Systems
Single source of truth for data structures going to the database
"""

# Database Models (PostgreSQL/EdFi)
from .database_models import (
    Base, School, Student, StudentSchoolAssociation, 
    Organization, User, DatabaseManager, db_manager
)

# DynamoDB Models (NoSQL Operations)
from .dynamodb_models import (
    # Core Models
    CoachProfile, WizardFlow, ProgressTracking,
    LeadProfile, UTMTracking, ReferralData, AttributionTouchpoint,
    EventTracking, Message, Notification, Transaction,
    Subscription, Document, DocumentTemplate, ComplianceTracking,
    UserSession, SystemMetric,
    
    # Enums
    DataQuality, EventSource, UTMSource, UTMMedium,
    LeadStatus, MessageType, DeliveryStatus, TransactionStatus,
    PaymentMethod, SubscriptionStatus, BillingCycle,
    DocumentType, DocumentStatus, ComplianceStatus,
    SessionStatus, MetricType, NotificationType,
    NotificationPriority
)

# PostgreSQL Models (SQLAlchemy)
from .postgresql_models import (
    create_tables, get_database_connection,
    insert_school_record, insert_user_record
)

# Utilities
from .shared_utils import (
    get_database_secret, create_cors_response, create_api_response,
    get_current_time, validate_email, generate_id, parse_event_body,
    standardize_error_response, get_dynamodb_table, get_table_name
)

# Email Services
from .sendgrid_utils import SendGridEmailService

# Import centralized data models
from .models import (
    UserIdentifier, CoachProfile, BootcampModule, BootcampProgress,
    Event, ParentInvitation, TimelineEvent
)

__all__ = [
    # Database Models
    'Base', 'School', 'Student', 'StudentSchoolAssociation', 
    'Organization', 'User', 'DatabaseManager', 'db_manager',
    
    # DynamoDB Models
    'CoachProfile', 'WizardFlow', 'ProgressTracking',
    'LeadProfile', 'UTMTracking', 'ReferralData', 'AttributionTouchpoint',
    'EventTracking', 'Message', 'Notification', 'Transaction',
    'Subscription', 'Document', 'DocumentTemplate', 'ComplianceTracking',
    'UserSession', 'SystemMetric',
    
    # Enums
    'DataQuality', 'EventSource', 'UTMSource', 'UTMMedium',
    'LeadStatus', 'MessageType', 'DeliveryStatus', 'TransactionStatus',
    'PaymentMethod', 'SubscriptionStatus', 'BillingCycle',
    'DocumentType', 'DocumentStatus', 'ComplianceStatus',
    'SessionStatus', 'MetricType', 'NotificationType',
    'NotificationPriority',
    
    # PostgreSQL Models
    'create_tables', 'get_database_connection',
    'insert_school_record', 'insert_user_record',
    
    # Utilities
    'get_database_secret', 'create_cors_response', 'create_api_response',
    'get_current_time', 'validate_email', 'generate_id', 'parse_event_body',
    'standardize_error_response', 'get_dynamodb_table', 'get_table_name',
    
    # Email Services
    'SendGridEmailService',
    
    # New centralized data models
    'UserIdentifier', 'CoachProfile', 'BootcampModule', 'BootcampProgress',
    'Event', 'ParentInvitation', 'TimelineEvent'
] 