"""
Token Verification Handler - JWT-Based Implementation
Validates magic link tokens and issues Cognito authentication tokens
Extended to support both coaches and parents for unified TSA platform
Uses JWT validation instead of DynamoDB for stateless authentication
"""
import json
import uuid
from datetime import datetime
from typing import Dict, Any
from shared_config import get_config

# Import shared utilities
from shared_utils import (
    verify_magic_link_jwt,
    generate_cognito_tokens,
    get_coach_profile,
    get_parent_profile,
    get_admin_profile,
    create_response,
    create_error_response,
    create_health_response,
    validate_user_exists
)

# Initialize shared config
config = get_config()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle token verification requests"""
    request_id = context.aws_request_id if context else str(uuid.uuid4())[:8]
    
    try:
        http_method = event.get('httpMethod', 'POST')
        path = event.get('path', '')
        
        print(f"[{request_id}] Token verification request: {http_method} {path}")
        
        if path.endswith('/verify') and http_method == 'POST':
            return handle_verify_token(event, context, request_id)
        elif path.endswith('/health') and http_method == 'GET':
            return handle_health_check(request_id)
        else:
            return create_error_response('Endpoint not found', 404, request_id=request_id)
            
    except Exception as e:
        print(f"[{request_id}] Error in verify token handler: {str(e)}")
        return create_error_response('Internal server error', 500, request_id=request_id)


def handle_verify_token(event: Dict[str, Any], context: Any, request_id: str) -> Dict[str, Any]:
    """Verify magic link JWT token and issue authentication tokens for coaches/parents"""
    try:
        # Parse request body
        raw_body = event.get('body', '{}')
        
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError as e:
            return create_error_response('Invalid JSON in request body', 400, request_id=request_id)
        
        token = body.get('token')
        email = body.get('email', '').lower().strip()
        
        if not token or not email:
            return create_error_response('Token and email are required', 400, request_id=request_id)
        
        # Validate JWT token
        try:
            token_payload = verify_magic_link_jwt(token)
            if not token_payload['valid']:
                return create_error_response(token_payload['error'], 400, request_id=request_id)
            
            jwt_data = token_payload['payload']
            print(f"[{request_id}] JWT validation successful for {email}")
            
        except Exception as e:
            print(f"[{request_id}] JWT validation failed: {str(e)}")
            return create_error_response('Invalid or expired token', 400, request_id=request_id)
        
        # Validate email matches JWT payload
        if jwt_data.get('email', '').lower() != email:
            return create_error_response('Token email mismatch', 400, request_id=request_id)
        
        # Get user role and invitation token from JWT
        user_role = jwt_data.get('user_role', 'coach')
        invitation_token = jwt_data.get('invitation_token')
        
        # 🔐 SECURITY: Only authenticate existing users - do NOT create users here
        # User creation should only happen in magic link generation after proper authorization
        print(f"[{request_id}] Checking if user exists in Cognito: {email}")
        if not validate_user_exists(email):
            print(f"[{request_id}] User {email} does not exist in Cognito - rejecting authentication")
            return create_error_response('User not found. Please request a new magic link.', 404, request_id=request_id)
        
        print(f"[{request_id}] User {email} exists in Cognito, proceeding with authentication")
        
        # Generate Cognito tokens
        auth_result = generate_cognito_tokens(email, request_id)
        if not auth_result['success']:
            return create_error_response(auth_result['error'], 500, request_id=request_id)
        
        # Get user profile information based on role
        
        if user_role == 'parent':
            user_profile = get_parent_profile(email, invitation_token, request_id)
        elif user_role == 'admin':
            user_profile = get_admin_profile(email, request_id)
        else:
            user_profile = get_coach_profile(email, request_id)
        
        response_data = {
            'message': 'Authentication successful',
            'tokens': {
                'access_token': auth_result['access_token'],
                'id_token': auth_result['id_token'],
                'refresh_token': auth_result['refresh_token']
            },
            'token_type': 'Bearer',
            'expires_in': auth_result['expires_in'],
            'user_role': user_role,
            'user': {
                'email': email,
                'email_verified': True,
                'role': user_role,
                'invitation_token': invitation_token,
                **user_profile
            }
        }
        
        return create_response(200, response_data, request_id)
        
    except Exception as e:
        print(f"[{request_id}] ERROR in handle_verify_token: {str(e)}")
        return create_error_response('Token verification failed', 500, request_id=request_id)


def handle_health_check(request_id: str) -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        return create_health_response(
            'verify-token-handler',
            'healthy',
            {'implementation': 'jwt-based'},
            request_id
        )
        
    except Exception as e:
        return create_health_response(
            'verify-token-handler',
            'unhealthy',
            {'error': str(e)},
            request_id
        )