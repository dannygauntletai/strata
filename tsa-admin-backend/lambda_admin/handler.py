"""
Lambda handler for admin portal functionality
Handles coach invitations, oversight, and analytics
"""
import json
import os
import boto3
import uuid
from typing import Dict, Any
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for admin portal requests"""
    try:
        logger.info(f"Event received: {json.dumps(event, default=str)}")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        logger.info(f"Processing {http_method} {path}")
        
        # Route to appropriate handler
        if '/admin/invitations' in path:
            return handle_invitations(event, context)
        elif '/admin/coaches' in path:
            return handle_coaches(event, context)
        elif '/admin/analytics' in path:
            return handle_analytics(event, context)
        elif '/admin/audit' in path:
            return handle_audit_logs(event, context)
        elif '/health' in path:
            return handle_health_check(event, context)
        else:
            return create_cors_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return create_cors_response(500, {
            'error': 'Internal server error',
            'details': str(e)
        })


def create_cors_response(status_code: int, body: dict) -> dict:
    """Create response with proper CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            return json.loads(body) if body else {}
        
        return body if isinstance(body, dict) else {}
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error parsing body: {str(e)}")
        return {}


def handle_invitations(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle invitation management endpoints"""
    try:
        http_method = event.get('httpMethod', '')
        path_parameters = event.get('pathParameters') or {}
        invitation_id = path_parameters.get('invitation_id')
        
        if http_method == 'GET':
            if invitation_id:
                return get_invitation(invitation_id)
            else:
                return list_invitations(event)
        elif http_method == 'POST':
            if 'resend' in event.get('path', ''):
                return resend_invitation(invitation_id)
            else:
                return create_invitation(event)
        elif http_method == 'PUT':
            return update_invitation(invitation_id, event)
        elif http_method == 'DELETE':
            if 'delete' in event.get('path', ''):
                return delete_invitation(invitation_id)
            else:
            return cancel_invitation(invitation_id)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error handling invitations: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def create_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new coach invitation - simplified to only email and message"""
    try:
        body = parse_event_body(event)
        
        # Only validate email is required
        if 'email' not in body or not body['email']:
            return create_cors_response(400, {'error': 'Missing required field: email'})
        
        # Check for duplicate pending invitations
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        # Check if active invitation already exists for this email
        response = invitations_table.scan(
            FilterExpression='email = :email AND #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':email': body['email'].lower().strip(),
                ':status': 'pending'
            }
        )
        
        if response.get('Items'):
            return create_cors_response(409, {'error': 'Active invitation already exists for this email'})
        
        # Generate invitation with minimal data
        invitation_id = str(uuid.uuid4())
        invitation_token = str(uuid.uuid4())
        expires_at = int((datetime.utcnow() + timedelta(days=7)).timestamp())
        
        invitation = {
            'invitation_id': invitation_id,
            'invitation_token': invitation_token,
            'email': body['email'].lower().strip(),
            'message': body.get('message', ''),
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at,
            'created_by': body.get('admin_user_id', 'system')
        }
        
        # Store in DynamoDB
        invitations_table.put_item(Item=invitation)
        
        # Send invitation email
        invite_url = f"{os.environ.get('TSA_FRONTEND_URL', os.environ.get('FRONTEND_URL', 'https://coach.texassportsacademy.com'))}/onboarding?invite={invitation_token}"
        send_invitation_email(body['email'], invite_url, invitation)
        
        # Log the action
        log_admin_action(
            admin_user_id=body.get('admin_user_id', 'system'),
            action='create_invitation',
            details={
                'invitation_id': invitation_id,
                'email': body['email']
            }
        )
        
        return create_cors_response(201, {
            'message': 'Invitation created successfully',
            'invitation_id': invitation_id,
            'invite_url': invite_url,
            'expires_at': expires_at
        })
        
    except Exception as e:
        logger.error(f"Error creating invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def list_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all invitations with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')
        limit = int(query_params.get('limit', 50))
        
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        if status_filter:
            # Query by status using GSI
            response = invitations_table.query(
                IndexName='status-index',
                KeyConditionExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': status_filter},
                Limit=limit,
                ScanIndexForward=False  # Most recent first
            )
        else:
            # Scan all invitations
            response = invitations_table.scan(Limit=limit)
        
        invitations = response.get('Items', [])
        
        # Sort by created_at descending
        invitations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_cors_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        })
        
    except Exception as e:
        logger.error(f"Error listing invitations: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def get_invitation(invitation_id: str) -> Dict[str, Any]:
    """Get specific invitation details"""
    try:
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        response = invitations_table.get_item(
            Key={'invitation_id': invitation_id}
        )
        
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        return create_cors_response(200, response['Item'])
        
    except Exception as e:
        logger.error(f"Error getting invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def resend_invitation(invitation_id: str) -> Dict[str, Any]:
    """Resend an invitation email"""
    try:
        # Get invitation details
        invitation_response = get_invitation(invitation_id)
        if invitation_response['statusCode'] != 200:
            return invitation_response
        
        invitation = json.loads(invitation_response['body'])
        
        # Check if invitation is still valid
        if invitation['status'] != 'pending':
            return create_cors_response(400, {'error': 'Invitation is no longer pending'})
        
        if datetime.utcnow().timestamp() > invitation['expires_at']:
            return create_cors_response(400, {'error': 'Invitation has expired'})
        
        # Resend email
        invite_url = f"{os.environ.get('TSA_FRONTEND_URL', os.environ.get('FRONTEND_URL', 'https://coach.texassportsacademy.com'))}/onboarding?invite={invitation['invitation_token']}"
        send_invitation_email(invitation['email'], invite_url, invitation)
        
        # Update last sent timestamp
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET last_sent_at = :timestamp',
            ExpressionAttributeValues={':timestamp': datetime.utcnow().isoformat()}
        )
        
        return create_cors_response(200, {'message': 'Invitation resent successfully'})
        
    except Exception as e:
        logger.error(f"Error resending invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def cancel_invitation(invitation_id: str) -> Dict[str, Any]:
    """Cancel an invitation"""
    try:
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        # Update status to cancelled
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET #status = :status, cancelled_at = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'cancelled',
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        
        return create_cors_response(200, {'message': 'Invitation cancelled successfully'})
        
    except Exception as e:
        logger.error(f"Error cancelling invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def delete_invitation(invitation_id: str) -> Dict[str, Any]:
    """Permanently delete an invitation"""
    try:
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        # First check if invitation exists and get email for logging
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        invitation = response['Item']
        
        # Delete the invitation
        invitations_table.delete_item(Key={'invitation_id': invitation_id})
        
        # Log the deletion
        log_admin_action(
            admin_user_id='system',
            action='delete_invitation',
            details={
                'invitation_id': invitation_id,
                'email': invitation.get('email', 'unknown'),
                'status': invitation.get('status', 'unknown')
            }
        )
        
        return create_cors_response(200, {'message': 'Invitation deleted permanently'})
        
    except Exception as e:
        logger.error(f"Error deleting invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def update_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an invitation"""
    try:
        body = parse_event_body(event)
        
        # Build update expression dynamically
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': datetime.utcnow().isoformat()}
        expression_names = {}
        
        # Allow updating certain fields
        updatable_fields = ['role', 'school_name', 'school_type', 'sport', 'message']
        for field in updatable_fields:
            if field in body:
                if field == 'status':  # Special handling for status
                    update_expression += ", #status = :status"
                    expression_names['#status'] = 'status'
                    expression_values[':status'] = body[field]
                else:
                    update_expression += f", {field} = :{field}"
                    expression_values[f':{field}'] = body[field]
        
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names if expression_names else None
        )
        
        return create_cors_response(200, {'message': 'Invitation updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def send_invitation_email(email: str, invite_url: str, invitation: Dict[str, Any]) -> None:
    """Send invitation email using SES"""
    try:
        ses_client = boto3.client('ses')
        
        subject = "Invitation to Join Texas Sports Academy Coach Portal"
        
        html_body = f"""
        <html>
        <body>
            <h2>You're Invited to Join Texas Sports Academy!</h2>
            <p>Hello,</p>
            <p>You've been invited to join the Texas Sports Academy Coach Portal.</p>
            
            {f"<p><em>Personal message:</em><br>{invitation['message']}</p>" if invitation.get('message') else ""}
            
            <p>Click the button below to complete your coach application:</p>
            <p><a href="{invite_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Application</a></p>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="{invite_url}">{invite_url}</a></p>
            
            <p>You'll only need to provide:</p>
            <ul>
                <li>Your name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Location</li>
            </ul>
            
            <p>This invitation will expire in 7 days.</p>
            
            <p>Best regards,<br>The Texas Sports Academy Team</p>
        </body>
        </html>
        """
        
        text_body = f"""
        You're Invited to Join Texas Sports Academy!

        Hello,

        You've been invited to join the Texas Sports Academy Coach Portal.

        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}

        Complete your coach application by visiting: {invite_url}

        You'll only need to provide:
        - Your name
        - Email address  
        - Phone number
        - Location

        This invitation will expire in 7 days.

        Best regards,
        The Texas Sports Academy Team
        """
        
        ses_client.send_email(
            Source=os.environ.get('TSA_FROM_EMAIL', os.environ.get('FROM_EMAIL', 'noreply@texassportsacademy.com')),
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': html_body},
                    'Text': {'Data': text_body}
                }
            }
        )
        
        logger.info(f"Invitation email sent to {email}")
        
    except Exception as e:
        logger.error(f"Error sending invitation email: {str(e)}")
        raise


def handle_coaches(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle coach management endpoints"""
    try:
        http_method = event.get('httpMethod', '')
        path_parameters = event.get('pathParameters') or {}
        coach_id = path_parameters.get('coach_id')
        
        if http_method == 'GET':
            return list_coaches(event)
        elif http_method == 'DELETE':
            if coach_id:
                return delete_coach(coach_id)
            else:
                return create_cors_response(400, {'error': 'Coach ID is required for deletion'})
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error handling coaches: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def list_coaches(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all coaches from profiles table"""
    try:
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        response = profiles_table.scan()
        profiles = response.get('Items', [])
        
        # Sort by created_at descending
        profiles.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_cors_response(200, {
            'coaches': profiles,
            'count': len(profiles)
        })
        
    except Exception as e:
        logger.error(f"Error listing coaches: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def delete_coach(coach_id: str) -> Dict[str, Any]:
    """Delete a coach from the profiles table"""
    try:
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # First check if coach exists
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Coach not found'})
        
        # Delete the coach profile
        profiles_table.delete_item(Key={'profile_id': coach_id})
        
        # Log the deletion
        log_admin_action(
            admin_user_id='system',
            action='delete_coach',
            details={
                'coach_id': coach_id,
                'email': response['Item'].get('email', 'unknown')
            }
        )
        
        return create_cors_response(200, {'message': 'Coach deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting coach: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle analytics endpoints with real data"""
    try:
        dynamodb = boto3.resource('dynamodb')
        
        # Get table references
        invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        audit_table = dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', os.environ.get('AUDIT_LOGS_TABLE', 'admin-audit-logs-v3-dev')))
        
        # Fetch invitations data
        invitations_response = invitations_table.scan()
        invitations = invitations_response.get('Items', [])
        
        # Fetch coaches data
        coaches_response = profiles_table.scan()
        coaches = coaches_response.get('Items', [])
        
        # Fetch recent audit logs for activity
        audit_response = audit_table.scan(Limit=10)
        audit_logs = audit_response.get('Items', [])
        
        # Calculate invitation metrics
        total_invitations = len(invitations)
        pending_invitations = len([inv for inv in invitations if inv.get('status') == 'pending'])
        completed_invitations = len([inv for inv in invitations if inv.get('status') == 'accepted'])
        cancelled_invitations = len([inv for inv in invitations if inv.get('status') == 'cancelled'])
        
        # Calculate coach metrics
        total_coaches = len(coaches)
        active_coaches = len([coach for coach in coaches if coach.get('status') == 'active'])
        
        # Calculate onboarding completion rate
        onboarding_completion_rate = 0.0
        if total_invitations > 0:
            onboarding_completion_rate = (completed_invitations / total_invitations) * 100
        
        # Format recent activity from audit logs
        recent_activity = []
        audit_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        for log in audit_logs[:5]:  # Get last 5 activities
            activity = {
                'action': log.get('action', 'Unknown action'),
                'details': f"{log.get('action', 'Action')} - {log.get('details', {}).get('email', 'Unknown user')}",
                'timestamp': log.get('timestamp', datetime.utcnow().isoformat()),
                'user': log.get('admin_user_id', 'System')
            }
            recent_activity.append(activity)
        
        # Build analytics data with real metrics
        analytics_data = {
            'total_invitations': total_invitations,
            'pending_invitations': pending_invitations,
            'completed_invitations': completed_invitations,
            'cancelled_invitations': cancelled_invitations,
            'total_coaches': total_coaches,
            'active_coaches': active_coaches,
            'onboarding_completion_rate': round(onboarding_completion_rate, 1),
            'average_onboarding_time': 'N/A',  # Would need time tracking to calculate
            'recent_activity': recent_activity
        }
        
        return create_cors_response(200, analytics_data)
        
    except Exception as e:
        logger.error(f"Error handling analytics: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_audit_logs(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle audit log endpoints"""
    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        
        dynamodb = boto3.resource('dynamodb')
        audit_table = dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', os.environ.get('AUDIT_LOGS_TABLE', 'admin-audit-logs-v3-dev')))
        
        response = audit_table.scan(Limit=limit)
        logs = response.get('Items', [])
        
        # Sort by timestamp descending
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return create_cors_response(200, {
            'audit_logs': logs,
            'count': len(logs)
        })
        
    except Exception as e:
        logger.error(f"Error handling audit logs: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def log_admin_action(admin_user_id: str, action: str, details: Dict[str, Any]) -> None:
    """Log admin action to audit table"""
    try:
        dynamodb = boto3.resource('dynamodb')
        audit_table = dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', os.environ.get('AUDIT_LOGS_TABLE', 'admin-audit-logs-v3-dev')))
        
        log_entry = {
            'log_id': str(uuid.uuid4()),
            'admin_user_id': admin_user_id,
            'action': action,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': 'unknown',  # Could extract from event context
        }
        
        audit_table.put_item(Item=log_entry)
        
    except Exception as e:
        logger.error(f"Error logging admin action: {str(e)}")


def handle_health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test DynamoDB connectivity
        health_status = {
            'status': 'healthy',
            'services': {
                'lambda': 'healthy',
                'dynamodb': 'unknown',
                'ses': 'unknown'
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Test DynamoDB
        try:
            dynamodb = boto3.resource('dynamodb')
            invitations_table = dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', os.environ.get('INVITATIONS_TABLE', 'coach-invitations-v3-dev')))
            invitations_table.meta.client.describe_table(TableName=invitations_table.table_name)
            health_status['services']['dynamodb'] = 'healthy'
        except Exception:
            health_status['services']['dynamodb'] = 'unhealthy'
        
        # Test SES
        try:
            ses_client = boto3.client('ses')
            ses_client.get_send_quota()
            health_status['services']['ses'] = 'healthy'
        except Exception:
            health_status['services']['ses'] = 'unhealthy'
        
        return create_cors_response(200, health_status)
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return create_cors_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }) 