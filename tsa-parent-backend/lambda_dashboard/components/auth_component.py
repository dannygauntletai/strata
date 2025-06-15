"""
Auth Component - Clean Architecture  
Handles all parent authentication operations with explicit functions
"""
from typing import Dict, Any
from tsa_shared import create_api_response, parse_request_body, validate_input
from services.auth_service import AuthService


class AuthComponent:
    """Clean component for parent authentication operations"""
    
    @staticmethod
    def handle_magic_link_request(event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle magic link request for parent authentication"""
        try:
            body = parse_request_body(event)
            
            # Validate input
            email = validate_input(body.get('email', ''), 'email')
            if not email:
                return create_api_response(400, {'error': 'Valid email required'})
            
            invitation_token = body.get('invitation_token')  # Optional
            
            # Use auth service to handle magic link
            result = AuthService.send_parent_magic_link(email, invitation_token)
            
            if result['success']:
                return create_api_response(200, {
                    'message': 'Magic link sent successfully',
                    'email': email,
                    'user_role': 'parent'
                })
            else:
                return create_api_response(400, {'error': result['error']})
                
        except Exception as e:
            print(f"Auth component error: {str(e)}")
            return create_api_response(500, {'error': 'Authentication request failed'})

