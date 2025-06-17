"""
Shared utilities for TSA Backend Systems - NO CORS (API Gateway handles it)
"""
import json
import os
import boto3
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union, List


def create_api_response(status_code: int, body: Union[Dict[str, Any], str], 
                       content_type: str = "application/json") -> Dict[str, Any]:
    """
    Create API Gateway response WITHOUT CORS headers
    CORS is handled by API Gateway infrastructure configuration
    """
    if isinstance(body, dict):
        response_body = json.dumps(body, default=str)
    else:
        response_body = str(body)
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": content_type
        },
        "body": response_body
    }


def create_cors_response(status_code: int, body: dict) -> dict:
    """
    DEPRECATED: Use create_api_response() instead
    This function is kept for backward compatibility during migration
    CORS should be handled by API Gateway, not Lambda
    """
    print("⚠️ WARNING: create_cors_response() is deprecated. Use create_api_response() instead.")
    print("⚠️ CORS should be handled by API Gateway infrastructure, not Lambda functions.")
    
    return create_api_response(status_code, body)


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            return json.loads(body) if body else {}
        
        return body if isinstance(body, dict) else {}
        
    except json.JSONDecodeError as e:
        print(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        print(f"Unexpected error parsing body: {str(e)}")
        return {}


def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email or '@' not in email or '.' not in email:
        return False
    
    # Basic email validation
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def generate_id(prefix: str = "id") -> str:
    """Generate a unique ID with timestamp"""
    timestamp = datetime.now(timezone.utc).isoformat().replace(':', '').replace('-', '').replace('.', '')
    return f"{prefix}_{timestamp}"


def get_current_time() -> str:
    """Get current UTC time in ISO format"""
    return datetime.now(timezone.utc).isoformat()


def hash_string(input_string: str) -> str:
    """Create SHA256 hash of input string"""
    return hashlib.sha256(input_string.encode()).hexdigest()


def get_table_name(base_name: str, stage: str = None) -> str:
    """Get environment-specific table name"""
    if not stage:
        stage = os.environ.get('STAGE', 'dev')
    
    # Use environment variable if available, otherwise construct
    env_var = f"{base_name.upper().replace('-', '_')}_TABLE"
    table_name = os.environ.get(env_var)
    
    if table_name:
        return table_name
    
    # Fallback construction
    return f"{base_name}-{stage}"


def get_database_secret() -> Dict[str, Any]:
    """Get database credentials from AWS Secrets Manager"""
    try:
        secret_arn = os.environ.get('DB_SECRET_ARN')
        if not secret_arn:
            raise Exception("DB_SECRET_ARN environment variable not set")
        
        secrets_client = boto3.client('secretsmanager')
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        
        secret_string = response['SecretString']
        return json.loads(secret_string)
        
    except Exception as e:
        print(f"Error getting database secret: {str(e)}")
        raise


def standardize_error_response(error: Exception, context: str = "") -> Dict[str, Any]:
    """Standardize error responses across all Lambda functions"""
    error_type = type(error).__name__
    error_message = str(error)
    
    # Log the full error for debugging
    print(f"Error in {context}: {error_type}: {error_message}")
    
    # Return standardized error structure
    return {
        "error": error_message,
        "error_type": error_type,
        "context": context,
        "timestamp": get_current_time()
    }


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


def log_api_event(event: Dict[str, Any], context: Any, message: str = "API Request"):
    """Log API Gateway event for debugging"""
    try:
        log_data = {
            'message': message,
            'method': event.get('httpMethod'),
            'path': event.get('path'),
            'source_ip': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
            'user_agent': event.get('headers', {}).get('User-Agent'),
            'request_id': context.aws_request_id if hasattr(context, 'aws_request_id') else 'unknown',
            'timestamp': get_current_timestamp()
        }
        
        print(json.dumps(log_data))
        
    except Exception as e:
        print(f"Error logging API event: {str(e)}")


def handle_cors_preflight(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Handle CORS preflight OPTIONS request"""
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(204, {})  # No content for OPTIONS
    
    return None


def format_error_response(error: Exception, status_code: int = 500) -> Dict[str, Any]:
    """Format error response with proper logging"""
    error_message = str(error)
    
    # Log the full error for debugging
    print(f"API Error: {error_message}")
    
    # Return sanitized error message
    return create_response(status_code, {
        'error': 'Internal server error' if status_code == 500 else error_message,
        'timestamp': get_current_timestamp()
    })


# ============================================================================
# ADMISSIONS-SPECIFIC UTILITIES
# Extending existing TSA Coach infrastructure for admissions portal
# ============================================================================

def create_enrollment_response(enrollment_data: Dict[str, Any], status_code: int = 200) -> Dict[str, Any]:
    """Admissions-specific response formatting with enrollment data"""
    try:
        response_body = {
            'enrollment_id': enrollment_data.get('enrollment_id'),
            'status': enrollment_data.get('status', 'pending'),
            'current_step': enrollment_data.get('current_step', 1),
            'progress_percentage': enrollment_data.get('progress_percentage', 0),
            'next_step_name': enrollment_data.get('next_step_name'),
            'created_at': enrollment_data.get('created_at'),
            'updated_at': enrollment_data.get('updated_at')
        }
        
        # Add student information if available
        if enrollment_data.get('student_first_name') or enrollment_data.get('student_last_name'):
            response_body['student_info'] = {
                'first_name': enrollment_data.get('student_first_name', ''),
                'last_name': enrollment_data.get('student_last_name', ''),
                'grade_level': enrollment_data.get('grade_level', ''),
                'sport_interest': enrollment_data.get('sport_interest', '')
            }
        
        # Add coach information if available
        if enrollment_data.get('coach_name') or enrollment_data.get('coach_id'):
            response_body['coach_info'] = {
                'coach_id': enrollment_data.get('coach_id'),
                'coach_name': enrollment_data.get('coach_name', ''),
                'school_name': enrollment_data.get('school_name', '')
            }
        
        return create_response(status_code, response_body)
        
    except Exception as e:
        print(f"Error creating enrollment response: {str(e)}")
        return create_response(500, {'error': 'Failed to format enrollment response'})


def validate_enrollment_step(step_data: Dict[str, Any], step_number: int) -> Dict[str, Any]:
    """Validate enrollment step completion with step-specific requirements"""
    try:
        validation_rules = {
            1: {  # Program Information & Interest Confirmation
                'required_fields': ['program_interest', 'contact_preference'],
                'optional_fields': ['sport_interests', 'additional_questions']
            },
            2: {  # Phone Consultation Scheduling
                'required_fields': ['consultation_date', 'consultation_time', 'preferred_contact_method'],
                'optional_fields': ['consultation_notes', 'special_requests']
            },
            3: {  # Shadow Day Scheduling
                'required_fields': ['shadow_day_date', 'shadow_day_time', 'waiver_signed'],
                'optional_fields': ['transportation_needed', 'dietary_restrictions']
            },
            4: {  # Formal Enrollment Application
                'required_fields': ['student_info', 'parent_info', 'academic_history', 'medical_info'],
                'optional_fields': ['emergency_contacts', 'special_needs']
            },
            5: {  # Document Submission
                'required_fields': ['required_documents_uploaded'],
                'optional_fields': ['additional_documents']
            },
            6: {  # Payment Processing
                'required_fields': ['payment_method', 'payment_plan_selected'],
                'optional_fields': ['financial_aid_application']
            }
        }
        
        if step_number not in validation_rules:
            return {'valid': False, 'error': f'Invalid step number: {step_number}'}
        
        rules = validation_rules[step_number]
        
        # Check required fields
        missing_fields = []
        for field in rules['required_fields']:
            if field not in step_data or not step_data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return {
                'valid': False,
                'error': f'Missing required fields for step {step_number}: {", ".join(missing_fields)}',
                'missing_fields': missing_fields
            }
        
        # Step-specific validations
        if step_number == 3 and not step_data.get('waiver_signed', False):
            return {'valid': False, 'error': 'Waiver must be signed for shadow day'}
        
        if step_number == 4:
            # Validate student info structure
            student_info = step_data.get('student_info', {})
            required_student_fields = ['first_name', 'last_name', 'birth_date', 'grade_level']
            missing_student_fields = [f for f in required_student_fields if not student_info.get(f)]
            if missing_student_fields:
                return {
                    'valid': False,
                    'error': f'Missing student information: {", ".join(missing_student_fields)}'
                }
        
        if step_number == 6:
            # Validate payment method
            payment_method = step_data.get('payment_method')
            if payment_method not in ['credit_card', 'bank_transfer', 'check', 'financial_aid']:
                return {'valid': False, 'error': 'Invalid payment method selected'}
        
        return {
            'valid': True,
            'step_number': step_number,
            'completed_fields': list(step_data.keys())
        }
        
    except Exception as e:
        print(f"Error validating enrollment step {step_number}: {str(e)}")
        return {'valid': False, 'error': f'Validation error: {str(e)}'}


def generate_enrollment_id() -> str:
    """Generate unique enrollment identifier with TSA prefix"""
    try:
        import uuid
        from datetime import datetime
        
        # Format: TSA-ENROLL-YYYYMMDD-SHORTID
        date_str = datetime.utcnow().strftime('%Y%m%d')
        short_id = str(uuid.uuid4())[:8].upper()
        
        enrollment_id = f"TSA-ENROLL-{date_str}-{short_id}"
        
        return enrollment_id
        
    except Exception as e:
        print(f"Error generating enrollment ID: {str(e)}")
        # Fallback to basic UUID
        return f"TSA-ENROLL-{str(uuid.uuid4())[:12].upper()}"


def process_document_upload(file_data: bytes, enrollment_id: str, document_type: str, context: Any = None) -> Dict[str, Any]:
    """Handle secure document uploads to S3 with metadata tracking"""
    try:
        import boto3
        from datetime import datetime
        
        # Validate inputs
        if not file_data or len(file_data) == 0:
            return {'success': False, 'error': 'No file data provided'}
        
        if not enrollment_id or not document_type:
            return {'success': False, 'error': 'Enrollment ID and document type are required'}
        
        # File size limit (10MB)
        if len(file_data) > 10 * 1024 * 1024:
            return {'success': False, 'error': 'File size exceeds 10MB limit'}
        
        # Allowed document types
        allowed_types = [
            'transcript', 'medical_form', 'birth_certificate', 'insurance_card',
            'previous_school_records', 'immunization_records', 'id_verification',
            'financial_aid_documents', 'emergency_contact_form', 'photo_release'
        ]
        
        if document_type not in allowed_types:
            return {'success': False, 'error': f'Invalid document type: {document_type}'}
        
        # Generate secure file path
        timestamp = datetime.utcnow().isoformat().replace(':', '-').replace('.', '-')
        document_id = f"DOC-{enrollment_id}-{document_type}-{timestamp}"
        file_key = f"admissions/{enrollment_id}/{document_type}/{document_id}"
        
        # Upload to S3
        s3_client = boto3.client('s3')
        bucket_name = os.environ.get('DOCUMENTS_BUCKET', 'tsa-documents')
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=file_key,
            Body=file_data,
            ServerSideEncryption='AES256',
            Metadata={
                'enrollment_id': enrollment_id,
                'document_type': document_type,
                'uploaded_at': get_current_timestamp(),
                'document_id': document_id
            },
            ContentType='application/pdf'  # Default to PDF, could be enhanced to detect type
        )
        
        # Store document metadata in DynamoDB
        documents_table = get_dynamodb_table(os.environ.get('DOCUMENTS_TABLE', 'tsa-coach-documents-v1-dev'))
        
        document_metadata = {
            'document_id': document_id,
            'enrollment_id': enrollment_id,
            'document_type': document_type,
            's3_bucket': bucket_name,
            's3_key': file_key,
            'file_size': len(file_data),
            'uploaded_at': get_current_timestamp(),
            'verification_status': 'pending',
            'verified_at': None,
            'verified_by': None,
            'notes': ''
        }
        
        documents_table.put_item(Item=document_metadata)
        
        # Log document upload event
        if context:
            log_enrollment_event(
                enrollment_id,
                'document_uploaded',
                {
                    'document_id': document_id,
                    'document_type': document_type,
                    'file_size': len(file_data)
                },
                context
            )
        
        return {
            'success': True,
            'document_id': document_id,
            's3_key': file_key,
            'document_type': document_type,
            'file_size': len(file_data),
            'uploaded_at': get_current_timestamp()
        }
        
    except Exception as e:
        print(f"Error processing document upload: {str(e)}")
        return {
            'success': False,
            'error': f'Document upload failed: {str(e)}'
        }


def log_enrollment_event(enrollment_id: str, event_type: str, event_data: Dict[str, Any], context: Any = None) -> None:
    """Log enrollment events for analytics using existing logging patterns"""
    try:
        log_entry = {
            'event_category': 'admissions',
            'event_type': event_type,
            'enrollment_id': enrollment_id,
            'event_data': event_data,
            'timestamp': get_current_timestamp(),
            'request_id': context.aws_request_id if context and hasattr(context, 'aws_request_id') else 'unknown'
        }
        
        # Use existing logging pattern
        print(json.dumps(log_entry))
        
        # Optional: Send to CloudWatch metrics for analytics
        if os.environ.get('ENABLE_CLOUDWATCH_METRICS', 'false').lower() == 'true':
            try:
                cloudwatch = boto3.client('cloudwatch')
                cloudwatch.put_metric_data(
                    Namespace='TSA/Admissions',
                    MetricData=[
                        {
                            'MetricName': f'EnrollmentEvent_{event_type}',
                            'Value': 1,
                            'Unit': 'Count',
                            'Dimensions': [
                                {'Name': 'EnrollmentId', 'Value': enrollment_id}
                            ]
                        }
                    ]
                )
            except Exception as e:
                print(f"CloudWatch metrics error: {str(e)}")
        
    except Exception as e:
        print(f"Enrollment event logging error: {str(e)}") 