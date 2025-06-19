"""
Response and API Utilities for TSA Platform
Consolidates CORS, validation, parsing, and response formatting utilities
"""
import json
import os
import re
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from .config import get_config

logger = logging.getLogger(__name__)
config = get_config()


# =================================================================
# CORS & API RESPONSE UTILITIES
# =================================================================

def get_allowed_origin(event: Dict[str, Any] = None) -> str:
    """Get allowed CORS origin based on environment and request origin"""
    # Environment-specific CORS origins (per .cursorrules security)
    cors_origins = {
        "dev": [
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3001"
        ],
        "staging": [
            "https://staging-app.sportsacademy.school",
            "https://staging-admin.sportsacademy.school",
            # Add localhost support for local development
            "http://localhost:3001",
            "https://localhost:3001"
        ],
        "prod": [
            "https://app.sportsacademy.school",
            "https://admin.sportsacademy.school"
        ]
    }
    
    # Get current environment (default to dev for safety)
    current_env = os.environ.get('STAGE', 'dev')
    allowed_origins = cors_origins.get(current_env, cors_origins['dev'])
    
    # Get request origin if event provided
    if event:
        request_origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin')
        if request_origin and request_origin in allowed_origins:
            return request_origin
    
    return allowed_origins[0]  # Safe fallback


def create_response(status_code: int, body: Dict[str, Any], 
                   event: Dict[str, Any] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Create standardized API response with proper CORS headers"""
    cors_origin = get_allowed_origin(event)
    
    # Default CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
    }
    
    # Merge with any additional headers
    if headers:
        cors_headers.update(headers)
    
    return {
        "statusCode": status_code,
        "headers": cors_headers,
        "body": json.dumps(sanitize_response(body), default=str)
    }


def create_cors_response(status_code: int, body: dict, event: Dict[str, Any] = None) -> dict:
    """Create standardized response with proper CORS headers (legacy function name)"""
    return create_response(status_code, body, event)


def handle_cors_preflight(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Handle CORS preflight OPTIONS request"""
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(204, {}, event)  # No content for OPTIONS
    
    return None


# =================================================================
# EVENT PARSING UTILITIES
# =================================================================

def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event with enhanced validation"""
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
        
        # Enhanced input validation
        validation = validate_input_security(parsed)
        if not validation['valid']:
            log_security_event("input_validation_failed", "anonymous", {
                "error": validation['error'],
                "data_keys": list(parsed.keys()) if isinstance(parsed, dict) else []
            }, event)
            return {}
            
        return parsed
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error parsing body: {str(e)}")
        log_security_event("request_parsing_failed", "anonymous", {"error": str(e)}, event)
        return {}


# =================================================================
# VALIDATION UTILITIES
# =================================================================

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """Validate that required fields are present in data"""
    missing_fields = []
    
    for field in required_fields:
        # Handle nested field validation (e.g., "user.email")
        if '.' in field:
            keys = field.split('.')
            current_data = data
            
            try:
                for key in keys:
                    if key not in current_data or current_data[key] is None:
                        missing_fields.append(field)
                        break
                    current_data = current_data[key]
            except (TypeError, KeyError):
                missing_fields.append(field)
        else:
            # Simple field validation
            if field not in data or data[field] is None or data[field] == '':
                missing_fields.append(field)
    
    if missing_fields:
        return {
            'valid': False,
            'missing_fields': missing_fields,
            'error': f"Missing required fields: {', '.join(missing_fields)}"
        }
    
    return {'valid': True}


def validate_email_format(email: str) -> bool:
    """Enhanced email validation"""
    if not email or not isinstance(email, str):
        return False
        
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False
        
    if len(email) > 254:  # RFC 5321 limit
        return False
        
    suspicious_patterns = [
        r'\.{2,}',  # Multiple consecutive dots
        r'^\.|\.$',  # Starts or ends with dot
        r'@.*@',  # Multiple @ symbols
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, email):
            return False
            
    return True


def validate_input_security(data: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced input validation with security checks"""
    xss_patterns = [
        r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe\b',
        r'<object\b'
    ]
    
    sql_patterns = [
        r'\b(union|select|insert|delete|update|drop|exec|execute)\b',
        r'[;\'"]\s*--',
        r'\bor\s+\d+\s*=\s*\d+',
        r'\band\s+\d+\s*=\s*\d+'
    ]
    
    def check_string_value(value: str) -> bool:
        if not isinstance(value, str):
            return True
            
        value_lower = value.lower()
        
        for pattern in xss_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return False
                
        for pattern in sql_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return False
                
        return True
    
    def validate_recursive(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if not validate_recursive(value):
                    return False
        elif isinstance(obj, list):
            for item in obj:
                if not validate_recursive(item):
                    return False
        elif isinstance(obj, str):
            if not check_string_value(obj):
                return False
        return True
    
    if not validate_recursive(data):
        return {'valid': False, 'error': 'Invalid input detected'}
    
    return {'valid': True}


def sanitize_string(value: str, max_length: int = 255) -> str:
    """Sanitize string input for database storage"""
    if not isinstance(value, str):
        return str(value)[:max_length]
    
    # Remove potentially dangerous characters
    sanitized = value.strip()
    
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def sanitize_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize response data for security"""
    if not isinstance(data, dict):
        return data
    
    sanitized = {}
    
    for key, value in data.items():
        # Skip sensitive fields
        if key.lower() in ['password', 'secret', 'token', 'api_key']:
            continue
        
        if isinstance(value, dict):
            sanitized[key] = sanitize_response(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_response(item) if isinstance(item, dict) else item for item in value]
        else:
            sanitized[key] = value
    
    return sanitized


# =================================================================
# LOGGING & AUDIT UTILITIES
# =================================================================

def log_security_event(event_type: str, user_id: str, details: Dict[str, Any], 
                      event: Dict[str, Any] = None) -> None:
    """Log security events for monitoring and compliance"""
    try:
        log_entry = {
            'event_type': event_type,
            'user_id': user_id,
            'details': details,
            'timestamp': get_current_timestamp(),
            'ip_address': get_client_ip(event) if event else 'unknown',
            'user_agent': event.get('headers', {}).get('User-Agent', 'unknown') if event else 'unknown'
        }
        
        logger.warning(f"Security event: {json.dumps(log_entry)}")
        
    except Exception as e:
        logger.error(f"Error logging security event: {str(e)}")


def log_admin_action(admin_user_id: str, action: str, details: Dict[str, Any]) -> None:
    """Log admin action to audit table for compliance and monitoring"""
    try:
        import boto3
        
        dynamodb = boto3.resource('dynamodb')
        stage = os.environ.get('STAGE', 'dev')
        audit_table = dynamodb.Table(config.get_table_name('audit-logs', stage))
        
        log_entry = {
            'log_id': str(uuid.uuid4()),
            'admin_user_id': admin_user_id,
            'action': action,
            'details': details,
            'timestamp': get_current_timestamp(),
            'ip_address': 'unknown',
        }
        
        audit_table.put_item(Item=log_entry)
        logger.info(f"Admin action logged: {action} by {admin_user_id}")
        
    except Exception as e:
        logger.error(f"Error logging admin action: {str(e)}")
        # Don't raise - logging failure shouldn't break the main operation


def log_api_event(event: Dict[str, Any], context: Any, message: str = "API Request"):
    """Log API Gateway event for debugging"""
    try:
        log_data = {
            'message': message,
            'method': event.get('httpMethod'),
            'path': event.get('path'),
            'source_ip': get_client_ip(event),
            'user_agent': event.get('headers', {}).get('User-Agent'),
            'request_id': context.aws_request_id if hasattr(context, 'aws_request_id') else 'unknown',
            'timestamp': get_current_timestamp()
        }
        
        logger.info(json.dumps(log_data))
        
    except Exception as e:
        logger.error(f"Error logging API event: {str(e)}")


# =================================================================
# ERROR HANDLING UTILITIES
# =================================================================

def format_error_response(error: Exception, status_code: int = 500, 
                         event: Dict[str, Any] = None) -> Dict[str, Any]:
    """Format error response with proper logging"""
    error_message = str(error)
    
    # Log the full error for debugging
    logger.error(f"API Error: {error_message}")
    
    # Return sanitized error message
    if status_code == 500:
        # Don't expose internal errors in production
        body = {
            'error': 'Internal server error',
            'timestamp': get_current_timestamp()
        }
    else:
        body = {
            'error': error_message,
            'timestamp': get_current_timestamp()
        }
    
    return create_response(status_code, body, event)


def create_production_safe_error(error_message: str, error_type: str = "ValidationError") -> Dict[str, Any]:
    """Create production-safe error responses"""
    return {
        'error': error_message,
        'error_type': error_type,
        'timestamp': get_current_timestamp()
    }


# =================================================================
# UTILITY FUNCTIONS
# =================================================================

def get_current_timestamp() -> str:
    """Get current ISO timestamp"""
    return datetime.utcnow().isoformat() + 'Z'


def get_client_ip(event: Dict[str, Any]) -> str:
    """Extract client IP from API Gateway event"""
    try:
        # Try different sources for IP address
        ip_sources = [
            lambda: event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
            lambda: event.get('headers', {}).get('X-Forwarded-For', '').split(',')[0].strip(),
            lambda: event.get('headers', {}).get('X-Real-IP'),
            lambda: event.get('headers', {}).get('CF-Connecting-IP')  # Cloudflare
        ]
        
        for source in ip_sources:
            ip = source()
            if ip and ip != 'unknown':
                return ip
        
        return 'unknown'
        
    except Exception as e:
        logger.warning(f"Error extracting client IP: {str(e)}")
        return 'unknown'


def is_this_week(date_str: str) -> bool:
    """Check if a date string is within the current week"""
    try:
        if not date_str:
            return False
        
        from datetime import timedelta
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        now = datetime.utcnow()
        
        # Calculate start of current week (Monday)
        days_since_monday = now.weekday()
        start_of_week = now - timedelta(days=days_since_monday)
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return date_obj >= start_of_week
        
    except Exception as e:
        logger.error(f"Error checking if date is this week: {str(e)}")
        return False


def generate_unique_id(prefix: str = "") -> str:
    """Generate a unique identifier with optional prefix"""
    unique_id = str(uuid.uuid4())
    return f"{prefix}{unique_id}" if prefix else unique_id 