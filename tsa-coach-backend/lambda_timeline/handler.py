"""
Coach Timeline Handler - Clean Architecture with Centralized Models
Tracks coach progress events and provides timeline status for wizard flow UI.
Moved from events handler where it was incorrectly placed.
"""
import json
from typing import Dict, Any, List, Optional

# Import centralized models and utilities - NO fallback pattern
from tsa_shared import (
    create_api_response, parse_event_body, get_current_time, 
    standardize_error_response, get_table_name, get_dynamodb_table,
    generate_id, UserIdentifier, CoachProfile, TimelineEvent
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler - NO CORS, uses centralized models"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        
        print(f"📊 Timeline: {http_method} {path}")
        
        if http_method == 'GET':
            if '/status' in path:
                return get_timeline_status(query_params)
            elif 'event_id' in path_params:
                return get_timeline_event(path_params['event_id'])
            else:
                return list_timeline_events(query_params)
        elif http_method == 'POST':
            return create_timeline_event(event)
        elif http_method == 'PUT' and 'event_id' in path_params:
            return update_timeline_event(path_params['event_id'], event)
        elif '/health' in path and http_method == 'GET':
            return get_health_status()
        else:
            return create_response(404, {
                'error': 'Endpoint not found',
                'available_endpoints': [
                    'GET /timeline', 'GET /timeline/status', 'GET /timeline/{id}',
                    'POST /timeline', 'PUT /timeline/{id}'
                ]
            })
            
    except Exception as e:
        print(f"💥 Handler Error: {str(e)}")
        return create_response(500, format_error_response(e, "lambda_handler"))


def get_timeline_status(query_params: Dict[str, Any]) -> Dict[str, Any]:
    """Get timeline status with auto-detection of completed steps"""
    try:
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Use centralized ID mapping - convert email to profile_id if needed
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Initialize status tracking
        timeline_status = {}
        
        # 1. Check onboarding completion
        timeline_status['onboarding'] = check_onboarding_status(normalized_profile_id, profiles_table)
        
        # 2. Check background check completion
        timeline_status['background_check'] = check_background_check_status(normalized_profile_id)
        
        # 3. Check bootcamp progress
        timeline_status['bootcamp_completion'] = check_bootcamp_status(normalized_profile_id, profiles_table)
        
        # 4. Check events created (Host Events step)
        timeline_status['host_events'] = check_events_status(normalized_profile_id)
        
        # 5. Check parent invitations sent (Invite Students step)
        timeline_status['invite_students'] = check_invitations_status(normalized_profile_id)
        
        # 6. Check student enrollment
        timeline_status['student_enrollment'] = check_enrollment_status(normalized_profile_id)
        
        # Calculate overall progress
        completed_steps = sum(1 for step in timeline_status.values() if step['status'] == 'completed')
        total_steps = len(timeline_status)
        
        progress_summary = {
            'completed_steps': completed_steps,
            'total_steps': total_steps,
            'completion_percentage': (completed_steps / total_steps * 100) if total_steps > 0 else 0,
            'current_step': get_current_step(timeline_status)
        }
        
        return create_response(200, {
            'timeline_status': timeline_status,
            'progress_summary': progress_summary,
            'coach_id': normalized_profile_id
        })
        
    except Exception as e:
        print(f"💥 Error getting timeline status: {str(e)}")
        return create_response(500, format_error_response(e, "get_timeline_status"))


def check_onboarding_status(profile_id: str, profiles_table) -> Dict[str, Any]:
    """Check onboarding completion status"""
    try:
        response = profiles_table.get_item(Key={'profile_id': profile_id})
        
        if 'Item' not in response:
            return {
                'status': 'not_started',
                'auto_detected': False,
                'error': 'Profile not found'
            }
        
        profile = CoachProfile(response['Item'])
        is_complete = profile.is_onboarding_complete()
        
        return {
            'status': 'completed' if is_complete else 'in_progress',
            'auto_detected': True,
            'details': {
                'profile_complete': bool(profile.first_name and profile.last_name and profile.school_name),
                'onboarding_progress': profile.onboarding_progress
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def check_background_check_status(profile_id: str) -> Dict[str, Any]:
    """Check background check completion status"""
    try:
        background_checks_table = get_dynamodb_table(get_table_name('background_checks'))
        
        response = background_checks_table.get_item(Key={'profile_id': profile_id})
        
        if 'Item' not in response:
            return {
                'status': 'not_started',
                'auto_detected': True,
                'details': {'checkr_status': 'not_initiated'}
            }
        
        check_data = response['Item']
        checkr_status = check_data.get('checkr_status', 'pending')
        
        status_mapping = {
            'clear': 'completed',
            'consider': 'completed',  # May need review but completed
            'suspended': 'blocked',
            'dispute': 'in_review'
        }
        
        return {
            'status': status_mapping.get(checkr_status, 'in_progress'),
            'auto_detected': True,
            'details': {
                'checkr_status': checkr_status,
                'initiated_at': check_data.get('created_at'),
                'completed_at': check_data.get('completed_at')
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def check_bootcamp_status(profile_id: str, profiles_table) -> Dict[str, Any]:
    """Check bootcamp completion status"""
    try:
        response = profiles_table.get_item(Key={'profile_id': profile_id})
        
        if 'Item' not in response:
            return {
                'status': 'not_started',
                'auto_detected': False,
                'error': 'Profile not found'
            }
        
        profile = CoachProfile(response['Item'])
        completion_percentage = profile.get_bootcamp_completion_percentage()
        
        if completion_percentage >= 80:
            status = 'completed'
        elif completion_percentage > 0:
            status = 'in_progress'
        else:
            status = 'not_started'
        
        return {
            'status': status,
            'auto_detected': True,
            'details': {
                'completion_percentage': completion_percentage,
                'modules_completed': len(profile.bootcamp_progress.get('modules_completed', [])),
                'certifications_earned': len(profile.bootcamp_progress.get('certifications_earned', []))
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def check_events_status(profile_id: str) -> Dict[str, Any]:
    """Check if coach has created events"""
    try:
        events_table = get_dynamodb_table(get_table_name('events'))
        
        response = events_table.scan(
            FilterExpression='created_by = :profile_id',
            ExpressionAttributeValues={':profile_id': profile_id},
            Select='COUNT'
        )
        
        events_count = response['Count']
        
        return {
            'status': 'completed' if events_count > 0 else 'not_started',
            'auto_detected': True,
            'details': {
                'events_created': events_count
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def check_invitations_status(profile_id: str) -> Dict[str, Any]:
    """Check if coach has sent parent invitations"""
    try:
        invitations_table = get_dynamodb_table(get_table_name('parent_invitations'))
        
        response = invitations_table.scan(
            FilterExpression='coach_id = :profile_id',
            ExpressionAttributeValues={':profile_id': profile_id},
            Select='COUNT'
        )
        
        invitations_count = response['Count']
        
        return {
            'status': 'completed' if invitations_count > 0 else 'not_started',
            'auto_detected': True,
            'details': {
                'invitations_sent': invitations_count
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def check_enrollment_status(profile_id: str) -> Dict[str, Any]:
    """Check if students have enrolled under this coach"""
    try:
        enrollments_table = get_dynamodb_table(get_table_name('enrollments'))
        
        response = enrollments_table.scan(
            FilterExpression='coach_id = :profile_id AND enrollment_status = :status',
            ExpressionAttributeValues={
                ':profile_id': profile_id,
                ':status': 'enrolled'
            },
            Select='COUNT'
        )
        
        enrollments_count = response['Count']
        
        return {
            'status': 'completed' if enrollments_count > 0 else 'not_started',
            'auto_detected': True,
            'details': {
                'students_enrolled': enrollments_count
            }
        }
        
    except Exception as e:
        return {
            'status': 'not_started',
            'auto_detected': False,
            'error': str(e)
        }


def get_current_step(timeline_status: Dict[str, Any]) -> str:
    """Determine the current step based on status"""
    step_order = [
        'onboarding', 'background_check', 'bootcamp_completion',
        'host_events', 'invite_students', 'student_enrollment'
    ]
    
    for step in step_order:
        if step in timeline_status:
            status = timeline_status[step]['status']
            if status in ['not_started', 'in_progress']:
                return step
    
    return 'completed'  # All steps done


def list_timeline_events(query_params: Dict[str, Any]) -> Dict[str, Any]:
    """List timeline events for a coach"""
    try:
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        timeline_table = get_dynamodb_table(get_table_name('timeline_events'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Query timeline events for this coach
        response = timeline_table.scan(
            FilterExpression='coach_id = :coach_id',
            ExpressionAttributeValues={':coach_id': normalized_profile_id}
        )
        
        # Convert to TimelineEvent models for consistency
        events = []
        for item in response.get('Items', []):
            event_model = TimelineEvent(item)
            events.append(event_model.to_dict())
        
        # Sort by created_at
        events.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_response(200, {
            'timeline_events': events,
            'count': len(events)
        })
        
    except Exception as e:
        print(f"💥 Error listing timeline events: {str(e)}")
        return create_response(500, format_error_response(e, "list_timeline_events"))


def create_timeline_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new timeline event"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['coach_id', 'event_type', 'title']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Normalize coach_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        timeline_table = get_dynamodb_table(get_table_name('timeline_events'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Create timeline event using centralized model
        event_data = {
            'event_id': generate_id('timeline'),
            'coach_id': normalized_profile_id,
            'event_type': body['event_type'],
            'title': body['title'],
            'description': body.get('description', ''),
            'status': body.get('status', 'pending'),
            'progress_percentage': body.get('progress_percentage', 0),
            'metadata': body.get('metadata', {}),
            'created_at': get_current_timestamp(),
            'completed_at': body.get('completed_at')
        }
        
        # Use TimelineEvent model for validation
        timeline_event = TimelineEvent(event_data)
        
        # Save to DynamoDB
        timeline_table.put_item(Item=timeline_event.to_dict())
        
        print(f"✅ Timeline event created: {timeline_event.event_id}")
        return create_response(201, {
            'message': 'Timeline event created successfully',
            'timeline_event': timeline_event.to_dict()
        })
        
    except Exception as e:
        print(f"💥 Error creating timeline event: {str(e)}")
        return create_response(500, format_error_response(e, "create_timeline_event"))


def update_timeline_event(event_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update a timeline event"""
    try:
        body = parse_event_body(event)
        
        timeline_table = get_dynamodb_table(get_table_name('timeline_events'))
        
        # Check if event exists
        response = timeline_table.get_item(Key={'event_id': event_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Timeline event not found'})
        
        # Build update expression
        updatable_fields = [
            'title', 'description', 'status', 'progress_percentage', 
            'metadata', 'completed_at'
        ]
        
        update_expressions = []
        expression_values = {}
        
        for field in updatable_fields:
            if field in body:
                update_expressions.append(f'{field} = :{field}')
                expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No valid fields to update'})
        
        # Update timeline event
        timeline_table.update_item(
            Key={'event_id': event_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeValues=expression_values
        )
        
        # Return updated event
        updated_response = timeline_table.get_item(Key={'event_id': event_id})
        updated_event = TimelineEvent(updated_response['Item'])
        
        return create_response(200, {
            'message': 'Timeline event updated successfully',
            'timeline_event': updated_event.to_dict()
        })
        
    except Exception as e:
        print(f"💥 Error updating timeline event: {str(e)}")
        return create_response(500, format_error_response(e, "update_timeline_event"))


def get_timeline_event(event_id: str) -> Dict[str, Any]:
    """Get a specific timeline event by ID"""
    try:
        timeline_table = get_dynamodb_table(get_table_name('timeline_events'))
        
        response = timeline_table.get_item(Key={'event_id': event_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Timeline event not found'})
        
        # Use TimelineEvent model for consistency
        timeline_event = TimelineEvent(response['Item'])
        
        return create_response(200, {
            'timeline_event': timeline_event.to_dict()
        })
        
    except Exception as e:
        print(f"💥 Error getting timeline event: {str(e)}")
        return create_response(500, format_error_response(e, "get_timeline_event"))


def get_health_status() -> Dict[str, Any]:
    """Health check with DynamoDB connectivity test"""
    try:
        timeline_table = get_dynamodb_table(get_table_name('timeline_events'))
        timeline_table.load()
        
        return create_response(200, {
            'status': 'healthy',
            'service': 'coach-timeline',
            'timestamp': get_current_timestamp(),
            'version': '2.0.0'
        })
        
    except Exception as e:
        print(f"💥 Health Error: {str(e)}")
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e)
        })
