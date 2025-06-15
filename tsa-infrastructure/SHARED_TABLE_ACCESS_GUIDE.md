# TSA Shared Table Access Patterns Guide

## 🎯 Current Architecture Issues

### Problem: Overpermissive IAM Policies
```python
# ❌ CURRENT (Dangerous)
resources=[
    f"arn:aws:dynamodb:*:*:table/*-{self.stage}",     # ALL tables!
    f"arn:aws:dynamodb:*:*:table/*-{self.stage}/*"   # ALL indexes!
]

# ✅ FIXED (Explicit permissions)
resources=[
    coach_profiles_table_arn,
    f"{coach_profiles_table_arn}/index/*",
    invitations_table_arn,
    f"{invitations_table_arn}/index/*"
]
```

## 📋 Recommended Patterns by Service

### Admin Service Access Patterns
```python
class AdminPortalService:
    def _grant_specific_permissions(self, function):
        # ✅ Only tables admin actually needs
        admin_owned_tables = [
            self.invitations_table.table_arn,
            self.audit_logs_table.table_arn,
            self.analytics_events_table.table_arn
        ]
        
        # ✅ Read-only access to coach data
        coach_profiles_arn = self.shared_resources["coach_profiles_table_arn"]
        
        function.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
                resources=admin_owned_tables
            )
        )
        
        function.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["dynamodb:GetItem", "dynamodb:Query"],  # Read-only
                resources=[coach_profiles_arn, f"{coach_profiles_arn}/index/*"]
            )
        )
```

### Parent Service Access Patterns
```python
class ParentPortalService:
    def _setup_coach_data_access(self):
        # ✅ API-first approach
        self.coach_api_url = self.shared_resources["coach_api_url"]
        
    async def get_coach_info(self, coach_id: str):
        # ✅ Call Coach Service API
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.coach_api_url}/coaches/{coach_id}") as response:
                return await response.json()
```

## 🔄 Data Flow Examples

### Example 1: Admin Views Coach Profiles
```python
# ✅ Direct table read (read-only permission)
def list_coaches(self):
    response = self.dynamodb.scan(
        TableName=self.coach_profiles_table_name,
        FilterExpression="attribute_exists(#status) AND #status = :active",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":active": "active"}
    )
    return response["Items"]
```

### Example 2: Parent Enrolls with Coach
```python
# ✅ API call + local table write
def create_enrollment(self, coach_id: str, student_data: dict):
    # Get coach info via API
    coach_info = await self.get_coach_info(coach_id)
    
    # Create enrollment in parent-owned table
    enrollment = {
        "enrollment_id": str(uuid.uuid4()),
        "coach_id": coach_id,
        "coach_name": coach_info["name"],  # Cached from API
        "student_data": student_data,
        "status": "pending"
    }
    
    self.enrollments_table.put_item(Item=enrollment)
    return enrollment
```

### Example 3: Event-Driven Updates
```python
# ✅ Coach updates profile, others get notified
class CoachPortalService:
    def update_profile(self, coach_id: str, updates: dict):
        # Update coach table
        self.profiles_table.update_item(
            Key={"coach_id": coach_id},
            UpdateExpression="SET profile_data = :data",
            ExpressionAttributeValues={":data": updates}
        )
        
        # Publish event
        event_bridge.put_events(
            Entries=[{
                "Source": "tsa.coach",
                "DetailType": "Coach Profile Updated",
                "Detail": json.dumps({
                    "coach_id": coach_id,
                    "updates": updates
                })
            }]
        )

class ParentPortalService:
    def handle_coach_profile_updated(self, event):
        coach_id = event["detail"]["coach_id"]
        updates = event["detail"]["updates"]
        
        # Update cached coach data in enrollments
        self.enrollments_table.update_item(
            Key={"coach_id": coach_id},
            UpdateExpression="SET coach_name = :name",
            ExpressionAttributeValues={":name": updates.get("name")}
        )
```

## 🏗️ Infrastructure Implementation

### Shared Resources Configuration
```python
# app.py - Explicit resource sharing
shared_resources = {
    # Infrastructure
    "vpc": networking_stack.vpc,
    "user_pool": security_stack.user_pool,
    
    # Table ARNs (not names - for IAM permissions)
    "coach_profiles_table_arn": coach_service.profiles_table.table_arn,
    "invitations_table_arn": admin_service.invitations_table.table_arn,
    
    # API URLs (for service-to-service calls)
    "coach_api_url": coach_service.api_url,
    "parent_api_url": parent_service.api_url,
}
```

### Service Dependencies
```python
# ✅ Explicit dependencies in app.py
parent_backend_stack.add_dependency(coach_backend_stack)  # Parent needs coach API
admin_backend_stack.add_dependency(coach_backend_stack)   # Admin needs coach data
admin_backend_stack.add_dependency(parent_backend_stack)  # Admin needs parent data
```

## 📏 Decision Matrix

| Access Pattern | Use When | Benefits | Drawbacks |
|-------|----------|----------|-----------|
| **API Calls** | Read-only, infrequent access | Clean boundaries, business logic | Latency, network dependency |
| **Direct Table Access** | High-frequency reads | Fast access | Tight coupling, permission complexity |
| **Event-Driven Sync** | Local copies needed | Eventually consistent, scalable | Complex setup, data lag |
| **Shared Tables** | Reference data only | Simple, single source of truth | Tight coupling, schema changes hard |

## 🎯 TSA-Specific Recommendations

### Coach Profiles (Most Accessed)
- **Owner**: Coach Service
- **Admin Access**: Direct table read (read-only IAM)
- **Parent Access**: API calls (infrequent)

### Invitations (Cross-cutting)
- **Owner**: Admin Service (creates) + Coach Service (fulfills)
- **Pattern**: Shared table with explicit permissions

### Enrollments (Parent-owned)
- **Owner**: Parent Service
- **Admin Access**: API calls for oversight
- **Coach Access**: API calls for student info

### Analytics Events (Write-heavy)
- **Owner**: Admin Service
- **Pattern**: Event streaming + local aggregation

## ⚡ Implementation Priority

1. **Fix wildcard permissions** in admin service
2. **Add API endpoints** for cross-service data access
3. **Implement explicit IAM grants** for high-frequency reads
4. **Add event-driven patterns** for real-time updates (future) 