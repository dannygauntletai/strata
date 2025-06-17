"""
Eventbrite OAuth Lambda Handler
Handles OAuth flow for connecting coach Eventbrite accounts
"""
import json
import os
import boto3
from typing import Dict, Any
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
    """Main Lambda handler for Eventbrite OAuth"""
    try:
        logger.info("Eventbrite OAuth handler called")
        
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        if '/oauth/authorize' in path and http_method == 'GET':
            return handle_oauth_start(event, context)
        elif '/oauth/callback' in path and http_method == 'GET':
            return handle_oauth_callback(event, context)
        elif '/oauth/status' in path and http_method == 'GET':
            return handle_oauth_status(event)
        elif '/oauth/disconnect' in path and http_method == 'POST':
            return handle_oauth_disconnect(event)
        elif '/oauth/refresh' in path and http_method == 'POST':
            return handle_oauth_refresh(event)
        else:
            return create_cors_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in Eventbrite OAuth handler: {str(e)}")
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


def handle_oauth_start(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Start OAuth flow - generate authorization URL"""
    try:
        # Get coach_id from query parameters
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_cors_response(400, {'error': 'coach_id is required'})
        
        # Get Eventbrite credentials from Secrets Manager
        try:
            credentials = get_cached_eventbrite_credentials()
            client_id = credentials.get('client_id')
            
            if not client_id:
                return create_cors_response(500, {'error': 'Eventbrite client_id not found in credentials'})
        except Exception as e:
            logger.error(f"Error getting Eventbrite credentials: {str(e)}")
            return create_cors_response(500, {'error': 'Eventbrite OAuth not configured'})
        
        # Generate state parameter for security
        state = generate_oauth_state(coach_id)
        
        # Build redirect URI - should point to our backend API, not frontend
        # The callback will be handled by this same Lambda function via API Gateway
        redirect_uri = f"{get_api_base_url(context)}/eventbrite/oauth/callback"
        
        # Generate OAuth URL
        oauth_url = EventbriteClient.get_oauth_url(
            client_id=client_id,
            redirect_uri=redirect_uri,
            state=state
        )
        
        logger.info(f"Generated OAuth URL for coach {coach_id}: {oauth_url}")
        logger.info(f"Redirect URI used: {redirect_uri}")
        logger.info(f"Client ID used: {client_id}")
        
        return create_cors_response(200, {
            'authorization_url': oauth_url,
            'state': state
        })
        
    except Exception as e:
        logger.error(f"Error starting OAuth flow: {str(e)}")
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


def handle_oauth_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get OAuth connection status for a coach"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_cors_response(400, {'error': 'coach_id is required'})
        
        config_table = get_dynamodb_table(get_table_name('eventbrite-config'))
        
        try:
            response = config_table.get_item(Key={'coach_id': coach_id})
            if 'Item' not in response:
                return create_cors_response(200, {
                    'connected': False,
                    'status': 'not_connected'
                })
            
            config = EventbriteConfig(**response['Item'])
            
            # Check if token is expired
            is_expired = False
            if config.token_expires_at:
                expires_at = datetime.fromisoformat(config.token_expires_at)
                is_expired = datetime.now(timezone.utc) >= expires_at
            
            return create_cors_response(200, {
                'connected': config.oauth_status == EventbriteOAuthStatus.CONNECTED and not is_expired,
                'status': config.oauth_status,
                'organization_name': config.organization_name,
                'expires_at': config.token_expires_at,
                'is_expired': is_expired,
                'last_sync': config.last_sync
            })
            
        except Exception as e:
            logger.error(f"Error getting OAuth status: {str(e)}")
            return create_cors_response(200, {
                'connected': False,
                'status': 'error',
                'error': str(e)
            })
        
    except Exception as e:
        logger.error(f"Error in OAuth status handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_oauth_disconnect(event: Dict[str, Any]) -> Dict[str, Any]:
    """Disconnect Eventbrite account"""
    try:
        # Parse request body safely
        body = event.get('body')
        if body is None:
            return create_cors_response(400, {'error': 'Request body is required'})
        
        try:
            body = json.loads(body) if isinstance(body, str) else body
        except json.JSONDecodeError:
            return create_cors_response(400, {'error': 'Invalid JSON in request body'})
        coach_id = body.get('coach_id')
        
        if not coach_id:
            return create_cors_response(400, {'error': 'coach_id is required'})
        
        config_table = get_dynamodb_table(get_table_name('eventbrite-config'))
        
        # Update config to disconnected state
        config_table.update_item(
            Key={'coach_id': coach_id},
            UpdateExpression='SET oauth_status = :status, access_token = :null, refresh_token = :null, updated_at = :now',
            ExpressionAttributeValues={
                ':status': EventbriteOAuthStatus.NOT_CONNECTED,
                ':null': None,
                ':now': get_current_timestamp()
            }
        )
        
        logger.info(f"Disconnected Eventbrite account for coach {coach_id}")
        
        return create_cors_response(200, {
            'message': 'Eventbrite account disconnected successfully'
        })
        
    except Exception as e:
        logger.error(f"Error disconnecting OAuth: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_oauth_refresh(event: Dict[str, Any]) -> Dict[str, Any]:
    """Refresh OAuth token"""
    try:
        # Parse request body safely
        body = event.get('body')
        if body is None:
            return create_cors_response(400, {'error': 'Request body is required'})
        
        try:
            body = json.loads(body) if isinstance(body, str) else body
        except json.JSONDecodeError:
            return create_cors_response(400, {'error': 'Invalid JSON in request body'})
        coach_id = body.get('coach_id')
        
        if not coach_id:
            return create_cors_response(400, {'error': 'coach_id is required'})
        
        # TODO: Implement token refresh logic
        # Eventbrite doesn't typically use refresh tokens in the same way as other OAuth providers
        # We would need to re-authorize if the token expires
        
        return create_cors_response(501, {'error': 'Token refresh not implemented - please re-authorize'})
        
    except Exception as e:
        logger.error(f"Error refreshing OAuth token: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


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