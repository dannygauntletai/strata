# 🛠️ Environment Management - TSA Admin Portal

## Overview
This document explains how to manage API endpoints and environment-specific configurations for the TSA Admin Portal across dev, staging, and production environments.

## 🏗️ Architecture

### **Centralized Configuration** (`src/config/environments.ts`)
- Single source of truth for all environment configs
- Type-safe environment management with TypeScript
- Automatic environment detection and fallbacks
- Debug logging in development mode

## 🚀 Quick Setup

### **For Local Development:**

1. **Run the setup script:**
```bash
cd tsa-admin-frontend
./scripts/setup-env.sh
```

2. **Or manually create `.env.local`:**
```bash
# API Endpoints (current from CDK deployment)
NEXT_PUBLIC_ADMIN_API_URL=https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_COACH_API_URL=https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=danny.mota@superbuilders.school

# Environment
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG_MODE=true
```

## 📡 **Current API Endpoints** (From Latest CDK Deployment)

- **Admin Backend:** `https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod`
- **Coach Backend:** `https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod`
- **Passwordless Auth:** `https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1`

## 🔄 Environment Priority

1. **Environment Variables** (highest - `.env.local`)
2. **Environment-specific defaults** (`.env.development`, etc.)
3. **Code defaults** (lowest - `environments.ts`)

## 🎯 **What's Different from Coach Portal**

### **Admin-Specific Features:**
- **Admin email validation** - Only authorized admin emails can login
- **Multi-API access** - Admin can access both admin and coach APIs
- **Enhanced debugging** - More detailed logging for troubleshooting
- **Bulk operations** - Admin-specific bulk actions for coaches/invitations

### **API Client Features:**
- **Automatic 401 handling** - Logs out admin on authentication failure
- **Flexible endpoint routing** - Can call admin, coach, or auth APIs
- **Enhanced error handling** - Better error messages and debugging

## 🔍 **Debugging Admin Issues**

### **1. Check Configuration in Browser Console:**
```javascript
// Look for: "🛠️ TSA Admin Portal Environment Config"
// This shows current endpoints and settings
```

### **2. Verify API Access:**
```javascript
// Test admin API connection
import { adminAPI } from '@/lib/auth'

// Check if endpoints are correct
console.log('Admin API endpoints:', {
  admin: adminAPI.getBaseUrl('admin'),
  coach: adminAPI.getBaseUrl('coach'), 
  auth: adminAPI.getBaseUrl('auth')
})
```

### **3. Common Admin Issues:**

#### **"Not authenticated" Errors:**
- Check admin email matches `NEXT_PUBLIC_ADMIN_EMAIL`
- Verify token is saved in localStorage
- Clear localStorage and re-login if token is corrupted

#### **API 401 Errors:**
- Admin backend may not be running
- Check API Gateway CORS settings
- Verify admin email authorization in backend

#### **Network Errors:**
- Verify API endpoints are correct
- Check if admin backend is deployed
- Test endpoints with curl/Postman

## 🛠️ **Admin API Client Usage**

```typescript
import { adminAPI, adminAuth } from '@/lib/auth'

// Login admin
adminAuth.login('danny.mota@superbuilders.school')

// Use admin APIs
const coaches = await adminAPI.getCoaches()
const invitations = await adminAPI.getInvitations()
const analytics = await adminAPI.getAnalytics()

// Bulk operations
await adminAPI.bulkDeleteCoaches(['id1', 'id2'])
await adminAPI.bulkCreateInvitations([...])
```

## 🚀 **Deployment Process**

### **Local Development:**
```bash
# Setup environment
./scripts/setup-env.sh

# Start development server
npm run dev
```

### **Staging/Production:**
- Admin portal is typically deployed separately from coach portal
- Environment variables are injected at build time
- Different admin emails for different environments

## 🔐 **Security Considerations**

### **Admin Access Control:**
- Only authorized admin emails can access the portal
- Admin email is validated on both frontend and backend
- Session tokens are stored securely in localStorage

### **API Security:**
- All admin API calls require authentication
- 401 responses automatically log out admin
- Cross-origin requests are handled properly

## 🆘 **Troubleshooting**

### **"Failed to fetch coaches" Error:**

1. **Check API endpoints:**
```bash
# Verify admin backend is running
curl https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod/health

# Check authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod/admin/coaches
```

2. **Check admin authentication:**
```javascript
// In browser console
console.log('Admin auth state:', adminAuth.getAuthState())
console.log('Auth header:', adminAuth.getAuthHeader())
```

3. **Verify environment config:**
```javascript
// Check current endpoints
import { config } from '@/config/environments'
console.log('Current config:', config)
```

### **Admin Login Issues:**

1. **Check admin email:**
- Must match `NEXT_PUBLIC_ADMIN_EMAIL` exactly
- Case-sensitive comparison

2. **Clear cached data:**
```javascript
// Clear localStorage
localStorage.removeItem('tsa-admin-auth')
// Refresh page and try again
```

### **CORS Issues:**

1. **Check API Gateway settings**
2. **Verify admin backend CORS configuration**
3. **Test with browser dev tools network tab**

## 📝 **Environment Variables Reference**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_ADMIN_API_URL` | Admin backend API | `https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod` |
| `NEXT_PUBLIC_COACH_API_URL` | Coach backend API | `https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod` |
| `NEXT_PUBLIC_PASSWORDLESS_AUTH_URL` | Auth API | `https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Authorized admin email | `danny.mota@superbuilders.school` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment name | `development` |
| `NEXT_PUBLIC_DEBUG_MODE` | Enable debug logging | `true` |

## ✅ **Verification Checklist**

- [ ] Admin frontend uses correct API endpoints
- [ ] Admin email authentication works
- [ ] Coach management page loads coaches
- [ ] Invitation management works
- [ ] Analytics page shows data
- [ ] Debug logging appears in console (dev mode)
- [ ] 401 errors properly log out admin
- [ ] Environment variables are properly loaded 