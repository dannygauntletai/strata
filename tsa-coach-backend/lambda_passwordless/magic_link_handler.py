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
from typing import Dict, Any


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
    """Generate and send magic link email for coaches or parents"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').lower().strip()
        user_role = body.get('user_role', 'coach')  # Default to coach for backward compatibility
        invitation_token = body.get('invitation_token')  # For parent invitations
        
        if not email or '@' not in email:
            return create_response(400, {'error': 'Valid email address required'})
        
        # Validate user role
        if user_role not in ['coach', 'parent']:
            return create_response(400, {'error': 'Invalid user role. Must be "coach" or "parent"'})
        
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
        
        # Generate magic link URL with unified verification endpoint
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        # Use unified verification route for both coaches and parents
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


def send_magic_link_email(email: str, magic_link: str, user_exists: bool, user_role: str, invitation_token: str = None) -> bool:
    """Send role-specific magic link email using SES"""
    try:
        ses_client = boto3.client('ses')
        from_email = os.environ.get('FROM_EMAIL', 'no-reply@texassportsacademy.com')
        
        # Role-specific email content
        if user_role == 'parent':
            if invitation_token:
                subject = "Complete Your Child's Enrollment at Texas Sports Academy"
                greeting = "Welcome to the Texas Sports Academy family!"
                action_text = "continue your child's enrollment process"
                portal_name = "Admissions Portal"
                additional_info = """
                <p>Your coach has invited your child to join TSA. Click the link below to:</p>
                <ul>
                    <li>Review program details</li>
                    <li>Complete enrollment forms</li>
                    <li>Schedule consultation and shadow day</li>
                    <li>Submit required documents</li>
                </ul>
                """
            else:
                subject = "Access Your TSA Parent Portal"
                greeting = "Welcome back!"
                action_text = "access your TSA Parent Portal"
                portal_name = "Parent Portal"
                additional_info = "<p>Access your child's enrollment status, documents, and communications.</p>"
        else:
            # Coach email content (existing)
            if user_exists:
                subject = "Sign in to your TSA Coach Portal"
                greeting = "Welcome back!"
                action_text = "sign in to"
                portal_name = "Coach Portal"
                additional_info = ""
            else:
                subject = "Complete your TSA Coach Portal registration"
                greeting = "Welcome to Texas Sports Academy!"
                action_text = "complete your registration for"
                portal_name = "Coach Portal"
                additional_info = ""
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
            <style>
                .container {{ max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }}
                .header {{ background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .button {{ 
                    display: inline-block; 
                    background-color: #dc2626; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .footer {{ padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }}
                .security-notice {{ 
                    background-color: #fef3c7; 
                    border: 1px solid #f59e0b; 
                    padding: 15px; 
                    border-radius: 6px; 
                    margin: 20px 0;
                }}
                .tsa-info {{ 
                    background-color: #dbeafe; 
                    border: 1px solid #3b82f6; 
                    padding: 15px; 
                    border-radius: 6px; 
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Texas Sports Academy</h1>
                    <p>{portal_name}</p>
                </div>
                
                <div class="content">
                    <h2>{greeting}</h2>
                    {additional_info}
                    <p>Click the button below to {action_text} your TSA {portal_name}:</p>
                    
                    <div style="text-align: center;">
                        <a href="{magic_link}" class="button">Access {portal_name}</a>
                    </div>
                    
                    <div class="security-notice">
                        <strong>🔒 Security Notice:</strong>
                        <ul>
                            <li>This link expires in 15 minutes</li>
                            <li>Can only be used once</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #3b82f6;">{magic_link}</p>
                    
                    {f'''
                    <div class="tsa-info">
                        <strong>Questions about enrollment?</strong><br>
                        Contact us at <a href="mailto:admissions@texassportsacademy.com">admissions@texassportsacademy.com</a><br>
                        or call (512) 555-0123
                    </div>
                    ''' if user_role == 'parent' else ''}
                </div>
                
                <div class="footer">
                    <p>This email was sent to {email}</p>
                    <p>Texas Sports Academy {portal_name}</p>
                    <p>If you have questions, contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
        {greeting}
        
        Click this link to {action_text} your TSA {portal_name}:
        {magic_link}
        
        SECURITY NOTICE:
        - This link expires in 15 minutes
        - Can only be used once  
        - If you didn't request this, please ignore this email
        
        This email was sent to {email}
        Texas Sports Academy {portal_name}
        """
        
        response = ses_client.send_email(
            Source=from_email,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': html_body},
                    'Text': {'Data': text_body}
                }
            }
        )
        
        print(f"Magic link email sent to {email} ({user_role}). Message ID: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"Error sending magic link email to {email}: {str(e)}")
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