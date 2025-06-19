"""
DynamoDB Table Models - Consolidated runtime models for TSA platform
Contains operational data models for high-performance NoSQL operations used by Lambda functions

ARCHITECTURE:
- Coach Database: Coach profiles, progress tracking with wizard flows
- Leads Database: Lead profiles, attribution tracking  
- Analytics Database: Event tracking, UTM campaigns
- Communication Database: Messages, notifications
- Payment Database: Transactions, subscriptions
- Document Database: Documents, templates, compliance tracking
- User Sessions Database: Session management
- Monitoring Database: System metrics
- Events Database: TSA events with Eventbrite integration
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime, timezone


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


# =================================================================
# EVENTS DATABASE MODELS
# =================================================================

class EventStatus(str, Enum):
    """Event status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class EventVisibility(str, Enum):
    """Event visibility"""
    PUBLIC = "public"
    PRIVATE = "private"


class EventCategory(str, Enum):
    """Event categories"""
    TRAINING = "training"
    TOURNAMENT = "tournament" 
    CAMP = "camp"
    MEETING = "meeting"
    CLINIC = "clinic"
    SHOWCASE = "showcase"
    TRYOUT = "tryout"
    SOCIAL = "social"


class TicketType(BaseModel):
    """Event ticket type"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    cost: float = Field(default=0.0, ge=0.0)  # Cost in dollars
    currency: str = Field(default="USD")
    quantity_total: Optional[int] = None  # None = unlimited
    quantity_sold: int = Field(default=0)
    sales_start: Optional[str] = None  # ISO datetime
    sales_end: Optional[str] = None    # ISO datetime
    hidden: bool = Field(default=False)
    include_fee: bool = Field(default=True)
    split_fee_with_organizer: bool = Field(default=False)


class EventbriteIntegration(BaseModel):
    """Eventbrite integration details"""
    eventbrite_event_id: Optional[str] = None
    eventbrite_url: Optional[str] = None
    eventbrite_status: Optional[str] = None
    last_synced: Optional[str] = None
    sync_errors: List[str] = Field(default_factory=list)
    auto_sync_enabled: bool = Field(default=True)


class Event(BaseModel):
    """Events table (DynamoDB) - TSA events that integrate with Eventbrite"""
    event_id: str = Field(..., description="Partition key")
    coach_id: str = Field(..., description="GSI key - event creator")
    
    # Basic Event Information
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    summary: Optional[str] = Field(None, max_length=500)  # Short description
    
    # Date and Time
    start_date: str = Field(..., description="ISO datetime with timezone")
    end_date: str = Field(..., description="ISO datetime with timezone")
    timezone: str = Field(default="America/Chicago")
    
    # Location Details  
    venue_name: Optional[str] = Field(None, max_length=255)
    address_line_1: Optional[str] = Field(None, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="US")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Event Configuration
    category: EventCategory = EventCategory.TRAINING
    subcategory: Optional[str] = Field(None, max_length=100)
    tags: List[str] = Field(default_factory=list)
    status: EventStatus = EventStatus.DRAFT
    visibility: EventVisibility = EventVisibility.PUBLIC
    
    # Capacity and Registration
    capacity: Optional[int] = None  # None = unlimited
    current_registrations: int = Field(default=0)
    waitlist_enabled: bool = Field(default=False)
    registration_deadline: Optional[str] = None  # ISO datetime
    
    # Ticketing
    ticket_types: List[TicketType] = Field(default_factory=list)
    currency: str = Field(default="USD")
    refund_policy: Optional[str] = Field(None, max_length=1000)
    
    # Requirements and Information
    age_restrictions: Optional[str] = Field(None, max_length=200)
    requirements: List[str] = Field(default_factory=list)
    what_to_bring: List[str] = Field(default_factory=list)
    
    # Media
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    
    # Eventbrite Integration
    eventbrite: EventbriteIntegration = Field(default_factory=EventbriteIntegration)
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    published_at: Optional[str] = None


class EventbriteOAuthStatus(str, Enum):
    """Eventbrite OAuth status"""
    NOT_CONNECTED = "not_connected"
    CONNECTED = "connected"
    EXPIRED = "expired"
    ERROR = "error"


class EventbriteConfig(BaseModel):
    """Coach's Eventbrite configuration"""
    coach_id: str = Field(..., description="Partition key")
    
    # OAuth Integration
    oauth_status: EventbriteOAuthStatus = EventbriteOAuthStatus.NOT_CONNECTED
    access_token: Optional[str] = None  # Encrypted
    refresh_token: Optional[str] = None  # Encrypted
    token_expires_at: Optional[str] = None  # ISO datetime
    
    # Eventbrite Account Info
    eventbrite_user_id: Optional[str] = None
    eventbrite_organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    
    # Default Settings
    default_currency: str = Field(default="USD")
    default_timezone: str = Field(default="America/Chicago") 
    auto_publish_events: bool = Field(default=False)
    sync_attendees: bool = Field(default=True)
    
    # Sync Status
    last_sync: Optional[str] = None
    sync_errors: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AttendeeStatus(str, Enum):
    """Attendee status from Eventbrite"""
    ATTENDING = "attending"
    NOT_ATTENDING = "not_attending"
    CHECKED_IN = "checked_in"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class EventAttendee(BaseModel):
    """Event attendees synced from Eventbrite"""
    attendee_id: str = Field(..., description="Partition key - Eventbrite attendee ID")
    event_id: str = Field(..., description="GSI key")
    
    # Attendee Information
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    
    # Registration Details
    ticket_class_name: str = Field(..., max_length=255)
    order_id: str
    cost: float = Field(default=0.0)
    currency: str = Field(default="USD")
    
    # Status
    status: AttendeeStatus = AttendeeStatus.ATTENDING
    checked_in: bool = Field(default=False)
    check_in_time: Optional[str] = None
    
    # Registration Questions (from Eventbrite)
    registration_answers: Dict[str, Any] = Field(default_factory=dict)
    
    # Sync Information
    eventbrite_created: str  # When registered on Eventbrite
    last_synced: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =================================================================
# COMMUNICATION MODELS
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
# ANALYTICS AND TRACKING MODELS
# =================================================================

class EventProperties(BaseModel):
    """Event properties"""
    page: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    screen_resolution: Optional[str] = None
    time_on_page: Optional[int] = None


class AttributionContext(BaseModel):
    """Attribution context for events"""
    is_first_visit: bool = Field(default=False)
    is_conversion_event: bool = Field(default=False)
    touchpoint_sequence: Optional[int] = None
    days_since_first_touch: Optional[int] = None


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
# UTILITY FUNCTIONS
# =================================================================

def get_current_timestamp() -> str:
    """Get current timestamp in ISO format for model defaults"""
    return datetime.now(timezone.utc).isoformat()


def validate_model_data(model_class: BaseModel, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and return clean model data
    
    Args:
        model_class: Pydantic model class
        data: Data to validate
        
    Returns:
        Validated and cleaned data
    """
    try:
        validated = model_class.parse_obj(data)
        return validated.dict()
    except Exception as e:
        raise ValueError(f"Model validation failed: {str(e)}")


# Export commonly used models for easy import
__all__ = [
    'CoachProfile', 'ProgressTracking', 'WizardFlow',
    'LeadProfile', 'LeadStatus', 'UTMTracking', 'ReferralData',
    'Event', 'EventbriteConfig', 'EventbriteOAuthStatus', 'EventAttendee',
    'EventStatus', 'EventCategory', 'TicketType',
    'Message', 'Notification', 'MessageType', 'NotificationType',
    'EventTracking', 'EventProperties', 'UTMTracking',
    # Payment models
    'Transaction', 'Subscription', 'PaymentMethod', 'BillingCycle', 'TransactionStatus', 'SubscriptionStatus',
    # Document models  
    'Document', 'DocumentTemplate', 'ComplianceTracking', 'DocumentType', 'DocumentStatus', 'ComplianceStatus',
    # Session models
    'UserSession', 'DeviceInfo', 'Location', 'SessionStatus',
    # Attribution models
    'AttributionTracking', 'FirstTouch', 'LastTouch',
    # System models
    'SystemMetric', 'MetricType',
    'get_current_timestamp', 'validate_model_data'
]


# =================================================================
# PAYMENT MODELS
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
# DOCUMENT MODELS
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
# SESSION MODELS
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
# ATTRIBUTION MODELS
# =================================================================

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
# SYSTEM MODELS
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