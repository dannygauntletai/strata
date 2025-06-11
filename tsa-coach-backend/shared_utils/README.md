# TSA Coach Models Library

A modular, scalable Pydantic models library for the TSA Coach platform, designed for data validation and consistency across PostgreSQL and DynamoDB systems.

## 📁 File Structure

The models are organized into focused, domain-specific modules:

```
python/
├── models.py              # Main entry point - imports and re-exports all models
├── base_models.py         # Core entities: User, Organization, enums
├── coach_models.py        # Coach-specific: CoachProfile, performance metrics
├── timeline_models.py     # Flexible timeline system for microschool launch
├── session_models.py      # Temporary DynamoDB session data (TTL-enabled)
├── api_models.py          # API request/response models
└── timeline_schema_examples.json  # DynamoDB schema examples
```

## 🏗️ Architecture Strategy

### **Hybrid Database Approach**
- **PostgreSQL**: Permanent data with Ed-Fi/OneRoster compliance
  - Users, Organizations, Coach Profiles
  - Structured relationships and ACID compliance
  
- **DynamoDB**: Temporary session data and flexible timelines
  - Onboarding wizard sessions (with TTL)
  - Customizable timeline instances
  - High-speed, schema-flexible operations

## 📋 Module Details

### 1. `base_models.py` - Core Foundation
Contains fundamental entities and enums used across the platform:

```python
# Enums
UserType, UserStatus, OrganizationType, AssociationRole

# Models  
Organization, User, UserOrgAssociation
```

**Key Features:**
- Ed-Fi/OneRoster compliant field mappings
- PostgreSQL CHECK constraint validation
- Multi-level organizational hierarchy support

### 2. `coach_models.py` - Coach Management
Specialized models for coach functionality:

```python
# Enums
BackgroundCheckStatus, OnboardingStatus

# Models
CoachProfile, CoachPerformanceMetric
```

**Key Features:**
- Comprehensive coach profile with business info (LLC, EIN, insurance)
- Background check workflow management
- Performance tracking and capacity management
- Flexible sport specialties and location preferences

### 3. `timeline_models.py` - Dynamic Timeline System
**DESIGN PHILOSOPHY: Maximum Flexibility & Adaptability**

```python
# Enums
TimelineStepStatus, TimelineStepPriority, TimelineStepCategory

# Models
FlexibleTimelineTemplate, DynamicTimelineStep, CoachTimelineInstance,
DynamicTimelineStepInstance, TimelineChangeEvent, TimelineAnalytics
```

**Revolutionary Features:**
- **Steps can be added, removed, reordered, or modified at any time**
- Templates serve as starting points, not rigid requirements
- Complete change tracking with undo/redo capability
- AI-powered recommendations and automation support
- Rich customization with personal notes, resources, evidence
- Complex dependency management (hard, soft, conditional)
- Collaboration features (delegation, mentoring, peer review)

### 4. `session_models.py` - Temporary Data
DynamoDB models with TTL for temporary session management:

```python
OnboardingWizardSession, QuizAttemptSession, TempInvitation
```

**Key Features:**
- Automatic cleanup via DynamoDB TTL
- Session state management
- Temporary invitation system

### 5. `api_models.py` - API Layer
Request/response models for all API endpoints:

```python
# Basic API
CreateUserRequest, CreateCoachRequest, ApiResponse, PaginatedResponse

# Timeline API
CreateFlexibleTimelineRequest, DynamicStepUpdateRequest,
TimelineReorganizationRequest, FlexibleTimelineAnalyticsResponse
```

## 🚀 Usage Examples

### Import All Models (Backward Compatible)
```python
from models import (
    User, Organization, CoachProfile,
    TimelineStepStatus, CoachTimelineInstance,
    CreateUserRequest, ApiResponse
)
```

### Import from Specific Modules
```python
from base_models import User, UserType
from coach_models import CoachProfile, BackgroundCheckStatus
from timeline_models import CoachTimelineInstance, TimelineStepStatus
```

### Create a Flexible Timeline
```python
from api_models import CreateFlexibleTimelineRequest

timeline_request = CreateFlexibleTimelineRequest(
    timeline_name="My Basketball Microschool 2024",
    based_on_template_id="default_microschool_v1",
    focus_areas=["basketball", "stem_integration"],
    customization_level="extensive",
    target_launch_date="2024-08-15"
)
```

### Customize Timeline Steps
```python
from timeline_models import DynamicTimelineStepInstance, TimelineStepStatus

step = DynamicTimelineStepInstance(
    step_instance_id="coach_123_timeline#marketing_001",
    timeline_id="coach_123_default_2024",
    coach_id="coach_123",
    name="Develop Basketball-Focused Marketing",
    status=TimelineStepStatus.IN_PROGRESS,
    custom_next_actions=[
        "Create basketball showcase video",
        "Partner with local basketball leagues",
        "Design basketball-themed flyers"
    ],
    personal_notes="Focus on competitive advantages in basketball training",
    tags=["basketball", "marketing", "community_outreach"]
)
```

## 🔧 Advanced Features

### Timeline Flexibility Examples

**Add Custom Steps:**
```python
# Coaches can add completely custom steps
custom_step = DynamicTimelineStepInstance(
    is_custom_step=True,
    step_source="coach",
    name="Partner with Local Basketball Academy",
    category=TimelineStepCategory.COMMUNITY,
    custom_next_actions=["Research local academies", "Schedule meetings"]
)
```

**Reorder Steps:**
```python
# Float-based ordering allows insertion between existing steps
step.order_index = 3.5  # Insert between step 3 and 4
```

**Track Changes:**
```python
from timeline_models import TimelineChangeEvent

change_event = TimelineChangeEvent(
    change_type="step_modified",
    change_description="Added basketball-specific marketing actions",
    change_reason="Want to emphasize basketball expertise",
    triggered_by="coach"
)
```

## 💾 Database Integration

### PostgreSQL (Structured Data)
```python
# User with organization association
user = User(
    source_id="coach_001",
    username="erica_johnson",
    email="erica@basketballacademy.com",
    type=UserType.COACH,
    status=UserStatus.ACTIVE
)

association = UserOrgAssociation(
    user_id=user.id,
    org_id="org_456",
    role=AssociationRole.HEAD_COACH
)
```

### DynamoDB (Flexible Data)
```python
# Timeline instance with custom fields
timeline = CoachTimelineInstance(
    timeline_id="coach_123_basketball_2024",
    coach_id="coach_123",
    custom_fields={
        "focus_sport": "basketball",
        "target_age_group": "8-14",
        "competitive_level": "recreational_to_competitive"
    }
)
```

## 🔄 Migration and Backward Compatibility

The modular structure maintains **100% backward compatibility**. Existing code importing from `models.py` will continue to work unchanged:

```python
# This still works exactly as before
from models import User, CoachProfile, CreateUserRequest
```

## 🎯 Benefits of Modular Design

1. **Maintainability**: Smaller, focused files are easier to understand and modify
2. **Performance**: Import only what you need
3. **Collaboration**: Teams can work on different modules simultaneously
4. **Testing**: Each module can be tested independently
5. **Scalability**: Easy to add new domains without cluttering existing files
6. **Flexibility**: Timeline system allows complete customization
7. **Documentation**: Each module is self-documenting with clear purpose

## 📈 Future Extensibility

The modular design makes it easy to add new domains:

```python
# Future modules could include:
├── academic_models.py     # Student progress, curriculum
├── financial_models.py    # Payments, ESA, transactions
├── communication_models.py # Messages, notifications
├── analytics_models.py    # Reporting, insights
```

Each new module follows the same pattern: define models, re-export in `models.py`, maintain backward compatibility.

---

**This modular architecture provides a solid foundation for scaling the TSA Coach platform while maintaining the flexibility coaches need to succeed.** 🚀 

# Shared Database Client for TSA Coach Lambda Functions

## Overview

This shared layer provides a unified database client that handles both **PostgreSQL (RDS)** and **DynamoDB** operations across all Lambda functions in the TSA Coach serverless architecture.

## Architecture

### Data Storage Strategy
- **PostgreSQL (RDS)**: Users, organizations, academic records (OneRoster/Ed-Fi compliance)
- **DynamoDB**: Events, wizards, templates, temporary session data

### Why This Approach?
- **Centralized**: Single database client for all Lambda functions
- **Connection Pooling**: Efficient PostgreSQL connection management
- **Error Handling**: Consistent error handling and logging
- **Performance**: Singleton pattern for Lambda container reuse
- **Maintainability**: Single source of truth for database operations

## Usage in Lambda Functions

### Basic Usage

```python
from shared_layer.python.database_client import with_database, DatabaseError

@with_database
def lambda_handler(event, context, db):
    """Lambda handler with automatic database client injection"""
    try:
        # PostgreSQL operations
        user = db.get_user(user_id)
        organization = db.get_organization(org_id)
        
        # DynamoDB operations
        event_data = db.get_event(event_id)
        db.create_event(new_event_data)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'success': True})
        }
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database operation failed'})
        }
```

### Manual Database Client Usage

```python
from shared_layer.python.database_client import get_db

def my_function():
    db = get_db()
    
    # Direct PostgreSQL access
    results = db.postgres.execute_query(
        "SELECT * FROM users WHERE org_id = %s", 
        (org_id,)
    )
    
    # Direct DynamoDB access
    db.dynamodb.put_item('events', event_data)
```

## Available Operations

### PostgreSQL Operations
- `db.postgres.execute_query(query, params)` - SELECT queries
- `db.postgres.execute_update(query, params)` - INSERT/UPDATE/DELETE
- `db.postgres.execute_batch(queries)` - Transaction batch
- `db.get_user(user_id)` - Get user by ID
- `db.get_organization(org_id)` - Get organization by ID
- `db.get_organization_users(org_id)` - Get users in organization

### DynamoDB Operations
- `db.dynamodb.put_item(table_name, item)` - Insert item
- `db.dynamodb.get_item(table_name, key)` - Get item by key
- `db.dynamodb.query_items(table_name, condition, values, index)` - Query items
- `db.dynamodb.update_item(table_name, key, expression, values)` - Update item
- `db.dynamodb.delete_item(table_name, key)` - Delete item

### Event-Specific Operations
- `db.create_event(event_data)` - Create event in DynamoDB
- `db.get_event(event_id)` - Get event by ID
- `db.get_events_by_organization(org_id)` - Get org events
- `db.register_for_event(registration_data)` - Register for event
- `db.get_event_registrations(event_id)` - Get event registrations

### Wizard/Session Operations
- `db.save_wizard_session(session_data)` - Save wizard session
- `db.get_wizard_session(session_id)` - Get wizard session

## Environment Variables

### Required for PostgreSQL
```bash
RDS_HOST=your-rds-endpoint
RDS_PORT=5432
RDS_DATABASE=tsa_coach
RDS_USERNAME=your-username
RDS_PASSWORD=your-password
```

### Required for DynamoDB
```bash
AWS_REGION=us-east-1
DYNAMODB_TABLE_PREFIX=tsa-coach
```

### Optional Configuration
```bash
RDS_MIN_CONNECTIONS=1
RDS_MAX_CONNECTIONS=5
```

## Error Handling

The client provides consistent error handling:

```python
from shared_layer.python.database_client import DatabaseError

try:
    result = db.some_operation()
except DatabaseError as e:
    # Database-specific error
    logger.error(f"Database error: {e}")
except Exception as e:
    # General error
    logger.error(f"Unexpected error: {e}")
```

## Performance Benefits

1. **Connection Pooling**: PostgreSQL connections are pooled and reused
2. **Lambda Container Reuse**: Singleton pattern leverages Lambda warm starts
3. **Automatic Timestamps**: DynamoDB items get automatic created_at/updated_at
4. **Efficient Queries**: Common operations are optimized

## Health Checks

```python
health = db.health_check()
# Returns: {'postgresql': True, 'dynamodb': True}
```

## Table Naming Convention

DynamoDB tables follow the pattern: `{DYNAMODB_TABLE_PREFIX}-{table_name}`

Example: `tsa-coach-events`, `tsa-coach-event-registrations` 