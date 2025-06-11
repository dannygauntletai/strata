"""
Lambda handler for event invitations
"""
import json
import os
import boto3
from typing import Dict, Any, List
from shared_utils import (
    create_response, get_dynamodb_table, parse_event_body,
    get_current_timestamp, validate_required_fields, get_path_parameters
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for invitation requests"""
    try:
        http_method = event.get('httpMethod', '')
        path_params = get_path_parameters(event)
        path = event.get('path', '')
        
        if http_method == 'GET':
            if 'invitation_id' in path_params:
                return get_invitation(path_params['invitation_id'])
            else:
                return list_invitations(event)
        elif http_method == 'POST':
            if '/send' in path:
                return send_invitations(event)
            elif '/bulk' in path:
                return send_bulk_invitations(event)
            else:
                return create_invitation(event)
        elif http_method == 'PUT':
            if 'invitation_id' in path_params:
                if '/respond' in path:
                    return respond_to_invitation(path_params['invitation_id'], event)
                else:
                    return update_invitation(path_params['invitation_id'], event)
            else:
                return create_response(400, {'error': 'Invitation ID required for update'})
        elif http_method == 'DELETE':
            if 'invitation_id' in path_params:
                return delete_invitation(path_params['invitation_id'])
            else:
                return create_response(400, {'error': 'Invitation ID required for deletion'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in invitations handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def create_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new event invitation"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_id', 'invitee_email', 'inviter_id']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        events_table = get_dynamodb_table(os.environ.get('EVENTS_TABLE', 'events'))
        
        # Check if event exists
        event_response = events_table.get_item(Key={'event_id': body['event_id']})
        if 'Item' not in event_response:
            return create_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        # Check if invitation already exists
        existing_invitation = invitations_table.scan(
            FilterExpression='event_id = :event_id AND invitee_email = :email',
            ExpressionAttributeValues={
                ':event_id': body['event_id'],
                ':email': body['invitee_email']
            }
        )
        
        if existing_invitation['Items']:
            return create_response(400, {'error': 'Invitation already exists for this email'})
        
        invitation_id = f"inv_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        # Calculate expiration (7 days from now)
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        invitation_data = {
            'invitation_id': invitation_id,
            'event_id': body['event_id'],
            'event_title': event_data['title'],
            'invitee_email': body['invitee_email'],
            'invitee_name': body.get('invitee_name', ''),
            'inviter_id': body['inviter_id'],
            'message': body.get('message', ''),
            'status': 'pending',
            'sent_at': None,
            'expires_at': expires_at,
            'responded_at': None,
            'response': None,
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        invitations_table.put_item(Item=invitation_data)
        
        return create_response(201, {
            'message': 'Invitation created successfully',
            'invitation': invitation_data
        })
        
    except Exception as e:
        print(f"Error creating invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to create invitation'})


def send_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Send event invitations via email"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['invitation_ids']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
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
                            ':sent_at': get_current_timestamp(),
                            ':updated_at': get_current_timestamp()
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
        
        return create_response(200, {
            'message': f'Processed {len(body["invitation_ids"])} invitations',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'results': results
        })
        
    except Exception as e:
        print(f"Error sending invitations: {str(e)}")
        return create_response(500, {'error': 'Failed to send invitations'})


def send_bulk_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create and send invitations to multiple recipients"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_id', 'invitees', 'inviter_id']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        if not isinstance(body['invitees'], list) or len(body['invitees']) == 0:
            return create_response(400, {'error': 'Invitees must be a non-empty list'})
        
        events_table = get_dynamodb_table(os.environ.get('EVENTS_TABLE', 'events'))
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        # Check if event exists
        event_response = events_table.get_item(Key={'event_id': body['event_id']})
        if 'Item' not in event_response:
            return create_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        created_invitations = []
        sent_count = 0
        failed_count = 0
        
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        for invitee in body['invitees']:
            try:
                if 'email' not in invitee:
                    failed_count += 1
                    continue
                
                # Check if invitation already exists
                existing = invitations_table.scan(
                    FilterExpression='event_id = :event_id AND invitee_email = :email',
                    ExpressionAttributeValues={
                        ':event_id': body['event_id'],
                        ':email': invitee['email']
                    }
                )
                
                if existing['Items']:
                    failed_count += 1
                    continue
                
                # Create invitation
                invitation_id = f"inv_{get_current_timestamp().replace(':', '').replace('-', '')}_{len(created_invitations)}"
                
                invitation_data = {
                    'invitation_id': invitation_id,
                    'event_id': body['event_id'],
                    'event_title': event_data['title'],
                    'invitee_email': invitee['email'],
                    'invitee_name': invitee.get('name', ''),
                    'inviter_id': body['inviter_id'],
                    'message': body.get('message', ''),
                    'status': 'pending',
                    'sent_at': None,
                    'expires_at': expires_at,
                    'responded_at': None,
                    'response': None,
                    'created_at': get_current_timestamp(),
                    'updated_at': get_current_timestamp()
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
                                ':sent_at': get_current_timestamp(),
                                ':updated_at': get_current_timestamp()
                            }
                        )
                        sent_count += 1
                        invitation_data['status'] = 'sent'
                        invitation_data['sent_at'] = get_current_timestamp()
                
                created_invitations.append(invitation_data)
                
            except Exception as e:
                print(f"Error processing invitee {invitee.get('email', 'unknown')}: {str(e)}")
                failed_count += 1
        
        return create_response(201, {
            'message': f'Created {len(created_invitations)} invitations',
            'created_count': len(created_invitations),
            'sent_count': sent_count,
            'failed_count': failed_count,
            'invitations': created_invitations
        })
        
    except Exception as e:
        print(f"Error creating bulk invitations: {str(e)}")
        return create_response(500, {'error': 'Failed to create bulk invitations'})


def send_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send invitation email using SES"""
    try:
        ses_client = boto3.client('ses')
        
        # Get event details for email content
        events_table = get_dynamodb_table(os.environ.get('EVENTS_TABLE', 'events'))
        event_response = events_table.get_item(Key={'event_id': invitation['event_id']})
        
        if 'Item' not in event_response:
            return False
        
        event_data = event_response['Item']
        
        subject = f"You're Invited: {event_data['title']}"
        
        # Format dates for display
        from datetime import datetime
        start_date = datetime.fromisoformat(event_data['start_date'].replace('Z', '+00:00'))
        formatted_date = start_date.strftime("%B %d, %Y at %I:%M %p")
        
        invitation_link = f"{os.environ.get('FRONTEND_URL', 'https://app.texassportsacademy.com')}/invitations/{invitation['invitation_id']}"
        
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
        
        response = ses_client.send_email(
            Source=os.environ.get('FROM_EMAIL', 'noreply@texassportsacademy.com'),
            Destination={'ToAddresses': [invitation['invitee_email']]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': body_html},
                    'Text': {'Data': body_text}
                }
            }
        )
        
        print(f"Invitation email sent to {invitation['invitee_email']}. Message ID: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"Error sending invitation email to {invitation['invitee_email']}: {str(e)}")
        return False


def respond_to_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Respond to an invitation (accept/decline)"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['response']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        if body['response'] not in ['accept', 'decline']:
            return create_response(400, {'error': 'Response must be "accept" or "decline"'})
        
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        # Get invitation
        invitation_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in invitation_response:
            return create_response(404, {'error': 'Invitation not found'})
        
        invitation = invitation_response['Item']
        
        # Check if invitation is still valid
        if invitation['status'] in ['accepted', 'declined']:
            return create_response(400, {'error': 'Invitation has already been responded to'})
        
        # Check if invitation has expired
        from datetime import datetime
        expires_at = datetime.fromisoformat(invitation['expires_at'])
        if datetime.utcnow() > expires_at:
            return create_response(400, {'error': 'Invitation has expired'})
        
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
                ':responded_at': get_current_timestamp(),
                ':updated_at': get_current_timestamp()
            }
        )
        
        # If accepted, create event registration
        if body['response'] == 'accept':
            registrations_table = get_dynamodb_table(os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations'))
            
            registration_id = f"reg_{get_current_timestamp().replace(':', '').replace('-', '')}"
            
            registration_data = {
                'registration_id': registration_id,
                'event_id': invitation['event_id'],
                'student_id': body.get('student_id', invitation['invitee_email']),  # Use email as fallback
                'student_email': invitation['invitee_email'],
                'registration_date': get_current_timestamp(),
                'status': 'confirmed',
                'source': 'invitation',
                'invitation_id': invitation_id,
                'notes': body.get('notes', ''),
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            registrations_table.put_item(Item=registration_data)
        
        return create_response(200, {
            'message': f'Invitation {body["response"]}ed successfully',
            'invitation_id': invitation_id,
            'response': body['response']
        })
        
    except Exception as e:
        print(f"Error responding to invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to respond to invitation'})


def get_invitation(invitation_id: str) -> Dict[str, Any]:
    """Get invitation details"""
    try:
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'})
        
        invitation = response['Item']
        
        # Get event details
        events_table = get_dynamodb_table(os.environ.get('EVENTS_TABLE', 'events'))
        event_response = events_table.get_item(Key={'event_id': invitation['event_id']})
        
        if 'Item' in event_response:
            invitation['event_details'] = event_response['Item']
        
        return create_response(200, {'invitation': invitation})
        
    except Exception as e:
        print(f"Error getting invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve invitation'})


def list_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List invitations with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        event_id = query_params.get('event_id')
        inviter_id = query_params.get('inviter_id')
        status = query_params.get('status')
        invitee_email = query_params.get('invitee_email')
        
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        # Build filter expression
        filter_expressions = []
        expression_values = {}
        expression_names = {}
        
        if event_id:
            filter_expressions.append('event_id = :event_id')
            expression_values[':event_id'] = event_id
        
        if inviter_id:
            filter_expressions.append('inviter_id = :inviter_id')
            expression_values[':inviter_id'] = inviter_id
        
        if status:
            filter_expressions.append('#status = :status')
            expression_values[':status'] = status
            expression_names['#status'] = 'status'
        
        if invitee_email:
            filter_expressions.append('invitee_email = :invitee_email')
            expression_values[':invitee_email'] = invitee_email
        
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
        
        return create_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        })
        
    except Exception as e:
        print(f"Error listing invitations: {str(e)}")
        return create_response(500, {'error': 'Failed to list invitations'})


def update_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an invitation"""
    try:
        body = parse_event_body(event)
        
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        # Check if invitation exists
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'})
        
        # Build update expression
        updatable_fields = ['message', 'expires_at']
        update_expressions = []
        expression_values = {}
        
        for field in updatable_fields:
            if field in body:
                update_expressions.append(f'{field} = :{field}')
                expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No valid fields to update'})
        
        # Always update the updated_at timestamp
        update_expressions.append('updated_at = :updated_at')
        expression_values[':updated_at'] = get_current_timestamp()
        
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated invitation
        updated_response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        return create_response(200, {
            'message': 'Invitation updated successfully',
            'invitation': updated_response['Item']
        })
        
    except Exception as e:
        print(f"Error updating invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to update invitation'})


def delete_invitation(invitation_id: str) -> Dict[str, Any]:
    """Delete an invitation"""
    try:
        invitations_table = get_dynamodb_table(os.environ.get('EVENT_INVITATIONS_TABLE', 'event-invitations'))
        
        # Check if invitation exists
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'})
        
        # Delete the invitation
        invitations_table.delete_item(Key={'invitation_id': invitation_id})
        
        return create_response(200, {
            'message': 'Invitation deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to delete invitation'}) 