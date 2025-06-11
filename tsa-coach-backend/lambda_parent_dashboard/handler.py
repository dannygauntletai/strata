"""
Parent Dashboard Handler
Handles parent authentication verification and dashboard data
Integrates with existing TSA Coach infrastructure for unified platform
"""
import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any, List

# Import shared utilities (with fallback per .cursorrules)
try:
    from shared_utils import (
        create_response, 
        parse_event_body, 
        validate_required_fields,
        get_current_timestamp,
        get_dynamodb_table
    )
    SHARED_UTILS_AVAILABLE = True
except ImportError:
    SHARED_UTILS_AVAILABLE = False
    print("Warning: Shared utils not available, using fallback functions")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for parent dashboard operations"""
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return create_response(204, {})
        
        # Route based on path and method
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        
        if '/parent/auth/magic-link' in path and method == 'POST':
            return handle_parent_magic_link_request(event, context)
        elif '/parent/dashboard' in path and method == 'GET':
            return get_parent_dashboard(event, context)
        elif '/parent/profile' in path and method == 'GET':
            return get_parent_profile(event, context)
        elif '/parent/profile' in path and method == 'PUT':
            return update_parent_profile(event, context)
        elif '/parent/enrollments' in path and method == 'GET':
            return get_parent_enrollments(event, context)
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Error in parent dashboard handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def handle_parent_magic_link_request(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle magic link request for parent authentication"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        validation = validate_required_fields(body, ['email'])
        if not validation['valid']:
            return create_response(400, {'error': validation['error']})
        
        email = body['email'].lower().strip()
        invitation_token = body.get('invitation_token')  # Optional for new parents
        
        # Call existing magic link handler
        magic_link_request = {
            'email': email,
            'user_role': 'parent',
            'invitation_token': invitation_token
        }
        
        # Make request to existing magic link lambda
        lambda_client = boto3.client('lambda')
        magic_link_function = os.environ.get('MAGIC_LINK_FUNCTION_NAME', 'tsa-coach-magic-link-handler')
        
        try:
            response = lambda_client.invoke(
                FunctionName=magic_link_function,
                InvocationType='RequestResponse',
                Payload=json.dumps({
                    'httpMethod': 'POST',
                    'body': json.dumps(magic_link_request)
                })
            )
            
            result = json.loads(response['Payload'].read().decode('utf-8'))
            
            if result.get('statusCode') == 200:
                return create_response(200, {
                    'message': 'Magic link sent successfully',
                    'email': email,
                    'user_role': 'parent'
                })
            else:
                error_body = json.loads(result.get('body', '{}'))
                return create_response(result.get('statusCode', 500), error_body)
                
        except Exception as e:
            print(f"Error calling magic link function: {str(e)}")
            return create_response(500, {'error': 'Failed to send magic link'})
            
    except Exception as e:
        print(f"Error handling parent magic link request: {str(e)}")
        return create_response(500, {'error': 'Failed to process magic link request'})


def get_parent_dashboard(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get parent dashboard data (parent portal only per restructured architecture)"""
    try:
        # Extract parent email from headers (set by authorizer or magic link auth)
        headers = event.get('headers', {})
        parent_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not parent_email:
            return create_response(401, {'error': 'Authentication required'})
        
        # This function now only handles parent dashboards per restructured architecture
        return get_parent_dashboard_data(parent_email, event, context)
        
    except Exception as e:
        print(f"Error getting parent dashboard: {str(e)}")
        return create_response(500, {'error': 'Failed to load dashboard'})


def get_parent_profile(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get parent profile information"""
    try:
        # Extract parent email from headers
        headers = event.get('headers', {})
        parent_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not parent_email:
            return create_response(401, {'error': 'Authentication required'})
        
        # Get parent profile data
        profile_data = get_parent_profile_data(parent_email)
        if not profile_data:
            return create_response(404, {'error': 'Profile not found'})
        
        return create_response(200, profile_data)
        
    except Exception as e:
        print(f"Error getting parent profile: {str(e)}")
        return create_response(500, {'error': 'Failed to get profile'})


def update_parent_profile(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Update parent profile information"""
    try:
        # Extract parent email from headers
        headers = event.get('headers', {})
        parent_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not parent_email:
            return create_response(401, {'error': 'Authentication required'})
        
        body = parse_event_body(event)
        
        # Get existing profile
        existing_profile = get_parent_profile_data(parent_email)
        if not existing_profile:
            return create_response(404, {'error': 'Profile not found'})
        
        # Update profile data
        profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles'))
        profile_id = existing_profile['profile_id']
        
        # Prepare update expression
        update_expressions = []
        expression_values = {}
        expression_names = {}
        
        updatable_fields = ['first_name', 'last_name', 'phone_number', 'emergency_contact', 'communication_preferences']
        
        for field in updatable_fields:
            if field in body:
                update_expressions.append(f"#{field} = :{field}")
                expression_names[f"#{field}"] = field
                expression_values[f":{field}"] = body[field]
        
        if update_expressions:
            update_expressions.append("#updated_at = :updated_at")
            expression_names["#updated_at"] = "updated_at"
            expression_values[":updated_at"] = get_current_timestamp()
            
            profiles_table.update_item(
                Key={'profile_id': profile_id},
                UpdateExpression=f"SET {', '.join(update_expressions)}",
                ExpressionAttributeNames=expression_names,
                ExpressionAttributeValues=expression_values
            )
        
        # Return updated profile
        updated_profile = get_parent_profile_data(parent_email)
        return create_response(200, updated_profile)
        
    except Exception as e:
        print(f"Error updating parent profile: {str(e)}")
        return create_response(500, {'error': 'Failed to update profile'})


def get_parent_enrollments(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get all enrollments for parent"""
    try:
        # Extract parent email from headers
        headers = event.get('headers', {})
        parent_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not parent_email:
            return create_response(401, {'error': 'Authentication required'})
        
        # Get enrollment data
        enrollments = get_parent_enrollment_data(parent_email)
        
        return create_response(200, {
            'enrollments': enrollments,
            'total_count': len(enrollments)
        })
        
    except Exception as e:
        print(f"Error getting parent enrollments: {str(e)}")
        return create_response(500, {'error': 'Failed to get enrollments'})


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_parent_profile_data(parent_email: str) -> Dict[str, Any]:
    """Get parent profile data from DynamoDB"""
    try:
        profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles'))
        
        # Scan for parent profile by email
        response = profiles_table.scan(
            FilterExpression='email = :email AND role_type = :role',
            ExpressionAttributeValues={
                ':email': parent_email,
                ':role': 'parent'
            },
            Limit=1
        )
        
        if response['Items']:
            return response['Items'][0]
        
        return None
        
    except Exception as e:
        print(f"Error getting parent profile data: {str(e)}")
        return None


def get_parent_enrollment_data(parent_email: str) -> List[Dict[str, Any]]:
    """Get all enrollment data for parent"""
    try:
        enrollments_table = get_dynamodb_table(os.environ.get('ENROLLMENTS_TABLE', 'tsa-coach-enrollments-v3-dev'))
        
        # Query enrollments by parent email
        response = enrollments_table.scan(
            FilterExpression='parent_email = :email',
            ExpressionAttributeValues={':email': parent_email}
        )
        
        enrollments = []
        for item in response.get('Items', []):
            # Calculate progress for each enrollment
            completed_steps = item.get('completed_steps', [])
            progress_percentage = (len(completed_steps) / 6) * 100  # 6 total steps
            
            enrollment_summary = {
                'enrollment_id': item.get('enrollment_id'),
                'student_name': f"{item.get('student_first_name', '')} {item.get('student_last_name', '')}".strip(),
                'coach_name': item.get('coach_name', ''),
                'school_name': item.get('school_name', ''),
                'grade_level': item.get('grade_level', ''),
                'sport_interest': item.get('sport_interest', ''),
                'status': item.get('status', 'pending'),
                'current_step': item.get('current_step', 1),
                'progress_percentage': round(progress_percentage, 1),
                'completed_steps': completed_steps,
                'created_at': item.get('created_at'),
                'updated_at': item.get('updated_at')
            }
            enrollments.append(enrollment_summary)
        
        return enrollments
        
    except Exception as e:
        print(f"Error getting parent enrollment data: {str(e)}")
        return []


def get_recent_activity(parent_email: str) -> List[Dict[str, Any]]:
    """Get recent activity for parent"""
    try:
        # This would typically query an activity log table
        # For now, return mock recent activity based on enrollments
        enrollments = get_parent_enrollment_data(parent_email)
        
        recent_activity = []
        for enrollment in enrollments:
            # Add recent updates based on enrollment status
            if enrollment.get('updated_at'):
                activity = {
                    'type': 'enrollment_update',
                    'message': f"Enrollment progress updated for {enrollment['student_name']}",
                    'enrollment_id': enrollment['enrollment_id'],
                    'timestamp': enrollment['updated_at']
                }
                recent_activity.append(activity)
        
        # Sort by timestamp (most recent first)
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return recent_activity[:10]  # Return last 10 activities
        
    except Exception as e:
        print(f"Error getting recent activity: {str(e)}")
        return []


def get_pending_tasks(enrollments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Get pending tasks based on enrollment status"""
    try:
        pending_tasks = []
        
        for enrollment in enrollments:
            if enrollment.get('status') == 'pending':
                current_step = enrollment.get('current_step', 1)
                
                # Define tasks based on current step
                step_tasks = {
                    1: "Review program information and confirm interest",
                    2: "Schedule phone consultation with coach",
                    3: "Schedule and attend shadow day",
                    4: "Complete student enrollment forms",
                    5: "Upload required documents",
                    6: "Complete payment and finalize enrollment"
                }
                
                if current_step in step_tasks:
                    task = {
                        'enrollment_id': enrollment['enrollment_id'],
                        'student_name': enrollment['student_name'],
                        'task': step_tasks[current_step],
                        'step_number': current_step,
                        'priority': 'high' if current_step <= 2 else 'medium',
                        'created_at': enrollment.get('created_at')
                    }
                    pending_tasks.append(task)
        
        return pending_tasks
        
    except Exception as e:
        print(f"Error getting pending tasks: {str(e)}")
        return []


def get_parent_dashboard_data(parent_email: str, event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get parent dashboard data (existing functionality)"""
    try:
        # Get parent profile
        parent_profile = get_parent_profile_data(parent_email)
        if not parent_profile:
            return create_response(404, {'error': 'Parent profile not found'})
        
        # Get enrollment data
        enrollments = get_parent_enrollment_data(parent_email)
        
        # Get recent activity
        recent_activity = get_recent_activity(parent_email)
        
        # Get pending tasks
        pending_tasks = get_pending_tasks(enrollments)
        
        # Prepare dashboard response
        dashboard_data = {
            'parent_info': {
                'email': parent_email,
                'first_name': parent_profile.get('first_name', ''),
                'last_name': parent_profile.get('last_name', ''),
                'profile_id': parent_profile.get('profile_id')
            },
            'enrollments': enrollments,
            'pending_tasks': pending_tasks,
            'recent_activity': recent_activity,
            'summary': {
                'total_enrollments': len(enrollments),
                'active_enrollments': len([e for e in enrollments if e.get('status') == 'active']),
                'pending_tasks': len(pending_tasks)
            }
        }
        
        return create_response(200, dashboard_data)
        
    except Exception as e:
        print(f"Error getting parent dashboard: {str(e)}")
        return create_response(500, {'error': 'Failed to load dashboard'})


# ============================================================================
# FALLBACK FUNCTIONS (if shared_utils not available)
# ============================================================================

if not SHARED_UTILS_AVAILABLE:
    def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email'
            },
            'body': json.dumps(body, default=str)
        }
    
    def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
        try:
            body = event.get('body', '{}')
            if isinstance(body, str):
                return json.loads(body) if body else {}
            return body if isinstance(body, dict) else {}
        except Exception:
            return {}
    
    def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            return {'valid': False, 'error': f"Missing required fields: {', '.join(missing_fields)}"}
        return {'valid': True}
    
    def get_current_timestamp() -> str:
        return datetime.utcnow().isoformat() + 'Z'
    
    def get_dynamodb_table(table_name: str):
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name) 