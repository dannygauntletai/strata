"""
Lambda handler for admissions invitation validation and enrollment initialization
Implements complete enrollment workflow validation for Sprint 1.2
Self-contained version without external dependencies - Following .cursorrules security guidelines
"""
import json
import os
import boto3
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List
import urllib.request
import urllib.parse
import urllib.error
import re

# Import response security module
try:
    from shared_utils.response_security import (
        create_enrollment_response, 
        create_invitation_details_response,
        sanitize_production_error
    )
    RESPONSE_SECURITY_AVAILABLE = True
except ImportError:
    # Fallback for .cursorrules lambda import issues
    RESPONSE_SECURITY_AVAILABLE = False
    print("Warning: Response security module not available, using fallback")


# ============================================================================
# INLINE RESPONSE SECURITY (Fallback for .cursorrules compliance)
# ============================================================================

def create_client_safe_enrollment_response_fallback(enrollment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback client-safe enrollment response (if shared_utils import fails)"""
    return {
        'success': True,
        'enrollment_id': enrollment_data.get('enrollment_id'),
        'status': enrollment_data.get('status'),
        'current_step': enrollment_data.get('current_step'),
        'progress_percentage': enrollment_data.get('progress_percentage'),
        'next_step_name': enrollment_data.get('next_step_name'),
        'student_name': f"{enrollment_data.get('student_first_name', '')} {enrollment_data.get('student_last_name', '')}".strip(),
        'school_name': enrollment_data.get('school_name'),
        'coach_name': enrollment_data.get('coach_name'),
        'created_at': enrollment_data.get('created_at')
    }


def create_client_safe_invitation_response_fallback(invitation_data: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback client-safe invitation details response"""
    return {
        'invitation_valid': True,
        'coach_name': invitation_data.get('coach_name'),
        'school_name': invitation_data.get('school_name'),
        'student_first_name': invitation_data.get('student_first_name', ''),
        'student_last_name': invitation_data.get('student_last_name', ''),
        'grade_level': invitation_data.get('grade_level', ''),
        'sport_interest': invitation_data.get('sport_interest', ''),
        'message': invitation_data.get('message', ''),
        'has_existing_enrollment': invitation_data.get('existing_enrollment') is not None,
        'enrollment_status': invitation_data.get('enrollment_status'),
        'current_step': invitation_data.get('current_step'),
        'progress_percentage': invitation_data.get('progress_percentage')
    }


# ============================================================================
# INLINE UTILITY FUNCTIONS (following .cursorrules Lambda best practices)
# ============================================================================

def get_allowed_origin(event: Dict[str, Any]) -> str:
    """Get allowed CORS origin based on environment and request origin (per .cursorrules security)"""
    # Environment-specific CORS origins (per .cursorrules recommendations)
    cors_origins = {
        "dev": [
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002"  # Admissions frontend
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
    
    # Get request origin
    request_origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin')
    
    # Return specific origin if allowed, otherwise first allowed origin as fallback
    if request_origin and request_origin in allowed_origins:
        return request_origin
    
    return allowed_origins[0]  # Safe fallback


def create_response(status_code: int, body: Dict[str, Any], event: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create standardized API response with environment-specific CORS headers (per .cursorrules)"""
    
    # Get appropriate CORS origin
    cors_origin = get_allowed_origin(event) if event else "http://localhost:3000"
    
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,  # ✅ Environment-specific, not wildcard
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",  # ✅ Minimal headers
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",  # ✅ Only needed methods
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",  # ✅ Security header
            "X-Frame-Options": "DENY"  # ✅ Security header
        },
        "body": json.dumps(sanitize_response(body), default=str)  # ✅ Sanitize responses
    }


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


def validate_input(data: Dict[str, Any]) -> Dict[str, Any]:
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
        validation = validate_input(parsed)
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


def get_current_timestamp() -> str:
    """Get current ISO timestamp"""
    return datetime.utcnow().isoformat() + 'Z'


def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource"""
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        print(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise


def validate_invitation_token(token: str) -> Dict[str, Any]:
    """Validate invitation token format and structure"""
    if not token or not isinstance(token, str):
        return {'valid': False, 'error': 'Invitation token is required'}
    
    if len(token) < 10:
        return {'valid': False, 'error': 'Invalid invitation token format'}
    
    try:
        # Try UUID format first
        try:
            uuid.UUID(token)
            return {'valid': True, 'token_type': 'uuid'}
        except ValueError:
            pass
        
        # Try base64 format
        try:
            import base64
            decoded = base64.b64decode(token).decode('utf-8')
            if len(decoded) > 5:
                return {'valid': True, 'token_type': 'base64'}
        except Exception:
            pass
        
        return {'valid': False, 'error': 'Invalid token format'}
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        return {'valid': False, 'error': 'Token validation failed'}


def generate_enrollment_id() -> str:
    """Generate unique enrollment identifier"""
    timestamp = datetime.utcnow().strftime('%Y%m%d')
    unique_suffix = str(uuid.uuid4())[:8]
    return f"enr_{timestamp}_{unique_suffix}"


def calculate_enrollment_progress(completed_steps: List[int], total_steps: int = 6) -> Dict[str, Any]:
    """Calculate enrollment progress percentage and next steps"""
    if not completed_steps:
        completed_steps = []
    
    progress_percentage = (len(completed_steps) / total_steps) * 100
    
    # Determine next step
    next_step = None
    for step in range(1, total_steps + 1):
        if step not in completed_steps:
            next_step = step
            break
    
    # Define step names for TSA enrollment process
    step_names = {
        1: 'Program Information',
        2: 'Phone Consultation', 
        3: 'Shadow Day',
        4: 'Student Information',
        5: 'Document Submission',
        6: 'Payment Processing'
    }
    
    return {
        'progress_percentage': round(progress_percentage, 1),
        'completed_steps': completed_steps,
        'completed_count': len(completed_steps),
        'total_steps': total_steps,
        'next_step': next_step,
        'next_step_name': step_names.get(next_step, 'Complete') if next_step else 'Complete',
        'is_complete': len(completed_steps) == total_steps
    }


def validate_enrollment_step(step_data: Dict[str, Any], step_number: int) -> Dict[str, Any]:
    """Validate enrollment step completion following existing validation patterns"""
    
    # Define required fields for each step
    step_requirements = {
        1: ['program_interest', 'contact_preferences'],  # Program Information
        2: ['consultation_date', 'consultation_type'],   # Phone Consultation  
        3: ['shadow_day_date', 'waivers_signed'],       # Shadow Day
        4: ['student_info', 'parent_info'],             # Student Information
        5: ['required_documents'],                       # Document Submission
        6: ['payment_method', 'deposit_amount']          # Payment Processing
    }
    
    required_fields = step_requirements.get(step_number, [])
    
    # Use existing validation function
    validation = validate_required_fields(step_data, required_fields)
    if not validation['valid']:
        return validation
    
    # Step-specific validation
    if step_number == 1:
        # Validate program interest selection
        if not step_data.get('program_interest') or not isinstance(step_data['program_interest'], list):
            return {'valid': False, 'error': 'Program interest must be a non-empty list'}
            
    elif step_number == 4:
        # Validate EdFi/OneRoster compliance for student info
        student_info = step_data.get('student_info', {})
        if 'birth_date' in student_info:
            try:
                datetime.fromisoformat(student_info['birth_date'])
            except ValueError:
                return {'valid': False, 'error': 'Invalid birth_date format. Use ISO format (YYYY-MM-DD)'}
        
        # Validate email format for parent
        parent_info = step_data.get('parent_info', {})
        if 'email' in parent_info:
            email = parent_info['email']
            if not email or '@' not in email or '.' not in email:
                return {'valid': False, 'error': 'Invalid parent email format'}
    
    return {'valid': True, 'step_number': step_number}


def log_enrollment_event(enrollment_id: str, event_type: str, event_data: Dict[str, Any], context: Any = None) -> None:
    """Log enrollment events for analytics"""
    try:
        log_entry = {
            'event_category': 'admissions',
            'event_type': event_type,
            'enrollment_id': enrollment_id,
            'event_data': event_data,
            'timestamp': get_current_timestamp()
        }
        print(json.dumps(log_entry))
    except Exception as e:
        print(f"Enrollment event logging error: {str(e)}")


def make_http_request(url: str, method: str = 'GET', data: Dict[str, Any] = None, timeout: int = 10) -> Dict[str, Any]:
    """Make HTTP request using standard library (no external dependencies)"""
    try:
        # Prepare request data
        headers = {'Content-Type': 'application/json'}
        
        if data and method in ['POST', 'PUT']:
            json_data = json.dumps(data).encode('utf-8')
            headers['Content-Length'] = str(len(json_data))
        else:
            json_data = None
        
        # Create request
        req = urllib.request.Request(url, data=json_data, headers=headers, method=method)
        
        # Make request
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response_body = response.read().decode('utf-8')
            return {
                'status_code': response.getcode(),
                'body': response_body,
                'success': True
            }
            
    except urllib.error.HTTPError as e:
        # Handle HTTP errors (4xx, 5xx)
        try:
            error_body = e.read().decode('utf-8')
        except:
            error_body = str(e)
        
        return {
            'status_code': e.code,
            'body': error_body,
            'success': False
        }
        
    except Exception as e:
        print(f"HTTP request error: {str(e)}")
        return {
            'status_code': 500,
            'body': json.dumps({'error': str(e)}),
            'success': False
        }


# ============================================================================
# MAIN LAMBDA HANDLER & ROUTE HANDLERS
# ============================================================================

def lambda_handler(event, context):
    """Main handler for admissions invitation validation and enrollment initialization"""
    try:
        # Enhanced security logging
        log_security_event("request_received", "anonymous", {
            "method": event.get('httpMethod'),
            "path": event.get('path'),
            "source_ip": event.get('headers', {}).get('X-Forwarded-For', 'unknown')
        }, event)
        
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return create_response(204, {}, event)
        
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters') or {}
        
        # Route to appropriate handler
        if http_method == 'POST':
            if '/validate-invitation' in path:
                return validate_invitation_and_initialize_enrollment(event, context)
            else:
                return create_response(404, create_production_safe_error('Endpoint not found', 'NotFoundError'), event)
                
        elif http_method == 'GET':
            if '/invitation/' in path and 'token' in path_parameters:
                return get_invitation_details(path_parameters['token'], event, context)
            else:
                return create_response(404, create_production_safe_error('Endpoint not found', 'NotFoundError'), event)
        else:
            return create_response(405, create_production_safe_error('Method not allowed', 'ValidationError'), event)
            
    except Exception as e:
        # Enhanced error logging for security monitoring
        log_security_event("lambda_error", "system", {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "method": event.get('httpMethod'),
            "path": event.get('path')
        }, event)
        
        print(f"Error in admissions validation handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return create_response(500, create_production_safe_error(str(e), 'SystemError'), event)


def validate_invitation_and_initialize_enrollment(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Validate invitation token and initialize enrollment process"""
    try:
        body = parse_event_body(event)
        
        # Enhanced input validation
        if not body:
            return create_response(400, create_production_safe_error('Invalid request body', 'ValidationError'), event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['invitation_token'])
        if not validation['valid']:
            log_security_event("validation_failed", "anonymous", {"error": validation['error']}, event)
            return create_response(400, create_production_safe_error(validation['error'], 'ValidationError'), event)
        
        # Validate token format
        token_validation = validate_invitation_token(body['invitation_token'])
        if not token_validation['valid']:
            log_security_event("invalid_token_attempt", "anonymous", {
                "token_length": len(body['invitation_token']),
                "error": token_validation['error']
            }, event)
            return create_response(400, create_production_safe_error(token_validation['error'], 'ValidationError'), event)
        
        # Call existing coach invitation API to validate token
        invitation_data = validate_with_coach_invitation_api(body['invitation_token'])
        if not invitation_data:
            log_security_event("invitation_validation_failed", "anonymous", {
                "token_type": token_validation.get('token_type')
            }, event)
            return create_response(400, create_production_safe_error('Invalid or expired invitation token', 'ValidationError'), event)
        
        # Check if enrollment already exists for this invitation
        existing_enrollment = check_existing_enrollment(invitation_data['invitation_id'])
        if existing_enrollment:
            log_enrollment_event(
                existing_enrollment['enrollment_id'],
                'invitation_revalidated',
                {'invitation_id': invitation_data['invitation_id']},
                context
            )
            # ✅ SECURITY FIX: Return client-safe response instead of raw data
            if RESPONSE_SECURITY_AVAILABLE:
                safe_response = create_enrollment_response(existing_enrollment, 'public')
            else:
                safe_response = create_client_safe_enrollment_response_fallback(existing_enrollment)
            return create_response(200, safe_response, event)
        
        # Initialize new enrollment record
        enrollment_data = initialize_enrollment_record(invitation_data, context)
        
        # Enhanced security logging for successful enrollment
        log_security_event("enrollment_initialized", enrollment_data.get('parent_email', 'unknown'), {
            "enrollment_id": enrollment_data['enrollment_id'],
            "coach_id": invitation_data.get('coach_id'),
            "school_name": invitation_data.get('school_name')
        }, event)
        
        # Log enrollment initialization
        log_enrollment_event(
            enrollment_data['enrollment_id'],
            'enrollment_initialized',
            {
                'invitation_id': invitation_data['invitation_id'],
                'coach_id': invitation_data.get('coach_id'),
                'parent_email': invitation_data.get('parent_email')
            },
            context
        )
        
        # Update coach invitation status
        update_coach_invitation_status(invitation_data['invitation_id'], 'accepted')
        
        # ✅ SECURITY FIX: Return client-safe response instead of raw enrollment_data
        if RESPONSE_SECURITY_AVAILABLE:
            safe_response = create_enrollment_response(enrollment_data, 'public')
        else:
            safe_response = create_client_safe_enrollment_response_fallback(enrollment_data)
        
        return create_response(201, safe_response, event)
        
    except Exception as e:
        log_security_event("enrollment_initialization_error", "system", {
            "error_type": type(e).__name__,
            "error_message": str(e)
        }, event)
        
        print(f"Error validating invitation: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, create_production_safe_error(str(e), 'SystemError'), event)


def validate_with_coach_invitation_api(invitation_token: str) -> Dict[str, Any]:
    """Call existing coach invitation API to validate token using standard library"""
    try:
        # Use existing parent invitation validation endpoint
        api_base_url = "https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod"
        validation_url = f"{api_base_url}/parent-invitations/validate/{invitation_token}"
        
        response = make_http_request(validation_url, method='GET')
        
        if response['status_code'] == 200:
            return json.loads(response['body'])
        elif response['status_code'] == 404:
            print(f"Invitation token not found: {invitation_token}")
            return None
        elif response['status_code'] == 400:
            print(f"Invitation token expired or invalid: {invitation_token}")
            return None
        else:
            print(f"Unexpected response from coach API: {response['status_code']} - {response['body']}")
            return None
            
    except Exception as e:
        print(f"Error calling coach invitation API: {str(e)}")
        return None


def check_existing_enrollment(invitation_id: str) -> Dict[str, Any]:
    """Check if enrollment already exists for this invitation"""
    try:
        # Use parent invitations table to track enrollment status
        invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        response = invitations_table.get_item(Key={'invitation_id': invitation_id})
        
        if response.get('Item') and response['Item'].get('enrollment_id'):
            # Return enrollment data based on invitation
            item = response['Item']
            return {
                'enrollment_id': item['enrollment_id'],
                'status': item.get('enrollment_status', 'pending'),
                'invitation_id': invitation_id,
                'current_step': item.get('current_step', 1),
                'completed_steps': item.get('completed_steps', []),
                'progress_percentage': item.get('progress_percentage', 0.0),
                'next_step_name': item.get('next_step_name', 'Program Information'),
                'created_at': item.get('enrollment_started_at'),
                'updated_at': item.get('updated_at')
            }
        
        return None
        
    except Exception as e:
        print(f"Error checking existing enrollment: {str(e)}")
        return None


def initialize_enrollment_record(invitation_data: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Initialize enrollment record using existing DynamoDB tables"""
    try:
        # Store enrollment data in the parent invitations table for Sprint 1.2
        invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev'))
        
        # Generate enrollment ID
        enrollment_id = generate_enrollment_id()
        
        # Calculate initial progress
        progress = calculate_enrollment_progress([])  # No steps completed yet
        
        # Create enrollment record by updating the invitation with enrollment data
        enrollment_data = {
            'enrollment_id': enrollment_id,
            'invitation_id': invitation_data['invitation_id'],
            'invitation_token': invitation_data['invitation_token'],
            'coach_id': invitation_data.get('coach_id'),
            'school_id': invitation_data.get('school_id'),
            'parent_email': invitation_data.get('parent_email'),
            'coach_name': invitation_data.get('coach_name'),
            'school_name': invitation_data.get('school_name'),
            
            # Student information from invitation
            'student_first_name': invitation_data.get('student_first_name', ''),
            'student_last_name': invitation_data.get('student_last_name', ''),
            'grade_level': invitation_data.get('grade_level', ''),
            'sport_interest': invitation_data.get('sport_interest', ''),
            
            # Enrollment progress tracking
            'status': 'pending',
            'current_step': 1,
            'completed_steps': [],
            'progress_percentage': progress['progress_percentage'],
            'next_step_name': progress['next_step_name'],
            
            # Timestamps
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp(),
            'enrollment_started_at': get_current_timestamp(),
            
            # Document tracking for TSA enrollment process
            'required_documents': [
                'transcript', 'birth_certificate', 'immunization_record',
                'medical_form', 'emergency_contact', 'photo_release'
            ],
            'submitted_documents': [],
            'missing_documents': [
                'transcript', 'birth_certificate', 'immunization_record',
                'medical_form', 'emergency_contact', 'photo_release'
            ]
        }
        
        # Update the invitation record with enrollment data
        update_expression = """
            SET enrollment_id = :enrollment_id,
                enrollment_status = :status,
                enrollment_started_at = :started_at,
                current_step = :current_step,
                completed_steps = :completed_steps,
                progress_percentage = :progress,
                next_step_name = :next_step_name,
                required_documents = :required_docs,
                submitted_documents = :submitted_docs,
                missing_documents = :missing_docs,
                updated_at = :updated_at
        """
        
        invitations_table.update_item(
            Key={'invitation_id': invitation_data['invitation_id']},
            UpdateExpression=update_expression,
            ExpressionAttributeValues={
                ':enrollment_id': enrollment_id,
                ':status': 'pending',
                ':started_at': enrollment_data['enrollment_started_at'],
                ':current_step': 1,
                ':completed_steps': [],
                ':progress': progress['progress_percentage'],
                ':next_step_name': progress['next_step_name'],
                ':required_docs': enrollment_data['required_documents'],
                ':submitted_docs': [],
                ':missing_docs': enrollment_data['missing_documents'],
                ':updated_at': get_current_timestamp()
            }
        )
        
        return enrollment_data
        
    except Exception as e:
        print(f"Error initializing enrollment record: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def update_coach_invitation_status(invitation_id: str, status: str) -> None:
    """Update status in coach invitation system using standard library"""
    try:
        # Call existing parent invitation API to update status
        api_base_url = "https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod"
        update_url = f"{api_base_url}/parent-invitations/{invitation_id}"
        
        update_data = {
            'status': status,
            'accepted_at': get_current_timestamp() if status == 'accepted' else None
        }
        
        response = make_http_request(update_url, method='PUT', data=update_data)
        
        if response['status_code'] in [200, 204]:
            print(f"Successfully updated coach invitation {invitation_id} to status: {status}")
        else:
            print(f"Warning: Failed to update coach invitation status: {response['status_code']} - {response['body']}")
            
    except Exception as e:
        print(f"Warning: Error updating coach invitation status: {str(e)}")


def get_invitation_details(token: str, event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get invitation details for display to parent"""
    try:
        # Enhanced token validation with security logging
        token_validation = validate_invitation_token(token)
        if not token_validation['valid']:
            log_security_event("invalid_token_access_attempt", "anonymous", {
                "token_length": len(token) if token else 0,
                "error": token_validation['error']
            }, event)
            return create_response(400, create_production_safe_error(token_validation['error'], 'ValidationError'), event)
        
        # Get invitation data from coach API
        invitation_data = validate_with_coach_invitation_api(token)
        if not invitation_data:
            log_security_event("invitation_details_not_found", "anonymous", {
                "token_type": token_validation.get('token_type')
            }, event)
            return create_response(404, create_production_safe_error('Invitation not found or expired', 'NotFoundError'), event)
        
        # Check if enrollment already exists
        existing_enrollment = check_existing_enrollment(invitation_data['invitation_id'])
        
        # ✅ SECURITY FIX: Use response transformer for invitation details
        combined_data = {
            **invitation_data,
            'existing_enrollment': existing_enrollment['enrollment_id'] if existing_enrollment else None,
            'enrollment_status': existing_enrollment['status'] if existing_enrollment else None,
            'current_step': existing_enrollment['current_step'] if existing_enrollment else None,
            'progress_percentage': existing_enrollment['progress_percentage'] if existing_enrollment else None
        }
        
        # Create client-safe response
        if RESPONSE_SECURITY_AVAILABLE:
            safe_response = create_invitation_details_response(combined_data, 'public')
        else:
            safe_response = create_client_safe_invitation_response_fallback(combined_data)
        
        return create_response(200, safe_response, event)
        
    except Exception as e:
        log_security_event("invitation_details_error", "system", {
            "error_type": type(e).__name__,
            "error_message": str(e)
        }, event)
        
        print(f"Error getting invitation details: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, create_production_safe_error(str(e), 'SystemError'), event) 