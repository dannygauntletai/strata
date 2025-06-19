"""
Authentication Utilities for TSA Platform
Centralized authentication, JWT handling, session management, and profile sync
"""
import boto3
import string
import random
import secrets
import json
import os
import logging
import time
import base64
from typing import Dict, Any, Optional, List
from .config import get_config

logger = logging.getLogger(__name__)

# Initialize shared config
config = get_config()


# =================================================================
# COGNITO UTILITIES
# =================================================================

def create_cognito_user(email: str, user_role: str, invitation_token: str = None) -> Dict[str, Any]:
    """Create passwordless Cognito user with role-specific attributes"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        # Check if user already exists
        try:
            cognito_client.admin_get_user(
                UserPoolId=user_pool_id,
                Username=email
            )
            return {'success': True, 'user_exists': True, 'message': 'User already exists'}
        except cognito_client.exceptions.UserNotFoundException:
            pass  # User doesn't exist, proceed with creation
        
        # Create user with role-specific attributes
        user_attributes = [
            {'Name': 'email', 'Value': email},
            {'Name': 'email_verified', 'Value': 'true'},
            {'Name': 'custom:user_role', 'Value': user_role}
        ]
        
        # Add invitation token for parents
        if user_role == 'parent' and invitation_token:
            user_attributes.append({
                'Name': 'custom:invitation_token', 
                'Value': invitation_token
            })
        
        # 1. Create user WITHOUT password
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=user_attributes,
            MessageAction='SUPPRESS'  # Don't send Cognito's default email
        )
        
        # 2. Set user as CONFIRMED with secure temporary password (passwordless system)
        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=generate_secure_password(),  # Use secure password generator that meets Cognito policy
            Permanent=True
        )
        
        return {
            'success': True, 
            'user_exists': False, 
            'message': f'Created passwordless Cognito user for {email}'
        }
        
    except Exception as e:
        logger.error(f"Error creating Cognito user: {str(e)}")
        return {
            'success': False,
            'error': f'Failed to create user: {str(e)}'
        }


def generate_cognito_tokens(email: str, request_id: str = None) -> Dict[str, Any]:
    """Generate Cognito authentication tokens"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        client_id = env_vars.get('CLIENT_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        # Set a temporary password for the user
        temp_password = generate_secure_password()
        
        try:
            # Set user password
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=email,
                Password=temp_password,
                Permanent=True
            )
            
            # Authenticate user to get tokens
            auth_response = cognito_client.admin_initiate_auth(
                UserPoolId=user_pool_id,
                ClientId=client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': temp_password
                }
            )
            
            tokens = auth_response['AuthenticationResult']
            
            return {
                'success': True,
                'access_token': tokens['AccessToken'],
                'id_token': tokens['IdToken'],
                'refresh_token': tokens['RefreshToken'],
                'expires_in': tokens['ExpiresIn']
            }
            
        except Exception as e:
            if request_id:
                logger.error(f"[{request_id}] Error in Cognito authentication: {str(e)}")
            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
            
    except Exception as e:
        if request_id:
            logger.error(f"[{request_id}] Error generating Cognito tokens: {str(e)}")
        return {
            'success': False,
            'error': f'Token generation failed: {str(e)}'
        }


def get_cognito_user_attributes(email: str) -> Dict[str, Any]:
    """Get user attributes from Cognito"""
    try:
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        
        # Convert attributes to dict
        attributes = {}
        for attr in response.get('UserAttributes', []):
            attributes[attr['Name']] = attr['Value']
        
        return {
            'success': True,
            'attributes': attributes,
            'user_status': response.get('UserStatus'),
            'user_create_date': response.get('UserCreateDate'),
            'user_last_modified_date': response.get('UserLastModifiedDate')
        }
        
    except cognito_client.exceptions.UserNotFoundException:
        return {'success': False, 'error': 'User not found'}
    except Exception as e:
        logger.error(f"Error getting Cognito user attributes: {str(e)}")
        return {'success': False, 'error': str(e)}


def validate_user_exists(email: str) -> bool:
    """Check if user exists in Cognito"""
    try:
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        return True
    except cognito_client.exceptions.UserNotFoundException:
        return False
    except Exception as e:
        logger.error(f"Error validating user existence: {str(e)}")
        return False


# =================================================================
# JWT TOKEN UTILITIES  
# =================================================================

def extract_user_from_auth_token(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user email from JWT Authorization header with session restoration fallback
    
    Flow:
    1. Try to extract from JWT token in Authorization header
    2. If no token, try to restore from server-side session
    3. Include profile sync hardening as final fallback
    
    Args:
        event: Lambda event containing headers
        
    Returns:
        User email if authentication successful, None otherwise
    """
    try:
        # Step 1: Try JWT token extraction first
        headers = event.get('headers', {})
        auth_header = None
        for header_name, header_value in headers.items():
            if header_name.lower() == 'authorization':
                auth_header = header_value
                break
        
        if auth_header and auth_header.startswith('Bearer '):
            # Extract JWT token
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            email = extract_email_from_jwt(token)
            if email:
                logger.info(f"✅ JWT authentication successful for {email}")
                return email
            else:
                logger.info("⚠️ JWT token invalid or expired")
        else:
            logger.info("⚠️ No valid Authorization header found")
        
        # Step 2: Try session restoration fallback
        session_id = extract_session_id_from_event(event)
        if session_id:
            email = restore_from_server_session(session_id)
            if email:
                logger.info(f"✅ Session restoration successful for {email}")
                return email
        
        # Step 3: No authentication method succeeded
        logger.info("❌ No valid authentication found (JWT or session)")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error in authentication: {str(e)}")
        return None


def extract_email_from_jwt(token: str) -> Optional[str]:
    """Extract email from JWT token payload"""
    try:
        # Split token into parts
        token_parts = token.split('.')
        if len(token_parts) != 3:
            return None
        
        # Decode payload (second part)
        payload_b64 = token_parts[1]
        # Add padding if necessary
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload = json.loads(base64.b64decode(payload_b64))
        
        # Check token expiration
        current_time = int(time.time())
        if payload.get('exp', 0) <= current_time:
            logger.info("JWT token is expired")
            return None
        
        # Extract email from token payload
        email = payload.get('email') or payload.get('username')
        if email:
            return email.lower().strip()
        
        return None
        
    except Exception as e:
        logger.warning(f"Error extracting email from JWT: {str(e)}")
        return None


# =================================================================
# JWT UTILITIES
# =================================================================

def get_jwt_secret() -> str:
    """Get JWT signing secret from AWS Secrets Manager"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        secret_arn = env_vars.get('JWT_SECRET_ARN')
        
        if not secret_arn:
            logger.info("JWT_SECRET_ARN not found in environment, using SendGrid secret ARN")
            secret_arn = env_vars.get('SENDGRID_SECRET_ARN')
        
        if not secret_arn:
            raise Exception("No secret ARN available for JWT signing")
        
        # Retrieve secret from AWS Secrets Manager
        secrets_client = boto3.client('secretsmanager')
        secret_response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret_data = json.loads(secret_response['SecretString'])
        
        # Try to get JWT secret, fallback to SendGrid key for now
        jwt_secret = secret_data.get('jwt_secret') or secret_data.get('api_key')
        
        if not jwt_secret:
            raise Exception("JWT secret not found in AWS Secrets Manager")
        
        return jwt_secret
        
    except Exception as e:
        logger.error(f"Error retrieving JWT secret: {str(e)}")
        raise


def get_sendgrid_api_key() -> str:
    """Get SendGrid API key from AWS Secrets Manager"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        secret_arn = env_vars.get('SENDGRID_SECRET_ARN')
        
        if not secret_arn:
            raise Exception("SENDGRID_SECRET_ARN environment variable not found")
        
        # Retrieve secret from AWS Secrets Manager
        secrets_client = boto3.client('secretsmanager')
        secret_response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret_data = json.loads(secret_response['SecretString'])
        
        # Get SendGrid API key
        api_key = secret_data.get('api_key')
        
        if not api_key:
            raise Exception("SendGrid API key not found in AWS Secrets Manager")
        
        return api_key
        
    except Exception as e:
        logger.error(f"Error retrieving SendGrid API key: {str(e)}")
        raise


def generate_magic_link_jwt(email: str, user_role: str, invitation_token: str = None, 
                           expires_minutes: int = 15) -> str:
    """Generate JWT token for magic link authentication"""
    try:
        import jwt
        import uuid
        from datetime import datetime, timedelta
        
        # Get JWT secret from AWS Secrets Manager
        jwt_secret = get_jwt_secret()
        
        # Create JWT payload
        now = datetime.utcnow()
        payload = {
            'email': email,
            'user_role': user_role,
            'invitation_token': invitation_token,
            'iat': now,
            'exp': now + timedelta(minutes=expires_minutes),
            'aud': 'tsa-auth',
            'iss': 'tsa-magic-link-handler',
            'purpose': 'magic_link',
            'jti': str(uuid.uuid4())  # Unique token ID
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        # Generate JWT
        token = jwt.encode(payload, jwt_secret, algorithm='HS256')
        
        return token
        
    except Exception as e:
        logger.error(f"Error generating JWT: {str(e)}")
        raise


def verify_magic_link_jwt(token: str) -> Dict[str, Any]:
    """Verify JWT magic link token"""
    try:
        import jwt
        
        # Get JWT secret
        jwt_secret = get_jwt_secret()
        
        # Decode and validate JWT
        payload = jwt.decode(
            token, 
            jwt_secret, 
            algorithms=['HS256'],
            audience='tsa-auth'
        )
        
        # Additional validation
        if payload.get('purpose') != 'magic_link':
            return {'valid': False, 'error': 'Invalid token purpose'}
        
        return {'valid': True, 'payload': payload}
        
    except Exception as e:
        # Handle specific JWT exceptions
        error_type = type(e).__name__
        if 'ExpiredSignature' in error_type:
            return {'valid': False, 'error': 'Token has expired'}
        elif 'InvalidToken' in error_type:
            return {'valid': False, 'error': f'Invalid token: {str(e)}'}
        else:
            return {'valid': False, 'error': f'Token validation failed: {str(e)}'}


def extract_jwt_payload(token: str) -> Optional[Dict[str, Any]]:
    """Extract payload from JWT without verification (for debugging)"""
    try:
        import jwt
        
        # Decode without verification for debugging purposes
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        logger.warning(f"Error extracting JWT payload: {str(e)}")
        return None


# =================================================================
# SESSION MANAGEMENT
# =================================================================

def extract_session_id_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract session ID from various sources in the event
    
    Sources (in order of preference):
    1. X-Session-ID header
    2. sessionId query parameter  
    3. session_id in body
    4. Cookies
    """
    try:
        headers = event.get('headers', {})
        
        # Check X-Session-ID header
        for header_name, header_value in headers.items():
            if header_name.lower() == 'x-session-id':
                return header_value
        
        # Check query parameters
        query_params = event.get('queryStringParameters') or {}
        if query_params.get('sessionId'):
            return query_params['sessionId']
        
        # Check body (for POST requests)
        body = event.get('body')
        if body:
            try:
                body_data = json.loads(body) if isinstance(body, str) else body
                if body_data.get('session_id'):
                    return body_data['session_id']
            except:
                pass
        
        # Check cookies
        cookie_header = headers.get('cookie') or headers.get('Cookie')
        if cookie_header:
            session_id = extract_session_from_cookies(cookie_header)
            if session_id:
                return session_id
        
        return None
        
    except Exception as e:
        logger.warning(f"Error extracting session ID: {str(e)}")
        return None


def extract_session_from_cookies(cookie_header: str) -> Optional[str]:
    """Extract session ID from cookie header"""
    try:
        cookies = {}
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                key, value = cookie.strip().split('=', 1)
                cookies[key] = value
        
        return cookies.get('tsa_session_id') or cookies.get('sessionId')
        
    except Exception as e:
        logger.warning(f"Error parsing cookies: {str(e)}")
        return None


def restore_from_server_session(session_id: str) -> Optional[str]:
    """
    Restore user authentication from server-side session
    
    Args:
        session_id: The session identifier
        
    Returns:
        User email if session is valid, None otherwise
    """
    try:
        # Get stage from environment
        stage = os.environ.get('STAGE', 'dev')
        table_name = config.get_table_name('user-sessions', stage)
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Retrieve session from DynamoDB
        response = table.get_item(Key={'session_id': session_id})
        
        if 'Item' not in response:
            logger.info(f"No valid session found for ID: {session_id}")
            return None
        
        session = response['Item']
        user_email = session.get('user_email')
        
        if not user_email:
            logger.warning(f"Session {session_id} missing user_email")
            return None
        
        # Check if session is expired
        expires_at = session.get('expires_at')
        if expires_at and int(time.time()) > int(expires_at):
            logger.info(f"Session {session_id} has expired")
            return None
        
        return user_email
        
    except Exception as e:
        logger.error(f"Error restoring session: {str(e)}")
        return None


def create_auth_session(user_email: str, user_role: str, auth_tokens: Dict[str, str], 
                       metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Create server-side authentication session
    
    Args:
        user_email: User's email address
        user_role: User's role (coach, parent, admin)
        auth_tokens: JWT tokens from Cognito
        metadata: Additional session metadata
        
    Returns:
        Session ID if successful, None otherwise
    """
    try:
        stage = os.environ.get('STAGE', 'dev')
        table_name = config.get_table_name('user-sessions', stage)
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Generate secure session ID
        session_id = secrets.token_urlsafe(32)
        
        # Session expires in 24 hours
        expires_at = int(time.time()) + (24 * 60 * 60)
        
        session_data = {
            'session_id': session_id,
            'user_email': user_email,
            'user_role': user_role,
            'auth_tokens': auth_tokens,
            'created_at': int(time.time()),
            'expires_at': expires_at,
            'last_activity': int(time.time()),
            'metadata': metadata or {}
        }
        
        table.put_item(Item=session_data)
        
        logger.info(f"Created session {session_id} for {user_email}")
        return session_id
        
    except Exception as e:
        logger.error(f"Error creating auth session: {str(e)}")
        return None


def invalidate_auth_sessions(user_email: str) -> int:
    """
    Invalidate all sessions for a user
    
    Args:
        user_email: User's email address
        
    Returns:
        Number of sessions invalidated
    """
    try:
        stage = os.environ.get('STAGE', 'dev')
        table_name = config.get_table_name('user-sessions', stage)
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Scan for user sessions (in production, consider GSI)
        response = table.scan(
            FilterExpression='user_email = :email',
            ExpressionAttributeValues={':email': user_email}
        )
        
        invalidated_count = 0
        for item in response.get('Items', []):
            table.delete_item(Key={'session_id': item['session_id']})
            invalidated_count += 1
        
        logger.info(f"Invalidated {invalidated_count} sessions for {user_email}")
        return invalidated_count
        
    except Exception as e:
        logger.error(f"Error invalidating sessions: {str(e)}")
        return 0


# =================================================================
# UTILITY FUNCTIONS
# =================================================================

def generate_secure_password() -> str:
    """Generate a secure temporary password for Cognito"""
    # Generate a password that meets Cognito requirements
    # At least 8 characters with uppercase, lowercase, number, and symbol
    
    # Ensure at least one of each required character type
    chars = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase), 
        random.choice(string.digits),
        random.choice('!@#$%^&*')
    ]
    
    # Fill the rest with random characters
    all_chars = string.ascii_letters + string.digits + '!@#$%^&*'
    chars.extend(random.choice(all_chars) for _ in range(28))  # Total 32 chars
    
    # Shuffle and join
    random.shuffle(chars)
    return ''.join(chars)


def create_lambda_response(status_code: int, body: Dict[str, Any], 
                          headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Create standardized Lambda response"""
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID'
    }
    
    if headers:
        default_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body)
    }


def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Optional[str]:
    """Validate that required fields are present in data"""
    missing_fields = []
    for field in required_fields:
        if field not in data or not data[field]:
            missing_fields.append(field)
    
    if missing_fields:
        return f"Missing required fields: {', '.join(missing_fields)}"
    
    return None 