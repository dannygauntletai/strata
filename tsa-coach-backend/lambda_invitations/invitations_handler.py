"""
Coach Event Invitations Handler - Clean Architecture with Centralized Models
Updated to use centralized CORS, ID mapping, and error handling patterns.
Handles invitations to events (not parent invitations to join platform).
"""
import json
import os
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

# Import from centralized shared layer
from tsa_shared import (
    parse_event_body, get_current_timestamp as get_current_time, 
    format_error_response as standardize_error_response, get_config,
    generate_id, validate_email_format as validate_email, CoachProfile
)

config = get_config()

def get_table_name(table_type):
    stage = os.environ.get('STAGE', 'dev')
    return config.get_table_name(table_type, stage)

def get_dynamodb_table(table_name):
    import boto3
    dynamodb = boto3.resource('dynamodb')
    return dynamodb.Table(table_name)
from user_identifier import UserIdentifier


def create_cors_response(status_code: int, body: dict) -> dict:
    """Create standardized response with proper CORS headers"""
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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for invitations operations"""
    try:
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        path_params = event.get('pathParameters') or {}
        
        print(f"🎫 Invitations: {http_method} {path}")
        
        if '/event-invitations' in path:
            # Event invitations endpoints (use dedicated table)
            if http_method == 'POST':
                return create_invitation(event)
            elif http_method == 'GET' and not path_params.get('id'):
                return list_invitations(event)
            elif http_method == 'GET' and path_params.get('id'):
                return get_invitation(path_params['id'])
            elif http_method == 'PUT' and path_params.get('id'):
                return update_invitation(path_params['id'], event)
            elif http_method == 'DELETE' and path_params.get('id'):
                return delete_invitation(path_params['id'])
                
        elif '/event-invitations/send' in path and http_method == 'POST':
                return send_invitations(event)
        elif '/event-invitations/bulk' in path and http_method == 'POST':
                return send_bulk_invitations(event)
        elif '/event-invitations/respond' in path and http_method == 'POST':
            return respond_to_invitation(path_params.get('id'), event)
            
        # Parent invitations endpoints (use main invitations table)
        elif '/parent-invitations' in path:
            if http_method == 'POST':
                return create_parent_invitation(event)
            elif http_method == 'GET' and not path_params.get('id'):
                return list_parent_invitations(event)
            elif http_method == 'GET' and path_params.get('id'):
                return get_parent_invitation(path_params['id'])
                
        elif '/parent-invitations/send' in path and http_method == 'POST':
            return send_parent_invitations(event)
        elif '/parent-invitations/bulk' in path and http_method == 'POST':
            return send_bulk_parent_invitations(event)
                
        elif '/health' in path and http_method == 'GET':
            return get_health_status()
        else:
            return create_cors_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"💥 Handler Error: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "lambda_handler"))


def extract_user_from_auth_token(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user email from JWT auth token in Authorization header
    Returns the authenticated user's email, or None if not authenticated
    """
    try:
        headers = event.get('headers', {})
        
        # Get authorization header (case-insensitive)
        auth_header = None
        for header_name, header_value in headers.items():
            if header_name.lower() == 'authorization':
                auth_header = header_value
                break
        
        if not auth_header:
            print("⚠️ No Authorization header found")
            return None
        
        if not auth_header.startswith('Bearer '):
            print("⚠️ Invalid Authorization header format")
            return None
        
        # Extract JWT token
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Decode JWT payload (basic validation - assumes token is already validated by API Gateway)
        import base64
        import json
        
        # Split token into parts
        token_parts = token.split('.')
        if len(token_parts) != 3:
            print("⚠️ Invalid JWT token format")
            return None
        
        # Decode payload (second part)
        payload_b64 = token_parts[1]
        # Add padding if necessary
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload = json.loads(base64.b64decode(payload_b64))
        
        # Extract email from token payload
        email = payload.get('email') or payload.get('username')
        if email:
            print(f"✅ Authenticated user extracted from token: {email}")
            return email.lower().strip()
        
        print("⚠️ No email found in token payload")
        return None
        
    except Exception as e:
        print(f"❌ Error extracting user from auth token: {str(e)}")
        return None


def create_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new event invitation"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_id', 'invitee_email', 'inviter_id']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Validate email format
        if not validate_email(body['invitee_email']):
            return create_cors_response(400, {'error': 'Invalid email format'})
        
        # Use centralized ID mapping for inviter_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_inviter_id = UserIdentifier.normalize_coach_id(body['inviter_id'], profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': f'Inviter not found: {str(e)}'})
        
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        events_table = get_dynamodb_table(get_table_name('events'))
        
        # Check if event exists
        event_response = events_table.get_item(Key={'event_id': body['event_id']})
        if 'Item' not in event_response:
            return create_cors_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        # Check if invitation already exists
        existing_invitation = invitations_table.scan(
            FilterExpression='event_id = :event_id AND invitee_email = :email',
            ExpressionAttributeValues={
                ':event_id': body['event_id'],
                ':email': body['invitee_email'].lower().strip()
            }
        )
        
        if existing_invitation['Items']:
            return create_cors_response(400, {'error': 'Invitation already exists for this email'})
        
        # Create invitation with centralized ID generation
        invitation_id = generate_id('invitation')
        
        # Calculate expiration (7 days from now)
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        invitation_data = {
            'invitation_id': invitation_id,
            'event_id': body['event_id'],
            'event_title': event_data['title'],
            'invitee_email': body['invitee_email'].lower().strip(),
            'invitee_name': body.get('invitee_name', ''),
            'inviter_id': normalized_inviter_id,  # Use normalized profile_id
            'message': body.get('message', ''),
            'status': 'pending',
            'sent_at': None,
            'expires_at': expires_at,
            'responded_at': None,
            'response': None,
            'created_at': get_current_time(),
            'updated_at': get_current_time()
        }
        
        invitations_table.put_item(Item=invitation_data)
        
        print(f"✅ Event invitation created: {invitation_id}")
        return create_cors_response(201, {
            'message': 'Invitation created successfully',
            'invitation': invitation_data
        })
        
    except Exception as e:
        print(f"💥 Error creating invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "create_invitation"))


def send_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Send event invitations via email"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['invitation_ids']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        sent_count = 0
        failed_count = 0
        results = []
        
        for invitation_id in body['invitation_ids']:
            try:
                # Get invitation details
                invitation_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
                if 'Item' not in invitation_response:
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'failed',
                        'error': 'Invitation not found'
                    })
                    failed_count += 1
                    continue
                
                invitation = invitation_response['Item']
                
                # Check if already sent
                if invitation['status'] == 'sent':
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'skipped',
                        'error': 'Already sent'
                    })
                    continue
                
                # Send email
                email_sent = send_invitation_email(invitation)
                
                if email_sent:
                    # Update invitation status
                    invitations_table.update_item(
                        Key={'invitation_id': invitation_id},
                        UpdateExpression='SET #status = :status, sent_at = :sent_at, updated_at = :updated_at',
                        ExpressionAttributeNames={'#status': 'status'},
                        ExpressionAttributeValues={
                            ':status': 'sent',
                            ':sent_at': get_current_time(),
                            ':updated_at': get_current_time()
                        }
                    )
                    
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'sent',
                        'email': invitation['invitee_email']
                    })
                    sent_count += 1
                else:
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'failed',
                        'error': 'Failed to send email'
                    })
                    failed_count += 1
                    
            except Exception as e:
                results.append({
                    'invitation_id': invitation_id,
                    'status': 'failed',
                    'error': str(e)
                })
                failed_count += 1
        
        return create_cors_response(200, {
            'message': f'Processed {len(body["invitation_ids"])} invitations',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'results': results
        })
        
    except Exception as e:
        print(f"💥 Error sending invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "send_invitations"))


def send_bulk_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create and send invitations to multiple recipients"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_id', 'invitees', 'inviter_id']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        if not isinstance(body['invitees'], list) or len(body['invitees']) == 0:
            return create_cors_response(400, {'error': 'Invitees must be a non-empty list'})
        
        # Use centralized ID mapping for inviter_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_inviter_id = UserIdentifier.normalize_coach_id(body['inviter_id'], profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': f'Inviter not found: {str(e)}'})
        
        events_table = get_dynamodb_table(get_table_name('events'))
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        # Check if event exists
        event_response = events_table.get_item(Key={'event_id': body['event_id']})
        if 'Item' not in event_response:
            return create_cors_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        created_invitations = []
        sent_count = 0
        failed_count = 0
        
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        for invitee in body['invitees']:
            try:
                if 'email' not in invitee:
                    failed_count += 1
                    continue
                
                email = invitee['email'].lower().strip()
                
                # Validate email format
                if not validate_email(email):
                    failed_count += 1
                    continue
                
                # Check if invitation already exists
                existing = invitations_table.scan(
                    FilterExpression='event_id = :event_id AND invitee_email = :email',
                    ExpressionAttributeValues={
                        ':event_id': body['event_id'],
                        ':email': email
                    }
                )
                
                if existing['Items']:
                    failed_count += 1
                    continue
                
                # Create invitation with centralized ID generation
                invitation_id = generate_id('invitation')
                
                invitation_data = {
                    'invitation_id': invitation_id,
                    'event_id': body['event_id'],
                    'event_title': event_data['title'],
                    'invitee_email': email,
                    'invitee_name': invitee.get('name', ''),
                    'inviter_id': normalized_inviter_id,  # Use normalized profile_id
                    'message': body.get('message', ''),
                    'status': 'pending',
                    'sent_at': None,
                    'expires_at': expires_at,
                    'responded_at': None,
                    'response': None,
                    'created_at': get_current_time(),
                    'updated_at': get_current_time()
                }
                
                invitations_table.put_item(Item=invitation_data)
                
                # Send email immediately if requested
                if body.get('send_immediately', False):
                    email_sent = send_invitation_email(invitation_data)
                    
                    if email_sent:
                        invitations_table.update_item(
                            Key={'invitation_id': invitation_id},
                            UpdateExpression='SET #status = :status, sent_at = :sent_at, updated_at = :updated_at',
                            ExpressionAttributeNames={'#status': 'status'},
                            ExpressionAttributeValues={
                                ':status': 'sent',
                                ':sent_at': get_current_time(),
                                ':updated_at': get_current_time()
                            }
                        )
                        sent_count += 1
                        invitation_data['status'] = 'sent'
                        invitation_data['sent_at'] = get_current_time()
                
                created_invitations.append(invitation_data)
                
            except Exception as e:
                print(f"Error processing invitee {invitee.get('email', 'unknown')}: {str(e)}")
                failed_count += 1
        
        return create_cors_response(201, {
            'message': f'Created {len(created_invitations)} invitations',
            'created_count': len(created_invitations),
            'sent_count': sent_count,
            'failed_count': failed_count,
            'invitations': created_invitations
        })
        
    except Exception as e:
        print(f"💥 Error creating bulk invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "send_bulk_invitations"))


def send_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send invitation email using SendGrid"""
    try:
        from tsa_shared.sendgrid_service import SendGridService
        
        sendgrid_service = SendGridService()
        
        # Get event details for email content
        events_table = get_dynamodb_table(get_table_name('events'))
        event_response = events_table.get_item(Key={'event_id': invitation['event_id']})
        
        if 'Item' not in event_response:
            return False
        
        event_data = event_response['Item']
        
        subject = f"You're Invited: {event_data['title']}"
        
        # Format dates for display
        start_date = datetime.fromisoformat(event_data['start_date'].replace('Z', '+00:00'))
        formatted_date = start_date.strftime("%B %d, %Y at %I:%M %p")
        
        invitation_link = f"{os.environ.get('FRONTEND_URL', 'https://localhost:3000')}/invitations/{invitation['invitation_id']}"
        
        body_html = f"""
        <html>
        <body>
            <h2>You're Invited to {event_data['title']}!</h2>
            <p>Hello {invitation.get('invitee_name', '')}!</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>{event_data['title']}</h3>
                <p><strong>Date:</strong> {formatted_date}</p>
                <p><strong>Location:</strong> {event_data.get('location', 'TBD')}</p>
                <p><strong>Description:</strong> {event_data['description']}</p>
                {f"<p><strong>Cost:</strong> ${event_data['cost']}</p>" if event_data.get('cost', 0) > 0 else ""}
            </div>
            
            {f"<p><em>Personal message:</em><br>{invitation['message']}</p>" if invitation.get('message') else ""}
            
            <p>
                <a href="{invitation_link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    View Invitation & Respond
                </a>
            </p>
            
            <p>This invitation expires on {datetime.fromisoformat(invitation['expires_at']).strftime("%B %d, %Y")}.</p>
            
            <p>Best regards,<br>The Texas Sports Academy Team</p>
        </body>
        </html>
        """
        
        body_text = f"""
        You're Invited to {event_data['title']}!
        
        Hello {invitation.get('invitee_name', '')}!
        
        Event Details:
        - Title: {event_data['title']}
        - Date: {formatted_date}
        - Location: {event_data.get('location', 'TBD')}
        - Description: {event_data['description']}
        {f"- Cost: ${event_data['cost']}" if event_data.get('cost', 0) > 0 else ""}
        
        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}
        
        To respond to this invitation, visit: {invitation_link}
        
        This invitation expires on {datetime.fromisoformat(invitation['expires_at']).strftime("%B %d, %Y")}.
        
        Best regards,
        The Texas Sports Academy Team
        """
        
        result = sendgrid_service._send_email(
            to_email=invitation['invitee_email'],
            subject=subject,
            plain_content=body_text,
            html_content=body_html
        )
        
        if result['success']:
            print(f"Invitation email sent via SendGrid to {invitation['invitee_email']}. Message ID: {result['message_id']}")
            return True
        else:
            print(f"Failed to send invitation email via SendGrid: {result['error']}")
            return False
        
    except Exception as e:
        print(f"Error sending invitation email to {invitation['invitee_email']}: {str(e)}")
        return False


def respond_to_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Respond to an invitation (accept/decline)"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['response']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        if body['response'] not in ['accept', 'decline']:
            return create_cors_response(400, {'error': 'Response must be "accept" or "decline"'})
        
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        # Get invitation
        invitation_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in invitation_response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        invitation = invitation_response['Item']
        
        # Check if invitation is still valid
        if invitation['status'] in ['accepted', 'declined']:
            return create_cors_response(400, {'error': 'Invitation has already been responded to'})
        
        # Check if invitation has expired
        expires_at = datetime.fromisoformat(invitation['expires_at'])
        if datetime.utcnow() > expires_at:
            return create_cors_response(400, {'error': 'Invitation has expired'})
        
        # Update invitation
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='''SET 
                #status = :status,
                response = :response,
                responded_at = :responded_at,
                updated_at = :updated_at
            ''',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'accepted' if body['response'] == 'accept' else 'declined',
                ':response': body['response'],
                ':responded_at': get_current_time(),
                ':updated_at': get_current_time()
            }
        )
        
        # If accepted, create event registration
        if body['response'] == 'accept':
            registrations_table = get_dynamodb_table(get_table_name('event_registrations'))
            
            registration_id = generate_id('registration')
            
            registration_data = {
                'registration_id': registration_id,
                'event_id': invitation['event_id'],
                'student_id': body.get('student_id', invitation['invitee_email']),  # Use email as fallback
                'student_email': invitation['invitee_email'],
                'registration_date': get_current_time(),
                'status': 'confirmed',
                'source': 'invitation',
                'invitation_id': invitation_id,
                'notes': body.get('notes', ''),
                'created_at': get_current_time(),
                'updated_at': get_current_time()
            }
            
            registrations_table.put_item(Item=registration_data)
        
        return create_cors_response(200, {
            'message': f'Invitation {body["response"]}ed successfully',
            'invitation_id': invitation_id,
            'response': body['response']
        })
        
    except Exception as e:
        print(f"💥 Error responding to invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "respond_to_invitation"))


def get_invitation(invitation_id: str) -> Dict[str, Any]:
    """Get invitation details"""
    try:
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        invitation = response['Item']
        
        # Get event details
        events_table = get_dynamodb_table(get_table_name('events'))
        event_response = events_table.get_item(Key={'event_id': invitation['event_id']})
        
        if 'Item' in event_response:
            invitation['event_details'] = event_response['Item']
        
        return create_cors_response(200, {'invitation': invitation})
        
    except Exception as e:
        print(f"💥 Error getting invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "get_invitation"))


def list_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List invitations with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        event_id = query_params.get('event_id')
        inviter_id = query_params.get('inviter_id')
        status = query_params.get('status')
        invitee_email = query_params.get('invitee_email')
        
        # Use centralized ID mapping for inviter_id if provided
        normalized_inviter_id = inviter_id
        if inviter_id:
            profiles_table = get_dynamodb_table(get_table_name('profiles'))
            try:
                normalized_inviter_id = UserIdentifier.normalize_coach_id(inviter_id, profiles_table)
            except ValueError as e:
                return create_cors_response(404, {'error': str(e)})
        
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        # Build filter expression
        filter_expressions = []
        expression_values = {}
        expression_names = {}
        
        if event_id:
            filter_expressions.append('event_id = :event_id')
            expression_values[':event_id'] = event_id
        
        if normalized_inviter_id:
            filter_expressions.append('inviter_id = :inviter_id')
            expression_values[':inviter_id'] = normalized_inviter_id
        
        if status:
            filter_expressions.append('#status = :status')
            expression_values[':status'] = status
            expression_names['#status'] = 'status'
        
        if invitee_email:
            filter_expressions.append('invitee_email = :invitee_email')
            expression_values[':invitee_email'] = invitee_email.lower().strip()
        
        scan_kwargs = {}
        if filter_expressions:
            scan_kwargs['FilterExpression'] = ' AND '.join(filter_expressions)
            scan_kwargs['ExpressionAttributeValues'] = expression_values
            if expression_names:
                scan_kwargs['ExpressionAttributeNames'] = expression_names
        
        response = invitations_table.scan(**scan_kwargs)
        
        invitations = response.get('Items', [])
        
        # Sort by created_at descending
        invitations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_cors_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        })
        
    except Exception as e:
        print(f"💥 Error listing invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "list_invitations"))


def update_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an invitation"""
    try:
        body = parse_event_body(event)
        
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        # Check if invitation exists
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        # Build update expression
        updatable_fields = ['message', 'expires_at']
        update_expressions = []
        expression_values = {}
        
        for field in updatable_fields:
            if field in body:
                update_expressions.append(f'{field} = :{field}')
                expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_cors_response(400, {'error': 'No valid fields to update'})
        
        # Always update the updated_at timestamp
        update_expressions.append('updated_at = :updated_at')
        expression_values[':updated_at'] = get_current_time()
        
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated invitation
        updated_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        return create_cors_response(200, {
            'message': 'Invitation updated successfully',
            'invitation': updated_response['Item']
        })
        
    except Exception as e:
        print(f"💥 Error updating invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "update_invitation"))


def delete_invitation(invitation_id: str) -> Dict[str, Any]:
    """Delete an invitation"""
    try:
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        
        # Check if invitation exists
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Invitation not found'})
        
        # Delete the invitation
        invitations_table.delete_item(Key={'invitation_id': invitation_id})
        
        print(f"🗑️ Event invitation deleted: {invitation_id}")
        return create_cors_response(200, {
            'message': 'Invitation deleted successfully',
            'invitation_id': invitation_id
        })
        
    except Exception as e:
        print(f"💥 Error deleting invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "delete_invitation"))


def get_health_status() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test table connectivity
        invitations_table = get_dynamodb_table(get_table_name('event_invitations'))
        invitations_table.scan(Limit=1)
        
        return create_cors_response(200, {
            'status': 'healthy',
            'service': 'invitations-handler',
            'timestamp': get_current_time()
        })
        
    except Exception as e:
        return create_cors_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': get_current_time()
        })


# ============================================================================
# PARENT INVITATION FUNCTIONS (Use parent-invitations table - coach sends to parents for platform enrollment)
# ============================================================================

def create_parent_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new parent invitation in the main invitations table"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['parent_email', 'coach_id']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Validate email format
        if not validate_email(body['parent_email']):
            return create_cors_response(400, {'error': 'Invalid email format'})
        
            # Use parent invitations table (coach-specific parent enrollment invitations)
    invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
        
        # Use centralized ID mapping for coach_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
            # Get coach profile data directly from table
            coach_response = profiles_table.get_item(Key={'profile_id': normalized_coach_id})
            if 'Item' not in coach_response:
                raise ValueError(f"Coach profile not found for ID: {normalized_coach_id}")
            coach_profile = coach_response['Item']
        except ValueError as e:
            return create_cors_response(404, {'error': f'Coach not found: {str(e)}'})
        
        # Check for existing pending parent invitation for this email
        existing_check = invitations_table.scan(
            FilterExpression='email = :email AND #role = :role AND #status = :status',
            ExpressionAttributeNames={'#role': 'role', '#status': 'status'},
            ExpressionAttributeValues={
                ':email': body['parent_email'].lower().strip(),
                ':role': 'parent',
                ':status': 'pending'
            }
        )
        
        if existing_check.get('Items'):
            return create_cors_response(409, {'error': 'Active parent invitation already exists for this email'})
        
        # Generate invitation
        invitation_id = generate_id('invitation')
        invitation_token = generate_id('token')
        expires_at = int((datetime.utcnow() + timedelta(days=14)).timestamp())
        
        invitation_data = {
            'invitation_id': invitation_id,
            'invitation_token': invitation_token,
            'email': body['parent_email'].lower().strip(),
            'role': 'parent',  # Set role as parent
            'coach_id': normalized_coach_id,
            'coach_name': f"{coach_profile.get('first_name', '')} {coach_profile.get('last_name', '')}".strip(),
            'school_name': body.get('school_name', 'Texas Sports Academy'),
            'message': body.get('message', ''),
            'student_first_name': body.get('student_first_name', ''),
            'student_last_name': body.get('student_last_name', ''),
            'grade_level': body.get('grade_level', ''),
            'sport_interest': body.get('sport_interest', ''),
            'status': 'pending',
            'created_at': get_current_time(),
            'updated_at': get_current_time(),
            'expires_at': expires_at,
            'sent_at': None,
            'accepted_at': None,
            'created_by': normalized_coach_id
        }
        
        # Store invitation
        invitations_table.put_item(Item=invitation_data)
        
        # Prepare response
        response_data = invitation_data.copy()
        response_data['invitation_url'] = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/parent/invitation?token={invitation_token}"
        
        print(f"✅ Parent invitation created: {invitation_id}")
        return create_cors_response(201, {
            'message': 'Parent invitation created successfully',
            'invitation': response_data
        })
        
    except Exception as e:
        print(f"💥 Error creating parent invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "create_parent_invitation"))


def list_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List parent invitations for authenticated coach from main invitations table"""
    try:
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Fetching parent invitations for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping to get normalized coach_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
            # Use parent invitations table (coach sends to parents for platform enrollment)
    invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
        
        # Filter by authenticated coach only
        response = invitations_table.scan(
            FilterExpression='#role = :role AND coach_id = :coach_id',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={
                ':role': 'parent',
                ':coach_id': normalized_coach_id
            }
        )
        
        invitations = response.get('Items', [])
        
        # Sort by created_at descending
        invitations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_cors_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        })
        
    except Exception as e:
        print(f"💥 Error listing parent invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "list_parent_invitations"))


def get_parent_invitation(invitation_id: str) -> Dict[str, Any]:
    """Get specific parent invitation details"""
    try:
            invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
    
    response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if 'Item' not in response or response['Item'].get('role') != 'parent':
            return create_cors_response(404, {'error': 'Parent invitation not found'})
        
        return create_cors_response(200, {'invitation': response['Item']})
        
    except Exception as e:
        print(f"💥 Error getting parent invitation: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "get_parent_invitation"))


def send_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Send parent invitations via email"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['invitation_ids']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
        
        sent_count = 0
        failed_count = 0
        results = []
        
        for invitation_id in body['invitation_ids']:
            try:
                # Get invitation details
                invitation_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
                if 'Item' not in invitation_response or invitation_response['Item'].get('role') != 'parent':
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'failed',
                        'error': 'Parent invitation not found'
                    })
                    failed_count += 1
                    continue
                
                invitation = invitation_response['Item']
                
                # Check if already sent
                if invitation['status'] == 'sent':
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'skipped',
                        'error': 'Already sent'
                    })
                    continue
                
                # Send email
                email_sent = send_parent_invitation_email(invitation)
                
                if email_sent:
                    # Update invitation status
                    invitations_table.update_item(
                        Key={'invitation_id': invitation_id},
                        UpdateExpression='SET #status = :status, sent_at = :sent_at, updated_at = :updated_at',
                        ExpressionAttributeNames={'#status': 'status'},
                        ExpressionAttributeValues={
                            ':status': 'sent',
                            ':sent_at': get_current_time(),
                            ':updated_at': get_current_time()
                        }
                    )
                    
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'sent',
                        'email': invitation['email']
                    })
                    sent_count += 1
                else:
                    results.append({
                        'invitation_id': invitation_id,
                        'status': 'failed',
                        'error': 'Failed to send email'
                    })
                    failed_count += 1
                    
            except Exception as e:
                results.append({
                    'invitation_id': invitation_id,
                    'status': 'failed',
                    'error': str(e)
                })
                failed_count += 1
        
        return create_cors_response(200, {
            'message': f'Processed {len(body["invitation_ids"])} parent invitations',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'results': results
        })
        
    except Exception as e:
        print(f"💥 Error sending parent invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "send_parent_invitations"))


def send_bulk_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create and send invitations to multiple parents"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['parents', 'coach_id']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_cors_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        if not isinstance(body['parents'], list) or len(body['parents']) == 0:
            return create_cors_response(400, {'error': 'Parents must be a non-empty list'})
        
        created_invitations = []
        sent_count = 0
        failed_count = 0
        
        for parent_data in body['parents']:
            try:
                # Create individual invitation
                parent_invitation_event = {
                    'body': json.dumps({
                        'parent_email': parent_data.get('email'),
                        'coach_id': body['coach_id'],
                        'school_name': body.get('school_name', ''),
                        'message': body.get('message', ''),
                        'student_first_name': parent_data.get('student_first_name', ''),
                        'student_last_name': parent_data.get('student_last_name', ''),
                        'grade_level': parent_data.get('grade_level', ''),
                        'sport_interest': parent_data.get('sport_interest', '')
                    })
                }
                
                create_response_result = create_parent_invitation(parent_invitation_event)
                
                if create_response_result['statusCode'] == 201:
                    invitation_data = json.loads(create_response_result['body'])['invitation']
                    created_invitations.append(invitation_data)
                    
                    # Send email immediately if requested
                    if body.get('send_immediately', False):
                        email_sent = send_parent_invitation_email(invitation_data)
                        
                        if email_sent:
                            # Update status to sent
                            invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
                            invitations_table.update_item(
                                Key={'invitation_id': invitation_data['invitation_id']},
                                UpdateExpression='SET #status = :status, sent_at = :sent_at, updated_at = :updated_at',
                                ExpressionAttributeNames={'#status': 'status'},
                                ExpressionAttributeValues={
                                    ':status': 'sent',
                                    ':sent_at': get_current_time(),
                                    ':updated_at': get_current_time()
                                }
                            )
                            sent_count += 1
                            invitation_data['status'] = 'sent'
                            invitation_data['sent_at'] = get_current_time()
                else:
                    failed_count += 1
                    
            except Exception as e:
                print(f"Error processing parent {parent_data.get('email', 'unknown')}: {str(e)}")
                failed_count += 1
        
        return create_cors_response(201, {
            'message': f'Created {len(created_invitations)} parent invitations',
            'created_count': len(created_invitations),
            'sent_count': sent_count,
            'failed_count': failed_count,
            'invitations': created_invitations
        })
        
    except Exception as e:
        print(f"💥 Error creating bulk parent invitations: {str(e)}")
        return create_cors_response(500, standardize_error_response(e, "send_bulk_parent_invitations"))


def send_parent_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send parent invitation email using SendGrid"""
    try:
        from tsa_shared.sendgrid_service import SendGridService
        
        sendgrid_service = SendGridService()
        
        student_name = f"{invitation.get('student_first_name', '')} {invitation.get('student_last_name', '')}".strip()
        if not student_name:
            student_name = "your student"
        
        invitation_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/parent/invitation?token={invitation['invitation_token']}"
        
        subject = f"Enrollment Invitation for {student_name} - Texas Sports Academy"
        
        body_html = f"""
        <html>
        <body>
            <h2>You're Invited to Enroll {student_name}!</h2>
            <p>Hello!</p>
            
            <p>You've been invited by {invitation['coach_name']} to enroll {student_name} at {invitation.get('school_name', 'Texas Sports Academy')}.</p>
            
            {f"<p><em>Personal message:</em><br>{invitation['message']}</p>" if invitation.get('message') else ""}
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>What's Included:</h3>
                <ul>
                    <li>Expert coaching and athletic development</li>
                    <li>Academic support and college preparation</li>
                    <li>State-of-the-art facilities and equipment</li>
                    <li>Scholarship and financial aid opportunities</li>
                    <li>Character development and leadership training</li>
                </ul>
            </div>
            
            <p>
                <a href="{invitation_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Complete Enrollment
                </a>
            </p>
            
            <p><strong>⏰ IMPORTANT:</strong> This invitation expires on {datetime.fromtimestamp(invitation['expires_at']).strftime('%B %d, %Y')}.</p>
            
            <p>Questions? Contact us:<br>
            • Email: admissions@sportsacademy.tech<br>
            • Phone: (512) 555-0123</p>
            
            <p>Best regards,<br>The Texas Sports Academy Team<br><em>Building Champions On and Off the Field</em></p>
        </body>
        </html>
        """
        
        body_text = f"""
        You're Invited to Enroll {student_name}!
        
        Hello!
        
        You've been invited by {invitation['coach_name']} to enroll {student_name} at {invitation.get('school_name', 'Texas Sports Academy')}.
        
        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}
        
        What's Included:
        • Expert coaching and athletic development
        • Academic support and college preparation  
        • State-of-the-art facilities and equipment
        • Scholarship and financial aid opportunities
        • Character development and leadership training
        
        Complete enrollment: {invitation_url}
        
        ⏰ IMPORTANT: This invitation expires on {datetime.fromtimestamp(invitation['expires_at']).strftime('%B %d, %Y')}.
        
        Questions? Contact us:
        • Email: admissions@sportsacademy.tech
        • Phone: (512) 555-0123
        
        Best regards,
        The Texas Sports Academy Team
        Building Champions On and Off the Field
        """
        
        result = sendgrid_service._send_email(
            to_email=invitation['email'],
            subject=subject,
            plain_content=body_text,
            html_content=body_html
        )
        
        if result['success']:
            print(f"Parent invitation email sent via SendGrid to {invitation['email']}. Status: {result.get('status_code', 'unknown')}")
            return True
        else:
            print(f"Failed to send parent invitation email via SendGrid: {result['error']}")
            return False
        
    except Exception as e:
        print(f"Error sending parent invitation email to {invitation['email']}: {str(e)}")
        return False 