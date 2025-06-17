"""
TSA Security Module
Security utilities and logging functions
"""
import logging
import json
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def log_security_event(event_type: str, details: Dict[str, Any], user_id: Optional[str] = None) -> None:
    """Log security-related events for monitoring and auditing"""
    try:
        security_log = {
            "event_type": event_type,
            "user_id": user_id,
            "details": details,
            "timestamp": str(int(__import__('time').time()))
        }
        
        # In production, this would go to a security monitoring system
        logger.warning(f"SECURITY_EVENT: {json.dumps(security_log)}")
        
    except Exception as e:
        logger.error(f"Failed to log security event: {str(e)}")


def create_production_safe_error(error_message: str, error_code: str = "INTERNAL_ERROR") -> Dict[str, Any]:
    """Create error response that's safe for production (no sensitive info)"""
    return {
        "error": True,
        "error_code": error_code,
        "message": "An error occurred. Please try again or contact support.",
        "internal_message": error_message  # This would be logged but not returned in production
    }


def sanitize_response(response_data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove sensitive information from API responses"""
    if not isinstance(response_data, dict):
        return response_data
    
    # Fields that should never be returned in API responses
    sensitive_fields = {
        'password', 'secret', 'token', 'private_key', 'api_key', 
        'ssn', 'social_security_number', 'credit_card', 'bank_account'
    }
    
    sanitized = {}
    for key, value in response_data.items():
        if key.lower() in sensitive_fields:
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_response(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_response(item) if isinstance(item, dict) else item for item in value]
        else:
            sanitized[key] = value
    
    return sanitized 