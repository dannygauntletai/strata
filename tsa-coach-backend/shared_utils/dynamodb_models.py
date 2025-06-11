"""
DynamoDB NoSQL Models for TSA Coach Platform
Contains operational data models for high-performance NoSQL operations

ARCHITECTURE:
- Coach Database: Coach profiles, progress tracking with wizard flows
- Leads Database: Lead profiles, attribution tracking
- Analytics Database: Event tracking, UTM campaigns
- Communication Database: Messages, notifications
- Payment Database: Transactions, subscriptions
- Document Database: Documents, templates, compliance tracking
- User Sessions Database: Session management
- Monitoring Database: System metrics
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum


# =================================================================
# COMMON ENUMS FOR DYNAMODB MODELS
# =================================================================

class DataQuality(str, Enum):
    """Data quality indicators"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class EventSource(str, Enum):
    """Event source types"""
    WEB = "web"
    MOBILE = "mobile"
    API = "api"
    IMPORT = "import"
    MANUAL = "manual"


class UTMSource(str, Enum):
    """UTM source types"""
    GOOGLE = "google"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    DIRECT = "direct"
    REFERRAL = "referral"


class UTMMedium(str, Enum):
    """UTM medium types"""
    CPC = "cpc"
    SOCIAL = "social"
    EMAIL = "email"
    ORGANIC = "organic"
    REFERRAL = "referral"
    DIRECT = "direct"


# =================================================================
# COACH DATABASE MODELS
# =================================================================

class CoachProfile(BaseModel):
    """Coach profiles table (DynamoDB)"""
    coach_id: str = Field(..., description="Partition key")
    school_id: str = Field(..., description="GSI key")
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    specializations: List[str] = Field(default_factory=list)
    certification_level: Optional[str] = Field(None, max_length=50)
    years_experience: Optional[int] = None
    students_assigned: List[str] = Field(default_factory=list)
    active_programs: List[str] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class WizardFlow(BaseModel):
    """Wizard flow configuration for progress tracking"""
    current_wizard_step: int
    wizard_flow_id: str
    step_status: str
    is_wizard_active: bool
    available_actions: List[Dict[str, Any]] = Field(default_factory=list)
    conditional_logic: Dict[str, Any] = Field(default_factory=dict)
    wizard_session: Dict[str, Any] = Field(default_factory=dict)


class ProgressTracking(BaseModel):
    """Timeline events table with wizard flow support (DynamoDB)"""
    coach_id: str = Field(..., description="Partition key")
    timestamp: str = Field(..., description="Sort key - ISO datetime")
    event_id: str
    event_type: str
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    category: str
    milestone_stage: Optional[str] = None
    step_number: Optional[int] = None
    step_name: Optional[str] = None
    total_steps_in_stage: Optional[int] = None
    wizard_flow: Optional[WizardFlow] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    next_steps: List[Dict[str, str]] = Field(default_factory=list)
    priority: str = Field(default="medium")
    tags: List[str] = Field(default_factory=list)


# =================================================================
# LEADS DATABASE MODELS
# =================================================================

class LeadStatus(str, Enum):
    """Lead status types"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    LOST = "lost"


class UTMTracking(BaseModel):
    """UTM tracking data"""
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


class ReferralData(BaseModel):
    """Referral data"""
    referrer_url: Optional[str] = None
    landing_page: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None


class AttributionTouchpoint(BaseModel):
    """Attribution touchpoint data"""
    sequence: int
    timestamp: str
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    page_visited: str


class ContactHistory(BaseModel):
    """Contact history entry"""
    date: str
    type: str
    outcome: str
    notes: Optional[str] = None


class LeadProfile(BaseModel):
    """Lead profiles table (DynamoDB)"""
    lead_id: str = Field(..., description="Partition key")
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    school_district: Optional[str] = Field(None, max_length=255)
    grade_level: Optional[str] = Field(None, max_length=20)
    interests: List[str] = Field(default_factory=list)
    lead_source: str
    lead_score: Optional[int] = None
    status: LeadStatus
    assigned_coach: Optional[str] = None
    utm_tracking: Optional[UTMTracking] = None
    referral_data: Optional[ReferralData] = None
    attribution_touchpoints: List[AttributionTouchpoint] = Field(default_factory=list)
    contact_history: List[ContactHistory] = Field(default_factory=list)
    created_at: str
    updated_at: str


class FirstTouch(BaseModel):
    """First touch attribution data"""
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    timestamp: str


class LastTouch(BaseModel):
    """Last touch attribution data"""
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    timestamp: str


class AttributionTracking(BaseModel):
    """Attribution tracking table (DynamoDB)"""
    attribution_id: str = Field(..., description="Partition key")
    lead_id: str = Field(..., description="GSI key")
    coach_id: Optional[str] = None
    touchpoint_sequence: List[Dict[str, Any]] = Field(default_factory=list)
    first_touch: Optional[FirstTouch] = None
    last_touch: Optional[LastTouch] = None
    conversion_value: Optional[float] = None
    attribution_model: str = Field(default="time_decay")
    total_touchpoints: int = Field(default=0)
    conversion_path: Optional[str] = None
    created_at: str


# =================================================================
# ANALYTICS DATABASE MODELS
# =================================================================

class AttributionContext(BaseModel):
    """Attribution context for events"""
    is_first_visit: bool = Field(default=False)
    is_conversion_event: bool = Field(default=False)
    touchpoint_sequence: Optional[int] = None
    days_since_first_touch: Optional[int] = None


class EventProperties(BaseModel):
    """Event properties"""
    page: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    screen_resolution: Optional[str] = None
    time_on_page: Optional[int] = None


class EventTracking(BaseModel):
    """Event tracking table (DynamoDB)"""
    event_date: str = Field(..., description="Partition key - YYYY-MM-DD")
    event_id: str = Field(..., description="Sort key")
    timestamp: str
    event_type: str
    action: str
    user_id: Optional[str] = None
    user_type: Optional[str] = None
    session_id: Optional[str] = None
    utm_tracking: Optional[UTMTracking] = None
    referral_data: Optional[ReferralData] = None
    properties: Optional[EventProperties] = None
    attribution_context: Optional[AttributionContext] = None
    school_id: Optional[str] = None
    coach_id: Optional[str] = None


# =================================================================
# COMMUNICATION DATABASE MODELS
# =================================================================

class MessageType(str, Enum):
    """Message types"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VIDEO = "video"
    AUDIO = "audio"


class DeliveryStatus(str, Enum):
    """Message delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Attachment(BaseModel):
    """Message attachment"""
    filename: str
    url: str
    size: Optional[int] = None
    mime_type: Optional[str] = None


class Message(BaseModel):
    """Messages table (DynamoDB)"""
    conversation_id: str = Field(..., description="Partition key")
    timestamp: str = Field(..., description="Sort key")
    message_id: str
    sender_id: str
    sender_type: str
    recipient_id: str
    recipient_type: str
    message_type: MessageType
    content: str
    read_status: bool = Field(default=False)
    delivery_status: DeliveryStatus = DeliveryStatus.PENDING
    attachments: List[Attachment] = Field(default_factory=list)
    thread_id: Optional[str] = None


class NotificationType(str, Enum):
    """Notification types"""
    ASSIGNMENT_DUE = "assignment_due"
    MESSAGE_RECEIVED = "message_received"
    EVENT_REMINDER = "event_reminder"
    SYSTEM_UPDATE = "system_update"


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class DeliveryChannelStatus(BaseModel):
    """Delivery channel status"""
    push: Optional[str] = None
    email: Optional[str] = None
    sms: Optional[str] = None


class Notification(BaseModel):
    """Notifications table (DynamoDB)"""
    user_id: str = Field(..., description="Partition key")
    timestamp: str = Field(..., description="Sort key")
    notification_id: str
    type: NotificationType
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    priority: NotificationPriority = NotificationPriority.MEDIUM
    read: bool = Field(default=False)
    action_required: bool = Field(default=False)
    action_url: Optional[str] = None
    delivery_channels: List[str] = Field(default_factory=list)
    delivery_status: Optional[DeliveryChannelStatus] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    expires_at: Optional[str] = None


# =================================================================
# PAYMENT DATABASE MODELS
# =================================================================

class TransactionStatus(str, Enum):
    """Transaction status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Payment methods"""
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class BillingCycle(str, Enum):
    """Billing cycles"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"


class Transaction(BaseModel):
    """Transactions table (DynamoDB)"""
    transaction_id: str = Field(..., description="Partition key")
    customer_id: str
    student_id: Optional[str] = None
    amount: int  # Amount in cents
    currency: str = Field(default="USD")
    payment_method: PaymentMethod
    payment_processor: str
    processor_transaction_id: str
    status: TransactionStatus
    description: str = Field(..., max_length=500)
    invoice_id: Optional[str] = None
    subscription_id: Optional[str] = None
    created_at: str
    processed_at: Optional[str] = None


class Subscription(BaseModel):
    """Subscriptions table (DynamoDB)"""
    subscription_id: str = Field(..., description="Partition key")
    customer_id: str = Field(..., description="GSI key")
    student_id: Optional[str] = None
    plan_id: str
    plan_name: str
    amount: int  # Amount in cents
    currency: str = Field(default="USD")
    billing_cycle: BillingCycle
    status: SubscriptionStatus
    current_period_start: str
    current_period_end: str
    next_billing_date: str
    stripe_subscription_id: Optional[str] = None
    trial_end: Optional[str] = None
    discount_applied: Optional[str] = None
    payment_method_id: str
    created_at: str
    updated_at: str


# =================================================================
# DOCUMENT DATABASE MODELS
# =================================================================

class DocumentType(str, Enum):
    """Document types"""
    ENROLLMENT_FORM = "enrollment_form"
    MEDICAL_RECORDS = "medical_records"
    EMERGENCY_CONTACTS = "emergency_contacts"
    PHOTO_RELEASE = "photo_release"
    LEGAL_DOCUMENT = "legal_document"
    CERTIFICATE = "certificate"
    TRANSCRIPT = "transcript"


class DocumentStatus(str, Enum):
    """Document status"""
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    SIGNED = "signed"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Document(BaseModel):
    """Documents table (DynamoDB)"""
    document_id: str = Field(..., description="Partition key")
    student_id: str = Field(..., description="GSI key")
    coach_id: Optional[str] = None
    document_type: DocumentType
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    status: DocumentStatus
    signature_required: bool = Field(default=False)
    signed_by: List[str] = Field(default_factory=list)
    compliance_tags: List[str] = Field(default_factory=list)
    retention_date: Optional[str] = None
    created_at: str
    updated_at: str


class DocumentTemplate(BaseModel):
    """Document templates table (DynamoDB)"""
    template_id: str = Field(..., description="Partition key")
    template_name: str = Field(..., max_length=255)
    template_type: str
    category: str
    version: str = Field(default="v1.0")
    is_active: bool = Field(default=True)
    template_content: str  # S3 URL
    merge_fields: List[str] = Field(default_factory=list)
    required_signatures: List[str] = Field(default_factory=list)
    compliance_requirements: List[str] = Field(default_factory=list)
    retention_period_years: int = Field(default=7)
    created_by: str
    created_at: str
    updated_at: str


class ComplianceStatus(str, Enum):
    """Compliance status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class ComplianceTracking(BaseModel):
    """Compliance tracking table (DynamoDB)"""
    compliance_id: str = Field(..., description="Partition key")
    student_id: str = Field(..., description="GSI key")
    coach_id: Optional[str] = None
    requirement_type: str
    requirement_name: str = Field(..., max_length=255)
    status: ComplianceStatus
    required_documents: List[str] = Field(default_factory=list)
    completed_documents: List[str] = Field(default_factory=list)
    missing_documents: List[str] = Field(default_factory=list)
    due_date: Optional[str] = None
    completion_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    compliance_score: Optional[int] = None
    last_reminder_sent: Optional[str] = None
    created_at: str
    updated_at: str


# =================================================================
# USER SESSIONS DATABASE MODELS
# =================================================================

class SessionStatus(str, Enum):
    """Session status"""
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class DeviceInfo(BaseModel):
    """Device information"""
    device_type: str
    browser: str
    os: str
    ip_address: str


class Location(BaseModel):
    """Location information"""
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class UserSession(BaseModel):
    """User sessions table (DynamoDB)"""
    session_id: str = Field(..., description="Partition key")
    user_id: str = Field(..., description="GSI key")
    user_type: str
    device_info: Optional[DeviceInfo] = None
    location: Optional[Location] = None
    login_timestamp: str
    last_activity: str
    expires_at: str
    status: SessionStatus
    logout_timestamp: Optional[str] = None
    session_duration: Optional[int] = None  # In seconds
    pages_visited: List[str] = Field(default_factory=list)
    actions_performed: int = Field(default=0)


# =================================================================
# MONITORING DATABASE MODELS
# =================================================================

class MetricType(str, Enum):
    """Metric types"""
    GAUGE = "gauge"
    COUNTER = "counter"
    HISTOGRAM = "histogram"
    TIMER = "timer"


class SystemMetric(BaseModel):
    """System metrics table (DynamoDB)"""
    metric_date: str = Field(..., description="Partition key - YYYY-MM-DD")
    timestamp: str = Field(..., description="Sort key")
    metric_name: str
    metric_value: Union[int, float]
    metric_type: MetricType
    service: str
    environment: str
    dimensions: Dict[str, str] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


# =================================================================
# DYNAMODB TABLE CONFIGURATION
# =================================================================

DYNAMODB_TABLE_CONFIGS = {
    "coach-profiles": {
        "KeySchema": [
            {"AttributeName": "coach_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "coach_id", "AttributeType": "S"},
            {"AttributeName": "school_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "school-index",
                "KeySchema": [{"AttributeName": "school_id", "KeyType": "HASH"}]
            }
        ]
    },
    
    "progress-tracking": {
        "KeySchema": [
            {"AttributeName": "coach_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "coach_id", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
            {"AttributeName": "category", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "category-date-index",
                "KeySchema": [
                    {"AttributeName": "category", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ]
            }
        ]
    },
    
    "lead-profiles": {
        "KeySchema": [
            {"AttributeName": "lead_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "lead_id", "AttributeType": "S"},
            {"AttributeName": "assigned_coach", "AttributeType": "S"},
            {"AttributeName": "status", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "coach-status-index",
                "KeySchema": [
                    {"AttributeName": "assigned_coach", "KeyType": "HASH"},
                    {"AttributeName": "status", "KeyType": "RANGE"}
                ]
            }
        ]
    },
    
    "attribution-tracking": {
        "KeySchema": [
            {"AttributeName": "attribution_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "attribution_id", "AttributeType": "S"},
            {"AttributeName": "lead_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "lead-attribution-index",
                "KeySchema": [{"AttributeName": "lead_id", "KeyType": "HASH"}]
            }
        ]
    },
    
    "event-tracking": {
        "KeySchema": [
            {"AttributeName": "event_date", "KeyType": "HASH"},
            {"AttributeName": "event_id", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "event_date", "AttributeType": "S"},
            {"AttributeName": "event_id", "AttributeType": "S"}
        ]
    },
    
    "messages": {
        "KeySchema": [
            {"AttributeName": "conversation_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "conversation_id", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
            {"AttributeName": "recipient_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "recipient-timestamp-index",
                "KeySchema": [
                    {"AttributeName": "recipient_id", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ]
            }
        ]
    },
    
    "notifications": {
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"}
        ]
    },
    
    "transactions": {
        "KeySchema": [
            {"AttributeName": "transaction_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "transaction_id", "AttributeType": "S"}
        ]
    },
    
    "subscriptions": {
        "KeySchema": [
            {"AttributeName": "subscription_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "subscription_id", "AttributeType": "S"},
            {"AttributeName": "customer_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "customer-subscription-index",
                "KeySchema": [{"AttributeName": "customer_id", "KeyType": "HASH"}]
            }
        ]
    },
    
    "documents": {
        "KeySchema": [
            {"AttributeName": "document_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "document_id", "AttributeType": "S"},
            {"AttributeName": "student_id", "AttributeType": "S"},
            {"AttributeName": "document_type", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "student-type-index",
                "KeySchema": [
                    {"AttributeName": "student_id", "KeyType": "HASH"},
                    {"AttributeName": "document_type", "KeyType": "RANGE"}
                ]
            }
        ]
    },
    
    "document-templates": {
        "KeySchema": [
            {"AttributeName": "template_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "template_id", "AttributeType": "S"}
        ]
    },
    
    "compliance-tracking": {
        "KeySchema": [
            {"AttributeName": "compliance_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "compliance_id", "AttributeType": "S"},
            {"AttributeName": "student_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "student-compliance-index",
                "KeySchema": [{"AttributeName": "student_id", "KeyType": "HASH"}]
            }
        ]
    },
    
    "user-sessions": {
        "KeySchema": [
            {"AttributeName": "session_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "session_id", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"}
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "user-sessions-index",
                "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}]
            }
        ]
    },
    
    "system-metrics": {
        "KeySchema": [
            {"AttributeName": "metric_date", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "metric_date", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"}
        ]
    }
} 