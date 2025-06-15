"""
Profile Component - Clean Architecture
Handles all parent profile operations with explicit functions
"""
from typing import Dict, Any, Optional
from tsa_shared import create_api_response, parse_request_body, get_table, UserIdentifier
from services.profile_service import ProfileService


class ProfileComponent:
    """Clean component for parent profile operations"""
    
    @staticmethod
    def handle_request(event: Dict[str, Any], method: str) -> Dict[str, Any]:
        """Route profile requests to appropriate functions"""
        try:
            if method == 'GET':
                return ProfileComponent.get_profile(event)
            elif method == 'PUT':
                return ProfileComponent.update_profile(event)
            else:
                return create_api_response(405, {'error': 'Method not allowed'})
                
        except Exception as e:
            print(f"Profile component error: {str(e)}")
            return create_api_response(500, {'error': 'Profile operation failed'})
    
    @staticmethod
    def get_profile(event: Dict[str, Any]) -> Dict[str, Any]:
        """Get complete parent profile"""
        user_email = UserIdentifier.extract_user_email(event)
        if not user_email:
            return create_api_response(401, {'error': 'Authentication required'})
        
        profile = ProfileService.get_parent_profile(user_email)
        if not profile:
            return create_api_response(404, {'error': 'Profile not found'})
        
        return create_api_response(200, profile)
    
    @staticmethod
    def get_profile_summary(user_email: str) -> Dict[str, Any]:
        """Get profile summary for dashboard composition"""
        try:
            profile = ProfileService.get_parent_profile(user_email)
            return {
                'email': user_email,
                'first_name': profile.get('first_name', ''),
                'last_name': profile.get('last_name', ''),
                'profile_id': profile.get('profile_id', ''),
                'phone_number': profile.get('phone_number', ''),
                'is_complete': ProfileService.is_profile_complete(profile)
            }
        except Exception as e:
            print(f"Profile summary error: {str(e)}")
            return {'email': user_email, 'error': 'Failed to load profile'}
    
    @staticmethod  
    def update_profile(event: Dict[str, Any]) -> Dict[str, Any]:
        """Update parent profile with validation"""
        user_email = UserIdentifier.extract_user_email(event)
        if not user_email:
            return create_api_response(401, {'error': 'Authentication required'})
        
        body = parse_request_body(event)
        updated_profile = ProfileService.update_parent_profile(user_email, body)
        
        if not updated_profile:
            return create_api_response(400, {'error': 'Update failed'})
        
        return create_api_response(200, updated_profile) 