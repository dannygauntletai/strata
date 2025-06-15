# Comprehensive Implementation Plan: Multi-Tenant Analytics & Lead Tracking Platform on AWS with Node.js

## Executive Summary

This implementation plan provides a complete blueprint for building a enterprise-grade multi-tenant analytics and lead tracking platform leveraging AWS serverless architecture and Node.js. The platform supports multiple schools/coaches with custom domains, includes nine comprehensive builder tools, and implements advanced features like cross-domain tracking, server-side APIs, and custom report builders with full multi-tenant isolation.

## Platform Architecture Overview

### Core Technology Stack

**AWS Services:**
- **Lambda**: Serverless compute with tenant isolation via IAM policies
- **DynamoDB**: NoSQL database with single-table design for multi-tenant data
- **Kinesis**: Real-time event streaming with sharded architecture
- **API Gateway**: RESTful APIs with custom domain routing
- **CloudFront**: Global CDN with Lambda@Edge for tenant routing
- **S3**: Asset storage with lifecycle policies
- **Cognito**: Authentication with tenant context
- **KMS**: Tenant-specific encryption keys

**Node.js Stack:**
- **Backend**: Express/Fastify with tenant middleware
- **Real-time**: Socket.io with Redis pub/sub
- **Database**: Knex/Prisma for PostgreSQL, AWS SDK v3 for DynamoDB
- **Frontend**: React/Vue with tenant-aware routing

## 1. Multi-Tenant Database Architecture

### DynamoDB Schema Design

**Primary Table Structure:**
```json
{
  "TableName": "Analytics_Events",
  "KeySchema": [
    {"AttributeName": "PK", "KeyType": "HASH"},
    {"AttributeName": "SK", "KeyType": "RANGE"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "UserIndex",
      "Keys": "GSI1_PK (TENANT#123|USER#456), GSI1_SK (timestamp)"
    },
    {
      "IndexName": "CampaignIndex", 
      "Keys": "GSI2_PK (TENANT#123|CAMPAIGN#789), GSI2_SK (timestamp)"
    }
  ]
}
```

**Event Record Structure:**
```json
{
  "PK": "TENANT#12345#EVENT#2024-01-15",
  "SK": "2024-01-15T14:30:25.123Z#SESSION#abc123#EVENT#pageview",
  "GSI1_PK": "TENANT#12345#USER#user456",
  "GSI1_SK": "2024-01-15T14:30:25.123Z",
  "event_type": "page_view",
  "tenant_id": "12345",
  "user_id": "user456",
  "session_id": "session_abc123",
  "event_data": {
    "page_url": "/dashboard",
    "referrer": "/login",
    "device": {"type": "desktop", "browser": "Chrome"}
  },
  "attribution": {
    "campaign_id": "camp_123",
    "source": "google",
    "medium": "cpc"
  },
  "ttl": 1735689600
}
```

### PostgreSQL Alternative Schema

```sql
-- Tenant isolation with RLS
CREATE SCHEMA tenant_12345;

CREATE TABLE tenant_12345.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW(),
    properties JSONB,
    attribution JSONB
);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON analytics_events
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## 2. AWS Lambda Multi-Tenant Implementation

### Tenant Isolation with Dynamic IAM

```javascript
// Lambda Authorizer
exports.handler = async (event) => {
  const token = event.authorizationToken.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // Generate tenant-scoped IAM policy
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: ['dynamodb:*'],
      Resource: 'arn:aws:dynamodb:*:*:table/analytics-data',
      Condition: {
        'ForAllValues:StringEquals': {
          'dynamodb:LeadingKeys': [`TENANT#${decoded.tenant_id}`]
        }
      }
    }]
  };
  
  return {
    principalId: decoded.user_id,
    policyDocument: policy,
    context: {
      tenantId: decoded.tenant_id,
      userId: decoded.user_id,
      role: decoded.role
    }
  };
};
```

### Performance Optimization

```javascript
// Connection pooling and warm-up
let dynamoClient;
let kinesisClient;

exports.handler = async (event) => {
  // Initialize clients once
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      maxRetries: 3,
      region: process.env.AWS_REGION
    });
  }
  
  // Warm-up request handling
  if (event.source === 'aws.events') {
    return { statusCode: 200, body: 'Warmed up' };
  }
  
  // Process analytics event
  const tenantId = event.requestContext.authorizer.tenantId;
  return processAnalyticsEvent(event, tenantId);
};
```

## 3. API Gateway Configuration

### Multi-Domain Routing Strategy

```javascript
// Custom domain mapping configuration
const domainMappings = {
  'school1.analytics-platform.com': 'tenant-001',
  'analytics.university.edu': 'tenant-002',
  'coach-analytics.example.com': 'tenant-003'
};

// API Gateway routing
exports.routingHandler = async (event) => {
  const domain = event.headers.Host;
  const tenantId = domainMappings[domain] || 
                  event.headers['x-tenant-id'];
  
  if (!tenantId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Tenant identification failed' })
    };
  }
  
  event.requestContext.tenantId = tenantId;
  return processRequest(event);
};
```

### Rate Limiting Implementation

```javascript
const rateLimits = {
  basic: { rps: 100, burst: 200, daily: 10000 },
  premium: { rps: 1000, burst: 2000, daily: 100000 },
  enterprise: { rps: 5000, burst: 10000, daily: 1000000 }
};

// Usage plan assignment
const assignUsagePlan = async (tenantId, tier) => {
  const plan = await apigateway.createUsagePlan({
    name: `${tenantId}-${tier}`,
    throttle: {
      rateLimit: rateLimits[tier].rps,
      burstLimit: rateLimits[tier].burst
    },
    quota: {
      limit: rateLimits[tier].daily,
      period: 'DAY'
    }
  }).promise();
  
  return plan;
};
```

## 4. Kinesis Real-Time Analytics Pipeline

### Stream Processing Architecture

```javascript
// Kinesis event processor
exports.kinesisProcessor = async (event) => {
  const batch = [];
  
  for (const record of event.Records) {
    const payload = JSON.parse(
      Buffer.from(record.kinesis.data, 'base64').toString()
    );
    
    // Transform and enrich event
    const enrichedEvent = {
      PK: `TENANT#${payload.tenant_id}#EVENT#${getDatePartition()}`,
      SK: `${payload.timestamp}#${generateId()}`,
      GSI1_PK: `TENANT#${payload.tenant_id}|USER#${payload.user_id}`,
      GSI1_SK: payload.timestamp,
      tenant_id: payload.tenant_id,
      event_type: payload.event_type,
      event_data: payload.properties,
      attribution: await enrichAttribution(payload),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
    };
    
    batch.push(enrichedEvent);
    
    // Batch write to DynamoDB
    if (batch.length >= 25) {
      await writeBatchToDynamoDB(batch);
      batch.length = 0;
    }
  }
  
  // Write remaining events
  if (batch.length > 0) {
    await writeBatchToDynamoDB(batch);
  }
};

// Real-time aggregation
const realtimeAggregator = async (events) => {
  const aggregates = events.reduce((acc, event) => {
    const key = `${event.tenant_id}:${event.event_type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  // Publish to WebSocket subscribers
  for (const [key, count] of Object.entries(aggregates)) {
    const [tenantId, eventType] = key.split(':');
    await publishToWebSocket(tenantId, { eventType, count });
  }
};
```

## 5. Node.js Integration Patterns

### Multi-Tenant Middleware Stack

```javascript
// Comprehensive tenant middleware
const tenantMiddleware = async (req, res, next) => {
  try {
    // Multiple tenant identification methods
    let tenantId = req.headers['x-tenant-id'] || 
                  req.subdomain ||
                  req.hostname.split('.')[0];
    
    // Custom domain lookup
    if (!tenantId && req.hostname) {
      const tenant = await getTenantByDomain(req.hostname);
      tenantId = tenant?.id;
    }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant identification failed' });
    }
    
    // Load tenant configuration
    const tenant = await getTenantConfig(tenantId);
    req.tenant = tenant;
    req.tenantId = tenantId;
    
    // Set database context
    if (req.db) {
      await req.db.query('SET app.current_tenant = $1', [tenantId]);
    }
    
    // Set Redis namespace
    req.redis = redis.namespace(tenantId);
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};

// Tenant-aware repository pattern
class TenantRepository {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.tablePrefix = `tenant_${tenantId}_`;
  }
  
  async findEvents(filters) {
    const params = {
      TableName: 'analytics_events',
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${this.tenantId}#EVENT#${filters.date}`
      }
    };
    
    return dynamodb.query(params).promise();
  }
}
```

### Real-Time Features with Socket.io

```javascript
// Multi-tenant WebSocket setup
const setupSocketIO = (io) => {
  // Tenant authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const tenantId = socket.handshake.query.tenantId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.tenant_id !== tenantId) {
        return next(new Error('Tenant mismatch'));
      }
      
      socket.tenantId = tenantId;
      socket.userId = decoded.user_id;
      socket.join(`tenant:${tenantId}`);
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  // Real-time analytics broadcasting
  io.on('connection', (socket) => {
    socket.on('subscribe:dashboard', async () => {
      const room = `dashboard:${socket.tenantId}`;
      socket.join(room);
      
      // Send initial data
      const metrics = await getRealtimeMetrics(socket.tenantId);
      socket.emit('dashboard:update', metrics);
    });
    
    socket.on('event:track', async (data) => {
      // Process and broadcast event
      const event = await processTrackingEvent(socket.tenantId, data);
      io.to(`tenant:${socket.tenantId}`).emit('event:new', event);
    });
  });
};
```

## 6. Builder Tools Implementation

### Core Builder Framework

```javascript
// Base builder architecture
class BuilderFramework {
  constructor() {
    this.components = new ComponentRegistry();
    this.validators = new ValidatorRegistry();
    this.storage = new S3Storage();
  }
  
  async save(builderType, config, tenantId) {
    // Validate configuration
    const validator = this.validators.get(builderType);
    const validation = await validator.validate(config);
    
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // Version and store
    const version = await this.createVersion(tenantId, builderType, config);
    const key = `${tenantId}/${builderType}/${version.id}.json`;
    
    await this.storage.put(key, config);
    
    return version;
  }
}
```

### UTM Builder Implementation

```javascript
class UTMBuilder {
  constructor() {
    this.validator = new UTMValidator();
    this.shortener = new LinkShortener();
  }
  
  async build(params) {
    // Validate parameters
    const validation = this.validator.validate(params);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Build URL
    const url = new URL(params.destination);
    const utmParams = ['source', 'medium', 'campaign', 'term', 'content'];
    
    utmParams.forEach(param => {
      if (params[`utm_${param}`]) {
        url.searchParams.set(`utm_${param}`, params[`utm_${param}`]);
      }
    });
    
    // Generate short link and QR code
    const shortLink = await this.shortener.shorten(url.toString());
    const qrCode = await QRCode.toDataURL(shortLink.url);
    
    return {
      full_url: url.toString(),
      short_url: shortLink.url,
      qr_code: qrCode,
      tracking_id: shortLink.id
    };
  }
}
```

### Email Template Builder

```javascript
class EmailTemplateBuilder {
  constructor() {
    this.mjml = require('mjml');
    this.handlebars = require('handlebars');
  }
  
  async compile(template, data) {
    // Pre-process with Handlebars for personalization
    const processedTemplate = this.handlebars.compile(template)(data);
    
    // Compile MJML to HTML
    const result = this.mjml(processedTemplate, {
      validationLevel: 'strict',
      fonts: {
        'Open Sans': 'https://fonts.googleapis.com/css?family=Open+Sans'
      }
    });
    
    if (result.errors.length > 0) {
      throw new CompilationError(result.errors);
    }
    
    // A/B testing support
    const variants = await this.generateVariants(result.html);
    
    return {
      html: result.html,
      text: this.htmlToText(result.html),
      variants: variants,
      preview: this.generatePreview(result.html)
    };
  }
  
  async generateVariants(html) {
    return {
      control: html,
      variant_a: this.modifySubjectLine(html, 'A'),
      variant_b: this.modifyCTA(html, 'B')
    };
  }
}
```

### Landing Page Builder

```javascript
class LandingPageBuilder {
  constructor() {
    this.components = {
      hero: HeroComponent,
      features: FeaturesGrid,
      testimonials: TestimonialCarousel,
      form: LeadCaptureForm,
      cta: CallToAction
    };
  }
  
  async build(config, tenantId) {
    const page = {
      id: generateId(),
      tenant_id: tenantId,
      components: []
    };
    
    // Build component tree
    for (const section of config.sections) {
      const Component = this.components[section.type];
      const rendered = await new Component(section.props).render();
      
      page.components.push({
        type: section.type,
        order: section.order,
        content: rendered,
        settings: section.settings
      });
    }
    
    // Generate responsive CSS
    const css = await this.generateResponsiveCSS(page);
    
    // Deploy to S3/CloudFront
    const deployment = await this.deploy(page, css);
    
    return {
      page_id: page.id,
      preview_url: deployment.preview_url,
      published_url: deployment.published_url,
      custom_domain: `${config.slug}.${tenantId}.landing.com`
    };
  }
}
```

### Attribution Model Builder

```javascript
class AttributionModelBuilder {
  constructor() {
    this.models = {
      firstTouch: this.firstTouchAttribution,
      lastTouch: this.lastTouchAttribution,
      linear: this.linearAttribution,
      timeDecay: this.timeDecayAttribution,
      datadriven: this.dataDrivenAttribution,
      custom: this.customAttribution
    };
  }
  
  async calculate(touchpoints, modelType, options = {}) {
    const model = this.models[modelType];
    const weights = await model.call(this, touchpoints, options);
    
    return touchpoints.map((tp, index) => ({
      ...tp,
      weight: weights[index],
      credit: weights[index] * options.conversionValue,
      influence_score: this.calculateInfluence(tp, touchpoints)
    }));
  }
  
  async dataDrivenAttribution(touchpoints, options) {
    // Machine learning based attribution
    const features = this.extractFeatures(touchpoints);
    const model = await this.loadMLModel(options.tenantId);
    
    return model.predict(features);
  }
  
  customAttribution(touchpoints, rules) {
    return touchpoints.map(tp => {
      const applicableRule = rules.find(r => r.condition(tp));
      return applicableRule ? applicableRule.weight : 0;
    });
  }
}
```

## 7. Cross-Domain Tracking Implementation

### Tracking Script Architecture

```javascript
// Generated tracking script for clients
(function(window, document) {
  const TENANT_ID = '{{TENANT_ID}}';
  const API_ENDPOINT = '{{API_ENDPOINT}}';
  
  // Cross-domain ID management
  const CrossDomainTracker = {
    getCrossDomainId() {
      let xdid = localStorage.getItem('_xdid');
      if (!xdid) {
        xdid = this.generateUUID();
        localStorage.setItem('_xdid', xdid);
      }
      return xdid;
    },
    
    syncAcrossDomains(domains) {
      const xdid = this.getCrossDomainId();
      domains.forEach(domain => {
        const iframe = document.createElement('iframe');
        iframe.src = `https://${domain}/sync?xdid=${xdid}`;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      });
    }
  };
  
  // Event tracking
  window.analytics = {
    track(event, properties) {
      const payload = {
        tenant_id: TENANT_ID,
        event_type: event,
        properties: properties,
        context: {
          page: {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer
          },
          user: {
            xdid: CrossDomainTracker.getCrossDomainId(),
            anonymous_id: this.getAnonymousId()
          }
        }
      };
      
      // Send via Beacon API for reliability
      navigator.sendBeacon(API_ENDPOINT + '/track', JSON.stringify(payload));
    }
  };
})(window, document);
```

### Server-Side Tracking API

```javascript
// Server-side tracking endpoint
app.post('/api/v1/track', tenantMiddleware, async (req, res) => {
  const { event_type, user_id, properties, context } = req.body;
  
  // Validate event
  const validation = await validateTrackingEvent(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ errors: validation.errors });
  }
  
  // Enrich event data
  const enrichedEvent = {
    tenant_id: req.tenantId,
    event_id: generateEventId(),
    event_type,
    user_id: user_id || context.user.anonymous_id,
    timestamp: new Date().toISOString(),
    properties,
    context: {
      ...context,
      ip: req.ip,
      user_agent: req.get('user-agent')
    },
    server_side: true
  };
  
  // Send to Kinesis
  await kinesis.putRecord({
    StreamName: 'analytics-stream',
    Data: JSON.stringify(enrichedEvent),
    PartitionKey: req.tenantId
  }).promise();
  
  res.status(200).json({ 
    success: true, 
    event_id: enrichedEvent.event_id 
  });
});

// Batch tracking API
app.post('/api/v1/track/batch', tenantMiddleware, async (req, res) => {
  const { events } = req.body;
  
  // Process in parallel with rate limiting
  const results = await Promise.allSettled(
    events.map(event => processTrackingEvent(req.tenantId, event))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  res.status(207).json({
    success: successful,
    failed: failed,
    results: results.map((r, i) => ({
      index: i,
      status: r.status,
      event_id: r.value?.event_id,
      error: r.reason?.message
    }))
  });
});
```

## 8. Custom Report Builder

### Report Definition Engine

```javascript
class CustomReportBuilder {
  constructor() {
    this.queryBuilder = new SQLQueryBuilder();
    this.visualizations = new VisualizationEngine();
  }
  
  async createReport(definition, tenantId) {
    const report = {
      id: generateId(),
      tenant_id: tenantId,
      name: definition.name,
      created_at: new Date(),
      query: this.buildQuery(definition, tenantId),
      schedule: definition.schedule,
      permissions: definition.permissions
    };
    
    // Validate query
    const validation = await this.validateQuery(report.query, tenantId);
    if (!validation.safe) {
      throw new Error('Query contains unsafe operations');
    }
    
    // Create materialized view for performance
    if (definition.cache_strategy === 'materialized') {
      await this.createMaterializedView(report);
    }
    
    return report;
  }
  
  buildQuery(definition, tenantId) {
    const query = this.queryBuilder
      .select(definition.metrics)
      .from('analytics_events')
      .where('tenant_id', tenantId)
      .dimensions(definition.dimensions)
      .filters(definition.filters)
      .timeRange(definition.date_range)
      .build();
    
    return query;
  }
  
  async executeReport(reportId, parameters = {}) {
    const report = await this.getReport(reportId);
    
    // Apply runtime parameters
    const query = this.applyParameters(report.query, parameters);
    
    // Execute with caching
    const cacheKey = `report:${reportId}:${JSON.stringify(parameters)}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const results = await this.executeQuery(query);
    await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 min cache
    
    return results;
  }
}
```

## 9. Security Implementation

### AWS Cognito Multi-Tenant Setup

```javascript
// Cognito configuration for multi-tenancy
const setupCognitoForTenant = async (tenantId, config) => {
  // Create user pool for premium tenants
  if (config.tier === 'premium' || config.tier === 'enterprise') {
    const userPool = await cognito.createUserPool({
      PoolName: `${tenantId}-users`,
      Schema: [
        {
          Name: 'email',
          Required: true,
          Mutable: false
        },
        {
          Name: 'tenant_id',
          AttributeDataType: 'String',
          Immutable: true
        }
      ],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 12,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true
        }
      },
      MfaConfiguration: 'OPTIONAL',
      UserAttributeUpdateSettings: {
        AttributesRequireVerificationBeforeUpdate: ['email']
      }
    }).promise();
    
    return userPool;
  }
  
  // Use shared pool with groups for standard tenants
  const group = await cognito.createGroup({
    GroupName: `tenant-${tenantId}`,
    UserPoolId: process.env.SHARED_USER_POOL_ID,
    Description: `Users for tenant ${tenantId}`
  }).promise();
  
  return group;
};
```

### Data Encryption Strategy

```javascript
// Field-level encryption for sensitive data
class EncryptionService {
  constructor() {
    this.kms = new KMSClient({ region: process.env.AWS_REGION });
  }
  
  async encryptField(data, tenantId, fieldName) {
    const dataKey = await this.generateDataKey(tenantId);
    const encrypted = await this.encrypt(data, dataKey.Plaintext);
    
    return {
      ciphertext: encrypted,
      data_key: dataKey.CiphertextBlob.toString('base64'),
      algorithm: 'AES-256-GCM',
      field: fieldName
    };
  }
  
  async generateDataKey(tenantId) {
    const command = new GenerateDataKeyCommand({
      KeyId: `alias/tenant-${tenantId}`,
      KeySpec: 'AES_256'
    });
    
    return this.kms.send(command);
  }
}
```

## 10. Cost Optimization Implementation

### Dynamic Resource Allocation

```javascript
class ResourceOptimizer {
  async optimizeLambdaMemory(functionName, tenantId) {
    // Analyze last 7 days of execution
    const metrics = await this.getLambdaMetrics(functionName, 7);
    
    // Calculate optimal memory
    const optimalMemory = this.calculateOptimalMemory(metrics);
    
    // Update function configuration
    await lambda.updateFunctionConfiguration({
      FunctionName: functionName,
      MemorySize: optimalMemory,
      Environment: {
        Variables: {
          TENANT_ID: tenantId
        }
      }
    }).promise();
    
    return {
      previous: metrics.averageMemory,
      optimal: optimalMemory,
      estimatedSavings: this.calculateSavings(metrics, optimalMemory)
    };
  }
  
  async implementAutoScaling(resourceType, tenantId) {
    const scalingConfig = {
      lambda: {
        metric: 'ConcurrentExecutions',
        target: 0.7,
        min: 5,
        max: 100
      },
      dynamodb: {
        metric: 'ConsumedCapacity',
        target: 0.7,
        min: 5,
        max: 40000
      }
    };
    
    const config = scalingConfig[resourceType];
    
    return applicationAutoscaling.putScalingPolicy({
      ServiceNamespace: resourceType,
      ResourceId: `table/${tenantId}-analytics`,
      ScalableDimension: 'dynamodb:table:ReadCapacityUnits',
      PolicyType: 'TargetTrackingScaling',
      TargetTrackingScalingPolicyConfiguration: {
        TargetValue: config.target,
        PredefinedMetricSpecification: {
          PredefinedMetricType: config.metric
        }
      }
    }).promise();
  }
}
```

### Tenant Usage Tracking

```javascript
class TenantBillingService {
  async trackUsage(tenantId, service, amount, cost) {
    const usage = {
      PK: `TENANT#${tenantId}#USAGE#${getYearMonth()}`,
      SK: `${Date.now()}#${service}`,
      tenant_id: tenantId,
      service: service,
      amount: amount,
      cost: cost,
      timestamp: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: 'tenant-usage',
      Item: usage
    }).promise();
    
    // Update running totals
    await this.updateMonthlyTotals(tenantId, service, amount, cost);
  }
  
  async generateInvoice(tenantId, month) {
    const usage = await this.getMonthlyUsage(tenantId, month);
    const tier = await this.getTenantTier(tenantId);
    
    const invoice = {
      tenant_id: tenantId,
      billing_period: month,
      line_items: [],
      total: 0
    };
    
    // Apply tiered pricing
    for (const [service, data] of Object.entries(usage)) {
      const discount = this.getTierDiscount(tier, service);
      const cost = data.base_cost * (1 - discount);
      
      invoice.line_items.push({
        service: service,
        usage: data.amount,
        base_cost: data.base_cost,
        discount: discount,
        final_cost: cost
      });
      
      invoice.total += cost;
    }
    
    return invoice;
  }
}
```

## 11. Infrastructure as Code

### Terraform Multi-Tenant Module

```hcl
# Main tenant infrastructure module
module "tenant_infrastructure" {
  source = "./modules/multi-tenant"
  
  tenant_id = var.tenant_id
  environment = var.environment
  region = var.aws_region
  
  # Lambda configuration
  lambda_config = {
    memory_size = 1024
    timeout = 30
    reserved_concurrent_executions = 10
    provisioned_concurrent_executions = var.environment == "prod" ? 5 : 0
  }
  
  # DynamoDB configuration
  dynamodb_config = {
    billing_mode = var.environment == "prod" ? "PROVISIONED" : "PAY_PER_REQUEST"
    read_capacity = 25
    write_capacity = 25
    enable_autoscaling = true
    enable_pitr = true
  }
  
  # Kinesis configuration
  kinesis_config = {
    shard_count = var.environment == "prod" ? 10 : 2
    retention_period = 24
  }
  
  # Security configuration
  security_config = {
    enable_kms_encryption = true
    kms_key_rotation = true
    enable_vpc_endpoints = true
  }
  
  tags = {
    TenantId = var.tenant_id
    Environment = var.environment
    CostCenter = var.cost_center
    ManagedBy = "Terraform"
  }
}
```

### AWS CDK Stack

```typescript
export class MultiTenantAnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props: MultiTenantStackProps) {
    super(scope, id, props);
    
    // VPC for network isolation
    const vpc = new Vpc(this, 'TenantVPC', {
      maxAzs: 3,
      natGateways: props.environment === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });
    
    // DynamoDB table with encryption
    const analyticsTable = new Table(this, 'AnalyticsTable', {
      tableName: `${props.tenantId}-analytics`,
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.ON_DEMAND,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: new Key(this, 'TableKey', {
        alias: `${props.tenantId}/dynamodb`
      }),
      pointInTimeRecovery: true,
      stream: StreamViewType.NEW_AND_OLD_IMAGES
    });
    
    // Lambda function with VPC
    const processorFunction = new Function(this, 'Processor', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda'),
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      },
      environment: {
        TENANT_ID: props.tenantId,
        TABLE_NAME: analyticsTable.tableName
      },
      memorySize: 1024,
      timeout: Duration.seconds(30),
      reservedConcurrentExecutions: 10
    });
    
    // Grant permissions
    analyticsTable.grantReadWriteData(processorFunction);
    
    // Apply tags
    Tags.of(this).add('TenantId', props.tenantId);
    Tags.of(this).add('CostCenter', props.costCenter);
  }
}
```

## 12. Monitoring and Observability

### Comprehensive Monitoring Setup

```javascript
// CloudWatch dashboard configuration
const createTenantDashboard = async (tenantId) => {
  const dashboardBody = {
    widgets: [
      {
        type: "metric",
        properties: {
          metrics: [
            ["AWS/Lambda", "Invocations", { stat: "Sum" }],
            [".", "Duration", { stat: "Average" }],
            [".", "Errors", { stat: "Sum" }],
            [".", "ConcurrentExecutions", { stat: "Maximum" }]
          ],
          period: 300,
          stat: "Average",
          region: "us-east-2",
          title: "Lambda Performance",
          dimensions: {
            FunctionName: `${tenantId}-processor`
          }
        }
      },
      {
        type: "metric",
        properties: {
          metrics: [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits"],
            [".", "ConsumedWriteCapacityUnits"],
            [".", "UserErrors", { stat: "Sum" }],
            [".", "SystemErrors", { stat: "Sum" }]
          ],
          period: 300,
          stat: "Sum",
          region: "us-east-2",
          title: "DynamoDB Usage",
          dimensions: {
            TableName: `${tenantId}-analytics`
          }
        }
      }
    ]
  };
  
  return cloudwatch.putDashboard({
    DashboardName: `${tenantId}-analytics`,
    DashboardBody: JSON.stringify(dashboardBody)
  }).promise();
};

// Custom metrics
const publishCustomMetrics = async (tenantId, metrics) => {
  const params = {
    Namespace: 'AnalyticsPlatform',
    MetricData: metrics.map(metric => ({
      MetricName: metric.name,
      Value: metric.value,
      Unit: metric.unit || 'Count',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'TenantId', Value: tenantId },
        { Name: 'Environment', Value: process.env.ENVIRONMENT }
      ]
    }))
  };
  
  return cloudwatch.putMetricData(params).promise();
};
```

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)
- VPC and network security setup
- Cognito authentication configuration
- Basic DynamoDB schema implementation
- Lambda authorizer deployment

### Phase 2: Core Platform (Weeks 5-8)
- API Gateway with custom domains
- Kinesis streaming pipeline
- Node.js backend services
- Basic tenant provisioning

### Phase 3: Builder Tools (Weeks 9-12)
- Core builder framework
- UTM and tracking script builders
- Email template and landing page builders
- Attribution model implementation

### Phase 4: Advanced Features (Weeks 13-16)
- Real-time analytics with WebSockets
- Custom report builder
- Cross-domain tracking
- Server-side API implementation

### Phase 5: Optimization (Weeks 17-20)
- Cost optimization implementation
- Performance tuning
- Comprehensive monitoring
- Tenant billing system

## Expected Outcomes

**Performance Metrics:**
- API response time: <100ms p95
- Real-time event processing: <50ms
- Dashboard load time: <2 seconds
- System availability: 99.95% SLA

**Scalability Targets:**
- Support 10,000+ tenants
- Process 1M+ events/second
- Handle 100K+ concurrent users
- Store 1PB+ analytics data

**Cost Efficiency:**
- 40-70% cost reduction through optimization
- Per-tenant cost tracking accuracy: 95%+
- Automated resource scaling
- Tiered pricing implementation

This comprehensive implementation plan provides a production-ready blueprint for building your multi-tenant analytics and lead tracking platform, combining AWS serverless architecture with Node.js to deliver enterprise-grade performance, security, and scalability.