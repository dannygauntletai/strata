"""
Lambda handler for coach invitation management
Handles invitation creation, listing, updates, and email sending
"""
import json
import os
import boto3
import uuid
from typing import Dict, Any
from datetime import datetime, timedelta
import logging
from shared_config import get_config


# Set up logger first
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import shared utilities from consolidated shared layer
try:
    from shared_utils import create_cors_response, parse_event_body, log_admin_action, SendGridEmailService
except ImportError as e:
    logger.error(f"Failed to import shared utilities: {e}")
    raise


config = get_config()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for invitation management requests"""
    try:
        logger.info(f"Invitation handler called")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        http_method = event.get('httpMethod', '')
        path_parameters = event.get('pathParameters') or {}
        invitation_id = path_parameters.get('invitation_id')
        
        # Route to appropriate handler
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
        logger.error(f"Error in invitation handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def create_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new coach invitation with comprehensive coach information"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'phone', 'city', 'state']
        missing_fields = []
        
        for field in required_fields:
            if field not in body or not body[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return create_cors_response(400, {
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'required_fields': required_fields
            })
        
        # Validate email format (basic validation)
        email = body['email'].lower().strip()
        if '@' not in email or '.' not in email:
            return create_cors_response(400, {'error': 'Invalid email format'})
        
        # Validate phone format (basic validation - remove non-digits and check length)
        phone = ''.join(filter(str.isdigit, body['phone']))
        if len(phone) < 10:
            return create_cors_response(400, {'error': 'Phone number must be at least 10 digits'})
        
        # Check for duplicate pending invitations
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
        # Check if active invitation already exists for this email
        response = invitations_table.scan(
            FilterExpression='email = :email AND #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':email': email,
                ':status': 'pending'
            }
        )
        
        if response.get('Items'):
            return create_cors_response(409, {'error': 'Active invitation already exists for this email'})
        
        # Generate invitation
        invitation_id = str(uuid.uuid4())
        invitation_token = str(uuid.uuid4())
        expires_at = int((datetime.utcnow() + timedelta(days=7)).timestamp())
        
        # Create comprehensive invitation record
        invitation = {
            'invitation_id': invitation_id,
            'invitation_token': invitation_token,
            'email': email,
            'role': 'coach',  # Explicitly set role for security
            'first_name': body['first_name'].strip(),
            'last_name': body['last_name'].strip(),
            'phone': phone,  # Store normalized phone number
            'city': body['city'].strip(),
            'state': body['state'].strip().upper(),  # Normalize state to uppercase
            'bio': body.get('bio', '').strip(),  # Optional field
            'message': body.get('message', ''),  # Admin message
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at,
            'created_by': body.get('admin_user_id', 'system'),
            # Additional metadata
            'full_name': f"{body['first_name'].strip()} {body['last_name'].strip()}",
            'location': f"{body['city'].strip()}, {body['state'].strip().upper()}",
            'phone_formatted': format_phone_number(phone),
        }
        
        # Store in DynamoDB
        invitations_table.put_item(Item=invitation)
        
        # Send invitation email with personalized content
        invite_url = f"{os.environ.get('TSA_FRONTEND_URL', 'https://coach.texassportsacademy.com')}/onboarding?invite={invitation_token}"
        send_invitation_email(email, invite_url, invitation)
        
        # Log the action with comprehensive details
        log_admin_action(
            admin_user_id=body.get('admin_user_id', 'system'),
            action='create_invitation',
            details={
                'invitation_id': invitation_id,
                'email': email,
                'full_name': invitation['full_name'],
                'location': invitation['location'],
                'phone': invitation['phone_formatted']
            }
        )
        
        return create_cors_response(201, {
            'message': 'Invitation created successfully',
            'invitation_id': invitation_id,
            'invite_url': invite_url,
            'expires_at': expires_at,
            'coach_info': {
                'full_name': invitation['full_name'],
                'email': email,
                'location': invitation['location'],
                'phone': invitation['phone_formatted']
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def format_phone_number(phone: str) -> str:
    """Format phone number for display (e.g., 1234567890 -> (123) 456-7890)"""
    try:
        # Remove all non-digits
        digits = ''.join(filter(str.isdigit, phone))
        
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        else:
            return phone  # Return original if can't format
    except Exception:
        return phone  # Return original if formatting fails


def list_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all invitations with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')
        limit = int(query_params.get('limit', 50))
        
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
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
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
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
        invite_url = f"{os.environ.get('TSA_FRONTEND_URL', 'https://coach.texassportsacademy.com')}/onboarding?invite={invitation['invitation_token']}"
        send_invitation_email(invitation['email'], invite_url, invitation)
        
        # Update last sent timestamp
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
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
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
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
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
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
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations')
        
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
    """Send personalized coach invitation email using shared SendGrid utility"""
    try:
        sendgrid_service = SendGridEmailService()
        
        # Create personalized invitation data for email template
        personalized_invitation = {
            **invitation,
            'invite_url': invite_url,
            'coach_name': invitation.get('full_name', f"{invitation.get('first_name', '')} {invitation.get('last_name', '')}").strip(),
            'location': invitation.get('location', f"{invitation.get('city', '')}, {invitation.get('state', '')}").strip(),
            'phone_display': invitation.get('phone_formatted', invitation.get('phone', '')),
            'has_bio': bool(invitation.get('bio', '').strip()),
            'expires_date': datetime.fromtimestamp(invitation.get('expires_at', 0)).strftime('%B %d, %Y') if invitation.get('expires_at') else 'N/A'
        }
        
        logger.info(f"Sending personalized invitation email to {email} for coach {personalized_invitation['coach_name']} from {personalized_invitation['location']}")
        
        # Use the shared invitation email method with personalized data
        result = sendgrid_service.send_invitation_email(email, invite_url, personalized_invitation)
        
        if result:
            logger.info(f"✅ Invitation email sent successfully via SendGrid to {email}")
        else:
            logger.error(f"❌ Failed to send invitation email via SendGrid")
            raise Exception(f"SendGrid send failed")
        
    except Exception as e:
        logger.error(f"Error sending invitation email: {str(e)}")
        raise 