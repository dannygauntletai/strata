# TSA Infrastructure Restructuring Guide

## Overview

This document outlines the restructured TSA infrastructure that provides clear separation between **Admins**, **Coaches**, and **Parents** with improved organization, security, and maintainability.

## 🏗️ New Architecture

### Infrastructure Layer (Shared)
All foundational AWS resources shared across all user types:

```
📦 Infrastructure Layer
├── 🌐 Networking Stack (VPC, Subnets, Security Groups)
├── 🔐 Security Stack (Cognito, IAM Roles, Secrets)
├── 🗄️ Data Stack (PostgreSQL, S3 Buckets)
├── 🔑 Passwordless Auth Stack (Email Authentication)
└── 🚀 Migration Stack (Database Schema)
```

### Application Layer (Portal-Specific)
Separate backend services for each user type:

```
📱 Application Layer
├── 👨‍🏫 Coach Portal Service (Coach-only functionality)
├── 👨‍👩‍👧‍👦 Parent Portal Service (Parent-only functionality)
└── 👩‍💼 Admin Portal Service (Admin-only functionality)
```

### Frontend Layer
```
🖥️ Frontend Layer
├── 🎯 Unified Frontend (Coach + Parent with role-based routing)
└── ⚙️ Admin Frontend (Admin-specific interface)
```

## 🆚 Before vs After Comparison

### Before (Mixed Concerns)
```
❌ Coach Portal Service
   ├── Coach onboarding ✓
   ├── Parent invitations ❌ (mixed concern)
   ├── Student enrollments ❌ (mixed concern)
   └── Document uploads ❌ (mixed concern)

❌ Admin Portal Service
   ├── Coach management ✓
   └── Limited oversight ❌
```

### After (Clear Separation)
```
✅ Coach Portal Service
   ├── Coach onboarding ✓
   ├── Coach profiles ✓
   ├── Coach dashboard ✓
   └── Invitation management ✓

✅ Parent Portal Service
   ├── Enrollment process ✓
   ├── Document uploads ✓
   ├── Communication ✓
   └── Scheduling ✓

✅ Admin Portal Service
   ├── Coach management ✓
   ├── System oversight ✓
   ├── Analytics ✓
   └── Audit logs ✓
```

## 📊 Data Organization

### Table Ownership by Portal

| Table | Owner | Access Pattern |
|-------|-------|----------------|
| `profiles-v3-{stage}` | Coach Portal | Coach: R/W, Parent: R, Admin: R/W |
| `onboarding-sessions-v3-{stage}` | Coach Portal | Coach: R/W, Admin: R |
| `parent-invitations-v3-{stage}` | Coach Portal | Coach: R/W, Parent: R, Admin: R |
| `tsa-parent-enrollments-v3-{stage}` | Parent Portal | Parent: R/W, Coach: R, Admin: R |
| `tsa-parent-documents-v3-{stage}` | Parent Portal | Parent: R/W, Admin: R |
| `tsa-parent-scheduling-v3-{stage}` | Parent Portal | Parent: R/W, Coach: R/W, Admin: R |
| `coach-invitations-v3-{stage}` | Admin Portal | Admin: R/W, Coach: R |
| `admin-audit-logs-v3-{stage}` | Admin Portal | Admin: R/W |

### API Endpoints by Portal

#### Coach Portal API (`/coach/*`)
```
🎯 Coach-Specific Endpoints
├── POST /onboard                    # Coach onboarding
├── GET  /profile                    # Coach profile
├── PUT  /profile                    # Update profile
├── GET  /parent-invitations         # Sent invitations
├── POST /parent-invitations         # Create invitation
└── GET  /dashboard                  # Coach dashboard
```

#### Parent Portal API (`/admissions/*`)
```
👨‍👩‍👧‍👦 Parent-Specific Endpoints
├── POST /validate-invitation        # Validate invitation
├── POST /enrollments               # Create enrollment
├── GET  /enrollments/{id}          # Get enrollment
├── PUT  /enrollments/{id}          # Update enrollment
├── POST /enrollments/{id}/documents # Upload documents
└── GET  /communication/messages     # Parent-coach messages
```

#### Admin Portal API (`/admin/*`)
```
👩‍💼 Admin-Specific Endpoints
├── GET  /coaches                   # List all coaches
├── GET  /coaches/{id}              # Get coach details
├── DELETE /coaches/{id}            # Deactivate coach
├── GET  /invitations               # Coach invitations
├── POST /invitations               # Create invitation
├── GET  /analytics                 # System analytics
└── GET  /audit                     # Audit logs
```

## 🔐 Authentication Strategy

### Multi-Tiered Authentication by User Type

| User Type | Authentication Method | Authorization Level |
|-----------|----------------------|-------------------|
| **Parents** | Public endpoints (no auth) | Rate-limited access to enrollment |
| **Coaches** | Cognito JWT tokens | Full access to coach functionality |
| **Admins** | Enhanced authentication | Full system access with audit logging |

### Security Implementation
```python
# Example authentication patterns

# 🟢 Public (Parents) - Rate limited
"/admissions/validate-invitation" -> No auth, rate limited

# 🟡 Authenticated (Coaches) - Cognito JWT required  
"/coach/profile" -> Bearer token required

# 🔴 Admin (Admins) - Enhanced authentication
"/admin/coaches" -> Multi-factor authentication + audit logging
```

## 🚀 Migration Strategy

### Phase 1: Infrastructure Setup
1. **Deploy new Parent Portal Service**
   ```bash
   cd tsa-infrastructure
   cdk deploy tsa-parent-backend-dev --force
   ```

2. **Update table names** (tables will be renamed with `parent` prefix)
   - `tsa-coach-enrollments-v3-dev` → `tsa-parent-enrollments-v3-dev`
   - `tsa-coach-documents-v3-dev` → `tsa-parent-documents-v3-dev`
   - `tsa-coach-scheduling-v3-dev` → `tsa-parent-scheduling-v3-dev`

3. **Deploy updated Coach Portal Service** (parent functionality removed)
   ```bash
   cdk deploy tsa-coach-backend-dev --force
   ```

### Phase 2: Data Migration
1. **Migrate existing enrollment data** to new parent tables
2. **Update API integrations** to point to correct services
3. **Test all three portals** independently

### Phase 3: Frontend Updates
1. **Update API endpoints** in frontend applications
2. **Implement role-based routing** (Rule 10 compliance)
3. **Test unified parent/coach frontend** experience

### Phase 4: Cleanup
1. **Remove deprecated functions** (admissions_validation_function)
2. **Clean up old resources** following Rule 5
3. **Update documentation** and API specs

## 🎯 Benefits of New Architecture

### 1. **Clear Separation of Concerns**
- Each portal handles only its specific user type
- Easier to understand, develop, and maintain
- Follows single responsibility principle

### 2. **Improved Security**
- User-specific authentication strategies
- Proper data access controls by role
- Enhanced audit logging for admin actions

### 3. **Better Scalability**
- Independent scaling of each portal
- Separate Lambda functions reduce cold starts
- Targeted optimization by user type

### 4. **Easier Development**
- Teams can work on different portals independently
- Clear API boundaries between services
- Simplified testing and debugging

### 5. **Enhanced Compliance**
- Better audit trails for admin actions
- Clear data ownership and access patterns
- Improved security posture for sensitive operations

## 📋 Development Guidelines

### Portal-Specific Rules

#### Coach Portal Development
```python
# ✅ Coach Portal Responsibilities
- Coach onboarding and profile management
- Parent invitation creation and management
- Dashboard and analytics for coaches
- Communication with parents (coach side)

# ❌ NOT Coach Portal Responsibilities  
- Parent enrollment process
- Document verification
- Parent-side scheduling
```

#### Parent Portal Development
```python
# ✅ Parent Portal Responsibilities
- Enrollment process and status tracking
- Document upload and management
- Communication with coaches (parent side)
- Appointment scheduling (parent side)

# ❌ NOT Parent Portal Responsibilities
- Coach management
- System administration
- Other parent's data
```

#### Admin Portal Development
```python
# ✅ Admin Portal Responsibilities
- Coach management and oversight
- System analytics and reporting
- Audit logging and compliance
- Cross-portal data access for administration

# ❌ NOT Admin Portal Responsibilities
- Day-to-day parent operations
- Individual coach workflows
- Direct parent communication
```

### Code Organization
```
tsa-infrastructure/
├── lib/
│   ├── services/
│   │   ├── coach_portal_service.py      # Coach-only functionality
│   │   ├── parent_portal_service.py     # Parent-only functionality
│   │   └── admin_portal_service.py      # Admin-only functionality
│   └── shared/                          # Infrastructure components
├── ../tsa-coach-backend/                # Coach Lambda functions
├── ../tsa-parent-backend/               # Parent Lambda functions (new)
└── ../tsa-admin-backend/                # Admin Lambda functions
```

## 🔧 Deployment Commands

### Full Deployment
```bash
# Deploy all stacks in correct order
cdk deploy tsa-infra-networking-dev
cdk deploy tsa-infra-security-dev  
cdk deploy tsa-infra-data-dev
cdk deploy tsa-coach-backend-dev
cdk deploy tsa-parent-backend-dev
cdk deploy tsa-admin-backend-dev
cdk deploy tsa-infra-frontend-dev
```

### Individual Portal Deployment
```bash
# Deploy specific portal
cdk deploy tsa-coach-backend-dev --force
cdk deploy tsa-parent-backend-dev --force
cdk deploy tsa-admin-backend-dev --force
```

### Verification
```bash
# Test each portal's health endpoints
curl https://api-url/coach/health
curl https://api-url/admissions/health  
curl https://api-url/admin/health
```

## 📚 API Documentation

### Coach Portal API
- **Base URL**: `https://{api-gateway}/coach/`
- **Authentication**: Cognito JWT required
- **Rate Limit**: 500 requests/minute
- **Documentation**: `/docs/coach-api.md`

### Parent Portal API  
- **Base URL**: `https://{api-gateway}/admissions/`
- **Authentication**: Public (rate limited)
- **Rate Limit**: 100 requests/minute
- **Documentation**: `/docs/parent-api.md`

### Admin Portal API
- **Base URL**: `https://{api-gateway}/admin/`
- **Authentication**: Enhanced multi-factor
- **Rate Limit**: 50 requests/minute (security)
- **Documentation**: `/docs/admin-api.md`

## 🏷️ Resource Tagging Strategy

All resources are tagged for better organization:

```python
# Infrastructure resources
Layer: "Infrastructure"

# Application resources by portal
Layer: "Application"
Portal: "Coach" | "Parent" | "Admin"  
UserType: "Coach" | "Parent" | "Admin"
```

## 🎉 Conclusion

This restructured architecture provides:
- ✅ Clear separation between admins, coaches, and parents
- ✅ Better security and access control
- ✅ Improved maintainability and scalability  
- ✅ Compliance with existing rules (especially Rule 10)
- ✅ Future-ready for additional portals or user types

The new architecture follows AWS best practices and provides a solid foundation for the TSA platform's continued growth. 