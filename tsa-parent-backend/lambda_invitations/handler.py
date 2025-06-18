"""
Lambda handler for parent invitations
Allows coaches to invite parents to complete student enrollment
Self-contained version without external dependencies - Following .cursorrules Lambda best practices
"""
import json
import os
import boto3
import uuid
from typing import Dict, Any, List
from datetime import datetime, timedelta
from shared_config import get_config


# Import shared utilities
from shared_utils import (
    create_response,
    parse_event_body,
    get_current_timestamp,
    validate_required_fields,
    validate_email_format,
    get_dynamodb_table,
    format_error_response,
    log_api_event,
    handle_cors_preflight
)


config = get_config()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for parent invitation requests"""
    try:
        # Log the request
        log_api_event(event, context, "Parent Invitation Request")
        
        # Handle CORS preflight
        cors_response = handle_cors_preflight(event)
        if cors_response:
            return cors_response
        
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters') or {}
        
        # Route to appropriate handler
        if http_method == 'GET':
            if 'invitation_id' in path_parameters:
                return get_parent_invitation(path_parameters['invitation_id'], event)
            elif '/validate/' in path:
                # Extract token from path
                token = path.split('/validate/')[-1]
                return validate_invitation_token(token, event)
            else:
                return list_parent_invitations(event)
                
        elif http_method == 'POST':
            if '/send' in path:
                return send_parent_invitations(event)
            elif '/bulk' in path:
                return send_bulk_parent_invitations(event)
            else:
                return create_parent_invitation(event)
                
        elif http_method == 'PUT':
            if 'invitation_id' in path_parameters:
                if '/resend' in path:
                    return resend_parent_invitation(path_parameters['invitation_id'], event)
                else:
                    return update_parent_invitation(path_parameters['invitation_id'], event)
            else:
                return create_response(400, {'error': 'Invitation ID required for update'}, event)
                
        elif http_method == 'DELETE':
            if 'invitation_id' in path_parameters:
                return delete_parent_invitation(path_parameters['invitation_id'], event)
            else:
                return create_response(400, {'error': 'Invitation ID required for deletion'}, event)
        else:
            return create_response(405, {'error': 'Method not allowed'}, event)
            
    except Exception as e:
        print(f"Error in parent invitations handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return format_error_response(e, event)


def create_parent_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new parent invitation"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['parent_email', 'coach_id'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        # Validate email format
        if not validate_email_format(body['parent_email']):
            return create_response(400, {'error': 'Invalid email format'}, event)
        
        parent_invitations_table = get_dynamodb_table(config.get_table_name('parent-invitations'))
        profiles_table = get_dynamodb_table(config.get_table_name('profiles'))
        
        # Check if this is a development environment
        stage = os.environ.get('STAGE', 'dev')
        
        if stage == 'dev':
            # Development mode: Skip coach validation and use default values
            coach_profile = {
                'profile_id': f"dev-coach-{body['coach_id'].replace('@', '-').replace('.', '-')}",
                'email': body['coach_id'],
                'role_type': 'coach',
                'first_name': 'Development',
                'last_name': 'Coach',
                'school_id': 'dev-school-001',
                'created_at': get_current_timestamp(),
                'status': 'active'
            }
            actual_coach_id = coach_profile['profile_id']
        else:
            # Production mode: Require actual coach validation
            
            # Get coach profile to validate they exist and get school info
            # Try by profile_id first, then by email if not found
            coach_response = profiles_table.get_item(Key={'profile_id': body['coach_id']})
            
            if 'Item' not in coach_response:
                # If not found by profile_id, try looking up by email
                email_lookup_response = profiles_table.scan(
                    FilterExpression='email = :email AND role_type = :role',
                    ExpressionAttributeValues={
                        ':email': body['coach_id'],
                        ':role': 'coach'
                    },
                    Limit=1
                )
                
                if email_lookup_response.get('Items'):
                    coach_profile = email_lookup_response['Items'][0]
                    # Update coach_id to use the actual profile_id for consistency
                    actual_coach_id = coach_profile['profile_id']
                else:
                    return create_response(404, {'error': 'Coach not found'}, event)
            else:
                coach_profile = coach_response['Item']
                actual_coach_id = body['coach_id']
        
        # Validate coach has school_id
        if 'school_id' not in coach_profile:
                coach_profile['school_id'] = 'default-school'
        
        # Check for existing pending invitation for this email from this coach
        existing_check = parent_invitations_table.scan(
            FilterExpression='parent_email = :email AND coach_id = :coach_id AND #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':email': body['parent_email'].lower().strip(),
                ':coach_id': actual_coach_id,
                ':status': 'pending'
            }
        )
        
        if existing_check.get('Items'):
            return create_response(409, {'error': 'Active invitation already exists for this parent from this coach'}, event)
        
        # Generate invitation
        invitation_id = str(uuid.uuid4())
        invitation_token = str(uuid.uuid4())
        expires_at = int((datetime.utcnow() + timedelta(days=14)).timestamp())
        
        invitation_data = {
            'invitation_id': invitation_id,
            'invitation_token': invitation_token,
            'parent_email': body['parent_email'].lower().strip(),
            'coach_id': actual_coach_id,
            'school_id': coach_profile['school_id'],
            'coach_name': f"{coach_profile.get('first_name', '')} {coach_profile.get('last_name', '')}".strip(),
            'school_name': body.get('school_name', 'Texas Sports Academy'),  # TODO: Get from schools table
            'message': body.get('message', ''),
            'student_first_name': body.get('student_first_name', ''),  # Optional student info
            'student_last_name': body.get('student_last_name', ''),
            'grade_level': body.get('grade_level', ''),
            'sport_interest': body.get('sport_interest', ''),
            'status': 'pending',
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp(),
            'expires_at': expires_at,
            'sent_at': None,
            'accepted_at': None,
            'enrollment_completed_at': None
        }
        
        # Store invitation
        parent_invitations_table.put_item(Item=invitation_data)
        
        # Prepare response
        response_data = invitation_data.copy()
        response_data['invitation_url'] = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/parent/invitation?token={invitation_token}"
        
        return create_response(201, {
            'message': 'Parent invitation created successfully',
            'invitation': response_data
        }, event)
        
    except Exception as e:
        print(f"Error creating parent invitation: {str(e)}")
        import traceback
        traceback.print_exc()
        return format_error_response(e, event)


def send_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Send parent invitations via email"""
    try:
        body = parse_event_body(event)
        
        validation = validate_required_fields(body, ['invitation_ids'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        parent_invitations_table = get_dynamodb_table(config.get_table_name('parent-invitations'))
        
        sent_count = 0
        failed_count = 0
        results = []
        
        for invitation_id in body['invitation_ids']:
            try:
                # Get invitation details
                invitation_response = parent_invitations_table.get_item(Key={'invitation_id': invitation_id})
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
                if invitation['status'] == 'sent' and invitation.get('sent_at'):
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
                    parent_invitations_table.update_item(
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
                        'email': invitation['parent_email']
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
        }, event)
        
    except Exception as e:
        print(f"Error sending parent invitations: {str(e)}")
        return format_error_response(e, event)


def send_bulk_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create and send invitations to multiple parents"""
    try:
        body = parse_event_body(event)
        
        validation = validate_required_fields(body, ['parents', 'coach_id'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        if not isinstance(body['parents'], list) or len(body['parents']) == 0:
            return create_response(400, {'error': 'Parents must be a non-empty list'}, event)
        
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
                            parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
                            parent_invitations_table.update_item(
                                Key={'invitation_id': invitation_data['invitation_id']},
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
                else:
                    failed_count += 1
                    
            except Exception as e:
                print(f"Error processing parent {parent_data.get('email', 'unknown')}: {str(e)}")
                failed_count += 1
        
        return create_response(201, {
            'message': f'Created {len(created_invitations)} parent invitations',
            'created_count': len(created_invitations),
            'sent_count': sent_count,
            'failed_count': failed_count,
            'invitations': created_invitations
        }, event)
        
    except Exception as e:
        print(f"Error creating bulk parent invitations: {str(e)}")
        return format_error_response(e, event)


def send_parent_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send parent invitation email using SendGrid"""
    try:
        from shared_utils.sendgrid_utils import send_parent_invitation_email as send_email
        return send_email(invitation)
        
    except Exception as e:
        print(f"Error sending parent invitation email to {invitation['parent_email']}: {str(e)}")
        return False


def validate_invitation_token(token: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Validate invitation token and return invitation details"""
    try:
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        # Search for invitation by token
        response = parent_invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': token}
        )
        
        if not response.get('Items'):
            return create_response(404, {'error': 'Invalid invitation token'}, event)
        
        invitation = response['Items'][0]
        
        # Fix: Convert expires_at to float for comparison
        expires_at = float(invitation['expires_at']) if isinstance(invitation['expires_at'], str) else invitation['expires_at']
        if datetime.utcnow().timestamp() > expires_at:
            return create_response(400, {'error': 'Invitation has expired'}, event)
        
        # Check if invitation is still pending
        if invitation['status'] not in ['pending', 'sent']:
            return create_response(400, {'error': 'Invitation is no longer valid'}, event)
        
        # Remove sensitive information
        safe_invitation = {
            'invitation_id': invitation['invitation_id'],
            'coach_name': invitation['coach_name'],
            'school_name': invitation['school_name'],
            'parent_email': invitation['parent_email'],
            'message': invitation.get('message', ''),
            'student_first_name': invitation.get('student_first_name', ''),
            'student_last_name': invitation.get('student_last_name', ''),
            'grade_level': invitation.get('grade_level', ''),
            'sport_interest': invitation.get('sport_interest', ''),
            'expires_at': invitation['expires_at'],
            'status': invitation['status']
        }
        
        return create_response(200, {
            'message': 'Valid invitation',
            'invitation': safe_invitation
        }, event)
        
    except Exception as e:
        print(f"Error validating invitation token: {str(e)}")
        return format_error_response(e, event)


def get_parent_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Get invitation details by ID"""
    try:
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        response = parent_invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'}, event)
        
        invitation = response['Item']
        return create_response(200, {'invitation': invitation}, event)
        
    except Exception as e:
        print(f"Error getting parent invitation: {str(e)}")
        return format_error_response(e, event)


def list_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all parent invitations"""
    try:
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        response = parent_invitations_table.scan()
        invitations = response.get('Items', [])
        
        return create_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        }, event)
        
    except Exception as e:
        print(f"Error listing parent invitations: {str(e)}")
        return format_error_response(e, event)


def resend_parent_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Resend a parent invitation"""
    try:
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        # Get invitation
        response = parent_invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'}, event)
        
        invitation = response['Item']
        
        # Send email
        if send_parent_invitation_email(invitation):
            # Update sent timestamp
            parent_invitations_table.update_item(
                Key={'invitation_id': invitation_id},
                UpdateExpression='SET sent_at = :sent_at, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':sent_at': get_current_timestamp(),
                    ':updated_at': get_current_timestamp()
                }
            )
            
            return create_response(200, {'message': 'Invitation resent successfully'}, event)
        else:
            return create_response(500, {'error': 'Failed to resend invitation'}, event)
            
    except Exception as e:
        print(f"Error resending parent invitation: {str(e)}")
        return format_error_response(e, event)


def update_parent_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update parent invitation"""
    try:
        body = parse_event_body(event)
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        # Update invitation
        parent_invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': body.get('status', 'pending'),
                ':updated_at': get_current_timestamp()
            }
        )
        
        return create_response(200, {'message': 'Invitation updated successfully'}, event)
        
    except Exception as e:
        print(f"Error updating parent invitation: {str(e)}")
        return format_error_response(e, event)


def delete_parent_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Delete parent invitation"""
    try:
        parent_invitations_table = get_dynamodb_table(config.get_env_vars('SERVICE')['PARENT_INVITATIONS_TABLE'], get_table_name('parent-invitations')))
        
        parent_invitations_table.delete_item(Key={'invitation_id': invitation_id})
        
        return create_response(200, {'message': 'Invitation deleted successfully'}, event)
        
    except Exception as e:
        print(f"Error deleting parent invitation: {str(e)}")
        return format_error_response(e, event) 