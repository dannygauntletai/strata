"""
Lambda handler for analytics dashboard functionality
Handles dashboard metrics, event tracking, sessions, and onboarding analytics
"""
import json
import uuid
import os
import boto3
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
import logging
from decimal import Decimal

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
kinesis = boto3.client('kinesis')

def get_analytics_tables():
    """Lazy initialization of analytics tables"""
    return {
        'analytics_events': dynamodb.Table(os.environ.get('TSA_ANALYTICS_EVENTS_TABLE', 'coach-analytics-eventsdev')),
        'sessions': dynamodb.Table(os.environ.get('TSA_ANALYTICS_SESSIONS_TABLE', 'coach-analytics-sessionsdev')),
        'invitations': dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', 'coach-invitationsdev')),
        'profiles': dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profilesdev')),
        'audit': dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', 'admin-audit-logsdev'))
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for analytics dashboard requests"""
    try:
        logger.info(f"Analytics dashboard handler called")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')
        
        # Route to appropriate handler
        if '/admin/analytics/events' in path:
            return handle_analytics_events(event, context)
        elif '/admin/analytics/realtime' in path:
            return handle_realtime_analytics(event, context)
        elif '/admin/analytics/sessions' in path:
            return handle_sessions_analytics(event, context)
        elif '/admin/analytics/onboarding' in path:
            return handle_onboarding_analytics(event, context)
        elif '/admin/analytics' in path and http_method == 'GET':
            return handle_dashboard_analytics(event, context)
        else:
            return create_cors_response(404, {'error': 'Analytics endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in analytics dashboard handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_dashboard_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle dashboard analytics with enhanced metrics"""
    try:
        # Get table references
        tables = get_analytics_tables()
        invitations_table = tables['invitations']
        profiles_table = tables['profiles']
        audit_table = tables['audit']
        
        # Fetch data
        invitations_response = invitations_table.scan()
        invitations = invitations_response.get('Items', [])
        
        coaches_response = profiles_table.scan()
        coaches = coaches_response.get('Items', [])
        
        audit_response = audit_table.scan(Limit=10)
        audit_logs = audit_response.get('Items', [])
        
        # Calculate metrics
        total_invitations = len(invitations)
        pending_invitations = len([inv for inv in invitations if inv.get('status') == 'pending'])
        completed_invitations = len([inv for inv in invitations if inv.get('status') == 'accepted'])
        cancelled_invitations = len([inv for inv in invitations if inv.get('status') == 'cancelled'])
        
        total_coaches = len(coaches)
        active_coaches = len([coach for coach in coaches if coach.get('status') == 'active'])
        
        # Calculate completion rate
        onboarding_completion_rate = 0.0
        if total_invitations > 0:
            onboarding_completion_rate = (completed_invitations / total_invitations) * 100
        
        # Format recent activity
        recent_activity = []
        audit_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        for log in audit_logs[:5]:
            activity = {
                'action': log.get('action', 'Unknown action'),
                'details': f"{log.get('action', 'Action')} - {log.get('details', {}).get('email', 'Unknown user')}",
                'timestamp': log.get('timestamp', datetime.utcnow().isoformat()),
                'user': log.get('admin_user_id', 'System')
            }
            recent_activity.append(activity)
        
        analytics_data = {
            'total_invitations': total_invitations,
            'pending_invitations': pending_invitations,
            'completed_invitations': completed_invitations,
            'cancelled_invitations': cancelled_invitations,
            'total_coaches': total_coaches,
            'active_coaches': active_coaches,
            'onboarding_completion_rate': round(onboarding_completion_rate, 1),
            'recent_activity': recent_activity,
            'conversion_funnel': {
                'invited': total_invitations,
                'clicked': completed_invitations,
                'started_onboarding': completed_invitations,
                'completed_onboarding': active_coaches
            },
            'growth_metrics': {
                'invitations_this_week': len([inv for inv in invitations if is_this_week(inv.get('created_at', ''))]),
                'coaches_this_week': len([coach for coach in coaches if is_this_week(coach.get('created_at', ''))]),
                'completion_rate_trend': onboarding_completion_rate
            }
        }
        
        return create_cors_response(200, analytics_data)
        
    except Exception as e:
        logger.error(f"Error handling dashboard analytics: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_analytics_events(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle event tracking and retrieval"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        if http_method == 'POST':
            if '/batch' in path:
                return track_events_batch(event)
            else:
                return track_event(event)
        elif http_method == 'GET':
            return get_analytics_events(event)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error handling analytics events: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def track_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Track a single analytics event"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_type', 'tenant_id']
        for field in required_fields:
            if field not in body:
                return create_cors_response(400, {'error': f'Missing required field: {field}'})
        
        # Generate event data
        event_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        tenant_id = body['tenant_id']
        
        # Create event record
        event_record = {
            'PK': f"TENANT#{tenant_id}#EVENT#{timestamp[:10]}",
            'SK': f"{timestamp}#{body.get('session_id', 'unknown')}#{event_id}",
            'GSI1_PK': f"TENANT#{tenant_id}#USER#{body.get('user_id', 'anonymous')}",
            'GSI1_SK': timestamp,
            'event_id': event_id,
            'event_type': body['event_type'],
            'tenant_id': tenant_id,
            'user_id': body.get('user_id', 'anonymous'),
            'session_id': body.get('session_id'),
            'timestamp': timestamp,
            'properties': body.get('properties', {}),
            'context': body.get('context', {}),
            'attribution': body.get('attribution', {}),
            'ttl': int((datetime.utcnow() + timedelta(days=90)).timestamp())
        }
        
        # Add campaign attribution if present
        if 'utm_campaign' in body.get('properties', {}):
            event_record['GSI2_PK'] = f"TENANT#{tenant_id}#CAMPAIGN#{body['properties']['utm_campaign']}"
            event_record['GSI2_SK'] = timestamp
        
        # Store in DynamoDB
        tables = get_analytics_tables()
        events_table = tables['analytics_events']
        events_table.put_item(Item=event_record)
        
        return create_cors_response(201, {
            'message': 'Event tracked successfully',
            'event_id': event_id,
            'timestamp': timestamp
        })
        
    except Exception as e:
        logger.error(f"Error tracking event: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def track_events_batch(event: Dict[str, Any]) -> Dict[str, Any]:
    """Track multiple analytics events in batch"""
    try:
        body = parse_event_body(event)
        events = body.get('events', [])
        
        if not events:
            return create_cors_response(400, {'error': 'No events provided'})
        
        if len(events) > 25:
            return create_cors_response(400, {'error': 'Maximum 25 events per batch'})
        
        tables = get_analytics_tables()
        events_table = tables['analytics_events']
        
        # Process events in batch
        with events_table.batch_writer() as batch:
            processed_events = []
            
            for evt in events:
                try:
                    event_id = str(uuid.uuid4())
                    timestamp = datetime.utcnow().isoformat()
                    tenant_id = evt.get('tenant_id', 'default')
                    
                    event_record = {
                        'PK': f"TENANT#{tenant_id}#EVENT#{timestamp[:10]}",
                        'SK': f"{timestamp}#{evt.get('session_id', 'unknown')}#{event_id}",
                        'GSI1_PK': f"TENANT#{tenant_id}#USER#{evt.get('user_id', 'anonymous')}",
                        'GSI1_SK': timestamp,
                        'event_id': event_id,
                        'event_type': evt.get('event_type', 'unknown'),
                        'tenant_id': tenant_id,
                        'user_id': evt.get('user_id', 'anonymous'),
                        'session_id': evt.get('session_id'),
                        'timestamp': timestamp,
                        'properties': evt.get('properties', {}),
                        'context': evt.get('context', {}),
                        'attribution': evt.get('attribution', {}),
                        'ttl': int((datetime.utcnow() + timedelta(days=90)).timestamp())
                    }
                    
                    batch.put_item(Item=event_record)
                    processed_events.append({'event_id': event_id, 'status': 'success'})
                    
                except Exception as e:
                    logger.error(f"Error processing event in batch: {str(e)}")
                    processed_events.append({'status': 'error', 'error': str(e)})
        
        return create_cors_response(200, {
            'message': f'Processed {len(processed_events)} events',
            'results': processed_events
        })
        
    except Exception as e:
        logger.error(f"Error tracking events batch: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def get_analytics_events(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get analytics events with filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        tenant_id = query_params.get('tenant_id', 'default')
        event_type = query_params.get('event_type')
        start_date = query_params.get('start_date')
        limit = int(query_params.get('limit', 100))
        
        tables = get_analytics_tables()
        events_table = tables['analytics_events']
        
        # Build query based on date range
        if start_date:
            pk_value = f"TENANT#{tenant_id}#EVENT#{start_date}"
            response = events_table.query(
                KeyConditionExpression='PK = :pk',
                ExpressionAttributeValues={':pk': pk_value},
                Limit=limit,
                ScanIndexForward=False
            )
        else:
            response = events_table.scan(
                FilterExpression='tenant_id = :tenant_id',
                ExpressionAttributeValues={':tenant_id': tenant_id},
                Limit=limit
            )
        
        events = response.get('Items', [])
        
        # Filter by event type if specified
        if event_type:
            events = [e for e in events if e.get('event_type') == event_type]
        
        return create_cors_response(200, {
            'events': events,
            'count': len(events)
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics events: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_realtime_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle realtime analytics data"""
    try:
        # Placeholder for realtime analytics implementation
        return create_cors_response(200, {
            'active_sessions': 0,
            'current_users': 0,
            'events_per_minute': 0,
            'top_pages': [],
            'message': 'Realtime analytics service active'
        })
        
    except Exception as e:
        logger.error(f"Error handling realtime analytics: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_sessions_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle session-based analytics"""
    try:
        return create_cors_response(200, {
            'total_sessions': 0,
            'average_session_duration': 0,
            'bounce_rate': 0,
            'pages_per_session': 0,
            'message': 'Session analytics service active'
        })
        
    except Exception as e:
        logger.error(f"Error handling sessions analytics: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_onboarding_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle onboarding-specific analytics"""
    try:
        tables = get_analytics_tables()
        invitations_table = tables['invitations']
        profiles_table = tables['profiles']
        
        # Get onboarding data
        invitations_response = invitations_table.scan()
        invitations = invitations_response.get('Items', [])
        
        profiles_response = profiles_table.scan()
        profiles = profiles_response.get('Items', [])
        
        # Calculate onboarding metrics
        total_invitations = len(invitations)
        started_onboarding = len([inv for inv in invitations if inv.get('status') in ['pending', 'accepted']])
        completed_onboarding = len([prof for prof in profiles if prof.get('onboarding_complete')])
        
        onboarding_funnel = {
            'invited': total_invitations,
            'started': started_onboarding,
            'completed': completed_onboarding,
            'completion_rate': (completed_onboarding / total_invitations * 100) if total_invitations > 0 else 0
        }
        
        return create_cors_response(200, {
            'onboarding_funnel': onboarding_funnel,
            'step_completion_rates': {},
            'average_completion_time': None,
            'drop_off_points': []
        })
        
    except Exception as e:
        logger.error(f"Error handling onboarding analytics: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def is_this_week(date_str: str) -> bool:
    """Check if date is within current week"""
    try:
        if not date_str:
            return False
        
        date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return date >= week_start
        
    except Exception:
        return False 