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

# ============================================================================
# INLINE UTILITY FUNCTIONS (following .cursorrules Lambda best practices)
# ============================================================================

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response with CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }

def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event"""
    try:
        body = event.get('body', '{}')
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        if isinstance(body, str):
            return json.loads(body) if body else {}
        return body if isinstance(body, dict) else {}
    except Exception:
        return {}

def get_current_timestamp() -> str:
    """Get current ISO timestamp"""
    return datetime.utcnow().isoformat() + 'Z'

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """Validate that required fields are present in data"""
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return {
            'valid': False,
            'error': f"Missing required fields: {', '.join(missing_fields)}"
        }
    return {'valid': True}

def validate_email_format(email: str) -> bool:
    """Basic email format validation"""
    return isinstance(email, str) and '@' in email and '.' in email and len(email) > 5

def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource"""
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        print(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise

def format_error_response(e: Exception) -> Dict[str, Any]:
    """Format error response consistently"""
    return create_response(500, {'error': 'Internal server error', 'details': str(e)})

def log_api_event(event: Dict[str, Any], context: Any, message: str) -> None:
    """Log API event for monitoring"""
    try:
        log_entry = {
            'event_category': 'api_request',
            'message': message,
            'method': event.get('httpMethod'),
            'path': event.get('path'),
            'timestamp': get_current_timestamp()
        }
        print(json.dumps(log_entry))
    except Exception as e:
        print(f"Logging error: {str(e)}")

def handle_cors_preflight(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle CORS preflight requests"""
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(204, {})
    return None


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
                return get_parent_invitation(path_parameters['invitation_id'])
            elif '/validate/' in path:
                # Extract token from path
                token = path.split('/validate/')[-1]
                return validate_invitation_token(token)
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
                    return resend_parent_invitation(path_parameters['invitation_id'])
                else:
                    return update_parent_invitation(path_parameters['invitation_id'], event)
            else:
                return create_response(400, {'error': 'Invitation ID required for update'})
                
        elif http_method == 'DELETE':
            if 'invitation_id' in path_parameters:
                return delete_parent_invitation(path_parameters['invitation_id'])
            else:
                return create_response(400, {'error': 'Invitation ID required for deletion'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in parent invitations handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return format_error_response(e)


def create_parent_invitation(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new parent invitation"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['parent_email', 'coach_id'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']})
        
        # Validate email format
        if not validate_email_format(body['parent_email']):
            return create_response(400, {'error': 'Invalid email format'})
        
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles-v3-dev'))
        
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
                    return create_response(404, {'error': 'Coach not found'})
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
            return create_response(409, {'error': 'Active invitation already exists for this parent from this coach'})
        
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
        })
        
    except Exception as e:
        print(f"Error creating parent invitation: {str(e)}")
        import traceback
        traceback.print_exc()
        return format_error_response(e)


def send_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Send parent invitations via email"""
    try:
        body = parse_event_body(event)
        
        validation = validate_required_fields(body, ['invitation_ids'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']})
        
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
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
        })
        
    except Exception as e:
        print(f"Error sending parent invitations: {str(e)}")
        return format_error_response(e)


def send_bulk_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create and send invitations to multiple parents"""
    try:
        body = parse_event_body(event)
        
        validation = validate_required_fields(body, ['parents', 'coach_id'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']})
        
        if not isinstance(body['parents'], list) or len(body['parents']) == 0:
            return create_response(400, {'error': 'Parents must be a non-empty list'})
        
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
                            parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
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
        })
        
    except Exception as e:
        print(f"Error creating bulk parent invitations: {str(e)}")
        return format_error_response(e)


def send_parent_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send parent invitation email using SES"""
    try:
        ses_client = boto3.client('ses')
        
        student_name = f"{invitation.get('student_first_name', '')} {invitation.get('student_last_name', '')}".strip()
        if not student_name:
            student_name = "your child"
        
        invitation_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/parent/invitation?token={invitation['invitation_token']}"
        
        subject = f"Invitation to Enroll {student_name} at Texas Sports Academy"
        
        # Fix: Handle expires_at as string or number for email formatting
        expires_at_timestamp = float(invitation['expires_at']) if isinstance(invitation['expires_at'], str) else invitation['expires_at']
        expires_at = datetime.fromtimestamp(expires_at_timestamp)
        formatted_expiry = expires_at.strftime("%B %d, %Y")
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1e3a8a; margin: 0;">You're Invited to Enroll {student_name}!</h2>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Texas Sports Academy Admissions Portal</p>
            </div>
            
            <p>Hello!</p>
            
            <p>You've been invited by <strong>{invitation['coach_name']}</strong> to enroll {student_name} at <strong>{invitation.get('school_name', 'Texas Sports Academy')}</strong>.</p>
            
            {f"<div style='background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;'><p style='margin: 0; font-style: italic;'><strong>Personal message:</strong><br>{invitation['message']}</p></div>" if invitation.get('message') else ""}
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">What's included in our program:</h3>
                <ul style="color: #6b7280;">
                    <li>Expert coaching and athletic development</li>
                    <li>Academic support and college preparation</li>
                    <li>State-of-the-art facilities and equipment</li>
                    <li>Scholarship and financial aid opportunities</li>
                    <li>Character development and leadership training</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invitation_url}" 
                   style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Complete Enrollment Application
                </a>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This invitation expires on {formatted_expiry}. Please complete your enrollment before this date.</p>
            </div>
            
            <p>The enrollment process includes:</p>
            <ol style="color: #6b7280;">
                <li>Student information and academic history</li>
                <li>Parent/guardian contact details</li>
                <li>Tuition and payment arrangements</li>
                <li>Required document submission</li>
            </ol>
            
            <p>If you have any questions, please don't hesitate to contact us:</p>
            <ul style="color: #6b7280;">
                <li>Email: <a href="mailto:admissions@texassportsacademy.com">admissions@texassportsacademy.com</a></li>
                <li>Phone: (555) 123-4567</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 14px;">
                Best regards,<br>
                The Texas Sports Academy Team<br>
                <em>Building Champions On and Off the Field</em>
            </p>
            
            <p style="color: #9ca3af; font-size: 12px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="{invitation_url}" style="color: #3b82f6;">{invitation_url}</a>
            </p>
        </body>
        </html>
        """
        
        body_text = f"""
        You're Invited to Enroll {student_name}!
        
        Hello!
        
        You've been invited by {invitation['coach_name']} to enroll {student_name} at {invitation.get('school_name', 'Texas Sports Academy')}.
        
        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}
        
        What's included in our program:
        • Expert coaching and athletic development
        • Academic support and college preparation  
        • State-of-the-art facilities and equipment
        • Scholarship and financial aid opportunities
        • Character development and leadership training
        
        To complete your enrollment application, visit: {invitation_url}
        
        IMPORTANT: This invitation expires on {formatted_expiry}. Please complete your enrollment before this date.
        
        The enrollment process includes:
        1. Student information and academic history
        2. Parent/guardian contact details
        3. Tuition and payment arrangements
        4. Required document submission
        
        If you have any questions, please contact us:
        • Email: admissions@texassportsacademy.com
        • Phone: (555) 123-4567
        
        Best regards,
        The Texas Sports Academy Team
        Building Champions On and Off the Field
        """
        
        response = ses_client.send_email(
            Source=os.environ.get('FROM_EMAIL', 'no-reply@sportsacademy.tech'),
            Destination={'ToAddresses': [invitation['parent_email']]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': body_html},
                    'Text': {'Data': body_text}
                }
            }
        )
        
        print(f"Parent invitation email sent to {invitation['parent_email']}. Message ID: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"Error sending parent invitation email to {invitation['parent_email']}: {str(e)}")
        return False


def validate_invitation_token(token: str) -> Dict[str, Any]:
    """Validate invitation token and return invitation details"""
    try:
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        # Search for invitation by token
        response = parent_invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': token}
        )
        
        if not response.get('Items'):
            return create_response(404, {'error': 'Invalid invitation token'})
        
        invitation = response['Items'][0]
        
        # Fix: Convert expires_at to float for comparison
        expires_at = float(invitation['expires_at']) if isinstance(invitation['expires_at'], str) else invitation['expires_at']
        if datetime.utcnow().timestamp() > expires_at:
            return create_response(400, {'error': 'Invitation has expired'})
        
        # Check if invitation is still pending
        if invitation['status'] not in ['pending', 'sent']:
            return create_response(400, {'error': 'Invitation is no longer valid'})
        
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
        })
        
    except Exception as e:
        print(f"Error validating invitation token: {str(e)}")
        return format_error_response(e)


def get_parent_invitation(invitation_id: str) -> Dict[str, Any]:
    """Get specific parent invitation details"""
    try:
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        response = parent_invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'})
        
        return create_response(200, {'invitation': response['Item']})
        
    except Exception as e:
        print(f"Error getting parent invitation: {str(e)}")
        return format_error_response(e)


def list_parent_invitations(event: Dict[str, Any]) -> Dict[str, Any]:
    """List parent invitations with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        status_filter = query_params.get('status')
        limit = int(query_params.get('limit', 50))
        
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        if coach_id:
            # If coach_id looks like an email, try to get the actual profile_id
            actual_coach_id = coach_id
            if '@' in coach_id:
                profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles-v3-dev'))
                email_lookup_response = profiles_table.scan(
                    FilterExpression='email = :email AND role_type = :role',
                    ExpressionAttributeValues={
                        ':email': coach_id,
                        ':role': 'coach'
                    },
                    Limit=1
                )
                
                if email_lookup_response.get('Items'):
                    actual_coach_id = email_lookup_response['Items'][0]['profile_id']
                else:
                    # No coach found with that email, return empty results
                    return create_response(200, {
                        'invitations': [],
                        'count': 0
                    })
            
            # Query by coach using GSI
            response = parent_invitations_table.query(
                IndexName='coach-index',
                KeyConditionExpression='coach_id = :coach_id',
                ExpressionAttributeValues={':coach_id': actual_coach_id},
                Limit=limit,
                ScanIndexForward=False  # Most recent first
            )
        elif status_filter:
            # Query by status using GSI
            response = parent_invitations_table.query(
                IndexName='status-index',
                KeyConditionExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': status_filter},
                Limit=limit,
                ScanIndexForward=False
            )
        else:
            # Scan all invitations
            response = parent_invitations_table.scan(Limit=limit)
        
        invitations = response.get('Items', [])
        
        # Sort by created_at descending
        invitations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_response(200, {
            'invitations': invitations,
            'count': len(invitations)
        })
        
    except Exception as e:
        print(f"Error listing parent invitations: {str(e)}")
        return format_error_response(e)


def resend_parent_invitation(invitation_id: str) -> Dict[str, Any]:
    """Resend a parent invitation email"""
    try:
        # Get invitation details
        invitation_response = get_parent_invitation(invitation_id)
        if invitation_response['statusCode'] != 200:
            return invitation_response
        
        invitation = json.loads(invitation_response['body'])['invitation']
        
        # Check if invitation is still valid
        if invitation['status'] not in ['pending', 'sent']:
            return create_response(400, {'error': 'Invitation is no longer valid for resending'})
        
        # Fix: Convert expires_at to float for comparison
        expires_at = float(invitation['expires_at']) if isinstance(invitation['expires_at'], str) else invitation['expires_at']
        if datetime.utcnow().timestamp() > expires_at:
            return create_response(400, {'error': 'Invitation has expired'})
        
        # Resend email
        email_sent = send_parent_invitation_email(invitation)
        
        if not email_sent:
            return create_response(500, {'error': 'Failed to resend invitation email'})
        
        # Update last sent timestamp
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        parent_invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET last_sent_at = :timestamp, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':timestamp': get_current_timestamp(),
                ':updated_at': get_current_timestamp()
            }
        )
        
        return create_response(200, {'message': 'Parent invitation resent successfully'})
        
    except Exception as e:
        print(f"Error resending parent invitation: {str(e)}")
        return format_error_response(e)


def update_parent_invitation(invitation_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update a parent invitation"""
    try:
        body = parse_event_body(event)
        
        # Build update expression dynamically
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': get_current_timestamp()}
        
        # Allow updating certain fields
        updatable_fields = ['message', 'student_first_name', 'student_last_name', 'grade_level', 'sport_interest', 'school_name']
        for field in updatable_fields:
            if field in body:
                update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = body[field]
        
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        parent_invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return create_response(200, {'message': 'Parent invitation updated successfully'})
        
    except Exception as e:
        print(f"Error updating parent invitation: {str(e)}")
        return format_error_response(e)


def delete_parent_invitation(invitation_id: str) -> Dict[str, Any]:
    """Delete a parent invitation"""
    try:
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        # Check if invitation exists
        response = parent_invitations_table.get_item(Key={'invitation_id': invitation_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Invitation not found'})
        
        # Delete the invitation
        parent_invitations_table.delete_item(Key={'invitation_id': invitation_id})
        
        return create_response(200, {'message': 'Parent invitation deleted successfully'})
        
    except Exception as e:
        print(f"Error deleting parent invitation: {str(e)}")
        return format_error_response(e) 