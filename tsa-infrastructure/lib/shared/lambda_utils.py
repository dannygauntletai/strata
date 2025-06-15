"""
Shared Lambda Utilities for TSA Platform
Consolidates common patterns used across all Lambda functions

Following .cursorrules best practices:
- Environment-specific CORS origins (not wildcards)
- Security-first input validation
- Consistent error handling and logging
"""
import json
import os
import boto3
import re
from datetime import datetime
from typing import Dict, Any, List


# ============================================================================
# CORS & API RESPONSE UTILITIES
# ============================================================================

def get_allowed_origin(event: Dict[str, Any] = None) -> str:
    """Get allowed CORS origin based on environment and request origin"""
    # Environment-specific CORS origins (per .cursorrules security)
    cors_origins = {
        "dev": [
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002"
        ],
        "staging": [
            "https://staging-coach.texassportsacademy.com",
            "https://staging-admin.texassportsacademy.com",
            "https://staging-admissions.texassportsacademy.com"
        ],
        "prod": [
            "https://coach.texassportsacademy.com",
            "https://admin.texassportsacademy.com", 
            "https://admissions.texassportsacademy.com"
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


def create_cors_response(status_code: int, body: Dict[str, Any], event: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create standardized API response with environment-specific CORS headers"""
    cors_origin = get_allowed_origin(event)
    
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,  # ✅ Environment-specific, not wildcard
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",  # ✅ Security header
            "X-Frame-Options": "DENY"  # ✅ Security header
        },
        "body": json.dumps(sanitize_response(body), default=str)
    }


def handle_cors_preflight(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle CORS preflight requests"""
    if event.get('httpMethod') == 'OPTIONS':
        return create_cors_response(204, {}, event)
    return None


# ============================================================================
# EVENT PARSING UTILITIES  
# ============================================================================

def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event with enhanced validation"""
    try:
        body = event.get('body', '{}')
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
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
    except Exception as e:
        log_security_event("request_parsing_failed", "anonymous", {"error": str(e)}, event)
        return {}


# ============================================================================
# VALIDATION UTILITIES
# ============================================================================

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """Validate that required fields are present in data"""
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return {
            'valid': False,
            'error': f"Missing required fields: {', '.join(missing_fields)}"
        }
    return {'valid': True}


def enhanced_email_validation(email: str) -> bool:
    """Enhanced email validation (per .cursorrules security practices)"""
    if not email or not isinstance(email, str):
        return False
        
    # Basic format check
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False
        
    # Additional security checks
    if len(email) > 254:  # RFC 5321 limit
        return False
        
    # Check for suspicious patterns
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
    """Enhanced input validation with security checks (per .cursorrules)"""
    
    # Check for basic XSS patterns
    xss_patterns = [
        r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe\b',
        r'<object\b'
    ]
    
    # Check for SQL injection patterns
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
        
        # Check for XSS
        for pattern in xss_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return False
                
        # Check for SQL injection
        for pattern in sql_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return False
                
        return True
    
    # Recursively validate all string values
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


# ============================================================================
# SECURITY UTILITIES
# ============================================================================

def log_security_event(event_type: str, user_id: str, details: Dict[str, Any], event: Dict[str, Any] = None) -> None:
    """Log security events for monitoring (per .cursorrules security practices)"""
    try:
        # Get client information safely
        headers = event.get('headers', {}) if event else {}
        
        security_log = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_category": "security",
            "event_type": event_type,
            "user_id": user_id or "anonymous",
            "ip_address": headers.get('X-Forwarded-For', 'unknown'),
            "user_agent": headers.get('User-Agent', 'unknown'),
            "request_id": event.get('requestContext', {}).get('requestId') if event else None,
            "details": details
        }
        
        # Use structured logging for security monitoring
        print(json.dumps(security_log))
        
    except Exception as e:
        print(f"Security logging error: {str(e)}")


def create_production_safe_error(error_message: str, error_type: str = "ValidationError") -> Dict[str, Any]:
    """Create production-safe error messages (per .cursorrules)"""
    
    # Map internal errors to user-friendly messages
    safe_messages = {
        "ValidationError": "Invalid request data provided",
        "AuthenticationError": "Authentication required",
        "AuthorizationError": "Access denied",
        "NotFoundError": "Requested resource not found",
        "RateLimitError": "Too many requests, please try again later",
        "SystemError": "Service temporarily unavailable"
    }
    
    # In development, show detailed errors; in production, use safe messages
    is_development = os.environ.get('STAGE', 'dev') == 'dev'
    
    if is_development:
        return {"error": error_message, "type": error_type}
    else:
        return {"error": safe_messages.get(error_type, "An error occurred")}


def sanitize_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove sensitive fields from API responses (per .cursorrules security)"""
    sensitive_fields = [
        'password', 'ssn', 'credit_card', 'token_secret', 'internal_id', 'raw_data',
        # Security tokens
        'invitation_token', 'token', 'auth_token', 'access_token', 'refresh_token',
        # Internal system IDs
        'coach_id', 'school_id', 'user_id', 'internal_user_id', 'system_id',
        # Private identifiers that clients shouldn't see
        'invitation_id', 'internal_invitation_id',
        # Parent/user PII that might be from other users
        'parent_email', 'coach_email', 'admin_email',
        # Database/system metadata
        'created_by', 'updated_by', 'internal_notes', 'admin_notes',
        # AWS/infrastructure details
        'dynamo_key', 'table_name', 'lambda_context'
    ]
    
    if isinstance(data, dict):
        return {k: sanitize_response(v) if isinstance(v, (dict, list)) else v 
                for k, v in data.items() if k not in sensitive_fields}
    elif isinstance(data, list):
        return [sanitize_response(item) for item in data]
    
    return data


# ============================================================================
# DATABASE UTILITIES
# ============================================================================

def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource"""
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        print(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise


def get_current_timestamp() -> str:
    """Get current ISO timestamp"""
    return datetime.utcnow().isoformat() + 'Z'


# ============================================================================
# CONFIGURATION UTILITIES
# ============================================================================

def get_table_name(table_key: str, default_name: str = None) -> str:
    """Get table name from environment with fallback"""
    return os.environ.get(table_key, default_name or f"{table_key.lower().replace('_', '-')}")


def get_frontend_url(service: str = "unified") -> str:
    """Get frontend URL based on service and environment"""
    stage = os.environ.get('STAGE', 'dev')
    
    urls = {
        "dev": {
            "unified": "http://localhost:3000",
            "admin": "http://localhost:3001",
            "admissions": "http://localhost:3002"
        },
        "staging": {
            "unified": "https://staging-coach.texassportsacademy.com",
            "admin": "https://staging-admin.texassportsacademy.com",
            "admissions": "https://staging-admissions.texassportsacademy.com"
        },
        "prod": {
            "unified": "https://coach.texassportsacademy.com",
            "admin": "https://admin.texassportsacademy.com",
            "admissions": "https://admissions.texassportsacademy.com"
        }
    }
    
    return urls.get(stage, urls["dev"]).get(service, urls["dev"]["unified"])


# ============================================================================
# ERROR HANDLING UTILITIES
# ============================================================================

def format_error_response(e: Exception, event: Dict[str, Any] = None) -> Dict[str, Any]:
    """Format error response consistently"""
    error_type = type(e).__name__
    
    # Log the error for debugging
    log_security_event("lambda_error", "system", {
        "error_type": error_type,
        "error_message": str(e)
    }, event)
    
    return create_cors_response(500, create_production_safe_error(str(e), 'SystemError'), event)


def log_api_event(event: Dict[str, Any], context: Any, message: str) -> None:
    """Log API event for monitoring"""
    try:
        log_entry = {
            'event_category': 'api_request',
            'message': message,
            'method': event.get('httpMethod'),
            'path': event.get('path'),
            'timestamp': get_current_timestamp(),
            'request_id': context.aws_request_id if context else None
        }
        print(json.dumps(log_entry))
    except Exception as e:
        print(f"Logging error: {str(e)}") 