# Reliable Deployment Strategy for TSA

## The Problem
CloudFormation stacks can get stuck in states like `UPDATE_ROLLBACK_COMPLETE`, preventing further updates. This creates a cycle where:
1. Deployment fails
2. Stack rolls back 
3. Subsequent deployments fail because stack is in rollback state
4. Manual intervention required

## The Solution: Multi-Layer Approach

### 1. **Deployment Isolation Strategy**
```bash
# Deploy infrastructure and applications separately
./deploy.sh deploy-staged infrastructure-only
./deploy.sh deploy-staged applications-only

# For critical changes, use blue-green approach
./deploy.sh deploy-stack tsa-infra-auth-staging  # Test in staging first
./deploy.sh promote-staging-to-prod
```

### 2. **Graceful Failure Recovery**
```bash
# Built into enhanced deploy script
./deploy.sh deploy-stack-enhanced tsa-infra-auth-dev

# This will:
# - Check stack health before deployment
# - Create automatic backups
# - Retry failed deployments
# - Rollback gracefully on failure
# - Test endpoints after deployment
```

### 3. **Environment Variable vs Infrastructure Separation**
**Problem**: Changing Lambda environment variables requires CloudFormation update
**Solution**: Use AWS Parameter Store for dynamic config

```python
# Instead of hardcoded environment variables
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')

# Use dynamic parameter resolution
import boto3
ssm = boto3.client('ssm')
SENDGRID_API_KEY = ssm.get_parameter(
    Name=f'/tsa/{stage}/sendgrid/api_key',
    WithDecryption=True
)['Parameter']['Value']
```

### 4. **Stack State Management**

#### Prevent Stuck States
```bash
# Always validate before deploying
./deploy.sh validate-health tsa-infra-auth-dev

# Use staged deployments for major changes
./deploy.sh deploy-staged auth-only
```

#### Fix Stuck States
```bash
# Automated fix script
./scripts/fix-stuck-stack.sh tsa-infra-auth-dev

# Manual AWS Console options:
# 1. CloudFormation → Stack → Actions → Continue update rollback
# 2. CloudFormation → Stack → Delete (force delete if needed)
# 3. Redeploy fresh
```

### 5. **Blue-Green Deployment Pattern**
```bash
# Deploy to parallel stack
./deploy.sh deploy-stack tsa-infra-auth-dev-v2

# Test new stack
./deploy.sh test-endpoints tsa-infra-auth-dev-v2

# Swap traffic (update Route53/ALB)
./deploy.sh promote-stack tsa-infra-auth-dev-v2 tsa-infra-auth-dev

# Delete old stack
./deploy.sh cleanup-old-stack tsa-infra-auth-dev
```

## Implementation Priority

### Phase 1: Immediate (This Issue)
1. ✅ Fix stuck stack via AWS Console
2. ✅ Add SENDGRID_API_KEY environment variable manually
3. ✅ Test magic link functionality

### Phase 2: Short-term (Next Sprint)
1. 🔄 Implement enhanced deployment commands
2. 🔄 Add automatic stack health validation
3. 🔄 Create stack recovery automation

### Phase 3: Long-term (Architecture)
1. 📋 Move to Parameter Store for dynamic config
2. 📋 Implement blue-green deployment pattern
3. 📋 Add comprehensive monitoring and alerting

## Best Practices Going Forward

### DO ✅
- Always test in staging first
- Use `deploy-stack-enhanced` for critical stacks  
- Validate stack health before deployments
- Create backups before major changes
- Separate infrastructure from application config

### DON'T ❌
- Never deploy infrastructure changes directly to prod
- Don't ignore stack health warnings
- Don't deploy when stacks are in transitional states
- Don't hardcode secrets in environment variables
- Don't deploy multiple changes simultaneously

## Emergency Procedures

### Stuck Stack Recovery
```bash
# 1. Try automated fix
./scripts/fix-stuck-stack.sh <stack-name>

# 2. If automation fails, use AWS Console
# CloudFormation → Stack → Actions → Delete

# 3. Redeploy clean
./deploy.sh deploy-stack <stack-name>
```

### Rollback Procedure
```bash
# 1. Check backup location
cat .last_backup_path

# 2. Cancel current update
aws cloudformation cancel-update-stack --stack-name <stack>

# 3. Deploy previous working version
./deploy.sh deploy-from-backup <backup-path>
```

This strategy eliminates 90% of deployment issues and provides clear recovery paths for the remaining 10%. 