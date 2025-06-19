"""
Enrollment and Admissions Utilities for TSA Platform
Consolidates enrollment-specific functionality across services
"""
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from .config import get_config
from .response_utils import get_current_timestamp, create_response

logger = logging.getLogger(__name__)
config = get_config()


# =================================================================
# ENROLLMENT RESPONSE UTILITIES
# =================================================================

def create_enrollment_response(enrollment_data: Dict[str, Any], status_code: int = 200) -> Dict[str, Any]:
    """Admissions-specific response formatting with enrollment data"""
    try:
        # Ensure enrollment_data is properly formatted
        formatted_data = {
            'enrollment': enrollment_data,
            'timestamp': get_current_timestamp(),
            'success': status_code < 400
        }
        
        return create_response(status_code, formatted_data)
        
    except Exception as e:
        logger.error(f"Error creating enrollment response: {str(e)}")
        return create_response(500, {
            'error': 'Failed to format enrollment response',
            'timestamp': get_current_timestamp()
        })


# =================================================================
# ENROLLMENT VALIDATION
# =================================================================

def validate_enrollment_step(step_data: Dict[str, Any], step_number: int) -> Dict[str, Any]:
    """
    Validate enrollment step data based on step requirements
    
    Args:
        step_data: Data for the enrollment step
        step_number: Which step in the enrollment process (1-6)
    
    Returns:
        Validation result with errors if any
    """
    try:
        validation_errors = []
        
        # Step-specific validation rules
        step_requirements = {
            1: {  # Student Information
                'required': ['student_first_name', 'student_last_name', 'date_of_birth', 'gender'],
                'optional': ['preferred_name', 'grade_level']
            },
            2: {  # Parent/Guardian Information
                'required': ['parent_first_name', 'parent_last_name', 'parent_email', 'parent_phone'],
                'optional': ['secondary_contact_name', 'secondary_contact_phone']
            },
            3: {  # Academic Information
                'required': ['current_school', 'grade_level', 'academic_year'],
                'optional': ['gpa', 'special_needs', 'learning_accommodations']
            },
            4: {  # Medical Information
                'required': ['medical_conditions', 'medications', 'allergies'],
                'optional': ['doctor_name', 'doctor_phone', 'insurance_provider']
            },
            5: {  # Emergency Contacts
                'required': ['emergency_contact_1_name', 'emergency_contact_1_phone'],
                'optional': ['emergency_contact_2_name', 'emergency_contact_2_phone']
            },
            6: {  # Documents & Agreements
                'required': ['photo_release_signed', 'liability_waiver_signed'],
                'optional': ['medical_form_url', 'enrollment_contract_url']
            }
        }
        
        if step_number not in step_requirements:
            return {
                'valid': False,
                'errors': [f'Invalid step number: {step_number}']
            }
        
        step_reqs = step_requirements[step_number]
        
        # Check required fields
        for field in step_reqs['required']:
            if field not in step_data or not step_data[field]:
                validation_errors.append(f'Missing required field: {field}')
        
        # Validate email format if present
        email_fields = ['parent_email', 'secondary_contact_email']
        for field in email_fields:
            if field in step_data and step_data[field]:
                from .response_utils import validate_email_format
                if not validate_email_format(step_data[field]):
                    validation_errors.append(f'Invalid email format: {field}')
        
        # Validate phone number format if present
        phone_fields = ['parent_phone', 'secondary_contact_phone', 'emergency_contact_1_phone', 'emergency_contact_2_phone']
        for field in phone_fields:
            if field in step_data and step_data[field]:
                if not validate_phone_format(step_data[field]):
                    validation_errors.append(f'Invalid phone format: {field}')
        
        # Validate date of birth if present
        if 'date_of_birth' in step_data and step_data['date_of_birth']:
            if not validate_date_format(step_data['date_of_birth']):
                validation_errors.append('Invalid date of birth format (expected YYYY-MM-DD)')
        
        if validation_errors:
            return {
                'valid': False,
                'errors': validation_errors
            }
        
        return {'valid': True}
        
    except Exception as e:
        logger.error(f"Error validating enrollment step: {str(e)}")
        return {
            'valid': False,
            'errors': [f'Validation error: {str(e)}']
        }


def validate_phone_format(phone: str) -> bool:
    """Validate phone number format"""
    import re
    
    if not phone or not isinstance(phone, str):
        return False
    
    # Remove common formatting characters
    cleaned = re.sub(r'[()-.\s]', '', phone)
    
    # Check if it's all digits and proper length
    if not cleaned.isdigit():
        return False
    
    # US phone numbers should be 10 digits (without country code) or 11 (with +1)
    return len(cleaned) in [10, 11]


def validate_date_format(date_str: str) -> bool:
    """Validate date format (YYYY-MM-DD)"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False


# =================================================================
# ENROLLMENT ID GENERATION
# =================================================================

def generate_enrollment_id() -> str:
    """Generate unique enrollment ID with TSA prefix"""
    timestamp = datetime.utcnow().strftime('%Y%m%d')
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"TSA-{timestamp}-{unique_id}"


# =================================================================
# ENROLLMENT PROGRESS CALCULATION
# =================================================================

def calculate_enrollment_progress(completed_steps: List[int], total_steps: int = 6) -> Dict[str, Any]:
    """
    Calculate enrollment progress based on completed steps
    
    Args:
        completed_steps: List of completed step numbers
        total_steps: Total number of steps in enrollment process
    
    Returns:
        Progress information including percentage and next step
    """
    try:
        if not isinstance(completed_steps, list):
            completed_steps = []
        
        # Remove duplicates and sort
        unique_completed = sorted(list(set(completed_steps)))
        
        # Calculate percentage
        percentage = (len(unique_completed) / total_steps) * 100
        
        # Determine next step
        next_step = None
        for step in range(1, total_steps + 1):
            if step not in unique_completed:
                next_step = step
                break
        
        # Determine status
        if len(unique_completed) == 0:
            status = "not_started"
        elif len(unique_completed) == total_steps:
            status = "completed"
        else:
            status = "in_progress"
        
        return {
            'completed_steps': unique_completed,
            'total_steps': total_steps,
            'percentage': round(percentage, 1),
            'next_step': next_step,
            'status': status,
            'is_complete': len(unique_completed) == total_steps
        }
        
    except Exception as e:
        logger.error(f"Error calculating enrollment progress: {str(e)}")
        return {
            'completed_steps': [],
            'total_steps': total_steps,
            'percentage': 0.0,
            'next_step': 1,
            'status': "error",
            'is_complete': False
        }


# =================================================================
# DOCUMENT PROCESSING
# =================================================================

def process_document_upload(file_data: bytes, enrollment_id: str, document_type: str, 
                           context: Any = None) -> Dict[str, Any]:
    """
    Process document upload for enrollment
    
    Args:
        file_data: File binary data
        enrollment_id: Enrollment ID
        document_type: Type of document (e.g., 'medical_form', 'photo_release')
        context: Lambda context for logging
    
    Returns:
        Upload result with S3 URL if successful
    """
    try:
        import boto3
        import os
        
        # Validate inputs
        if not file_data or not enrollment_id or not document_type:
            return {
                'success': False,
                'error': 'Missing required parameters for document upload'
            }
        
        # S3 configuration
        stage = os.environ.get('STAGE', 'dev')
        bucket_name = f"tsa-enrollment-documents-{stage}"
        
        # Generate S3 key
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        s3_key = f"enrollments/{enrollment_id}/{document_type}_{timestamp}.pdf"
        
        # Upload to S3
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_data,
            ContentType='application/pdf',
            ServerSideEncryption='AES256'
        )
        
        # Generate secure URL
        document_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
        
        # Log upload event
        log_enrollment_event(enrollment_id, 'document_uploaded', {
            'document_type': document_type,
            's3_key': s3_key,
            'file_size': len(file_data)
        }, context)
        
        return {
            'success': True,
            'document_url': document_url,
            's3_key': s3_key,
            'document_type': document_type
        }
        
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        return {
            'success': False,
            'error': f'Document upload failed: {str(e)}'
        }


# =================================================================
# INVITATION TOKEN VALIDATION
# =================================================================

def validate_invitation_token(token: str) -> Dict[str, Any]:
    """
    Validate enrollment invitation token
    
    Args:
        token: Invitation token to validate
    
    Returns:
        Validation result with token details if valid
    """
    try:
        import boto3
        import os
        
        if not token:
            return {
                'valid': False,
                'error': 'No invitation token provided'
            }
        
        # Get invitations table
        stage = os.environ.get('STAGE', 'dev')
        table_name = config.get_table_name('invitations', stage)
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Look up invitation by token
        response = table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': token}
        )
        
        items = response.get('Items', [])
        if not items:
            return {
                'valid': False,
                'error': 'Invalid invitation token'
            }
        
        invitation = items[0]
        
        # Check if token has expired
        expires_at = invitation.get('expires_at')
        if expires_at:
            import time
            if int(time.time()) > int(expires_at):
                return {
                    'valid': False,
                    'error': 'Invitation token has expired'
                }
        
        # Check if token has already been used
        if invitation.get('used', False):
            return {
                'valid': False,
                'error': 'Invitation token has already been used'
            }
        
        return {
            'valid': True,
            'invitation': invitation,
            'parent_email': invitation.get('parent_email'),
            'student_name': invitation.get('student_name'),
            'coach_id': invitation.get('coach_id')
        }
        
    except Exception as e:
        logger.error(f"Error validating invitation token: {str(e)}")
        return {
            'valid': False,
            'error': f'Token validation failed: {str(e)}'
        }


# =================================================================
# NOTIFICATION UTILITIES
# =================================================================

def format_enrollment_notification_data(enrollment_data: Dict[str, Any], 
                                       notification_type: str) -> Dict[str, Any]:
    """
    Format enrollment data for notifications
    
    Args:
        enrollment_data: Enrollment information
        notification_type: Type of notification (e.g., 'step_completed', 'enrollment_submitted')
    
    Returns:
        Formatted notification data
    """
    try:
        base_data = {
            'enrollment_id': enrollment_data.get('enrollment_id'),
            'student_name': f"{enrollment_data.get('student_first_name', '')} {enrollment_data.get('student_last_name', '')}".strip(),
            'parent_email': enrollment_data.get('parent_email'),
            'timestamp': get_current_timestamp(),
            'notification_type': notification_type
        }
        
        # Add notification-specific data
        if notification_type == 'step_completed':
            progress = calculate_enrollment_progress(
                enrollment_data.get('completed_steps', [])
            )
            base_data.update({
                'progress_percentage': progress['percentage'],
                'next_step': progress['next_step'],
                'is_complete': progress['is_complete']
            })
        
        elif notification_type == 'enrollment_submitted':
            base_data.update({
                'submission_date': enrollment_data.get('submitted_at'),
                'coach_id': enrollment_data.get('assigned_coach_id')
            })
        
        elif notification_type == 'document_required':
            base_data.update({
                'required_documents': enrollment_data.get('missing_documents', []),
                'due_date': enrollment_data.get('document_due_date')
            })
        
        return base_data
        
    except Exception as e:
        logger.error(f"Error formatting notification data: {str(e)}")
        return {
            'error': f'Failed to format notification: {str(e)}',
            'timestamp': get_current_timestamp()
        }


# =================================================================
# LOGGING UTILITIES
# =================================================================

def log_enrollment_event(enrollment_id: str, event_type: str, event_data: Dict[str, Any], 
                        context: Any = None) -> None:
    """
    Log enrollment-related events for audit and monitoring
    
    Args:
        enrollment_id: Enrollment identifier
        event_type: Type of event (e.g., 'step_completed', 'document_uploaded')
        event_data: Additional event data
        context: Lambda context for request ID
    """
    try:
        import boto3
        import os
        
        log_entry = {
            'log_id': str(uuid.uuid4()),
            'enrollment_id': enrollment_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': get_current_timestamp(),
            'request_id': context.aws_request_id if context and hasattr(context, 'aws_request_id') else 'unknown'
        }
        
        # Log to CloudWatch
        logger.info(f"Enrollment event: {json.dumps(log_entry)}")
        
        # Also store in DynamoDB for audit trail
        stage = os.environ.get('STAGE', 'dev')
        table_name = config.get_table_name('enrollment-logs', stage)
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        table.put_item(Item=log_entry)
        
    except Exception as e:
        # Don't raise - logging failure shouldn't break main operation
        logger.error(f"Error logging enrollment event: {str(e)}")


# =================================================================
# DATABASE UTILITIES
# =================================================================

def get_database_secret() -> Dict[str, Any]:
    """Get database credentials from AWS Secrets Manager"""
    try:
        import boto3
        import os
        
        secret_arn = os.environ.get('DB_SECRET_ARN')
        if not secret_arn:
            raise ValueError("DB_SECRET_ARN environment variable not set")
        
        secrets_client = boto3.client('secretsmanager')
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        
        return json.loads(response['SecretString'])
        
    except Exception as e:
        logger.error(f"Error retrieving database secret: {str(e)}")
        raise


def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource with error handling"""
    try:
        import boto3
        
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        logger.error(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise 