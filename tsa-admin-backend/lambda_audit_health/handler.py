"""
Lambda handler for audit logging and health check functionality
Handles audit log retrieval and system health monitoring
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any
import logging

# Import shared utilities from consolidated shared layer
try:
    from shared_utils import create_cors_response, parse_event_body, log_admin_action
    logger = logging.getLogger()
    logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))
except ImportError as e:
    logger.error(f"Failed to import shared utilities: {e}")
    raise

# AWS clients
dynamodb = boto3.resource('dynamodb')

def get_audit_tables():
    """Lazy initialization of audit tables"""
    return {
        'audit_logs': dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', 'admin-audit-logs-v1-dev')),
        'invitations': dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', 'coach-invitations-v1-dev')),
        'profiles': dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profiles-v1-dev'))
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for audit and health requests"""
    try:
        logger.info(f"Audit/health handler called")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')
        
        # Route to appropriate handler
        if '/admin/audit' in path:
            return handle_audit_logs(event, context)
        elif '/health' in path:
            return handle_health_check(event, context)
        else:
            return create_cors_response(404, {'error': 'Audit/health endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in audit/health handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_audit_logs(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle audit log retrieval"""
    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        action_filter = query_params.get('action')
        user_filter = query_params.get('user')
        start_date = query_params.get('start_date')
        end_date = query_params.get('end_date')
        
        tables = get_audit_tables()
        audit_table = tables['audit_logs']
        
        # Build scan filter expression
        filter_expression = None
        expression_values = {}
        
        if action_filter:
            filter_expression = '#action = :action'
            expression_values[':action'] = action_filter
        
        if user_filter:
            if filter_expression:
                filter_expression += ' AND admin_user_id = :user'
            else:
                filter_expression = 'admin_user_id = :user'
            expression_values[':user'] = user_filter
        
        if start_date:
            timestamp_filter = '#timestamp >= :start_date'
            if filter_expression:
                filter_expression += f' AND {timestamp_filter}'
            else:
                filter_expression = timestamp_filter
            expression_values[':start_date'] = start_date
        
        if end_date:
            timestamp_filter = '#timestamp <= :end_date'
            if filter_expression:
                filter_expression += f' AND {timestamp_filter}'
            else:
                filter_expression = timestamp_filter
            expression_values[':end_date'] = end_date
        
        # Execute scan with filters
        scan_kwargs = {'Limit': limit}
        
        if filter_expression:
            scan_kwargs['FilterExpression'] = filter_expression
            scan_kwargs['ExpressionAttributeValues'] = expression_values
            
            # Add attribute names if needed
            if '#action' in filter_expression or '#timestamp' in filter_expression:
                scan_kwargs['ExpressionAttributeNames'] = {}
                if '#action' in filter_expression:
                    scan_kwargs['ExpressionAttributeNames']['#action'] = 'action'
                if '#timestamp' in filter_expression:
                    scan_kwargs['ExpressionAttributeNames']['#timestamp'] = 'timestamp'
        
        response = audit_table.scan(**scan_kwargs)
        audit_logs = response.get('Items', [])
        
        # Sort by timestamp descending
        audit_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return create_cors_response(200, {
            'audit_logs': audit_logs,
            'count': len(audit_logs),
            'filters_applied': {
                'action': action_filter,
                'user': user_filter,
                'start_date': start_date,
                'end_date': end_date
            }
        })
        
    except Exception as e:
        logger.error(f"Error handling audit logs: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle system health check"""
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'tsa-admin-backend',
            'version': '1.0.0',
            'checks': {}
        }
        
        # Check database connectivity
        try:
            tables = get_audit_tables()
            
            # Test DynamoDB connections
            for table_name, table in tables.items():
                try:
                    # Simple describe table call to test connectivity
                    table.table_status
                    health_status['checks'][f'dynamodb_{table_name}'] = {
                        'status': 'healthy',
                        'message': 'Connected successfully'
                    }
                except Exception as e:
                    health_status['checks'][f'dynamodb_{table_name}'] = {
                        'status': 'unhealthy',
                        'message': f'Connection failed: {str(e)}'
                    }
                    health_status['status'] = 'degraded'
            
        except Exception as e:
            health_status['checks']['database'] = {
                'status': 'unhealthy',
                'message': f'Database check failed: {str(e)}'
            }
            health_status['status'] = 'unhealthy'
        
        # Check environment variables
        required_env_vars = [
            'TSA_INVITATIONS_TABLE',
            'TSA_PROFILES_TABLE',
            'TSA_AUDIT_LOGS_TABLE'
        ]
        
        missing_env_vars = []
        for env_var in required_env_vars:
            if not os.environ.get(env_var):
                missing_env_vars.append(env_var)
        
        if missing_env_vars:
            health_status['checks']['environment'] = {
                'status': 'unhealthy',
                'message': f'Missing environment variables: {", ".join(missing_env_vars)}'
            }
            health_status['status'] = 'unhealthy'
        else:
            health_status['checks']['environment'] = {
                'status': 'healthy',
                'message': 'All required environment variables present'
            }
        
        # Check AWS permissions (basic test)
        try:
            # Test basic AWS permissions by attempting to get caller identity
            import boto3
            sts = boto3.client('sts')
            identity = sts.get_caller_identity()
            health_status['checks']['aws_permissions'] = {
                'status': 'healthy',
                'message': f"AWS identity verified: {identity.get('Arn', 'Unknown')}"
            }
        except Exception as e:
            health_status['checks']['aws_permissions'] = {
                'status': 'unhealthy',
                'message': f'AWS permissions check failed: {str(e)}'
            }
            health_status['status'] = 'unhealthy'
        
        # Determine HTTP status code based on health
        if health_status['status'] == 'healthy':
            status_code = 200
        elif health_status['status'] == 'degraded':
            status_code = 200  # Still operational
        else:
            status_code = 503  # Service unavailable
        
        return create_cors_response(status_code, health_status)
        
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        return create_cors_response(500, {
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'tsa-admin-backend',
            'error': str(e)
        })


def get_system_metrics() -> Dict[str, Any]:
    """Get basic system metrics for health monitoring"""
    try:
        tables = get_audit_tables()
        
        # Get basic table counts (limited scans for performance)
        metrics = {
            'database_metrics': {},
            'collected_at': datetime.utcnow().isoformat()
        }
        
        for table_name, table in tables.items():
            try:
                # Use describe table to get item count (approximate)
                table_description = table.Table().table_status
                item_count = table.Table().item_count
                
                metrics['database_metrics'][table_name] = {
                    'status': table_description,
                    'approximate_item_count': item_count,
                    'last_updated': datetime.utcnow().isoformat()
                }
            except Exception as e:
                metrics['database_metrics'][table_name] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        return {
            'error': str(e),
            'collected_at': datetime.utcnow().isoformat()
        }


def create_audit_log_entry(admin_user_id: str, action: str, details: Dict[str, Any]) -> None:
    """Create an audit log entry (utility function)"""
    try:
        tables = get_audit_tables()
        audit_table = tables['audit_logs']
        
        log_entry = {
            'log_id': f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{admin_user_id}_{action}",
            'timestamp': datetime.utcnow().isoformat(),
            'admin_user_id': admin_user_id,
            'action': action,
            'details': details,
            'source': 'admin_backend'
        }
        
        audit_table.put_item(Item=log_entry)
        logger.info(f"Audit log created: {action} by {admin_user_id}")
        
    except Exception as e:
        logger.error(f"Error creating audit log: {str(e)}")
        # Don't raise exception to avoid breaking the main operation


def get_audit_summary(days: int = 7) -> Dict[str, Any]:
    """Get audit activity summary for the specified number of days"""
    try:
        tables = get_audit_tables()
        audit_table = tables['audit_logs']
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Scan for recent audit logs
        response = audit_table.scan(
            FilterExpression='#timestamp >= :start_date',
            ExpressionAttributeNames={'#timestamp': 'timestamp'},
            ExpressionAttributeValues={':start_date': start_date.isoformat()}
        )
        
        audit_logs = response.get('Items', [])
        
        # Summarize activities
        summary = {
            'total_activities': len(audit_logs),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'activities_by_action': {},
            'activities_by_user': {},
            'recent_activities': []
        }
        
        for log in audit_logs:
            action = log.get('action', 'unknown')
            user = log.get('admin_user_id', 'unknown')
            
            # Count by action
            summary['activities_by_action'][action] = summary['activities_by_action'].get(action, 0) + 1
            
            # Count by user
            summary['activities_by_user'][user] = summary['activities_by_user'].get(user, 0) + 1
        
        # Get most recent activities
        audit_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        summary['recent_activities'] = audit_logs[:10]
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting audit summary: {str(e)}")
        return {
            'error': str(e),
            'total_activities': 0
        }

