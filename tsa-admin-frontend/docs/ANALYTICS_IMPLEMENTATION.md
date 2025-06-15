# TSA Analytics Platform Implementation Guide

## Overview

The TSA Analytics Platform is a comprehensive multi-tenant analytics solution built on AWS serverless architecture with Python Lambda backends and a Next.js frontend. It provides real-time event tracking, UTM campaign management, attribution modeling, and custom report generation.

## Architecture Components

### 1. Backend Services (Python)
- **Admin Portal Service**: Main analytics API and dashboard
- **Kinesis Stream Processor**: Real-time event processing
- **Analytics Handlers**: Event tracking, UTM campaigns, attribution

### 2. Frontend Dashboard (Next.js)
- **Analytics Overview**: Key metrics and conversion funnels
- **UTM Builder**: Campaign creation and tracking
- **Real-time Metrics**: Live user activity and events
- **Event Tracking**: Custom event monitoring

### 3. Infrastructure (AWS CDK)
- **DynamoDB Tables**: Multi-tenant event storage
- **Kinesis Streams**: Real-time data processing
- **Lambda Functions**: Serverless compute
- **API Gateway**: RESTful API endpoints

## Database Schema

### Analytics Events Table
```
PK: TENANT#{tenant_id}#EVENT#{date}
SK: {timestamp}#{session_id}#{event_id}
GSI1_PK: TENANT#{tenant_id}#USER#{user_id}
GSI1_SK: {timestamp}
GSI2_PK: TENANT#{tenant_id}#CAMPAIGN#{campaign_id}
GSI2_SK: {timestamp}
```

### Sessions Table
```
session_id: Primary Key
tenant_id: Global Secondary Index
created_at: Sort Key for GSI
```

### UTM Campaigns Table
```
campaign_id: Primary Key
tenant_id: Global Secondary Index
created_at: Sort Key for GSI
```

## API Endpoints

### Analytics Endpoints

#### Dashboard Analytics
```
GET /admin/analytics
```
Returns comprehensive dashboard metrics including:
- Total invitations and completion rates
- Coach metrics and activity
- Conversion funnel data
- Channel performance
- Growth trends

#### Event Tracking
```
POST /admin/analytics/events
{
  "event_type": "page_view",
  "tenant_id": "default",
  "user_id": "user123",
  "session_id": "session456",
  "properties": {
    "page_url": "/dashboard",
    "utm_source": "google"
  },
  "context": {
    "page": {...},
    "device": {...}
  }
}
```

#### Batch Event Tracking
```
POST /admin/analytics/events/batch
{
  "events": [
    {
      "event_type": "page_view",
      "tenant_id": "default",
      ...
    }
  ]
}
```

#### Real-time Metrics
```
GET /admin/analytics/realtime?tenant_id=default
```

### UTM Campaign Endpoints

#### List Campaigns
```
GET /admin/utm?tenant_id=default&limit=50
```

#### Build UTM Link
```
POST /admin/utm/build
{
  "url": "https://example.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "spring_sale",
  "utm_term": "sports academy",
  "utm_content": "banner_ad",
  "tenant_id": "default",
  "name": "Spring Sale Campaign"
}
```

Response:
```json
{
  "campaign_id": "uuid",
  "utm_url": "https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale",
  "short_url": "https://tsa.ly/abc123",
  "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?data=..."
}
```

## Frontend Implementation

### Analytics Dashboard

The analytics dashboard provides multiple views:

1. **Overview Tab**: Key metrics, conversion funnel, channel performance
2. **UTM Builder Tab**: Campaign creation and performance tracking
3. **Real-time Tab**: Live user activity and events
4. **Events Tab**: Event tracking interface (future)

### Key Components

#### UTM Builder Form
```typescript
const [utmBuilder, setUtmBuilder] = useState({
  url: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: ''
})

const handleUTMBuild = async () => {
  const response = await fetch('/api/admin/utm/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...utmBuilder,
      tenant_id: 'default',
      name: `${utmBuilder.utm_campaign} Campaign`
    })
  })
  // Handle response
}
```

#### Real-time Metrics Display
```typescript
interface RealtimeMetrics {
  active_users: number;
  events_per_minute: number;
  top_pages: Array<{
    page: string;
    views: number;
  }>;
  conversion_rate: number;
  bounce_rate: number;
  average_session_duration: string;
}
```

## Cross-Domain Tracking

### Implementation

The platform includes a comprehensive tracking script (`analytics-tracking.js`) that provides:

- Cross-domain user identification
- Automatic event tracking (page views, clicks, forms)
- UTM parameter capture
- Session management
- Offline event queuing

### Usage

#### Basic Implementation
```html
<script src="https://your-domain.com/analytics-tracking.js"></script>
<script>
  // The script auto-initializes and tracks page views
  
  // Manual event tracking
  tsaAnalytics.track('button_click', {
    button_name: 'signup',
    value: 100
  });
  
  // User identification
  tsaAnalytics.identify('user123', {
    email: 'user@example.com',
    plan: 'premium'
  });
  
  // Conversion tracking
  tsaAnalytics.conversion('signup', 99.99, 'USD');
</script>
```

#### Advanced Features
```javascript
// Custom event tracking
tsaAnalytics.track('video_play', {
  video_id: 'intro-video',
  duration: 120,
  quality: 'HD'
});

// E-commerce tracking
tsaAnalytics.ecommerce('purchase', [
  {
    product_id: 'coaching-session',
    price: 75.00,
    quantity: 1
  }
]);

// Debug mode
tsaAnalytics.debug(true);
```

## Deployment

### Infrastructure Deployment

1. **Deploy CDK Stack**:
```bash
cd tsa-infrastructure
cdk deploy tsa-admin-backend-dev
```

2. **Verify Tables Created**:
   - analytics-events-v1-dev
   - analytics-sessions-v1-dev
   - utm-campaigns-v1-dev
   - attribution-models-v1-dev
   - custom-reports-v1-dev

3. **Check Lambda Functions**:
   - Admin handler with analytics routes
   - Stream processor for Kinesis events

### Frontend Deployment

The enhanced analytics page is automatically deployed with the existing admin frontend.

### Configuration

#### Environment Variables

Backend Lambda functions require:
```
TSA_ANALYTICS_EVENTS_TABLE=analytics-events-v1-dev
TSA_ANALYTICS_SESSIONS_TABLE=analytics-sessions-v1-dev
TSA_UTM_CAMPAIGNS_TABLE=utm-campaigns-v1-dev
TSA_ATTRIBUTION_MODELS_TABLE=attribution-models-v1-dev
TSA_CUSTOM_REPORTS_TABLE=custom-reports-v1-dev
TSA_ANALYTICS_STREAM_NAME=analytics-stream-v1-dev
```

#### Frontend Configuration

Update API endpoints in the frontend to match your deployment:
```typescript
// In analytics page
const response = await fetch('/api/admin/analytics/realtime', {
  // API calls use relative paths that proxy to Lambda
});
```

## Monitoring and Observability

### CloudWatch Metrics

The platform automatically generates metrics for:
- Event processing rate
- Error rates
- API response times
- Active user counts

### Logs

All Lambda functions log to CloudWatch with structured logging:
```python
logger.info(f"Processed event {event_id} for tenant {tenant_id}")
logger.error(f"Error processing analytics event: {str(e)}")
```

### Alerts

Set up CloudWatch alarms for:
- High error rates (>5%)
- Slow response times (>2s)
- Low event processing rates

## Testing

### Backend Testing

Test analytics endpoints:
```bash
# Test event tracking
curl -X POST https://api.example.com/admin/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "test_event",
    "tenant_id": "default",
    "properties": {"test": true}
  }'

# Test UTM builder
curl -X POST https://api.example.com/admin/utm/build \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "utm_source": "test",
    "utm_medium": "api",
    "utm_campaign": "test_campaign"
  }'
```

### Frontend Testing

1. Navigate to `/analytics` in the admin portal
2. Test each tab (Overview, UTM Builder, Real-time, Events)
3. Create a UTM campaign and verify response
4. Check real-time metrics display

### Tracking Script Testing

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tracking Test</title>
</head>
<body>
  <h1>Test Page</h1>
  <button onclick="testTracking()">Test Event</button>
  
  <script src="/analytics-tracking.js"></script>
  <script>
    // Enable debug mode
    tsaAnalytics.debug(true);
    
    function testTracking() {
      tsaAnalytics.track('test_event', {
        test_property: 'test_value'
      });
    }
    
    // Check browser console for debug output
  </script>
</body>
</html>
```

## Performance Optimization

### Database Optimization

1. **Partition Strategy**: Events are partitioned by tenant and date
2. **TTL Settings**: Automatic cleanup after 90 days
3. **GSI Usage**: Efficient querying by user and campaign

### Lambda Optimization

1. **Memory Allocation**: 512MB for most functions
2. **Concurrent Execution**: Limited per tenant
3. **Cold Start Mitigation**: Provisioned concurrency for production

### Frontend Optimization

1. **Code Splitting**: Separate analytics bundle
2. **Data Fetching**: Parallel API calls
3. **Caching**: Browser cache for static assets

## Security Considerations

### Data Privacy

1. **PII Handling**: No sensitive data in tracking
2. **Data Retention**: Automatic cleanup with TTL
3. **Tenant Isolation**: Multi-tenant data separation

### Access Control

1. **API Authentication**: JWT tokens required
2. **Role-Based Access**: Admin-only analytics access
3. **CORS Configuration**: Restricted origins

### Compliance

1. **GDPR**: User data deletion capabilities
2. **CCPA**: Data access and deletion rights
3. **SOC 2**: Audit trail in CloudWatch

## Troubleshooting

### Common Issues

1. **Events Not Appearing**:
   - Check API endpoint configuration
   - Verify tenant_id matches
   - Check CloudWatch logs for errors

2. **UTM Links Not Working**:
   - Verify URL format
   - Check required fields (source, medium, campaign)
   - Test with simple example

3. **Real-time Metrics Not Updating**:
   - Check Kinesis stream status
   - Verify stream processor function
   - Check for throttling

### Debug Commands

```bash
# Check DynamoDB items
aws dynamodb scan --table-name analytics-events-v1-dev --limit 5

# Check Lambda logs
aws logs tail /aws/lambda/admin-backend-dev --follow

# Check API Gateway access logs
aws logs tail /aws/apigateway/analytics-api-dev --follow
```

## Future Enhancements

### Planned Features

1. **Advanced Attribution Models**: Machine learning-based attribution
2. **Custom Report Builder**: Drag-and-drop report creation
3. **A/B Testing**: Built-in experimentation platform
4. **Predictive Analytics**: Churn prediction and LTV modeling

### Integration Opportunities

1. **CRM Integration**: Salesforce, HubSpot connectors
2. **Email Platforms**: SendGrid, Mailchimp integration
3. **Ad Platforms**: Google Ads, Facebook Ads API
4. **Business Intelligence**: Tableau, PowerBI connectors

This comprehensive analytics platform provides the foundation for data-driven decision making and marketing optimization for TSA Coach Portal. 