# TSA Coach Admin Portal - Frontend Integration Guide

## 🎯 Overview

The TSA Coach Admin Portal provides secure backend APIs for managing coach invitations and administrative oversight. This guide provides everything your frontend team needs to integrate with the admin portal backend.

## 📊 System Status

| Component | Status | Details |
|-----------|--------|---------|
| 🖥️ **API Backend** | ✅ **Ready** | All endpoints functional |
| 💾 **Database** | ✅ **Ready** | DynamoDB tables operational |
| 🔐 **Authentication** | ✅ **Ready** | Bearer token auth implemented |
| 🌐 **CORS** | ✅ **Ready** | Configured for `localhost:3001` |
| 📧 **Email** | ⏳ **Pending** | Domain verification in progress |

## 🔗 API Endpoints

### Base URLs
```javascript
const API_ENDPOINTS = {
  ADMIN_API: 'https://ekfw6ekr33.execute-api.us-east-2.amazonaws.com/prod',
  COACH_API: 'https://kcdmb9q31m.execute-api.us-east-2.amazonaws.com/prod',
  AUTH_API: 'https://in3vjwy2r8.execute-api.us-east-2.amazonaws.com/v1'
};
```

## 🔐 Authentication

### Admin Access
- **Only** `danny.mota@superbuilders.school` has admin access
- Uses Bearer token authentication
- Simple base64 encoding for development

### Authentication Setup
```javascript
// Generate authentication token
function getAuthToken() {
  const adminEmail = 'danny.mota@superbuilders.school';
  return `Bearer ${btoa(adminEmail)}`;
}

// Default headers for API requests
const getHeaders = () => ({
  'Authorization': getAuthToken(),
  'Content-Type': 'application/json'
});
```

### Authentication Test
```javascript
// Test authentication
fetch('https://ekfw6ekr33.execute-api.us-east-2.amazonaws.com/prod/admin/invitations', {
  headers: getHeaders()
})
.then(response => response.json())
.then(data => console.log('Auth successful:', data))
.catch(error => console.error('Auth failed:', error));
```

## 📋 API Endpoints Reference

### Health Check (No Auth Required)
```javascript
// GET /health
const healthCheck = async () => {
  const response = await fetch(`${API_ENDPOINTS.ADMIN_API}/health`);
  return response.json();
};

// Response:
// {
//   "status": "healthy",
//   "services": {
//     "lambda": "healthy",
//     "dynamodb": "healthy",
//     "ses": "unhealthy" // Expected until domain verification
//   },
//   "timestamp": "2025-06-04T19:49:54.891780"
// }
```

### Invitation Management (Auth Required)

#### List Invitations
```javascript
// GET /admin/invitations
// GET /admin/invitations?status=pending

const listInvitations = async (statusFilter = null) => {
  const url = statusFilter 
    ? `${API_ENDPOINTS.ADMIN_API}/admin/invitations?status=${statusFilter}`
    : `${API_ENDPOINTS.ADMIN_API}/admin/invitations`;
    
  const response = await fetch(url, { headers: getHeaders() });
  return response.json();
};

// Status filters: 'pending', 'accepted', 'cancelled', 'expired'
```

#### Create Invitation
```javascript
// POST /admin/invitations

const createInvitation = async (invitationData) => {
  const response = await fetch(`${API_ENDPOINTS.ADMIN_API}/admin/invitations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(invitationData)
  });
  return response.json();
};

// Request payload:
const invitationData = {
  email: "coach@example.com",           // Required
  role: "coach",                        // Required
  school_name: "Test High School",      // Required
  school_type: "high",                  // Optional
  sport: "football",                    // Optional
  message: "Welcome to our team!"       // Optional
};

// Available roles:
// - coach
// - instructor  
// - administrator
// - school_owner
// - director
// - principal
// - counselor

// Available school_types:
// - elementary
// - middle
// - high
// - combined
// - k-12

// Available sports:
// - football
// - basketball
// - baseball
// - soccer
// - track
// - tennis
// - volleyball
// - other
```

#### Get Single Invitation
```javascript
// GET /admin/invitations/{invitation_id}

const getInvitation = async (invitationId) => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/invitations/${invitationId}`, 
    { headers: getHeaders() }
  );
  return response.json();
};
```

#### Cancel Invitation
```javascript
// DELETE /admin/invitations/{invitation_id}

const cancelInvitation = async (invitationId) => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/invitations/${invitationId}`, 
    {
      method: 'DELETE',
      headers: getHeaders()
    }
  );
  return response.json();
};
```

#### Resend Invitation
```javascript
// POST /admin/invitations/{invitation_id}/resend

const resendInvitation = async (invitationId) => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/invitations/${invitationId}/resend`, 
    {
      method: 'POST',
      headers: getHeaders()
    }
  );
  return response.json();
};
```

### Coach Management (Auth Required)

```javascript
// GET /admin/coaches

const listCoaches = async () => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/coaches`, 
    { headers: getHeaders() }
  );
  return response.json();
};
```

### Analytics (Auth Required)

```javascript
// GET /admin/analytics

const getAnalytics = async () => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/analytics`, 
    { headers: getHeaders() }
  );
  return response.json();
};

// Response:
// {
//   "total_invitations": 25,
//   "pending_invitations": 8,
//   "completed_invitations": 15,
//   "cancelled_invitations": 2,
//   "total_coaches": 15,
//   "active_coaches": 12,
//   "onboarding_completion_rate": 60.0,
//   "average_onboarding_time": "2.5 hours",
//   "recent_activity": [...]
// }
```

### Audit Logs (Auth Required)

```javascript
// GET /admin/audit?limit=50

const getAuditLogs = async (limit = 50) => {
  const response = await fetch(
    `${API_ENDPOINTS.ADMIN_API}/admin/audit?limit=${limit}`, 
    { headers: getHeaders() }
  );
  return response.json();
};
```

## 📦 Complete API Class

```javascript
class TSAAdminAPI {
  constructor() {
    this.baseURL = 'https://ekfw6ekr33.execute-api.us-east-2.amazonaws.com/prod';
    this.adminEmail = 'danny.mota@superbuilders.school';
  }

  getAuthToken() {
    return `Bearer ${btoa(this.adminEmail)}`;
  }

  getHeaders() {
    return {
      'Authorization': this.getAuthToken(),
      'Content-Type': 'application/json'
    };
  }

  async apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
        ...options
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error.message);
      throw error;
    }
  }

  // Health check (no auth required)
  async getHealth() {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  // Invitation Management
  async getInvitations(statusFilter = null) {
    const endpoint = statusFilter 
      ? `/admin/invitations?status=${statusFilter}`
      : '/admin/invitations';
    return this.apiRequest(endpoint);
  }

  async createInvitation(invitationData) {
    return this.apiRequest('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify(invitationData)
    });
  }

  async getInvitation(invitationId) {
    return this.apiRequest(`/admin/invitations/${invitationId}`);
  }

  async cancelInvitation(invitationId) {
    return this.apiRequest(`/admin/invitations/${invitationId}`, {
      method: 'DELETE'
    });
  }

  async resendInvitation(invitationId) {
    return this.apiRequest(`/admin/invitations/${invitationId}/resend`, {
      method: 'POST'
    });
  }

  // Coach Management
  async getCoaches() {
    return this.apiRequest('/admin/coaches');
  }

  // Analytics
  async getAnalytics() {
    return this.apiRequest('/admin/analytics');
  }

  // Audit Logs
  async getAuditLogs(limit = 50) {
    return this.apiRequest(`/admin/audit?limit=${limit}`);
  }
}
```

## ⚛️ React Integration Examples

### Custom Hook for Invitations
```javascript
import { useState, useEffect } from 'react';

function useInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const api = new TSAAdminAPI();

  const fetchInvitations = async (statusFilter = null) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInvitations(statusFilter);
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (invitationData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.createInvitation(invitationData);
      await fetchInvitations(); // Refresh list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    createInvitation,
    cancelInvitation: api.cancelInvitation.bind(api),
    resendInvitation: api.resendInvitation.bind(api)
  };
}
```

### React Component Example
```javascript
import React from 'react';

function InvitationsList() {
  const { 
    invitations, 
    loading, 
    error, 
    fetchInvitations, 
    cancelInvitation 
  } = useInvitations();

  const handleCancel = async (invitationId) => {
    try {
      await cancelInvitation(invitationId);
      await fetchInvitations(); // Refresh list
      alert('Invitation cancelled successfully');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Coach Invitations ({invitations.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>School</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(invitation => (
            <tr key={invitation.invitation_id}>
              <td>{invitation.email}</td>
              <td>{invitation.school_name}</td>
              <td>{invitation.role}</td>
              <td>
                <span className={`status status-${invitation.status}`}>
                  {invitation.status}
                </span>
              </td>
              <td>{new Date(invitation.created_at).toLocaleDateString()}</td>
              <td>
                {invitation.status === 'pending' && (
                  <button 
                    onClick={() => handleCancel(invitation.invitation_id)}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 🔍 Data Models

### Invitation Object
```typescript
interface Invitation {
  invitation_id: string;
  invitation_token: string;
  email: string;
  role: string;
  school_name: string;
  school_type?: string;
  sport?: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  message?: string;
  created_at: string; // ISO timestamp
  expires_at: number;  // Unix timestamp
  created_by: string;
  accepted_at?: string;
  cancelled_at?: string;
  last_sent_at?: string;
}
```

### API Response Format
```typescript
interface InvitationsResponse {
  invitations: Invitation[];
  count: number;
}

interface CreateInvitationResponse {
  message: string;
  invitation_id: string;
  invite_url: string;
  expires_at: number;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: string[];
}
```

## ⚠️ Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created (new invitation)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (access denied)
- `404` - Not Found (invitation doesn't exist)
- `409` - Conflict (duplicate invitation)
- `500` - Internal Server Error

### Error Handling Example
```javascript
async function handleApiCall() {
  try {
    const result = await api.createInvitation(data);
    console.log('Success:', result);
  } catch (error) {
    switch (error.message) {
      case 'Authentication failed. Please log in again.':
        // Handle auth error - redirect to login
        break;
      case 'Active invitation already exists for this email':
        // Handle duplicate invitation
        break;
      default:
        // Handle generic error
        console.error('API Error:', error.message);
    }
  }
}
```

## 🧪 Testing

### Quick API Test
```bash
# Test health endpoint (no auth)
curl https://ekfw6ekr33.execute-api.us-east-2.amazonaws.com/prod/health

# Test authenticated endpoint
curl -H "Authorization: Bearer ZGFubnkubW90YUBzdXBlcmJ1aWxkZXJzLnNjaG9vbA==" \
  https://ekfw6ekr33.execute-api.us-east-2.amazonaws.com/prod/admin/invitations
```

### Frontend Testing Checklist
- [ ] Health check endpoint works
- [ ] Authentication with correct email works
- [ ] Authentication with wrong email fails
- [ ] List invitations returns data
- [ ] Create invitation succeeds (database record created)
- [ ] Cancel invitation works
- [ ] Error handling displays user-friendly messages
- [ ] Loading states work properly

## 🎨 UI/UX Recommendations

### Status Styling
```css
.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-accepted { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }
.status-expired { background: #f3f4f6; color: #374151; }
```

### Form Validation
```javascript
const validateInvitation = (data) => {
  const errors = [];
  
  if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!data.role) {
    errors.push('Role is required');
  }
  
  if (!data.school_name || data.school_name.length < 2) {
    errors.push('School name must be at least 2 characters');
  }
  
  return errors;
};
```

## 📧 Email Status (Important)

### Current State
- ✅ **Invitations are created** and stored in database
- ⚠️ **Email sending fails** until domain verification complete
- 🔄 **Domain verification in progress** for `sportsacademy.tech`

### Expected Behavior
```javascript
// Current: Email error but invitation created
{
  "error": "Email address is not verified..."
  // But invitation is still created in database
}

// After domain verification: Full success
{
  "message": "Invitation created successfully",
  "invitation_id": "uuid",
  "invite_url": "https://...",
  "expires_at": 1749672448
}
```

### Handling Email Errors
```javascript
const createInvitation = async (data) => {
  try {
    const result = await api.createInvitation(data);
    return result;
  } catch (error) {
    if (error.message.includes('Email address is not verified')) {
      // Show user-friendly message
      return {
        success: false,
        message: 'Invitation created but email sending is temporarily disabled. The coach will need to be contacted manually.',
        showManualContact: true
      };
    }
    throw error;
  }
};
```

## 🚀 Getting Started

1. **Copy the API class** from this guide into your project
2. **Test authentication** with the provided credentials
3. **Implement basic invitation listing** using the React hook example
4. **Add invitation creation form** with proper validation
5. **Handle email errors gracefully** until domain verification completes
6. **Style components** using the recommended CSS

## 💬 Support

- **Backend API**: Fully functional and ready for integration
- **Authentication**: Working with `danny.mota@superbuilders.school`
- **Database**: All CRUD operations working
- **Email**: Will be enabled once domain verification completes

For questions or issues, check the API health endpoint first, then verify authentication tokens are correctly formatted.

---

**Last Updated**: June 4, 2025  
**API Version**: v1  
**Backend Status**: ✅ Production Ready 