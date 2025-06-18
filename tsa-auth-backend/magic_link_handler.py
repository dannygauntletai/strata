# Import shared config at the top
from shared_config import get_config

# Import shared utilities
from shared_utils import (
    generate_magic_link_jwt,
    create_response,
    create_error_response,
    create_health_response,
    create_cognito_user,
    send_magic_link_email,
    validate_user_role
)

"""
Magic Link Handler - JWT-Based Implementation
Generates and sends magic link emails for passwordless authentication
Extended to support both coaches and parents for unified TSA platform
Uses JWT tokens instead of DynamoDB for stateless authentication
"""
import json
from datetime import datetime
from typing import Dict, Any

# Initialize shared config
config = get_config()

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


def handle_generate_magic_link(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Generate and send magic link email for coaches, parents, or admins"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').lower().strip()
        user_role = body.get('user_role', 'coach')  # Default to coach for backward compatibility
        invitation_token = body.get('invitation_token')  # For parent invitations
        
        if not email or '@' not in email:
            return create_error_response('Valid email address required', 400)
        
        # Validate user role - now includes admin
        if user_role not in ['coach', 'parent', 'admin']:
            return create_error_response('Invalid user role. Must be "coach", "parent", or "admin"', 400)
        
        # 🔐 SECURITY: Validate role access before proceeding
        try:
            print(f"🔍 Validating role access for {email} as {user_role}")
            
            # Use sophisticated role validator
            validation_result = validate_user_role(email, user_role, invitation_token)
            
            if not validation_result['valid']:
                # Check if coach needs onboarding
                if (user_role == 'coach' and 
                    validation_result.get('additional_data', {}).get('requires_onboarding')):
                    print(f"🔄 Redirecting {email} to onboarding")
                    return create_response(202, {
                        'message': 'Please complete your onboarding process',
                        'requires_onboarding': True,
                        'onboarding_url': validation_result['additional_data']['onboarding_url'],
                        'status': validation_result['additional_data']['status']
                    })
                
                # Access denied for other cases
                return create_error_response('Access denied', 403, {
                    'reason': validation_result['reason']
                })
            
            print(f"✅ {user_role.capitalize()} validation passed for {email}")
            
        except Exception as e:
            print(f"⚠️ Role validation error for {email}: {str(e)}")
            return create_error_response('Access denied', 403, {
                'reason': 'Role validation failed'
            })
        
        # Generate JWT magic link token
        try:
            magic_link_token = generate_magic_link_jwt(email, user_role, invitation_token)
            print(f"✅ Generated JWT magic link token for {email}")
        except Exception as e:
            print(f"Error generating magic link: {str(e)}")
            return create_error_response('Failed to generate magic link', 500)
        
        # Get environment variables from shared config
        env_vars = config.get_env_vars('auth')
        frontend_url = env_vars.get('FRONTEND_URL', 'http://localhost:3000')
        admin_frontend_url = env_vars.get('ADMIN_FRONTEND_URL', 'http://localhost:3001')
        
        # Create or check Cognito user
        user_result = create_cognito_user(email, user_role, invitation_token)
        if not user_result['success']:
            return create_error_response(user_result['error'], 500)
        
        # Generate magic link URL
        if user_role == 'admin':
            base_url = admin_frontend_url
        else:
            base_url = frontend_url
            
        magic_link = f"{base_url}/auth/verify?token={magic_link_token}&email={email}"
        
        # Send magic link email
        email_sent = send_magic_link_email(email, magic_link, user_result['user_exists'], user_role, invitation_token)
        
        if email_sent:
            return create_response(200, {
                'message': 'Magic link sent successfully',
                'email': email,
                'user_role': user_role,
                'user_exists': user_result['user_exists']
            })
        else:
            return create_error_response('Failed to send magic link email', 500)
            
    except Exception as e:
        print(f"Error in handle_generate_magic_link: {str(e)}")
        return create_error_response('Failed to generate magic link', 500)


def handle_health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        return create_health_response(
            'magic-link-handler',
            'healthy',
            {'implementation': 'jwt-based'}
        )
        
    except Exception as e:
        return create_health_response(
            'magic-link-handler',
            'unhealthy',
            {'error': str(e)}
        ) 