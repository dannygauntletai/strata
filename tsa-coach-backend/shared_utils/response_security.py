"""
Response Security Module - Options 1 & 4 Implementation
Provides client-safe response transformations and endpoint-specific filtering
Ensures sensitive data never leaves the system boundary
"""
from typing import Dict, Any, List, Optional, Callable
import hashlib


class ResponseSecurityTransformer:
    """Handles secure response transformations for all API endpoints"""
    
    def __init__(self):
        self.endpoint_configurations = self._initialize_endpoint_configs()
        self.role_permissions = self._initialize_role_permissions()
    
    def _initialize_endpoint_configs(self) -> Dict[str, Dict[str, Any]]:
        """Define endpoint-specific response transformations"""
        return {
            'enrollment_creation': {
                'allowed_fields': [
                    'enrollment_id', 'status', 'current_step', 'progress_percentage',
                    'next_step_name', 'school_name', 'coach_name', 'created_at'
                ],
                'computed_fields': {
                    'student_name': lambda d: f"{d.get('student_first_name', '')} {d.get('student_last_name', '')}".strip(),
                    'success': lambda d: True
                }
            },
            'enrollment_status': {
                'allowed_fields': [
                    'enrollment_id', 'status', 'current_step', 'progress_percentage',
                    'next_step_name', 'created_at', 'updated_at'
                ],
                'computed_fields': {
                    'is_complete': lambda d: d.get('progress_percentage', 0) >= 100
                }
            },
            'invitation_details': {
                'allowed_fields': [
                    'invitation_valid', 'coach_name', 'school_name', 'student_first_name',
                    'student_last_name', 'grade_level', 'sport_interest', 'message',
                    'current_step', 'progress_percentage'
                ],
                'computed_fields': {
                    'has_existing_enrollment': lambda d: d.get('existing_enrollment') is not None
                }
            },
            'step_validation': {
                'allowed_fields': [
                    'valid', 'step_number', 'next_step', 'progress_percentage'
                ],
                'computed_fields': {
                    'validation_timestamp': lambda d: d.get('updated_at') or d.get('created_at')
                }
            }
        }
    
    def _initialize_role_permissions(self) -> Dict[str, List[str]]:
        """Define role-based field access permissions"""
        return {
            'public': [
                'enrollment_id', 'status', 'current_step', 'progress_percentage',
                'next_step_name', 'school_name', 'coach_name', 'created_at',
                'success', 'student_name', 'invitation_valid'
            ],
            'parent': [
                'enrollment_id', 'status', 'current_step', 'progress_percentage',
                'next_step_name', 'school_name', 'coach_name', 'created_at',
                'student_first_name', 'student_last_name', 'grade_level',
                'sport_interest', 'success', 'student_name'
            ],
            'coach': [
                'enrollment_id', 'status', 'current_step', 'progress_percentage',
                'next_step_name', 'school_name', 'coach_name', 'created_at',
                'student_first_name', 'student_last_name', 'grade_level',
                'sport_interest', 'success', 'student_name'
                # Note: Coach access to parent_email requires separate authentication
            ],
            'admin': ['*']  # Admin sees everything (with proper authentication)
        }
    
    def create_client_safe_response(
        self, 
        internal_data: Dict[str, Any], 
        endpoint_type: str,
        client_role: str = 'public'
    ) -> Dict[str, Any]:
        """
        Create client-safe response using endpoint configuration and role permissions
        
        Args:
            internal_data: Raw internal data object
            endpoint_type: Type of endpoint (enrollment_creation, invitation_details, etc.)
            client_role: Client role (public, parent, coach, admin)
            
        Returns:
            Client-safe response dictionary
        """
        
        # Get endpoint configuration
        config = self.endpoint_configurations.get(endpoint_type, {})
        allowed_fields = config.get('allowed_fields', [])
        computed_fields = config.get('computed_fields', {})
        
        # Apply endpoint-specific filtering
        safe_response = {}
        
        # Add allowed fields that exist in the data
        for field in allowed_fields:
            if field in internal_data:
                safe_response[field] = internal_data[field]
        
        # Add computed fields
        for field, compute_func in computed_fields.items():
            try:
                safe_response[field] = compute_func(internal_data)
            except Exception as e:
                print(f"Warning: Failed to compute field '{field}': {e}")
                # Don't add the field if computation fails
        
        # Apply role-based filtering
        safe_response = self._filter_by_role(safe_response, client_role)
        
        return safe_response
    
    def _filter_by_role(self, data: Dict[str, Any], client_role: str) -> Dict[str, Any]:
        """Apply role-based access control to response data"""
        allowed_fields = self.role_permissions.get(client_role, self.role_permissions['public'])
        
        # Admin gets everything
        if '*' in allowed_fields:
            return data
        
        # Filter based on role permissions
        return {k: v for k, v in data.items() if k in allowed_fields}
    
    def sanitize_error_response(self, error_data: Dict[str, Any], is_production: bool = True) -> Dict[str, Any]:
        """Sanitize error responses to prevent information disclosure"""
        
        if not is_production:
            # Development: Return detailed errors
            return error_data
        
        # Production: Return sanitized errors
        safe_error_fields = ['error', 'type', 'timestamp', 'request_id']
        sanitized = {k: v for k, v in error_data.items() if k in safe_error_fields}
        
        # Ensure generic error messages in production
        if 'error' in sanitized:
            error_msg = sanitized['error'].lower()
            # Don't expose internal details
            if any(internal_term in error_msg for internal_term in 
                   ['database', 'sql', 'dynamodb', 'internal', 'system', 'lambda']):
                sanitized['error'] = "Service temporarily unavailable"
        
        return sanitized
    
    def mask_sensitive_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive fields while preserving format for debugging"""
        
        def mask_email(email: str) -> str:
            if '@' not in email or len(email) < 5:
                return '*' * len(email)
            user, domain = email.split('@', 1)
            return f"{user[0]}***@{domain[0]}*****.{domain.split('.')[-1]}"
        
        def mask_token(token: str) -> str:
            if len(token) <= 8:
                return '*' * len(token)
            return f"{token[:4]}{'*' * (len(token) - 8)}{token[-4:]}"
        
        def mask_id(id_val: str) -> str:
            # Create consistent hash for debugging while hiding actual value
            return f"masked_{hashlib.sha256(id_val.encode()).hexdigest()[:8]}"
        
        masked_data = data.copy()
        
        masking_rules = {
            'parent_email': mask_email,
            'email': mask_email,
            'invitation_token': mask_token,
            'auth_token': mask_token,
            'api_key': mask_token,
            'coach_id': mask_id,
            'school_id': mask_id,
            'invitation_id': mask_id,
            'user_id': mask_id,
            'internal_id': mask_id
        }
        
        for field, mask_func in masking_rules.items():
            if field in masked_data and masked_data[field]:
                try:
                    masked_data[field] = mask_func(str(masked_data[field]))
                except Exception as e:
                    print(f"Warning: Failed to mask field '{field}': {e}")
                    masked_data[field] = '*' * 8  # Fallback masking
        
        return masked_data


# Global instance for easy import
response_transformer = ResponseSecurityTransformer()


# Convenience functions for common use cases
def create_enrollment_response(enrollment_data: Dict[str, Any], client_role: str = 'public') -> Dict[str, Any]:
    """Create client-safe enrollment creation response"""
    return response_transformer.create_client_safe_response(
        enrollment_data, 'enrollment_creation', client_role
    )


def create_invitation_details_response(invitation_data: Dict[str, Any], client_role: str = 'public') -> Dict[str, Any]:
    """Create client-safe invitation details response"""
    return response_transformer.create_client_safe_response(
        invitation_data, 'invitation_details', client_role
    )


def create_step_validation_response(step_data: Dict[str, Any], client_role: str = 'public') -> Dict[str, Any]:
    """Create client-safe step validation response"""
    return response_transformer.create_client_safe_response(
        step_data, 'step_validation', client_role
    )


def sanitize_production_error(error_data: Dict[str, Any], is_production: bool = True) -> Dict[str, Any]:
    """Sanitize error response for production"""
    return response_transformer.sanitize_error_response(error_data, is_production)


def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive fields in data"""
    return response_transformer.mask_sensitive_fields(data) 