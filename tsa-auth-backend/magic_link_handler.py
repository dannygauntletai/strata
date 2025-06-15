"""
Magic Link Handler
Generates and sends magic link emails for passwordless authentication
Extended to support both coaches and parents for unified TSA platform
"""
import json
import os
import boto3
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Union

# SendGrid imports for direct email sending
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle magic link generation and sending for coaches and parents"""
    try:
        # Parse request
        if event.get('httpMethod') == 'POST':
            return handle_generate_magic_link(event, context)
        elif event.get('httpMethod') == 'GET' and '/health' in event.get('path', ''):
            return handle_health_check()
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in magic link handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def cleanup_expired_tokens() -> None:
    """Clean up expired tokens from DynamoDB (called periodically)"""
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        
        current_timestamp = int(datetime.utcnow().timestamp())
        
        # Scan for expired tokens (DynamoDB TTL should handle this automatically, but manual cleanup for safety)
        response = table.scan(
            FilterExpression='expires_at < :current_time',
            ExpressionAttributeValues={
                ':current_time': current_timestamp
            }
        )
        
        # Delete expired tokens in batches
        with table.batch_writer() as batch:
            for item in response.get('Items', []):
                batch.delete_item(Key={'token_id': item['token_id']})
        
        if response.get('Items'):
            print(f"Cleaned up {len(response['Items'])} expired tokens")
            
    except Exception as e:
        print(f"Error during token cleanup: {str(e)}")


def handle_generate_magic_link(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Generate and send magic link email for coaches, parents, or admins"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').lower().strip()
        user_role = body.get('user_role', 'coach')  # Default to coach for backward compatibility
        invitation_token = body.get('invitation_token')  # For parent invitations
        
        if not email or '@' not in email:
            return create_response(400, {'error': 'Valid email address required'})
        
        # Validate user role - now includes admin
        if user_role not in ['coach', 'parent', 'admin']:
            return create_response(400, {'error': 'Invalid user role. Must be "coach", "parent", or "admin"'})
        
        # 🔐 SECURITY: Validate role access before proceeding
        try:
            print(f"🔍 Validating role access for {email} as {user_role}")
            
            # For coach role, use direct invitation table check (synchronous)
            if user_role == 'coach':
                validation_result = validate_coach_invitation_fallback(email)
                
                # Handle different return types
                if validation_result is True:
                    # Completed coach - can proceed with magic link
                    print(f"✅ Coach validation passed for {email}")
                elif isinstance(validation_result, dict) and validation_result.get('requires_onboarding'):
                    # Pending/accepted coach - redirect to onboarding
                    print(f"🔄 Redirecting {email} to onboarding")
                    return create_response(202, {
                        'message': 'Please complete your onboarding process',
                        'requires_onboarding': True,
                        'onboarding_url': validation_result.get('onboarding_url'),
                        'status': validation_result.get('status')
                    })
                else:
                    # No valid invitation found
                    return create_response(403, {
                        'error': 'Access denied',
                        'reason': 'No valid coach invitation found'
                    })
            
            # For admin role, check authorized admin list
            elif user_role == 'admin':
                if not validate_admin_access_direct(email):
                    return create_response(403, {
                        'error': 'Access denied',
                        'reason': 'Not authorized as admin'
                    })
                print(f"✅ Admin validation passed for {email}")
            
            # For parent role, validate invitation token
            elif user_role == 'parent':
                if not invitation_token:
                    return create_response(403, {
                        'error': 'Access denied',
                        'reason': 'Parent access requires valid invitation token'
                    })
                if not validate_parent_invitation_direct(email, invitation_token):
                    return create_response(403, {
                        'error': 'Access denied',
                        'reason': 'Invalid parent invitation token'
                    })
                print(f"✅ Parent validation passed for {email}")
            
        except Exception as e:
            print(f"⚠️ Role validation error for {email}: {str(e)}")
            return create_response(403, {
                'error': 'Access denied',
                'reason': 'Role validation failed'
            })
        
        # Rate limiting check - max 3 requests per email per 5 minutes
        if not check_rate_limit(email):
            return create_response(429, {
                'error': 'Too many requests. Please wait before requesting another magic link.',
                'retry_after_minutes': 5
            })
        
        # Cleanup expired tokens occasionally (1 in 10 requests)
        if hash(email) % 10 == 0:
            cleanup_expired_tokens()
        
        # Invalidate all previous tokens for this email (security fix)
        invalidate_previous_tokens(email)
        
        # Generate secure token
        token_id = str(uuid.uuid4())
        token_hash = hashlib.sha256(f"{token_id}{email}{datetime.utcnow()}".encode()).hexdigest()
        
        # Calculate expiration (15 minutes from now)
        expires_at = int((datetime.utcnow() + timedelta(minutes=15)).timestamp())
        
        # Store token in DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        
        token_record = {
            'token_id': token_id,
            'email': email,
            'user_role': user_role,  # Track user role
            'invitation_token': invitation_token,  # For parent invitations
            'token_hash': token_hash,
            'created_at': datetime.utcnow().isoformat(),
            'created_at_timestamp': int(datetime.utcnow().timestamp()),  # For easier querying
            'expires_at': expires_at,
            'used': False
        }
        
        table.put_item(Item=token_record)
        
        # Check if user exists in Cognito, create if not
        cognito_client = boto3.client('cognito-idp')
        user_pool_id = os.environ['USER_POOL_ID']
        
        try:
            cognito_client.admin_get_user(
                UserPoolId=user_pool_id,
                Username=email
            )
            user_exists = True
        except cognito_client.exceptions.UserNotFoundException:
            # Create user with role-specific attributes
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'custom:user_role', 'Value': user_role}  # Store user role
            ]
            
            # Add invitation token for parents
            if user_role == 'parent' and invitation_token:
                user_attributes.append({
                    'Name': 'custom:invitation_token', 
                    'Value': invitation_token
                })
            
            cognito_client.admin_create_user(
                UserPoolId=user_pool_id,
                Username=email,
                UserAttributes=user_attributes,
                MessageAction='SUPPRESS'  # Don't send Cognito welcome email
            )
            user_exists = False
        
        # Generate magic link URL with role-specific verification endpoint
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        admin_frontend_url = os.environ.get('ADMIN_FRONTEND_URL', 'http://localhost:3001')
        
        # Use role-specific verification routes
        if user_role == 'admin':
            # Admin uses admin frontend URL for verification
            magic_link = f"{admin_frontend_url}/verify?token={token_id}&email={email}&role={user_role}"
        else:
            # Coaches and parents use unified frontend
            magic_link = f"{frontend_url}/verify?token={token_id}&email={email}&role={user_role}"
        
        # Add invitation token for parents if present
        if user_role == 'parent' and invitation_token:
            magic_link += f"&invitation={invitation_token}"
        
        # Send role-specific email
        email_sent = send_magic_link_email(email, magic_link, user_exists, user_role, invitation_token)
        
        if email_sent:
            return create_response(200, {
                'message': 'Magic link sent successfully. Check your email.',
                'email': email,
                'user_role': user_role,
                'expires_in_minutes': 15
            })
        else:
            return create_response(500, {'error': 'Failed to send magic link email'})
            
    except Exception as e:
        print(f"Error generating magic link: {str(e)}")
        return create_response(500, {'error': 'Failed to generate magic link'})


def validate_coach_invitation_fallback(email: str) -> Union[bool, Dict[str, Any]]:
    """Fallback validation for coach invitations by checking invitations table directly"""
    try:
        print(f"🔍 Fallback coach validation for {email}")
        
        # Check invitations table directly
        dynamodb = boto3.resource('dynamodb')
        invitations_table_name = os.environ.get('TSA_INVITATIONS_TABLE', 'invitations-v1-dev')
        invitations_table = dynamodb.Table(invitations_table_name)
        
        # Scan for invitation with this email
        response = invitations_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        invitations = response.get('Items', [])
        if not invitations:
            print(f"❌ No invitation found for {email}")
            return False
        
        # Sort by created_at to get the most recent invitation
        sorted_invitations = sorted(invitations, key=lambda x: x.get('created_at', ''), reverse=True)
        most_recent_invitation = sorted_invitations[0]
        
        status = most_recent_invitation.get('status', '')
        role = most_recent_invitation.get('role', '')
        
        print(f"📅 Using most recent invitation for {email}: status={status}, created_at={most_recent_invitation.get('created_at', 'unknown')}")
        
        # Allow completed coaches to get magic links
        if status in ['completed'] and (role == 'coach' or role is None):
            print(f"✅ Fallback validation passed for {email} (status: {status}, role: {role})")
            return True
        
        # For pending/accepted coaches, return onboarding redirect info
        if status in ['pending', 'accepted'] and (role == 'coach' or role is None):
            print(f"🔄 Coach needs to complete onboarding: {email} (status: {status})")
            # Don't return True/False, return onboarding info instead
            return {
                'requires_onboarding': True,
                'status': status,
                'invitation_token': most_recent_invitation.get('invitation_token', ''),
                'invitation_id': most_recent_invitation.get('invitation_id', ''),
                'onboarding_url': f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/onboarding?token={most_recent_invitation.get('invitation_token', '')}"
            }
        
        # No valid invitation found
        print(f"❌ No valid invitation found for {email}")
        return False
        
    except Exception as e:
        print(f"⚠️ Error in fallback coach validation: {str(e)}")
        return False


def validate_admin_access_direct(email: str) -> bool:
    """Direct validation for admin access by checking authorized admin list"""
    try:
        print(f"🔐 Validating admin access for {email}")
        
        # Get admin emails from environment or use hardcoded list
        admin_emails_str = os.environ.get('ADMIN_EMAILS', '')
        if admin_emails_str:
            admin_emails = [e.strip().lower() for e in admin_emails_str.split(',')]
        else:
            # Hardcoded fallback admin emails
            admin_emails = [
                'admin@sportsacademy.tech',
                'danny.mota@superbuilders.school',
                'malekai.mischke@superbuilders.school',
                # Add other authorized admin emails
            ]
        
        # Check if email is in authorized admin list
        is_admin = email.lower() in admin_emails
        
        if is_admin:
            print(f"✅ Admin access granted for {email}")
        else:
            print(f"❌ Admin access denied for {email} - not in authorized list")
            
        return is_admin
        
    except Exception as e:
        print(f"⚠️ Error in admin validation: {str(e)}")
        return False


def validate_parent_invitation_direct(email: str, invitation_token: str) -> bool:
    """Direct validation for parent invitations by checking main invitations table"""
    try:
        print(f"👨‍👩‍👧‍👦 Validating parent invitation for {email}")
        
        # Check main invitations table (same as coach invitations)
        dynamodb = boto3.resource('dynamodb')
        invitations_table_name = os.environ.get('TSA_INVITATIONS_TABLE', 'invitations-v1-dev')
        invitations_table = dynamodb.Table(invitations_table_name)
        
        # Look up invitation by token and role
        response = invitations_table.scan(
            FilterExpression='invitation_token = :token AND #role = :role',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={
                ':token': invitation_token,
                ':role': 'parent'
            }
        )
        
        if response.get('Items'):
            invitation = response['Items'][0]
            invitation_email = invitation.get('email', '').lower()
            status = invitation.get('status', '')
            expires_at = invitation.get('expires_at')
            
            # Validate email matches
            if invitation_email != email.lower():
                print(f"❌ Parent invitation email mismatch: {email} vs {invitation_email}")
                return False
            
            # Validate status
            if status not in ['pending', 'sent']:
                print(f"❌ Parent invitation status is {status}, expected pending or sent")
                return False
            
            # Check expiration
            if expires_at and datetime.utcnow().timestamp() > expires_at:
                print(f"❌ Parent invitation has expired")
                return False
            
            print(f"✅ Parent invitation validation passed for {email}")
            return True
        else:
            print(f"❌ Parent invitation token not found: {invitation_token}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error in parent invitation validation: {str(e)}")
        return False


def check_rate_limit(email: str) -> bool:
    """Check if email has exceeded rate limit (max 3 requests per 5 minutes)"""
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        
        # Check requests in last 5 minutes
        five_minutes_ago = int((datetime.utcnow() - timedelta(minutes=5)).timestamp())
        
        # Query by email using GSI
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            FilterExpression='created_at_timestamp > :five_minutes_ago',
            ExpressionAttributeValues={
                ':email': email,
                ':five_minutes_ago': five_minutes_ago
            }
        )
        
        # Allow max 3 requests per 5 minutes
        return len(response.get('Items', [])) < 3
        
    except Exception as e:
        print(f"Error checking rate limit for {email}: {str(e)}")
        # If rate limit check fails, allow the request (fail open)
        return True


def invalidate_previous_tokens(email: str) -> None:
    """Invalidate all previous unused tokens for this email"""
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        
        # Find all unused tokens for this email
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            FilterExpression='used = :used',
            ExpressionAttributeValues={
                ':email': email,
                ':used': False
            }
        )
        
        # Mark all existing tokens as used
        for item in response.get('Items', []):
            table.update_item(
                Key={'token_id': item['token_id']},
                UpdateExpression='SET used = :used, used_at = :used_at, invalidated_reason = :reason',
                ExpressionAttributeValues={
                    ':used': True,
                    ':used_at': datetime.utcnow().isoformat(),
                    ':reason': 'superseded_by_new_request'
                }
            )
            
        print(f"Invalidated {len(response.get('Items', []))} previous tokens for {email}")
        
    except Exception as e:
        print(f"Error invalidating previous tokens for {email}: {str(e)}")
        # Don't fail the request if token cleanup fails


def send_magic_link_email(email: str, magic_link: str, user_exists: bool, user_role: str, invitation_token: str) -> bool:
    """Send magic link email using SendGrid"""
    try:
        # Get SendGrid API key from AWS Secrets Manager
        secret_arn = os.environ.get('SENDGRID_SECRET_ARN')
        if not secret_arn:
            print(f"SENDGRID_SECRET_ARN not found in environment")
            return False
        
        # Retrieve secret from AWS Secrets Manager
        secrets_client = boto3.client('secretsmanager')
        secret_response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret_data = json.loads(secret_response['SecretString'])
        api_key = secret_data.get('api_key')
        
        if not api_key:
            print(f"api_key not found in secret")
            return False
        
        # Initialize SendGrid client
        sg = SendGridAPIClient(api_key)
        
        # Email content
        from_email = Email("no-reply@strata.school")
        to_email = To(email)
        subject = f"Magic Link - {user_role.capitalize()} Verification"
        content = Content("text/plain", f"Click the link to verify your account: {magic_link}")
        
        # Create and send email
        mail = Mail(from_email, to_email, subject, content)
        response = sg.client.mail.send.post(request_body=mail.get())
        
        return response.status_code == 202
         
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


def handle_health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test DynamoDB connectivity
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        table.scan(Limit=1)
        
        return create_response(200, {
            'status': 'healthy',
            'service': 'magic-link-handler',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps(body)
    } 