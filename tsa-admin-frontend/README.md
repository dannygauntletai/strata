# TSA Admin Frontend

## Overview

The **TSA Admin Frontend** is a Next.js administrative interface for managing the entire TSA Coach platform. This portal provides system administrators with tools to oversee users, organizations, services, and analytics across the multi-service architecture.

## Purpose

This admin portal serves as the central management interface for:

- **System Monitoring**: Real-time service health and performance metrics
- **User Management**: Manage coaches, admins, and organization users
- **Organization Management**: Oversee microschool organizations and their operations
- **Cross-Service Analytics**: Platform-wide reporting and insights
- **Configuration Management**: System settings and feature flags

## Architecture Position

```
┌─────────────────────────────────────────────────────────────┐
│                    TSA COACH ECOSYSTEM                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│   COACH PORTAL  │   ADMISSIONS    │      ADMIN PORTAL       │
│    FRONTEND     │    FRONTEND     │      (THIS APP)         │
│  (tsa-coach-    │ (tsa-admissions │  (tsa-admin-frontend)   │
│   frontend)     │   -frontend)    │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
           │                │                │
    ┌──────▼────────┬───────▼──────┬─────────▼─────────┐
    │ COACH PORTAL  │ ADMISSIONS   │   ADMIN/SYSTEM    │
    │   SERVICE     │   SERVICE    │    SERVICES       │
    │               │              │                   │
    └───────────────┴──────────────┴───────────────────┘
```

## Features

### **Dashboard**
- System-wide metrics and KPIs
- Service health monitoring
- Recent activity feed
- Quick action shortcuts

### **User Management**
- Coach profile management
- Admin user administration
- Organization user oversight
- Role and permission management

### **Organization Management**
- Microschool organization listing
- Organization settings and configuration
- Performance metrics per organization
- Resource allocation tracking

### **System Analytics**
- Cross-service reporting
- Performance analytics
- Usage statistics
- Financial metrics

### **Service Monitoring**
- Real-time service status
- Uptime monitoring
- Error tracking
- Performance metrics

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety
- **Port**: 3001 (to avoid conflicts with other frontends)

## Development

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **Getting Started**

```bash
# Install dependencies
npm install

# Start development server (runs on port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Available Scripts**

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
tsa-admin-frontend/
├── src/
│   └── app/
│       ├── layout.tsx          # Root layout with navigation
│       ├── page.tsx            # Dashboard homepage
│       ├── globals.css         # Global styles
│       ├── users/              # User management pages
│       ├── organizations/      # Organization management pages
│       └── analytics/          # System analytics pages
├── public/                     # Static assets
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## API Integration

The admin portal integrates with multiple backend services:

### **Coach Portal Service** (`/coach-portal/*`)
- Coach timeline analytics
- Event management oversight
- Onboarding progress tracking

### **Lead Management Service** (`/leads/*`)
- Lead analytics and reporting
- Attribution analysis
- Conversion metrics

### **Admissions Portal Service** (`/admissions/*`)
- Enrollment pipeline oversight
- Registration analytics
- Communication monitoring

### **Analytics Service** (`/analytics/*`)
- Cross-service data aggregation
- Custom report generation
- Real-time metrics

## Authentication & Authorization

The admin portal implements role-based access control:

- **Super Admin**: Full system access
- **Organization Admin**: Organization-specific management
- **Support Admin**: Read-only access for customer support
- **Analytics Admin**: Analytics and reporting access

## Deployment

The admin portal is deployed as part of the TSA Coach infrastructure:

```bash
# Deploy from infrastructure directory
cd ../tsa-infrastructure
cdk deploy TSA-Frontend-dev
```

## Environment Configuration

```bash
# API Endpoints
NEXT_PUBLIC_COACH_API_URL=https://api.sportsacademy.school/coach-portal
NEXT_PUBLIC_LEADS_API_URL=https://api.sportsacademy.school/leads
NEXT_PUBLIC_ADMISSIONS_API_URL=https://api.sportsacademy.school/admissions
NEXT_PUBLIC_ANALYTICS_API_URL=https://api.sportsacademy.school/analytics

# Authentication
NEXT_PUBLIC_AUTH_DOMAIN=auth.sportsacademy.school

# Environment
NEXT_PUBLIC_ENV=development|staging|production
```

## Security

- **HTTPS Only**: All communication encrypted
- **JWT Authentication**: Token-based authentication
- **Role-Based Access**: Granular permission system
- **Audit Logging**: All admin actions logged
- **Input Validation**: Client and server-side validation

## Monitoring

### **Application Monitoring**
- Performance metrics via Next.js analytics
- Error tracking and reporting
- User activity monitoring

### **Infrastructure Monitoring**
- CloudWatch integration
- Custom dashboards
- Alert notifications

## Future Enhancements

1. **Advanced Analytics**: AI-powered insights and predictions
2. **Real-Time Updates**: WebSocket integration for live data
3. **Bulk Operations**: Mass user and organization management
4. **Custom Dashboards**: Configurable admin dashboards
5. **Mobile Support**: Responsive design optimization

---

**The TSA Admin Frontend provides comprehensive platform management while maintaining security and usability for system administrators.**
