# Coach Onboarding Integration Guide

## Overview

The TSA Admin Backend now collects comprehensive coach information during the invitation process to streamline the onboarding experience. This document outlines how to integrate this pre-collected data with the coach onboarding flow.

## Enhanced Invitation Data Structure

### Required Fields (Collected During Invitation)
- `first_name` - Coach's first name
- `last_name` - Coach's last name  
- `email` - Coach's email address
- `phone` - Coach's phone number (normalized to digits only)
- `city` - Coach's city
- `state` - Coach's state (normalized to uppercase)

### Optional Fields
- `bio` - Coach's biography/background (optional)
- `message` - Admin message to coach

### Generated Fields (Auto-populated)
- `full_name` - Combined first and last name
- `location` - Combined city and state
- `phone_formatted` - Display-friendly phone format: `(123) 456-7890`

## Database Schema

### Invitations Table Structure
```json
{
  "invitation_id": "uuid",
  "invitation_token": "uuid", 
  "email": "coach@example.com",
  "first_name": "John",
  "last_name": "Smith", 
  "phone": "1234567890",
  "city": "Dallas",
  "state": "TX",
  "bio": "Experienced basketball coach...",
  "message": "Welcome to TSA!",
  "status": "pending|accepted|expired|cancelled",
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": 1705312200,
  "created_by": "admin-user-id",
  "full_name": "John Smith",
  "location": "Dallas, TX", 
  "phone_formatted": "(123) 456-7890"
}
```

## API Usage Examples

### Create Enhanced Invitation
```bash
curl -X POST https://api.example.com/admin/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Sarah",
    "last_name": "Johnson", 
    "email": "sarah.johnson@example.com",
    "phone": "555-123-4567",
    "city": "Austin",
    "state": "TX",
    "bio": "Experienced volleyball coach with 10+ years coaching high school teams.",
    "message": "Welcome to TSA! We are excited to have you join our coaching team.",
    "admin_user_id": "admin-test"
  }'
```

### Response
```json
{
  "message": "Invitation created successfully",
  "invitation_id": "7a9187f8-56bf-4866-8c83-3a56a181a1b3",
  "invite_url": "https://coach.texassportsacademy.com/onboarding?invite=37e5d8a6-e862-42ea-8614-c0cfaeb2053d",
  "expires_at": 1750531379,
  "coach_info": {
    "full_name": "Sarah Johnson",
    "email": "sarah.johnson@example.com", 
    "location": "Austin, TX",
    "phone": "(555) 123-4567"
  }
}
```

## Onboarding Integration Strategy

### 1. Token-Based Data Retrieval

When a coach clicks the invitation link (`/onboarding?invite=TOKEN`), the onboarding system should:

```typescript
// Frontend onboarding page
const searchParams = useSearchParams();
const inviteToken = searchParams.get('invite');

// Fetch invitation data (to be implemented)
const invitationData = await fetch(`/api/invitations/verify/${inviteToken}`)
  .then(res => res.json());

if (invitationData.success) {
  // Pre-populate onboarding form with invitation data
  const coachInfo = invitationData.invitation;
  // Use coachInfo.first_name, coachInfo.last_name, etc.
}
```

### 2. Pre-populated Onboarding Form

The onboarding form should be pre-populated with invitation data:

```typescript
interface OnboardingFormData {
  // Pre-populated from invitation (read-only or editable)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  bio?: string;
  
  // Additional onboarding fields
  dateOfBirth?: string;
  emergencyContact?: string;
  certifications?: string[];
  experience?: string;
  specialties?: string[];
  availability?: ScheduleData;
}
```

## Implementation Features

### ✅ Completed
- **Enhanced invitation creation** with comprehensive coach data
- **Field validation** for required fields (first_name, last_name, email, phone, city, state)
- **Phone number formatting** and normalization
- **Personalized email sending** with coach information
- **Data storage** in DynamoDB with proper indexing
- **Error handling** for missing fields and validation failures

### 🔄 To Be Implemented
- **Invitation token verification endpoint** for onboarding integration
- **Coach onboarding completion endpoint** 
- **Frontend integration** for pre-populated forms

## Security Considerations

### Token Validation
- Tokens expire after 7 days
- Single-use tokens (mark as used after onboarding completion)
- Validate token format and existence
- Check invitation status (must be 'pending')

### Data Privacy
- Invitation data should only be accessible via valid token
- Implement rate limiting on verification endpoints
- Log all invitation verification attempts
- Clear sensitive data after successful onboarding

## Testing Results

### ✅ Validation Testing
```bash
# Missing required fields
curl -X POST .../invitations -d '{"first_name": "John", "email": "john@example.com"}'
# Response: {"error": "Missing required fields: last_name, phone, city, state"}
```

### ✅ Successful Creation
```bash
# Complete invitation data
curl -X POST .../invitations -d '{
  "first_name": "Sarah", "last_name": "Johnson", 
  "email": "sarah.johnson@example.com", "phone": "555-123-4567",
  "city": "Austin", "state": "TX", "bio": "Experienced coach..."
}'
# Response: Success with formatted phone number and location
```

### ✅ Email Integration
- Personalized emails sent via SendGrid
- Comprehensive coach information included in email context
- Proper logging: "Sending personalized invitation email to sarah.johnson@example.com for coach Sarah Johnson from Austin, TX"

## Quick Reference

### Environment Variables
- `TSA_INVITATIONS_TABLE` - DynamoDB table name
- `TSA_FRONTEND_URL` - Coach frontend URL for invitation links
- `SENDGRID_SECRET_ARN` - SendGrid API key secret ARN

### Key Functions
- `create_invitation()` - Creates invitation with comprehensive data
- `format_phone_number()` - Formats phone for display: `(123) 456-7890`
- `send_invitation_email()` - Sends personalized invitation email
- `validate_required_fields()` - Validates all required fields are present

### Database Indexes
- Primary: `invitation_id`
- GSI: `status-index` for filtering by status
- Consider adding: `email-index` for duplicate checking

---

## Next Steps for Onboarding Integration

1. **Create invitation verification endpoint** in admin backend
2. **Update coach frontend** to handle invitation tokens
3. **Implement pre-populated onboarding forms**
4. **Add onboarding completion tracking**
5. **Test end-to-end invitation flow** 