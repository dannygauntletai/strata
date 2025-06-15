# Archived Database Models

## Overview
This document contains database models that will be implemented in future phases after the core platform is established. These are moved here to keep the main database.md focused on essential MVP functionality.

## DynamoDB NoSQL Models (Future Implementation)

### 2. Leads Database

#### Lead Profiles Table 
```json
{
  "TableName": "lead-profiles",
  "KeySchema": [
    {
      "AttributeName": "lead_id",
      "KeyType": "HASH"
    }
  ],
  "Sample Item": {
    "lead_id": "lead_12345",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane.doe@email.com",
    "phone": "+1234567890",
    "school_district": "Metro District",
    "grade_level": "9",
    "interests": ["engineering", "robotics", "programming"],
    "lead_source": "website_form",
    "lead_score": 85,
    "status": "qualified",
    "assigned_profile": "profile_12345",
    "utm_tracking": {
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "fall_2024_enrollment",
      "utm_term": "tsa+prep+program",
      "utm_content": "hero_cta_button"
    },
    "referral_data": {
      "referrer_url": "https://google.com/search?q=tsa+prep",
      "landing_page": "https://tsacoach.com/enrollment?utm_source=google",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "session_id": "sess_12345"
    },
    "attribution_touchpoints": [
      {
        "sequence": 1,
        "timestamp": "2024-01-01T09:00:00Z",
        "utm_source": "google",
        "utm_medium": "cpc", 
        "utm_campaign": "fall_2024_enrollment",
        "utm_term": "tsa+prep+program",
        "utm_content": "hero_cta_button",
        "page_visited": "/enrollment"
      },
      {
        "sequence": 2,
        "timestamp": "2024-01-01T10:00:00Z",
        "utm_source": "direct",
        "utm_medium": "none",
        "utm_campaign": "direct",
        "page_visited": "/contact"
      }
    ],
    "contact_history": [
      {
        "date": "2024-01-01T10:00:00Z",
        "type": "email",
        "outcome": "responded",
        "notes": "Interested in TSA program"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Attribution Tracking Table
```json
{
  "TableName": "attribution-tracking",
  "KeySchema": [
    {
      "AttributeName": "attribution_id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "attribution_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "lead_id", 
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "lead-attribution-index",
      "KeySchema": [
        {
          "AttributeName": "lead_id",
          "KeyType": "HASH"
        }
      ]
    }
  ],
  "Sample Item": {
    "attribution_id": "attr_12345",
    "lead_id": "lead_12345",
    "profile_id": "profile_12345",
    "touchpoint_sequence": [
      {
        "sequence": 1,
        "timestamp": "2024-01-01T09:00:00Z",
        "utm_source": "google",
        "utm_medium": "cpc",
        "utm_campaign": "fall_enrollment_2024",
        "utm_term": "tsa+prep+program",
        "utm_content": "headline_ad_1",
        "page_visited": "/tsa-program",
        "session_duration": 180,
        "attribution_weight": 0.4
      },
      {
        "sequence": 2,
        "timestamp": "2024-01-01T10:00:00Z",
        "utm_source": "direct",
        "utm_medium": "none",
        "utm_campaign": "direct",
        "utm_term": null,
        "utm_content": null,
        "page_visited": "/enrollment",
        "session_duration": 420,
        "attribution_weight": 0.6
      }
    ],
    "first_touch": {
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "fall_enrollment_2024",
      "utm_term": "tsa+prep+program",
      "timestamp": "2024-01-01T09:00:00Z"
    },
    "last_touch": {
      "utm_source": "direct",
      "utm_medium": "none", 
      "utm_campaign": "direct",
      "utm_term": null,
      "utm_content": null,
      "timestamp": "2024-01-01T10:00:00Z"
    },
    "conversion_value": 299.99,
    "attribution_model": "time_decay",
    "total_touchpoints": 2,
    "conversion_path": "google/cpc -> direct/none",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### 3. Analytics Database

#### Event Tracking Table
```json
{
  "TableName": "event-tracking",
  "KeySchema": [
    {
      "AttributeName": "event_date",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "event_id",
      "KeyType": "RANGE"
    }
  ],
  "Sample Item": {
    "event_date": "2024-01-01",
    "event_id": "evt_12345_1704067200",
    "timestamp": "2024-01-01T10:00:00Z",
    "event_type": "user_action",
    "action": "login",
    "user_id": "user_12345",
    "user_type": "student",
    "session_id": "session_12345",
    "utm_tracking": {
      "utm_source": "facebook",
      "utm_medium": "social",
      "utm_campaign": "back_to_school_2024",
      "utm_term": null,
      "utm_content": "carousel_ad_2"
    },
    "referral_data": {
      "referrer_url": "https://facebook.com",
      "landing_page": "/dashboard",
      "ip_address": "192.168.1.50"
    },
    "properties": {
      "page": "/dashboard",
      "device": "mobile",
      "browser": "chrome",
      "screen_resolution": "390x844",
      "time_on_page": 45
    },
    "attribution_context": {
      "is_first_visit": false,
      "is_conversion_event": false,
      "touchpoint_sequence": 3,
      "days_since_first_touch": 7
    },
    "school_id": "school_001",
    "profile_id": "profile_12345"
  }
}
```

### 4. Communication Database

#### Messages Table
```json
{
  "TableName": "messages",
  "KeySchema": [
    {
      "AttributeName": "conversation_id",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ],
  "Sample Item": {
    "conversation_id": "conv_student001_profile001",
    "timestamp": "2024-01-01T10:00:00Z",
    "message_id": "msg_12345",
    "sender_id": "profile_001",
    "sender_type": "educator",
    "recipient_id": "student_001",
    "recipient_type": "student",
    "message_type": "text",
    "content": "Great job on your TSA project!",
    "read_status": false,
    "delivery_status": "delivered",
    "attachments": [],
    "thread_id": "thread_12345"
  }
}
```

#### Notifications Table
```json
{
  "TableName": "notifications",
  "KeySchema": [
    {
      "AttributeName": "user_id",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ],
  "Sample Item": {
    "user_id": "user_12345",
    "timestamp": "2024-01-01T10:00:00Z",
    "notification_id": "notif_12345",
    "type": "assignment_due",
    "title": "Assignment Due Tomorrow",
    "message": "Your TSA project presentation is due tomorrow at 3 PM",
    "priority": "high",
    "read": false,
    "action_required": true,
    "action_url": "/assignments/12345",
    "delivery_channels": ["push", "email"],
    "delivery_status": {
      "push": "delivered",
      "email": "pending"
    },
    "metadata": {
      "assignment_id": "assign_12345",
      "due_date": "2024-01-02T15:00:00Z"
    },
    "expires_at": "2024-01-07T10:00:00Z"
  }
}
```

### 5. Payment Database

#### Transactions Table
```json
{
  "TableName": "transactions",
  "KeySchema": [
    {
      "AttributeName": "transaction_id",
      "KeyType": "HASH"
    }
  ],
  "Sample Item": {
    "transaction_id": "txn_12345",
    "customer_id": "customer_001",
    "student_unique_id": "student_001", 
    "amount": 29999,
    "currency": "USD",
    "payment_method": "card",
    "payment_processor": "stripe",
    "processor_transaction_id": "pi_12345",
    "status": "completed",
    "description": "TSA Prep Program - Monthly Subscription",
    "invoice_id": "inv_12345",
    "subscription_id": "sub_12345",
    "created_at": "2024-01-01T10:00:00Z",
    "processed_at": "2024-01-01T10:00:05Z"
  }
}
```

#### Subscriptions Table
```json
{
  "TableName": "subscriptions",
  "KeySchema": [
    {
      "AttributeName": "subscription_id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "subscription_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "customer_id",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "customer-subscription-index",
      "KeySchema": [
        {
          "AttributeName": "customer_id",
          "KeyType": "HASH"
        }
      ]
    }
  ],
  "Sample Item": {
    "subscription_id": "sub_12345",
    "customer_id": "customer_001",
    "student_unique_id": "student_001",
    "plan_id": "tsa_monthly",
    "plan_name": "TSA Prep Monthly",
    "amount": 29999,
    "currency": "USD",
    "billing_cycle": "monthly",
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z",
    "next_billing_date": "2024-02-01T00:00:00Z",
    "stripe_subscription_id": "sub_stripe123",
    "trial_end": null,
    "discount_applied": null,
    "payment_method_id": "pm_12345",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 6. Document Database

#### Documents Table
```json
{
  "TableName": "documents",
  "KeySchema": [
    {
      "AttributeName": "document_id",
      "KeyType": "HASH"
    }
  ],
  "Sample Item": {
    "document_id": "doc_12345",
    "student_unique_id": "student_001",
    "profile_id": "profile_001",
    "document_type": "enrollment_form",
    "title": "TSA Program Enrollment Agreement",
    "description": "Student enrollment form for TSA preparation program",
    "file_url": "https://s3.amazonaws.com/docs/doc_12345.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "status": "pending_signature",
    "signature_required": true,
    "signed_by": [],
    "compliance_tags": ["enrollment", "privacy", "terms"],
    "retention_date": "2031-01-01",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

#### Document Templates Table
```json
{
  "TableName": "document-templates",
  "KeySchema": [
    {
      "AttributeName": "template_id",
      "KeyType": "HASH"
    }
  ],
  "Sample Item": {
    "template_id": "template_12345",
    "template_name": "Student Enrollment Agreement",
    "template_type": "legal_document",
    "category": "enrollment",
    "version": "v2.1",
    "is_active": true,
    "template_content": "s3://templates/enrollment-agreement-v2.1.docx",
    "merge_fields": [
      "student_name",
      "parent_name", 
      "enrollment_date",
      "program_details",
      "tuition_amount"
    ],
    "required_signatures": [
      "student",
      "parent_guardian",
      "school_representative"
    ],
    "compliance_requirements": ["FERPA", "state_education_law"],
    "retention_period_years": 7,
    "created_by": "admin_001",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

#### Compliance Tracking Table
```json
{
  "TableName": "compliance-tracking",
  "KeySchema": [
    {
      "AttributeName": "compliance_id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "compliance_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "student_unique_id",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "student-compliance-index",
      "KeySchema": [
        {
          "AttributeName": "student_unique_id",
          "KeyType": "HASH"
        }
      ]
    }
  ],
  "Sample Item": {
    "compliance_id": "comp_12345",
    "student_unique_id": "student_001",
    "profile_id": "profile_001",
    "requirement_type": "enrollment_documents",
    "requirement_name": "Complete Enrollment Package",
    "status": "in_progress",
    "required_documents": [
      "enrollment_agreement",
      "medical_records",
      "emergency_contacts",
      "photo_release"
    ],
    "completed_documents": [
      "enrollment_agreement",
      "emergency_contacts"
    ],
    "missing_documents": [
      "medical_records",
      "photo_release"
    ],
    "due_date": "2024-01-15T00:00:00Z",
    "completion_percentage": 50,
    "compliance_score": 85,
    "last_reminder_sent": "2024-01-01T10:00:00Z",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

### 7. User Sessions Database

#### User Sessions Table
```json
{
  "TableName": "user-sessions",
  "KeySchema": [
    {
      "AttributeName": "session_id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "session_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "user_id",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "user-sessions-index",
      "KeySchema": [
        {
          "AttributeName": "user_id",
          "KeyType": "HASH"
        }
      ]
    }
  ],
  "Sample Item": {
    "session_id": "sess_12345",
    "user_id": "user_12345",
    "user_type": "coach",
    "device_info": {
      "device_type": "desktop",
      "browser": "chrome",
      "os": "macOS",
      "ip_address": "192.168.1.100"
    },
    "location": {
      "city": "Austin",
      "state": "TX",
      "country": "US"
    },
    "login_timestamp": "2024-01-01T10:00:00Z",
    "last_activity": "2024-01-01T12:30:00Z",
    "expires_at": "2024-01-01T18:00:00Z",
    "status": "active",
    "logout_timestamp": null,
    "session_duration": 9000,
    "pages_visited": [
      "/dashboard",
      "/students",
      "/timeline",
      "/messages"
    ],
    "actions_performed": 25
  }
}
```

### 8. Monitoring Database

#### System Metrics Table
```json
{
  "TableName": "system-metrics",
  "KeySchema": [
    {
      "AttributeName": "metric_date",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ],
  "Sample Item": {
    "metric_date": "2024-01-01",
    "timestamp": "2024-01-01T10:00:00Z",
    "metric_name": "active_users",
    "metric_value": 1250,
    "metric_type": "gauge",
    "service": "coach-portal",
    "environment": "production",
    "dimensions": {
      "school_id": "school_001",
      "user_type": "student"
    },
    "tags": ["performance", "user_engagement"]
  }
}
```

## Implementation Priority

### Phase 1 (MVP - Core Platform)
- Handled in main database.md

### Phase 2 (Lead Generation & Marketing)
- Lead profiles
- Attribution tracking 
- Event tracking

### Phase 3 (Communication & Engagement)
- Messages
- Notifications

### Phase 4 (Monetization)
- Transactions
- Subscriptions

### Phase 5 (Document Management)
- Documents
- Document templates
- Compliance tracking

### Phase 6 (Advanced Features)
- User sessions
- System metrics

## Notes

These tables have been moved to focus the initial development on core functionality. They can be added back to the main schema as needed for future features. 