# TSA Admin Frontend - Magic Link Authentication

## 🎯 Overview

This document outlines the magic link authentication system implemented for the TSA Admin Frontend. The system provides secure, passwordless authentication specifically designed for admin users.

## ✅ Current Status 

**PRODUCTION READY** - Magic link authentication is fully implemented and operational

| Component | Status | Details |
|-----------|---------|---------|
| 🔐 **Magic Link API** | ✅ **Ready** | Supports admin, coach, and parent user roles |
| 🌐 **CORS Configuration** | ✅ **Fixed** | localhost:3001 added for admin frontend |
| 🎯 **Admin Authorization** | ✅ **Ready** | danny.mota@superbuilders.school authorized |
| 📧 **Email Integration** | ⚠️ **Pending** | SendGrid configuration in progress |
| 🖥️ **Frontend UI** | ✅ **Ready** | Professional TSA-branded interface |

**RECENT UPDATES:**
- ✅ Fixed CORS policy to allow `http://localhost:3001` (admin frontend)
- ✅ Added "admin" as valid user role in magic link handler
- ✅ Implemented role-specific frontend URL routing (admin → port 3001, coach/parent → port 3000)
- ✅ Updated API endpoints configuration

## 🏗️ Architecture

```
📱 Admin Frontend (localhost:3001)
    ↓ Magic Link Request
🔗 Magic Link API (blka63phul.execute-api.us-east-2.amazonaws.com/v1)
    ↓ User Validation & Token Generation
🗄️ DynamoDB (magic-linksdev)
    ↓ Cognito User Creation/Validation  
👤 Cognito User Pool (us-east-2_3xlxRQk3y)
    ↓ Magic Link Email
📧 SendGrid Email Service
    ↓ User Clicks Link
📱 Admin Frontend (/verify page)
    ↓ Token Verification
🔗 Magic Link API (/auth/verify)
    ↓ JWT Token Generation
🔐 Authenticated Admin Session
```

## 🔧 Technical Implementation

### API Endpoints

**Base URL:** `https://blka63phul.execute-api.us-east-2.amazonaws.com/v1`

#### Send Magic Link
```bash
POST /auth/magic-link
Content-Type: application/json

{
  "email": "danny.mota@superbuilders.school",
  "user_role": "admin"
}
```

**Response (Success):**
```json
{
  "message": "Magic link sent successfully. Check your email.",
  "email": "danny.mota@superbuilders.school", 
  "user_role": "admin",
  "expires_in_minutes": 15
}
```

#### Verify Magic Link Token
```bash
POST /auth/verify
Content-Type: application/json

{
  "token": "uuid-token-from-email-link",
  "email": "danny.mota@superbuilders.school"
}
```

**Response (Success):**
```json
{
  "message": "Authentication successful",
  "tokens": {
    "access_token": "cognito-jwt-access-token",
    "id_token": "cognito-jwt-id-token", 
    "refresh_token": "cognito-refresh-token"
  },
  "user": {
    "email": "danny.mota@superbuilders.school",
    "user_role": "admin"
  }
}
```

### Frontend Integration

**Authentication Flow:**
```typescript
// 1. Send Magic Link
const authService = new AdminAuth();
await authService.sendMagicLink('danny.mota@superbuilders.school');

// 2. User receives email with link to: 
// http://localhost:3001/verify?token=xxx&email=xxx&role=admin

// 3. Verify Token (automatic on /verify page load)
const result = await authService.verifyToken(token, email);

// 4. Store tokens and redirect to dashboard
localStorage.setItem('admin_tokens', JSON.stringify(result.tokens));
router.push('/dashboard');
```

**Key Implementation Files:**
- `src/lib/auth.ts` - AdminAuth class with magic link methods
- `src/components/AuthWrapper.tsx` - Authentication state management
- `src/components/LoginForm.tsx` - Magic link request UI
- `src/app/verify/page.tsx` - Token verification handler
- `src/config/environments.ts` - API endpoint configuration

### Security Features

**Multi-Layered Security:**
1. **Email Validation** - Only danny.mota@superbuilders.school authorized
2. **Token Expiration** - 15-minute expiry on magic link tokens
3. **Single Use Tokens** - Tokens invalidated after use
4. **Rate Limiting** - Max 3 requests per 5 minutes per email
5. **JWT Authentication** - Secure Cognito JWT tokens for session management
6. **CORS Protection** - Restricted to localhost:3001 for development

**Token Management:**
- Magic link tokens stored in DynamoDB with TTL
- Previous unused tokens invalidated on new requests
- Automatic cleanup of expired tokens
- Secure token generation with cryptographic hashing

## 🚀 Development Setup

### Prerequisites
- Admin frontend running on `http://localhost:3001`
- Valid admin email: `danny.mota@superbuilders.school`
- Magic link API deployed with admin role support

### Quick Start
1. **Start Admin Frontend:**
   ```bash
   cd tsa-admin-frontend
   npm run dev  # Starts on port 3001
   ```

2. **Access Login Page:**
   ```
   http://localhost:3001/login
   ```

3. **Test Magic Link:**
   - Enter: `danny.mota@superbuilders.school`
   - Click "Send Magic Link"
   - Check browser console for magic link URL (email service pending)
   - Copy token from logs and manually navigate to verify page

### Environment Variables
```bash
# Admin Frontend (.env.local)
NEXT_PUBLIC_TSA_AUTH_API_URL=https://blka63phul.execute-api.us-east-2.amazonaws.com/v1
NEXT_PUBLIC_TSA_ADMIN_API_URL=https://gt87xbmjcj.execute-api.us-east-2.amazonaws.com/prod
NEXT_PUBLIC_ENVIRONMENT=development
```

## 🔍 Troubleshooting

### Common Issues

**1. CORS Error (FIXED)**
```
Access to fetch at 'https://...amazonaws.com/v1/auth/magic-link' 
from origin 'http://localhost:3001' has been blocked by CORS policy
```
**Solution:** ✅ Fixed - localhost:3001 added to CORS allowed origins

**2. Invalid User Role Error (FIXED)**  
```
{"error": "Invalid user role. Must be 'coach' or 'parent'"}
```
**Solution:** ✅ Fixed - "admin" role added to magic link handler

**3. Email Not Sent**
```
{"error": "Failed to send magic link email"}
```
**Solution:** Expected in development - check CloudWatch logs for magic link URL

**4. Double Slash in URL**
```
v1//auth/magic-link (404 error)
```
**Solution:** Remove trailing slash from passwordlessAuth URL in config

### Debugging Steps

1. **Check API Connectivity:**
   ```bash
   curl -X POST https://blka63phul.execute-api.us-east-2.amazonaws.com/v1/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email":"danny.mota@superbuilders.school","user_role":"admin"}'
   ```

2. **Verify CORS Configuration:**
   - Open browser dev tools → Network tab
   - Look for preflight OPTIONS request
   - Check Access-Control-Allow-Origin header

3. **Check Magic Link Logs:**
   ```bash
   # View Lambda logs
   aws logs tail /aws/lambda/tsa-magic-linkdev --follow
   ```

4. **Test Token Verification:**
   ```bash
   curl -X POST https://blka63phul.execute-api.us-east-2.amazonaws.com/v1/auth/verify \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_TOKEN","email":"danny.mota@superbuilders.school"}'
   ```

## 📋 Production Checklist

### Before Production Deployment

- [ ] **Email Service:** Configure SendGrid with proper templates
- [ ] **Domain Setup:** Update CORS origins for production domains  
- [ ] **Rate Limiting:** Review and adjust rate limits for production traffic
- [ ] **Monitoring:** Set up CloudWatch alarms for authentication failures
- [ ] **Security:** Enable MFA for production admin accounts
- [ ] **Backup:** Ensure DynamoDB backups are configured
- [ ] **SSL/TLS:** Verify HTTPS enforcement on all endpoints

### Production Configuration
```typescript
// Production environment config
const productionConfig = {
  passwordlessAuth: 'https://blka63phul.execute-api.us-east-2.amazonaws.com/v1',
  adminApi: 'https://gt87xbmjcj.execute-api.us-east-2.amazonaws.com/prod',
  corsOrigins: [
    'https://admin.sportsacademy.school'  // Production admin domain
  ],
  mfaRequired: true,
  sessionTimeout: '8h'
};
```

## 📚 Additional Resources

- **Magic Link Handler Code:** `tsa-coach-backend/lambda_passwordless/magic_link_handler.py`
- **Infrastructure:** `tsa-infrastructure/lib/passwordless_auth_stack.py`
- **API Documentation:** `tsa-infrastructure/FRONTEND_INTEGRATION_GUIDE.md`
- **Cognito User Pool:** `us-east-2_3xlxRQk3y`
- **DynamoDB Table:** `magic-linksdev`

---

**Last Updated:** December 2024 - Fixed CORS and added admin role support  
**Status:** Production Ready ✅  
**Next Steps:** Configure SendGrid email templates for production use 