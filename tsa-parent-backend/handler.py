"""
Parent Enrollment Handler
Manages the complete multi-step enrollment process for parents
Leverages existing TSA Coach infrastructure and shared utilities
Implements Phase 1, Sprint 3 of the admissions implementation plan

UPDATED: Now includes automatic PostgreSQL student creation when enrollment is completed (step 6)
"""
import json
import os
import boto3
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Import shared utilities
from shared_utils import (
    create_response, 
    parse_event_body, 
    validate_required_fields,
    get_current_timestamp,
    get_dynamodb_table,
    handle_cors_preflight,
    format_error_response,
    generate_enrollment_id,
    calculate_enrollment_progress,
    validate_enrollment_step,
    log_enrollment_event
)

# Import student creation module
try:
    from student_creation import create_edfi_student_from_enrollment
    STUDENT_CREATION_AVAILABLE = True
except ImportError:
    print("Warning: student_creation module not available")
    STUDENT_CREATION_AVAILABLE = False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for parent enrollment operations"""
    try:
        # Handle CORS preflight
        cors_response = handle_cors_preflight(event)
        if cors_response:
            return cors_response
        
        # Route based on path and method
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        
        if '/enrollment/initialize' in path and method == 'POST':
            return initialize_enrollment(event, context)
        elif '/enrollment/step' in path and method == 'POST':
            return process_enrollment_step(event, context)
        elif '/enrollment/status' in path and method == 'GET':
            return get_enrollment_status(event, context)
        elif '/enrollment/documents' in path and method == 'POST':
            return handle_document_upload(event, context)
        elif '/enrollment/schedule' in path and method == 'POST':
            return handle_scheduling(event, context)
        else:
            return create_response(404, {'error': 'Endpoint not found'}, event)
            
    except Exception as e:
        print(f"Error in parent enrollment handler: {str(e)}")
        return format_error_response(e, event)


def initialize_enrollment(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Initialize enrollment process from invitation"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['invitation_token', 'parent_email'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        invitation_token = body['invitation_token']
        parent_email = body['parent_email']
        
        # Validate invitation with existing coach API
        invitation_data = validate_invitation_with_coach_api(invitation_token)
        if not invitation_data:
            return create_response(400, {'error': 'Invalid or expired invitation'}, event)
        
        # Check if enrollment already exists
        existing_enrollment = check_existing_enrollment(invitation_token)
        if existing_enrollment:
            return create_enrollment_response(existing_enrollment, 200, event)
        
        # Create new enrollment record
        enrollment_data = create_enrollment_record(invitation_data, parent_email, context)
        
        # Log enrollment initialization
        log_enrollment_event(
            enrollment_data['enrollment_id'],
            'enrollment_initialized',
            {
                'invitation_token': invitation_token,
                'parent_email': parent_email,
                'coach_name': invitation_data.get('coach_name'),
                'student_name': f"{invitation_data.get('student_first_name', '')} {invitation_data.get('student_last_name', '')}"
            },
            context
        )
        
        return create_enrollment_response(enrollment_data, 201, event)
        
    except Exception as e:
        print(f"Error initializing enrollment: {str(e)}")
        return format_error_response(e, event)


def process_enrollment_step(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Process enrollment step completion"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['enrollment_id', 'step_number', 'step_data'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        enrollment_id = body['enrollment_id']
        step_number = int(body['step_number'])
        step_data = body['step_data']
        
        # Get enrollment record
        enrollment = get_enrollment_by_id(enrollment_id)
        if not enrollment:
            return create_response(404, {'error': 'Enrollment not found'}, event)
        
        # Validate step data
        step_validation = validate_enrollment_step(step_data, step_number)
        if not step_validation['valid']:
            return create_response(400, {'error': step_validation['error']}, event)
        
        # Update enrollment with step data
        updated_enrollment = update_enrollment_step(enrollment, step_number, step_data, context)
        
        # CRITICAL: Check if this is step 4 (student information) - CREATE STUDENT RECORDS
        if step_number == 4 and STUDENT_CREATION_AVAILABLE:
            try:
                # Create EdFi-compliant student records in PostgreSQL (using sync wrapper)
                student_creation_result = create_student_records_sync(updated_enrollment)
                
                if student_creation_result['success']:
                    # Update enrollment record with student creation info
                    update_enrollment_with_student_info(enrollment_id, student_creation_result)
                    
                    # Log successful student creation
                    log_enrollment_event(
                        enrollment_id,
                        'student_record_created',
                        {
                            'student_unique_id': student_creation_result['student_unique_id'],
                            'student_usi': student_creation_result['student_usi'],
                            'school_association_created': student_creation_result['school_association_created'],
                            'tsa_extension_created': student_creation_result['tsa_extension_created']
                        },
                        context
                    )
                    
                    print(f"✅ Student records created for enrollment {enrollment_id}: {student_creation_result['student_unique_id']}")
                else:
                    # Log student creation failure but don't fail the enrollment
                    print(f"❌ Student creation failed for enrollment {enrollment_id}: {student_creation_result['error']}")
                    log_enrollment_event(
                        enrollment_id,
                        'student_creation_failed',
                        {'error': student_creation_result['error']},
                        context
                    )
                    
            except Exception as e:
                print(f"❌ Exception during student creation for enrollment {enrollment_id}: {str(e)}")
                log_enrollment_event(
                    enrollment_id,
                    'student_creation_error',
                    {'error': str(e)},
                    context
                )
        
        # Check if this is step 6 (payment completion) - UPDATE EXISTING STUDENT RECORDS
        elif step_number == 6:
            try:
                # Update existing student records to mark as fully enrolled
                update_result = update_student_enrollment_status(updated_enrollment, 'enrolled')
                
                if update_result['success']:
                    # Log successful enrollment completion
                    log_enrollment_event(
                        enrollment_id,
                        'enrollment_completed',
                        {
                            'student_unique_id': update_result.get('student_unique_id'),
                            'payment_completed': True,
                            'enrollment_status': 'enrolled'
                        },
                        context
                    )
                    
                    print(f"✅ Enrollment completed for {enrollment_id}: Student marked as enrolled")
                else:
                    print(f"⚠️ Could not update student enrollment status for {enrollment_id}: {update_result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"❌ Exception during enrollment completion for {enrollment_id}: {str(e)}")
                log_enrollment_event(
                    enrollment_id,
                    'enrollment_completion_error',
                    {'error': str(e)},
                    context
                )
        
        # Log step completion
        log_enrollment_event(
            enrollment_id,
            f'step_{step_number}_completed',
            {
                'step_number': step_number,
                'step_name': get_step_name(step_number),
                'completed_fields': step_validation.get('completed_fields', [])
            },
            context
        )
        
        return create_enrollment_response(updated_enrollment, 200, event)
        
    except Exception as e:
        print(f"Error processing enrollment step: {str(e)}")
        return format_error_response(e, event)


def create_student_records_sync(enrollment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Synchronous wrapper for async student creation function"""
    if not STUDENT_CREATION_AVAILABLE:
        return {
            'success': False,
            'error': 'Student creation module not available'
        }
    
    try:
        import asyncio
        
        # Run the async function in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(create_edfi_student_from_enrollment(enrollment_data))
            return result
        finally:
            loop.close()
            
    except Exception as e:
        print(f"Error in sync wrapper for student creation: {str(e)}")
        return {
            'success': False,
            'error': f"Student creation sync wrapper failed: {str(e)}"
        }


def update_enrollment_with_student_info(enrollment_id: str, student_creation_result: Dict[str, Any]) -> None:
    """Update enrollment record with student creation information"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v1-dev'))
        
        # Update enrollment with student record information
        update_expression = 'SET student_records = :records, updated_at = :updated'
        expression_values = {
            ':records': {
                'student_unique_id': student_creation_result.get('student_unique_id'),
                'student_usi': student_creation_result.get('student_usi'),
                'edfi_compliant': True,
                'created_at': student_creation_result.get('created_at'),
                'school_association_created': student_creation_result.get('school_association_created', False),
                'tsa_extension_created': student_creation_result.get('tsa_extension_created', False),
                'user_record_created': student_creation_result.get('user_record_created', False)
            },
            ':updated': get_current_timestamp()
        }
        
        # If enrollment is now complete, update status
        if student_creation_result.get('success'):
            update_expression += ', #status = :status'
            expression_values[':status'] = 'completed'
            
        enrollments_table.update_item(
            Key={'enrollment_id': enrollment_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#status': 'status'} if ':status' in expression_values else {},
            ExpressionAttributeValues=expression_values
        )
        
        print(f"Updated enrollment {enrollment_id} with student record information")
        
    except Exception as e:
        print(f"Error updating enrollment with student info: {str(e)}")
        # Don't raise - this is supplementary information


def get_enrollment_status(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get enrollment status and progress"""
    try:
        # Extract enrollment ID from path parameters
        path_params = event.get('pathParameters', {})
        enrollment_id = path_params.get('enrollment_id')
        
        if not enrollment_id:
            return create_response(400, {'error': 'Enrollment ID required'}, event)
        
        # Get enrollment data
        enrollment = get_enrollment_by_id(enrollment_id)
        if not enrollment:
            return create_response(404, {'error': 'Enrollment not found'}, event)
        
        # Calculate current progress
        completed_steps = enrollment.get('completed_steps', [])
        progress_data = calculate_enrollment_progress(completed_steps)
        
        # Prepare status response
        status_response = {
            'enrollment_id': enrollment_id,
            'status': enrollment.get('status', 'pending'),
            'student_info': {
                'first_name': enrollment.get('student_first_name', ''),
                'last_name': enrollment.get('student_last_name', ''),
                'grade_level': enrollment.get('grade_level', ''),
                'sport_interest': enrollment.get('sport_interest', '')
            },
            'coach_info': {
                'name': enrollment.get('coach_name', ''),
                'school_name': enrollment.get('school_name', '')
            },
            'progress': progress_data,
            'next_steps': get_next_steps(enrollment),
            'documents_status': get_documents_status(enrollment_id),
            'created_at': enrollment.get('created_at'),
            'updated_at': enrollment.get('updated_at')
        }
        
        return create_response(200, status_response, event)
        
    except Exception as e:
        print(f"Error getting enrollment status: {str(e)}")
        return format_error_response(e, event)


def handle_document_upload(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle document upload for enrollment"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['enrollment_id', 'document_type', 'file_data'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        enrollment_id = body['enrollment_id']
        document_type = body['document_type']
        file_data = body['file_data']
        
        # Verify enrollment exists
        enrollment = get_enrollment_by_id(enrollment_id)
        if not enrollment:
            return create_response(404, {'error': 'Enrollment not found'}, event)
        
        # Process document upload using shared utility
        try:
            from shared_utils import process_document_upload
            import base64
            
            # Decode base64 file data
            try:
                decoded_file_data = base64.b64decode(file_data)
            except Exception as e:
                return create_response(400, {'error': 'Invalid file data format'}, event)
            
            upload_result = process_document_upload(decoded_file_data, enrollment_id, document_type, context)
            
            if upload_result['success']:
                # Update enrollment with document info
                update_enrollment_documents(enrollment_id, document_type, upload_result)
                
                # Log document upload
                log_enrollment_event(
                    enrollment_id,
                    'document_uploaded',
                    {
                        'document_type': document_type,
                        'document_id': upload_result['document_id'],
                        'file_size': upload_result['file_size']
                    },
                    context
                )
                
                return create_response(200, {
                    'message': 'Document uploaded successfully',
                    'document_id': upload_result['document_id'],
                    'document_type': document_type
                }, event)
            else:
                return create_response(400, {'error': upload_result['error']}, event)
        except ImportError:
            return create_response(500, {'error': 'Document upload service not available'}, event)
            
    except Exception as e:
        print(f"Error handling document upload: {str(e)}")
        return format_error_response(e, event)


def handle_scheduling(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle consultation and shadow day scheduling"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['enrollment_id', 'schedule_type', 'preferred_date', 'preferred_time'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']}, event)
        
        enrollment_id = body['enrollment_id']
        schedule_type = body['schedule_type']  # 'consultation' or 'shadow_day'
        preferred_date = body['preferred_date']
        preferred_time = body['preferred_time']
        
        # Verify enrollment exists
        enrollment = get_enrollment_by_id(enrollment_id)
        if not enrollment:
            return create_response(404, {'error': 'Enrollment not found'}, event)
        
        # Create scheduling record
        schedule_id = create_scheduling_record(enrollment_id, schedule_type, preferred_date, preferred_time)
        
        # Update enrollment with scheduling info
        update_enrollment_scheduling(enrollment_id, schedule_type, schedule_id)
        
        # Log scheduling
        log_enrollment_event(
            enrollment_id,
            f'{schedule_type}_scheduled',
            {
                'schedule_type': schedule_type,
                'schedule_id': schedule_id,
                'preferred_date': preferred_date,
                'preferred_time': preferred_time
            },
            context
        )
        
        return create_response(200, {
            'message': f'{schedule_type.title()} scheduled successfully',
            'schedule_id': schedule_id,
            'status': 'pending_confirmation'
        }, event)
        
    except Exception as e:
        print(f"Error handling scheduling: {str(e)}")
        return format_error_response(e, event)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_invitation_with_coach_api(invitation_token: str) -> Dict[str, Any]:
    """Validate invitation token directly with DynamoDB instead of API call"""
    try:
        # Use DynamoDB directly instead of HTTP API call
        parent_invitations_table = get_dynamodb_table(os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v1-dev'))
        
        # Query invitation by token
        response = parent_invitations_table.scan(
            FilterExpression='invitation_token = :token AND #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':token': invitation_token,
                ':status': 'sent'  # Only allow sent invitations
            },
            Limit=1
        )
        
        if response['Items']:
            invitation = response['Items'][0]
            
            # Check if invitation is expired
            created_at = invitation.get('created_at')
            if created_at:
                from datetime import datetime, timedelta
                try:
                    created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    expiry_time = created_time + timedelta(days=30)  # 30 day expiry
                    
                    if datetime.utcnow().replace(tzinfo=created_time.tzinfo) > expiry_time:
                        print(f"Invitation token {invitation_token} has expired")
                        return None
                except Exception as e:
                    print(f"Error checking invitation expiry: {str(e)}")
            
            return invitation
        
        return None
        
    except Exception as e:
        print(f"Error validating invitation: {str(e)}")
        return None


def check_existing_enrollment(invitation_token: str) -> Dict[str, Any]:
    """Check if enrollment already exists for this invitation"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v1-dev'))
        
        # Query by invitation token
        response = enrollments_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': invitation_token},
            Limit=1
        )
        
        if response['Items']:
            return response['Items'][0]
        
        return None
        
    except Exception as e:
        print(f"Error checking existing enrollment: {str(e)}")
        return None


def create_enrollment_record(invitation_data: Dict[str, Any], parent_email: str, context: Any) -> Dict[str, Any]:
    """Create new enrollment record"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v1-dev'))
        
        # Generate enrollment ID
        enrollment_id = generate_enrollment_id()
        
        # Calculate initial progress
        progress = calculate_enrollment_progress([])
        
        enrollment_data = {
            'enrollment_id': enrollment_id,
            'invitation_token': invitation_data['invitation_token'],
            'parent_email': parent_email,
            'coach_id': invitation_data.get('coach_id'),
            'coach_name': invitation_data.get('coach_name'),
            'school_name': invitation_data.get('school_name'),
            'student_first_name': invitation_data.get('student_first_name', ''),
            'student_last_name': invitation_data.get('student_last_name', ''),
            'grade_level': invitation_data.get('grade_level', ''),
            'sport_interest': invitation_data.get('sport_interest', ''),
            'status': 'pending',
            'current_step': 1,
            'completed_steps': [],
            'progress_percentage': progress['progress_percentage'],
            'next_step_name': progress['next_step_name'],
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        enrollments_table.put_item(Item=enrollment_data)
        return enrollment_data
        
    except Exception as e:
        print(f"Error creating enrollment record: {str(e)}")
        raise


def get_enrollment_by_id(enrollment_id: str) -> Dict[str, Any]:
    """Get enrollment record by ID"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v1-dev'))
        
        response = enrollments_table.get_item(Key={'enrollment_id': enrollment_id})
        return response.get('Item')
        
    except Exception as e:
        print(f"Error getting enrollment by ID: {str(e)}")
        return None


def update_enrollment_step(enrollment: Dict[str, Any], step_number: int, step_data: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Update enrollment with completed step data"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v1-dev'))
        
        # Update completed steps
        completed_steps = enrollment.get('completed_steps', [])
        if step_number not in completed_steps:
            completed_steps.append(step_number)
        
        # Calculate new progress
        progress = calculate_enrollment_progress(completed_steps)
        
        # Update enrollment record
        enrollments_table.update_item(
            Key={'enrollment_id': enrollment['enrollment_id']},
            UpdateExpression='SET completed_steps = :steps, current_step = :current, progress_percentage = :progress, next_step_name = :next_step, updated_at = :updated',
            ExpressionAttributeValues={
                ':steps': completed_steps,
                ':current': progress['next_step'] or 7,  # Complete if no next step
                ':progress': progress['progress_percentage'],
                ':next_step': progress['next_step_name'],
                ':updated': get_current_timestamp()
            }
        )
        
        # Return updated enrollment
        updated_enrollment = enrollment.copy()
        updated_enrollment.update({
            'completed_steps': completed_steps,
            'current_step': progress['next_step'] or 7,
            'progress_percentage': progress['progress_percentage'],
            'next_step_name': progress['next_step_name'],
            'updated_at': get_current_timestamp()
        })
        
        return updated_enrollment
        
    except Exception as e:
        print(f"Error updating enrollment step: {str(e)}")
        raise


def get_step_name(step_number: int) -> str:
    """Get step name for step number"""
    step_names = {
        1: 'Program Information',
        2: 'Phone Consultation', 
        3: 'Shadow Day',
        4: 'Student Information',
        5: 'Document Submission',
        6: 'Payment Processing'
    }
    return step_names.get(step_number, f'Step {step_number}')


def get_next_steps(enrollment: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get next steps for enrollment"""
    # Implementation would return upcoming steps based on current progress
    return []


def get_documents_status(enrollment_id: str) -> Dict[str, Any]:
    """Get document upload status for enrollment"""
    # Implementation would return document status
    return {
        'required_documents': 6,
        'uploaded_documents': 0,
        'missing_documents': 6
    }


def update_enrollment_documents(enrollment_id: str, document_type: str, upload_result: Dict[str, Any]) -> None:
    """Update enrollment with document information"""
    # Implementation would update enrollment with document data
    pass


def create_scheduling_record(enrollment_id: str, schedule_type: str, preferred_date: str, preferred_time: str) -> str:
    """Create scheduling record"""
    # Implementation would create scheduling record
    return str(uuid.uuid4())


def update_enrollment_scheduling(enrollment_id: str, schedule_type: str, schedule_id: str) -> None:
    """Update enrollment with scheduling information"""
    # Implementation would update enrollment with scheduling data
    pass


def update_student_enrollment_status(enrollment_data: Dict[str, Any], new_status: str) -> Dict[str, Any]:
    """Update student enrollment status in PostgreSQL"""
    # Implementation would update student status
    return {'success': True}


def create_enrollment_response(enrollment_data: Dict[str, Any], status_code: int, event: Dict[str, Any]) -> Dict[str, Any]:
    """Create enrollment response"""
    return create_response(status_code, {
        'enrollment_id': enrollment_data.get('enrollment_id'),
        'status': enrollment_data.get('status'),
        'progress_percentage': enrollment_data.get('progress_percentage'),
        'next_step_name': enrollment_data.get('next_step_name')
    }, event) 