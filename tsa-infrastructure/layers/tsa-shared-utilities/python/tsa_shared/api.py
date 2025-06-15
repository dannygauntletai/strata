"""
API Utilities - CORS-free responses for TSA backend services

API Gateway handles all CORS - Lambda functions return clean JSON only
"""
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union


def create_api_response(status_code: int, body: Dict[str, Any], context: Optional[str] = None) -> Dict[str, Any]:
    """
    Create standardized API response WITHOUT CORS headers
    API Gateway handles CORS - Lambda returns clean JSON only
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",  # Security header
            "X-Frame-Options": "DENY"  # Security header
        },
        "body": json.dumps(sanitize_api_response(body), default=str)
    }


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event with security validation"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            parsed = json.loads(body) if body else {}
        else:
            parsed = body if isinstance(body, dict) else {}
        
        # Basic security validation
        from .validation import validate_input_security
        validation = validate_input_security(parsed)
        if not validation['valid']:
            print(f"⚠️ Input validation failed: {validation['error']}")
            return {}
            
        return parsed
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {str(e)}")
        return {}
    except Exception as e:
        print(f"❌ Unexpected error parsing body: {str(e)}")
        return {}


def standardize_error_response(error: Union[Exception, str], context: str = "") -> Dict[str, Any]:
    """
    Create standardized error response with context
    Production-safe error messages that don't leak internal details
    """
    import os
    
    error_message = str(error)
    error_type = type(error).__name__ if isinstance(error, Exception) else "Error"
    
    # Development vs production error handling
    is_development = os.environ.get('STAGE', 'dev') == 'dev'
    
    # Log full error for debugging (always)
    print(f"🔥 Error in {context}: {error_type} - {error_message}")
    
    # Production-safe error mapping
    safe_messages = {
        "ValidationError": "Invalid request data",
        "ValueError": "Invalid input provided", 
        "KeyError": "Missing required information",
        "AttributeError": "Invalid request format",
        "TypeError": "Invalid data type provided",
        "FileNotFoundError": "Resource not found",
        "PermissionError": "Access denied",
        "ConnectionError": "Service temporarily unavailable",
        "TimeoutError": "Request timeout",
        "JSONDecodeError": "Invalid JSON format"
    }
    
    if is_development:
        # Show detailed errors in development
        return {
            "error": error_message,
            "error_type": error_type,
            "context": context,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        # Use safe messages in production
        safe_message = safe_messages.get(error_type, "An error occurred")
        return {
            "error": safe_message,
            "timestamp": datetime.utcnow().isoformat()
        }


def log_api_event(event: Dict[str, Any], context: Any, message: str, extra_data: Optional[Dict[str, Any]] = None):
    """Log API Gateway event for monitoring and debugging"""
    try:
        # Extract safe request information
        headers = event.get('headers', {})
        request_context = event.get('requestContext', {})
        
        log_entry = {
            'category': 'api_request',
            'message': message,
            'method': event.get('httpMethod'),
            'path': event.get('path'),
            'query_params': list((event.get('queryStringParameters') or {}).keys()),
            'source_ip': headers.get('X-Forwarded-For', 'unknown'),
            'user_agent': headers.get('User-Agent', 'unknown')[:100],  # Truncate for safety
            'request_id': request_context.get('requestId'),
            'api_id': request_context.get('apiId'),
            'stage': request_context.get('stage'),
            'timestamp': datetime.utcnow().isoformat(),
            'lambda_request_id': context.aws_request_id if hasattr(context, 'aws_request_id') else None
        }
        
        # Add extra data if provided
        if extra_data:
            log_entry['extra'] = extra_data
        
        # Structured logging for CloudWatch
        print(json.dumps(log_entry))
        
    except Exception as e:
        print(f"❌ Logging error: {str(e)}")


def sanitize_api_response(data: Any) -> Any:
    """
    Remove sensitive fields from API responses
    Security-first approach to prevent data leaks
    """
    # Sensitive fields that should never be in API responses
    sensitive_fields = {
        # Passwords and secrets
        'password', 'secret', 'token_secret', 'private_key', 'api_key',
        # Personal identifiers
        'ssn', 'social_security_number', 'credit_card', 'card_number',
        # Internal system fields
        'internal_id', 'system_id', 'raw_data', 'internal_notes', 'admin_notes',
        # AWS/infrastructure details
        'aws_key', 'dynamo_key', 'lambda_context', 'infrastructure_id',
        # Tokens (some exceptions below)
        'access_token', 'refresh_token', 'auth_token',
        # Database metadata
        'table_name', 'db_connection', 'connection_string',
        # Internal flags
        'is_test', 'debug_mode', 'internal_flag'
    }
    
    # Fields that are okay to include (override sensitive list)
    allowed_sensitive_fields = {
        'invitation_token',  # Needed for invitation flows
        'verification_token'  # Needed for verification flows
    }
    
    def clean_recursive(obj):
        if isinstance(obj, dict):
            cleaned = {}
            for key, value in obj.items():
                # Skip sensitive fields unless explicitly allowed
                if key.lower() in sensitive_fields and key not in allowed_sensitive_fields:
                    continue
                cleaned[key] = clean_recursive(value)
            return cleaned
        elif isinstance(obj, list):
            return [clean_recursive(item) for item in obj]
        else:
            return obj
    
    return clean_recursive(data)


def validate_api_permissions(event: Dict[str, Any], required_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate API permissions from request context
    Returns user information if valid, error info if not
    """
    try:
        # Extract authorization info from headers or request context
        headers = event.get('headers', {})
        request_context = event.get('requestContext', {})
        
        # Check for authorization header
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header:
            return {
                'valid': False,
                'error': 'Authorization header required',
                'status_code': 401
            }
        
        # Extract token (assuming Bearer token format)
        if not auth_header.startswith('Bearer '):
            return {
                'valid': False,
                'error': 'Invalid authorization format',
                'status_code': 401
            }
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # TODO: Implement actual token validation
        # This would integrate with your auth system (Cognito, custom JWT, etc.)
        # For now, return a placeholder
        
        user_info = {
            'user_id': 'placeholder_user',
            'email': 'user@example.com',
            'role': 'coach'  # or 'parent', 'admin'
        }
        
        # Check role requirement
        if required_role and user_info.get('role') != required_role:
            return {
                'valid': False,
                'error': f'Role {required_role} required',
                'status_code': 403
            }
        
        return {
            'valid': True,
            'user': user_info
        }
        
    except Exception as e:
        return {
            'valid': False,
            'error': f'Authorization validation failed: {str(e)}',
            'status_code': 500
        } 