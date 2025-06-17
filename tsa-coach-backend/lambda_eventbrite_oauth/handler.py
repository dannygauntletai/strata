"""
Eventbrite OAuth Lambda Handler
Handles OAuth flow for connecting coach Eventbrite accounts
"""
import json
import os
import boto3
from typing import Dict, Any, Optional
import logging
from datetime import datetime, timezone, timedelta
import uuid
import urllib.parse

# Import shared utilities
import sys
sys.path.append('/opt/python')
from tsa_shared.database import get_dynamodb_table, get_table_name, get_current_timestamp
from shared_utils.dynamodb_models import EventbriteConfig, EventbriteOAuthStatus
from lambda_events.eventbrite_client import EventbriteClient, EventbriteAPIError, EventbriteCredentials
from lambda_events.secrets_utils import get_eventbrite_client_credentials

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Environment variables
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

def get_api_base_url(context=None):
    """Get the API Gateway base URL dynamically"""
    # Try environment variable first
    if 'API_BASE_URL' in os.environ:
        return os.environ['API_BASE_URL']
    
    # Construct from Lambda context and environment
    stage = os.environ.get('STAGE', 'dev')
    region = os.environ.get('AWS_REGION', 'us-east-2')
    
    # If we have context, we can get the account ID from it
    if context and hasattr(context, 'invoked_function_arn'):
        # Extract account ID from Lambda function ARN: arn:aws:lambda:region:account:function:name
        account_id = context.invoked_function_arn.split(':')[4]
    else:
        # Fallback to current account (this should work in Lambda environment)
        account_id = "164722634547"  # Your account ID
    
    # The API Gateway ID pattern for coach service
    # This is less reliable but works as a fallback
    return f"https://h6wgy6f3r4.execute-api.{region}.amazonaws.com/{stage}"

# Cache for Eventbrite credentials (retrieved once per Lambda instance)
_eventbrite_credentials = None

def get_cached_eventbrite_credentials():
    """Get Eventbrite credentials with caching for Lambda efficiency"""
    global _eventbrite_credentials
    if _eventbrite_credentials is None:
        _eventbrite_credentials = get_eventbrite_client_credentials()
    return _eventbrite_credentials


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for Eventbrite OAuth operations"""
    try:
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        print(f"🎫 Eventbrite OAuth: {http_method} {path}")
        
        if '/status' in path and http_method == 'GET':
            return get_oauth_status(event)
        elif '/authorize' in path and http_method == 'GET':
            return initiate_oauth(event)
        elif '/callback' in path and http_method == 'GET':
            return handle_oauth_callback(event)
        elif '/disconnect' in path and http_method == 'POST':
            return disconnect_oauth(event)
        elif '/health' in path and http_method == 'GET':
            return create_cors_response(200, {'status': 'healthy', 'service': 'eventbrite-oauth'})
        else:
            return create_cors_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"💥 Handler Error: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def create_cors_response(status_code: int, body: dict) -> dict:
    """Create standardized response with proper CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


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


def get_oauth_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get Eventbrite OAuth status for authenticated coach"""
    try:
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Fetching Eventbrite OAuth status for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
        # Get coach profile and check OAuth status
        response = profiles_table.get_item(Key={'profile_id': normalized_coach_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Verify the profile belongs to the authenticated user (security check)
        if profile.get('email', '').lower() != authenticated_email:
            print(f"🚨 Security violation: Authenticated user {authenticated_email} tried to access profile {profile.get('email')}")
            return create_cors_response(403, {'error': 'Access denied'})
        
        eventbrite_config = profile.get('eventbrite_config', {})
        
        oauth_status = {
            'connected': bool(eventbrite_config.get('access_token')),
            'organization_id': eventbrite_config.get('organization_id'),
            'account_email': eventbrite_config.get('account_email'),
            'connected_at': eventbrite_config.get('connected_at'),
            'scopes': eventbrite_config.get('scopes', [])
        }
        
        return create_cors_response(200, {
            'oauth_status': oauth_status,
            'coach_id': normalized_coach_id
        })
        
        except Exception as e:
        print(f"💥 Error getting OAuth status: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def initiate_oauth(event: Dict[str, Any]) -> Dict[str, Any]:
    """Initiate Eventbrite OAuth flow for authenticated coach"""
    try:
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Initiating Eventbrite OAuth for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
        # Generate OAuth state parameter for security
        import secrets
        state = secrets.token_urlsafe(32)
        
        # Store state in coach profile for verification
        profiles_table.update_item(
            Key={'profile_id': normalized_coach_id},
            UpdateExpression='SET oauth_state = :state, oauth_state_expires = :expires',
            ExpressionAttributeValues={
                ':state': state,
                ':expires': int((datetime.utcnow() + timedelta(minutes=10)).timestamp())
            }
        )
        
        # Build OAuth authorization URL
        client_id = os.environ.get('EVENTBRITE_CLIENT_ID')
        redirect_uri = os.environ.get('EVENTBRITE_REDIRECT_URI')
        
        if not client_id or not redirect_uri:
            return create_cors_response(500, {'error': 'Eventbrite OAuth not configured'})
        
        auth_url = (
            f"https://www.eventbrite.com/oauth/authorize"
            f"?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
            f"&scope=event_read%20event_write%20organization_read"
        )
        
        return create_cors_response(200, {
            'authorization_url': auth_url,
            'state': state,
            'coach_id': normalized_coach_id
        })
        
    except Exception as e:
        print(f"💥 Error initiating OAuth: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def disconnect_oauth(event: Dict[str, Any]) -> Dict[str, Any]:
    """Disconnect Eventbrite OAuth for authenticated coach"""
    try:
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Disconnecting Eventbrite OAuth for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
        # Clear Eventbrite configuration from profile
        profiles_table.update_item(
            Key={'profile_id': normalized_coach_id},
            UpdateExpression='REMOVE eventbrite_config, oauth_state, oauth_state_expires',
            ReturnValues='UPDATED_NEW'
        )
        
        return create_cors_response(200, {
            'message': 'Eventbrite OAuth disconnected successfully',
            'coach_id': normalized_coach_id
        })
        
    except Exception as e:
        print(f"💥 Error disconnecting OAuth: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_oauth_callback(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle OAuth callback - exchange code for token"""
    try:
        query_params = event.get('queryStringParameters') or {}
        code = query_params.get('code')
        state = query_params.get('state')
        error = query_params.get('error')
        
        if error:
            logger.error(f"OAuth error: {error}")
            return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_error={error}")
        
        if not code or not state:
            return create_cors_response(400, {'error': 'Missing code or state parameter'})
        
        # Verify and decode state
        coach_id = verify_oauth_state(state)
        if not coach_id:
            return create_cors_response(400, {'error': 'Invalid state parameter'})
        
        # Get Eventbrite credentials
        try:
            credentials = get_cached_eventbrite_credentials()
            client_id = credentials.get('client_id')
            client_secret = credentials.get('client_secret')
            
            if not client_id or not client_secret:
                return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_error=config_error")
        except Exception as e:
            logger.error(f"Error getting Eventbrite credentials: {str(e)}")
            return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_error=config_error")
        
        # Exchange code for token
        redirect_uri = f"{get_api_base_url(context)}/eventbrite/oauth/callback"
        
        token_data = EventbriteClient.exchange_code_for_token(
            client_id=client_id,
            client_secret=client_secret,
            code=code,
            redirect_uri=redirect_uri
        )
        
        # Get user info from Eventbrite
        credentials = EventbriteCredentials(access_token=token_data['access_token'])
        eventbrite_client = EventbriteClient(credentials)
        
        user_info = eventbrite_client.get_user_info()
        organizations = eventbrite_client.get_organizations()
        
        # Calculate token expiration
        expires_in = token_data.get('expires_in', 3600)  # Default 1 hour
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Save configuration to DynamoDB
        config_table = get_dynamodb_table(get_table_name('eventbrite-config'))
        
        config = EventbriteConfig(
            coach_id=coach_id,
            oauth_status=EventbriteOAuthStatus.CONNECTED,
            access_token=encrypt_token(token_data['access_token']),
            refresh_token=encrypt_token(token_data.get('refresh_token')) if token_data.get('refresh_token') else None,
            token_expires_at=expires_at.isoformat(),
            eventbrite_user_id=user_info['id'],
            eventbrite_organization_id=organizations[0]['id'] if organizations else None,
            organization_name=organizations[0]['name'] if organizations else None,
            updated_at=get_current_timestamp()
        )
        
        config_table.put_item(Item=config.dict())
        
        logger.info(f"Successfully connected Eventbrite account for coach {coach_id}")
        
        # Redirect to success page
        return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_connected=true")
        
    except EventbriteAPIError as e:
        logger.error(f"Eventbrite API error during OAuth: {str(e)}")
        return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_error=api_error")
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {str(e)}")
        return create_redirect_response(f"{FRONTEND_URL}/coach/settings?eventbrite_error=server_error")


def generate_oauth_state(coach_id: str) -> str:
    """Generate secure state parameter for OAuth"""
    # Simple state generation - in production, consider more robust approach
    timestamp = str(int(datetime.now().timestamp()))
    unique_id = str(uuid.uuid4())[:8]
    
    # Base64 encode the state data
    import base64
    state_data = f"{coach_id}:{timestamp}:{unique_id}"
    return base64.b64encode(state_data.encode()).decode()


def verify_oauth_state(state: str) -> str:
    """Verify and extract coach_id from state parameter"""
    try:
        import base64
        state_data = base64.b64decode(state.encode()).decode()
        parts = state_data.split(':')
        
        if len(parts) != 3:
            return None
        
        coach_id, timestamp, unique_id = parts
        
        # Check if state is too old (older than 1 hour)
        state_time = datetime.fromtimestamp(int(timestamp))
        if datetime.now() - state_time > timedelta(hours=1):
            return None
        
        return coach_id
        
    except Exception as e:
        logger.error(f"Error verifying state: {str(e)}")
        return None


def encrypt_token(token: str) -> str:
    """Encrypt token for storage (placeholder implementation)"""
    # TODO: Implement proper encryption using AWS KMS
    # For now, just store the token as-is (not recommended for production)
    return token


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt token from storage (placeholder implementation)"""
    # TODO: Implement proper decryption using AWS KMS
    # For now, just return the token as-is (not recommended for production)
    return encrypted_token


def create_redirect_response(url: str) -> Dict[str, Any]:
    """Create HTTP redirect response"""
    return {
        "statusCode": 302,
        "headers": {
            "Location": url,
            "Access-Control-Allow-Origin": "*"
        },
        "body": ""
    } 