"""
Bootcamp Progress Handler - Tracks coach bootcamp completion, video progress, and certifications
Integrates with existing quiz system and profiles
"""
import json
import os
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import uuid
from decimal import Decimal

try:
    from shared_utils import (
        create_response, get_dynamodb_table, parse_event_body,
        get_current_timestamp, validate_required_fields, get_path_parameters
    )
    SHARED_UTILS_AVAILABLE = True
except ImportError:
    # Fallback implementations if shared utils aren't available
    SHARED_UTILS_AVAILABLE = False
    import boto3
    dynamodb = boto3.resource('dynamodb')
    
    def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "statusCode": status_code,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Content-Type": "application/json"
            },
            "body": json.dumps(body, default=str)
        }
    
    def get_dynamodb_table(table_name: str):
        return dynamodb.Table(table_name)
    
    def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
        try:
            body = event.get('body', '{}')
            return json.loads(body) if isinstance(body, str) else body
        except:
            return {}
    
    def get_current_timestamp() -> str:
        return datetime.utcnow().isoformat() + 'Z'
    
    def validate_required_fields(data: Dict[str, Any], fields: List[str]) -> str:
        missing = [f for f in fields if f not in data or not data[f]]
        return f"Missing required fields: {', '.join(missing)}" if missing else ""
    
    def get_path_parameters(event: Dict[str, Any]) -> Dict[str, str]:
        return event.get('pathParameters') or {}

# Bootcamp module definitions (matches frontend)
BOOTCAMP_MODULES = {
    1: {
        "id": 1,
        "module": "Foundation",
        "title": "Introduction to TimeBack Learning",
        "description": "Learn the fundamentals of our revolutionary education model",
        "type": "video",
        "duration": 720,  # 12 minutes in seconds
        "prerequisites": [],
        "quiz_id": None
    },
    2: {
        "id": 2,
        "module": "Foundation",
        "title": "Core Principles Quiz",
        "description": "Test your understanding of the basic concepts",
        "type": "quiz",
        "duration": 600,  # 10 minutes
        "questions": 15,
        "prerequisites": [1],
        "quiz_id": "quiz_core_principles"
    },
    3: {
        "id": 3,
        "module": "Foundation",
        "title": "The Science Behind TBL",
        "description": "Understand the research and methodology",
        "type": "video",
        "duration": 1080,  # 18 minutes
        "prerequisites": [2],
        "quiz_id": None
    },
    4: {
        "id": 4,
        "module": "Teaching Methods",
        "title": "AI-Powered Personalization",
        "description": "Learn how AI adapts to individual student needs",
        "type": "video",
        "duration": 1200,  # 20 minutes
        "prerequisites": [3],
        "quiz_id": None
    },
    5: {
        "id": 5,
        "module": "Teaching Methods",
        "title": "Personalization Assessment",
        "description": "Apply what you've learned about AI personalization",
        "type": "quiz",
        "duration": 900,  # 15 minutes
        "questions": 20,
        "prerequisites": [4],
        "quiz_id": "quiz_personalization"
    },
    6: {
        "id": 6,
        "module": "Teaching Methods",
        "title": "Creating Engaging Content",
        "description": "Master the art of creating content that resonates",
        "type": "video",
        "duration": 1500,  # 25 minutes
        "prerequisites": [5],
        "quiz_id": None
    },
    7: {
        "id": 7,
        "module": "Practical Application",
        "title": "Setting Up Your First Classroom",
        "description": "Step-by-step guide to launching your classroom",
        "type": "video",
        "duration": 1800,  # 30 minutes
        "prerequisites": [6],
        "quiz_id": None
    },
    8: {
        "id": 8,
        "module": "Practical Application",
        "title": "Classroom Setup Review",
        "description": "Verify your classroom is properly configured",
        "type": "quiz",
        "duration": 1200,  # 20 minutes
        "questions": 25,
        "prerequisites": [7],
        "quiz_id": "quiz_classroom_setup"
    },
    9: {
        "id": 9,
        "module": "Practical Application",
        "title": "Student Onboarding Process",
        "description": "Learn how to effectively onboard new students",
        "type": "video",
        "duration": 1320,  # 22 minutes
        "prerequisites": [8],
        "quiz_id": None
    },
    10: {
        "id": 10,
        "module": "Certification",
        "title": "Final Assessment",
        "description": "Complete the final assessment to earn your certificate",
        "type": "quiz",
        "duration": 2700,  # 45 minutes
        "questions": 50,
        "prerequisites": [9],
        "quiz_id": "quiz_final_assessment"
    }
}

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for bootcamp progress requests"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_params = get_path_parameters(event)
        
        print(f"Bootcamp handler - Method: {http_method}, Path: {path}")
        
        if http_method == 'GET':
            if '/progress' in path:
                return get_progress(event)
            elif '/modules' in path:
                return get_modules_status(event)
            elif '/module/' in path and 'module_id' in path_params:
                return get_module_details(path_params['module_id'])
            else:
                return create_response(400, {'error': 'Invalid GET endpoint'})
                
        elif http_method == 'POST':
            if '/start-module' in path:
                return start_module(event)
            elif '/complete-video' in path:
                return complete_video(event)
            elif '/complete-quiz' in path:
                return complete_quiz_module(event)
            elif '/save-video-progress' in path:
                return save_video_progress(event)
            else:
                return create_response(400, {'error': 'Invalid POST endpoint'})
                
        elif http_method == 'PUT':
            if '/reset-progress' in path:
                return reset_bootcamp_progress(event)
            else:
                return create_response(400, {'error': 'Invalid PUT endpoint'})
                
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in bootcamp handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'})


def get_progress(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get coach's bootcamp progress"""
    try:
        coach_id = event.get('queryStringParameters', {}).get('coach_id')
        if not coach_id:
            return create_response(400, {'error': 'Missing coach_id parameter'})
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # Get coach profile
        try:
            response = profiles_table.get_item(Key={'profile_id': coach_id})
            profile = response.get('Item', {})
        except Exception as e:
            print(f"Error getting profile: {str(e)}")
            return create_response(404, {'error': 'Coach not found'})
        
        # Get bootcamp progress, converting Decimal values to float
        bootcamp_progress = profile.get('bootcamp_progress', {})
        
        # Convert Decimal values to float for JSON serialization
        if bootcamp_progress:
            bootcamp_progress = {
                'coach_id': coach_id,
                'enrollment_date': bootcamp_progress.get('enrollment_date'),
                'completion_percentage': float(bootcamp_progress.get('completion_percentage', 0)),
                'total_hours_completed': float(bootcamp_progress.get('total_hours_completed', 0)),
                'current_module': bootcamp_progress.get('current_module'),
                'modules_completed': bootcamp_progress.get('modules_completed', []),
                'quiz_attempts': bootcamp_progress.get('quiz_attempts', []),
                'certifications_earned': bootcamp_progress.get('certifications_earned', []),
                'video_progress': bootcamp_progress.get('video_progress', {}),
                'available_modules': get_available_modules(coach_id, bootcamp_progress.get('modules_completed', [])),
                'next_module': get_next_available_module(coach_id, bootcamp_progress.get('modules_completed', [])),
                'statistics': calculate_statistics(bootcamp_progress)
            }
        else:
            # No progress yet, return default values
            bootcamp_progress = {
                'coach_id': coach_id,
                'enrollment_date': get_current_timestamp(),
                'completion_percentage': 0,
                'total_hours_completed': 0,
                'current_module': None,
                'modules_completed': [],
                'quiz_attempts': [],
                'certifications_earned': [],
                'video_progress': {},
                'available_modules': [1],  # Only module 1 available initially
                'next_module': 1,
                'statistics': {
                    'modules_completed': 0,
                    'total_modules': len(BOOTCAMP_MODULES),
                    'video_modules_completed': 0,
                    'quiz_modules_completed': 0,
                    'completion_percentage': 0,
                    'total_hours_completed': 0,
                    'quiz_statistics': {
                        'total_attempts': 0,
                        'passed_quizzes': 0,
                        'average_score': 0
                    },
                    'certifications_earned': 0,
                    'enrollment_date': None,
                    'last_activity': None
                }
            }
        
        return create_response(200, {
            'progress': bootcamp_progress,
            'modules_definition': BOOTCAMP_MODULES
        })
        
    except Exception as e:
        print(f"Error getting bootcamp progress: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Failed to get bootcamp progress'})


def get_modules_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get all available modules with their current status for a coach"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Get coach progress
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        
        if 'Item' not in response:
            # Return modules with all locked except first one
            modules_with_status = []
            for module_id, module_data in BOOTCAMP_MODULES.items():
                modules_with_status.append({
                    **module_data,
                    'status': 'current' if module_id == 1 else 'locked',
                    'locked': module_id != 1
                })
            
            return create_response(200, {'modules': modules_with_status})
        
        bootcamp_progress = response['Item'].get('bootcamp_progress', {})
        modules_completed_raw = bootcamp_progress.get('modules_completed', [])
        
        # Handle both formats: list of dicts with module_id keys, or list of integers/strings
        completed_modules = []
        for m in modules_completed_raw:
            if isinstance(m, dict):
                completed_modules.append(m.get('module_id'))
            elif isinstance(m, str):
                completed_modules.append(int(m))
            else:
                completed_modules.append(m)
        
        # Get next available module ID
        next_module_id = get_next_available_module(coach_id, completed_modules)
        
        modules_with_status = []
        for module_id, module_data in BOOTCAMP_MODULES.items():
            # Check if prerequisites are met
            prerequisites_met = all(prereq in completed_modules for prereq in module_data.get('prerequisites', []))
            
            if module_id in completed_modules:
                status = 'completed'
                locked = False
            elif prerequisites_met:
                status = 'current' if module_id == next_module_id else 'available'
                locked = False
            else:
                status = 'locked'
                locked = True
            
            modules_with_status.append({
                **module_data,
                'status': status,
                'locked': locked
            })
        
        return create_response(200, {'modules': modules_with_status})
        
    except Exception as e:
        print(f"Error getting available modules: {str(e)}")
        return create_response(500, {'error': 'Failed to get available modules'})


def get_module_details(module_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific module"""
    try:
        module_id = int(module_id)
        
        if module_id not in BOOTCAMP_MODULES:
            return create_response(404, {'error': 'Module not found'})
        
        module_data = BOOTCAMP_MODULES[module_id]
        
        # Add additional details for different module types
        if module_data['type'] == 'video':
            # Add video-specific metadata
            module_data['chapters'] = get_video_chapters(module_id)
            module_data['transcript_available'] = True
            module_data['resources'] = get_module_resources(module_id)
        elif module_data['type'] == 'quiz':
            # Add quiz-specific metadata
            module_data['passing_score'] = 80
            module_data['max_attempts'] = 3
            module_data['time_limit_minutes'] = module_data['duration'] // 60
        
        return create_response(200, {'module': module_data})
        
    except ValueError:
        return create_response(400, {'error': 'Invalid module ID'})
    except Exception as e:
        print(f"Error getting module details: {str(e)}")
        return create_response(500, {'error': 'Failed to get module details'})


def start_module(event: Dict[str, Any]) -> Dict[str, Any]:
    """Start a new module (video or quiz)"""
    try:
        body = parse_event_body(event)
        
        error = validate_required_fields(body, ['coach_id', 'module_id'])
        if error:
            return create_response(400, {'error': error})
        
        coach_id = body['coach_id']
        module_id = int(body['module_id'])
        
        if module_id not in BOOTCAMP_MODULES:
            return create_response(404, {'error': 'Module not found'})
        
        module_data = BOOTCAMP_MODULES[module_id]
        
        # Check if coach can access this module
        if not can_access_module(coach_id, module_id):
            return create_response(403, {'error': 'Module prerequisites not met'})
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # First, check if profile exists and initialize bootcamp_progress if needed
        try:
            # Try to update existing bootcamp_progress
            profiles_table.update_item(
                Key={'profile_id': coach_id},
                UpdateExpression='SET bootcamp_progress.current_module = :module, bootcamp_progress.last_accessed = :timestamp',
                ExpressionAttributeValues={
                    ':module': module_id,
                    ':timestamp': get_current_timestamp()
                }
            )
        except Exception as e:
            if 'ValidationException' in str(e):
                # bootcamp_progress doesn't exist, so initialize it first
                initial_progress = {
                    'enrollment_date': get_current_timestamp(),
                    'completion_percentage': Decimal('0'),
                    'total_hours_completed': Decimal('0'),
                    'current_module': module_id,
                    'modules_completed': [],
                    'quiz_attempts': [],
                    'certifications_earned': [],
                    'video_progress': {},
                    'last_accessed': get_current_timestamp()
                }
                
                profiles_table.update_item(
                    Key={'profile_id': coach_id},
                    UpdateExpression='SET bootcamp_progress = :progress',
                    ExpressionAttributeValues={
                        ':progress': initial_progress
                    }
                )
            else:
                raise e
        
        return create_response(200, {
            'message': f'Started module {module_id}',
            'module': module_data,
            'started_at': get_current_timestamp()
        })
        
    except Exception as e:
        print(f"Error starting module: {str(e)}")
        return create_response(500, {'error': 'Failed to start module'})


def complete_video(event: Dict[str, Any]) -> Dict[str, Any]:
    """Complete a video module"""
    try:
        body = parse_event_body(event)
        
        error = validate_required_fields(body, ['coach_id', 'module_id', 'watch_time'])
        if error:
            return create_response(400, {'error': error})
        
        coach_id = body['coach_id']
        module_id = int(body['module_id'])
        watch_time = float(body['watch_time'])  # Ensure float type
        
        if module_id not in BOOTCAMP_MODULES:
            return create_response(404, {'error': 'Module not found'})
        
        module_data = BOOTCAMP_MODULES[module_id]
        if module_data['type'] != 'video':
            return create_response(400, {'error': 'Module is not a video'})
        
        # Check if coach can access this module
        if not can_access_module(coach_id, module_id):
            return create_response(403, {'error': 'Module prerequisites not met'})
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # Get current progress
        profile = profiles_table.get_item(Key={'profile_id': coach_id})['Item']
        bootcamp_progress = profile.get('bootcamp_progress', {})
        
        # Convert existing hours to float for calculation, then back to Decimal for DynamoDB
        current_hours = float(bootcamp_progress.get('total_hours_completed', 0))
        video_hours = watch_time / 3600.0  # Convert seconds to hours
        
        # Update module completion
        modules_completed = bootcamp_progress.get('modules_completed', [])
        
        # Check if module is already completed (handle both formats)
        already_completed = False
        for completed in modules_completed:
            if isinstance(completed, dict) and completed.get('module_id') == module_id:
                already_completed = True
                break
            elif isinstance(completed, int) and completed == module_id:
                already_completed = True
                break
            elif isinstance(completed, str) and int(completed) == module_id:
                already_completed = True
                break
        
        if not already_completed:
            # Add completion record as dictionary with Decimal types
            completion_record = {
                'module_id': module_id,
                'module_name': module_data['title'],
                'module_type': module_data['type'],
                'completed_at': get_current_timestamp(),
                'watch_time': Decimal(str(watch_time)),
                'completion_percentage': Decimal(str(min(100, (watch_time / module_data['duration']) * 100)))
            }
            modules_completed.append(completion_record)
        
        # Calculate new totals and convert to Decimal for DynamoDB
        new_total_hours = Decimal(str(current_hours + video_hours))
        completion_percentage = Decimal(str(calculate_completion_percentage([m.get('module_id', m) if isinstance(m, dict) else m for m in modules_completed])))
        
        # Get next available module
        next_module = get_next_available_module(coach_id, [m.get('module_id', m) if isinstance(m, dict) else int(m) if isinstance(m, str) else m for m in modules_completed])
        
        # Update progress in DynamoDB
        profiles_table.update_item(
            Key={'profile_id': coach_id},
            UpdateExpression='SET bootcamp_progress.modules_completed = :modules, bootcamp_progress.total_hours_completed = :hours, bootcamp_progress.completion_percentage = :percentage, bootcamp_progress.last_accessed = :timestamp',
            ExpressionAttributeValues={
                ':modules': modules_completed,
                ':hours': new_total_hours,  # Now Decimal type
                ':percentage': completion_percentage,  # Now Decimal type
                ':timestamp': get_current_timestamp()
            }
        )
        
        # Check for certifications
        certifications = check_certifications(modules_completed)
        if certifications:
            profiles_table.update_item(
                Key={'profile_id': coach_id},
                UpdateExpression='SET bootcamp_progress.certifications_earned = :certs',
                ExpressionAttributeValues={
                    ':certs': certifications
                }
            )
        
        return create_response(200, {
            'message': f'Video module {module_id} completed',
            'completion': {
                'percentage': float(completion_percentage),  # Convert Decimal to float for JSON
                'hours_completed': float(new_total_hours),   # Convert Decimal to float for JSON
                'certifications': certifications
            },
            'next_module': next_module
        })
        
    except Exception as e:
        print(f"Error completing video: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Failed to complete video'})


def complete_quiz_module(event: Dict[str, Any]) -> Dict[str, Any]:
    """Mark a quiz module as completed (called after quiz submission)"""
    try:
        body = parse_event_body(event)
        
        error = validate_required_fields(body, ['coach_id', 'module_id', 'attempt_id', 'score', 'percentage', 'passed'])
        if error:
            return create_response(400, {'error': error})
        
        coach_id = body['coach_id']
        module_id = int(body['module_id'])
        attempt_id = body['attempt_id']
        score = body['score']
        percentage = body['percentage']
        passed = body['passed']
        
        if module_id not in BOOTCAMP_MODULES:
            return create_response(404, {'error': 'Module not found'})
        
        module_data = BOOTCAMP_MODULES[module_id]
        
        if module_data['type'] != 'quiz':
            return create_response(400, {'error': 'Module is not a quiz'})
        
        if not passed:
            return create_response(400, {'error': 'Quiz must be passed to complete module'})
        
        # Mark module as completed
        completion_result = mark_module_completed(coach_id, module_id, {
            'attempt_id': attempt_id,
            'score': score,
            'percentage': percentage,
            'passed': passed
        })
        
        # Check if this completion earns a certification
        certification = check_for_certification(coach_id, module_id)
        
        response_data = {
            'message': f'Quiz module {module_id} completed',
            'completion': completion_result,
            'next_module': get_next_available_module_id(coach_id)
        }
        
        if certification:
            response_data['certification_earned'] = certification
        
        return create_response(200, response_data)
        
    except Exception as e:
        print(f"Error completing quiz module: {str(e)}")
        return create_response(500, {'error': 'Failed to complete quiz module'})


def save_video_progress(event: Dict[str, Any]) -> Dict[str, Any]:
    """Save video watching progress (for resume functionality)"""
    try:
        body = parse_event_body(event)
        
        error = validate_required_fields(body, ['coach_id', 'module_id', 'current_time', 'duration'])
        if error:
            return create_response(400, {'error': error})
        
        coach_id = body['coach_id']
        module_id = int(body['module_id'])
        current_time = float(body['current_time'])
        duration = float(body['duration'])
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # Calculate progress percentage
        progress_percentage = (current_time / duration) * 100 if duration > 0 else 0
        
        # Save video progress with Decimal types
        profiles_table.update_item(
            Key={'profile_id': coach_id},
            UpdateExpression='SET bootcamp_progress.video_progress.#module = :progress',
            ExpressionAttributeNames={'#module': str(module_id)},
            ExpressionAttributeValues={
                ':progress': {
                    'current_time': Decimal(str(current_time)),
                    'duration': Decimal(str(duration)),
                    'progress_percentage': Decimal(str(progress_percentage)),
                    'last_watched': get_current_timestamp()
                }
            }
        )
        
        return create_response(200, {
            'message': 'Video progress saved',
            'progress': {
                'current_time': current_time,  # Return as float for JSON
                'progress_percentage': progress_percentage  # Return as float for JSON
            }
        })
        
    except Exception as e:
        print(f"Error saving video progress: {str(e)}")
        return create_response(500, {'error': 'Failed to save video progress'})


def reset_bootcamp_progress(event: Dict[str, Any]) -> Dict[str, Any]:
    """Reset bootcamp progress for a coach (admin function)"""
    try:
        body = parse_event_body(event)
        
        error = validate_required_fields(body, ['coach_id'])
        if error:
            return create_response(400, {'error': error})
        
        coach_id = body['coach_id']
        confirm = body.get('confirm', False)
        
        if not confirm:
            return create_response(400, {'error': 'Must confirm reset by setting confirm=true'})
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # Reset bootcamp progress
        profiles_table.update_item(
            Key={'profile_id': coach_id},
            UpdateExpression='SET bootcamp_progress = :reset_progress',
            ExpressionAttributeValues={
                ':reset_progress': {
                    'enrollment_date': get_current_timestamp(),
                    'completion_percentage': Decimal('0'),
                    'total_hours_completed': Decimal('0'),
                    'current_module': 1,
                    'modules_completed': [],
                    'quiz_attempts': [],
                    'certifications_earned': [],
                    'video_progress': {}
                }
            }
        )
        
        return create_response(200, {
            'message': 'Bootcamp progress reset successfully',
            'coach_id': coach_id,
            'reset_at': get_current_timestamp()
        })
        
    except Exception as e:
        print(f"Error resetting bootcamp progress: {str(e)}")
        return create_response(500, {'error': 'Failed to reset bootcamp progress'})


# Helper Functions

def can_access_module(coach_id: str, module_id: int) -> bool:
    """Check if coach can access the specified module"""
    try:
        if module_id == 1:  # First module is always accessible
            return True
        
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        
        if 'Item' not in response:
            return False
        
        bootcamp_progress = response['Item'].get('bootcamp_progress', {})
        modules_completed_raw = bootcamp_progress.get('modules_completed', [])
        
        # Handle both formats: list of dicts with module_id keys, or list of integers/strings
        completed_modules = []
        for m in modules_completed_raw:
            if isinstance(m, dict):
                completed_modules.append(m.get('module_id'))
            elif isinstance(m, str):
                completed_modules.append(int(m))
            else:
                completed_modules.append(m)
        
        # Check prerequisites
        module_data = BOOTCAMP_MODULES[module_id]
        prerequisites = module_data.get('prerequisites', [])
        
        return all(prereq in completed_modules for prereq in prerequisites)
        
    except Exception as e:
        print(f"Error checking module access: {str(e)}")
        return False


def mark_module_completed(coach_id: str, module_id: int, completion_data: Dict[str, Any]) -> Dict[str, Any]:
    """Mark a module as completed and update progress"""
    try:
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        
        # Get current progress
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        
        if 'Item' not in response:
            return {'error': 'Profile not found'}
        
        profile = response['Item']
        bootcamp_progress = profile.get('bootcamp_progress', {
            'modules_completed': [],
            'completion_percentage': 0,
            'total_hours_completed': 0
        })
        
        # Check if already completed
        completed_modules = bootcamp_progress.get('modules_completed', [])
        
        # Handle both formats for checking completion
        already_completed = False
        for m in completed_modules:
            if isinstance(m, dict):
                if m.get('module_id') == module_id:
                    already_completed = True
                    break
            elif isinstance(m, (int, str)):
                if int(m) == module_id:
                    already_completed = True
                    break
        
        if already_completed:
            return {'message': 'Module already completed', 'module_id': module_id}
        
        # Add completion record with Decimal types
        module_data = BOOTCAMP_MODULES[module_id]
        completion_record = {
            'module_id': module_id,
            'module_name': module_data['title'],
            'module_type': module_data['type'],
            'completed_at': get_current_timestamp(),
            **{k: (Decimal(str(v)) if isinstance(v, (int, float)) else v) for k, v in completion_data.items()}
        }
        
        completed_modules.append(completion_record)
        
        # Calculate new progress
        total_modules = len(BOOTCAMP_MODULES)
        completion_percentage = Decimal(str((len(completed_modules) / total_modules) * 100))
        
        # Calculate hours (convert duration from seconds to hours)
        hours_for_module = Decimal(str(module_data['duration'] / 3600))
        current_hours = float(bootcamp_progress.get('total_hours_completed', 0))
        total_hours = Decimal(str(current_hours + float(hours_for_module)))
        
        # Update profile with Decimal types
        profiles_table.update_item(
            Key={'profile_id': coach_id},
            UpdateExpression='''SET 
                bootcamp_progress.modules_completed = :completed,
                bootcamp_progress.completion_percentage = :percentage,
                bootcamp_progress.total_hours_completed = :hours,
                bootcamp_progress.last_activity = :timestamp
            ''',
            ExpressionAttributeValues={
                ':completed': completed_modules,
                ':percentage': completion_percentage,
                ':hours': total_hours,
                ':timestamp': get_current_timestamp()
            }
        )
        
        return {
            'module_id': module_id,
            'completion_percentage': float(completion_percentage),  # Convert to float for JSON
            'total_hours_completed': float(total_hours),           # Convert to float for JSON
            'completed_at': completion_record['completed_at']
        }
        
    except Exception as e:
        print(f"Error marking module completed: {str(e)}")
        return {'error': str(e)}


def check_for_certification(coach_id: str, module_id: int) -> Optional[Dict[str, Any]]:
    """Check if completing this module earns a certification"""
    try:
        # Certification criteria
        certifications = {
            'tsa_fundamentals': {
                'name': 'TSA Fundamentals Certification',
                'required_modules': [1, 2, 3],  # Foundation modules
                'description': 'Certified in TSA foundational principles'
            },
            'teaching_methods': {
                'name': 'Teaching Methods Certification',
                'required_modules': [4, 5, 6],  # Teaching Methods modules
                'description': 'Certified in advanced teaching methodologies'
            },
            'practical_application': {
                'name': 'Practical Application Certification',
                'required_modules': [7, 8, 9],  # Practical Application modules
                'description': 'Certified in practical implementation'
            },
            'master_coach': {
                'name': 'Master Coach Certification',
                'required_modules': [10],  # Final assessment
                'description': 'Complete TSA coaching certification'
            }
        }
        
        # Get completed modules
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        
        if 'Item' not in response:
            return None
        
        bootcamp_progress = response['Item'].get('bootcamp_progress', {})
        completed_modules = [m['module_id'] for m in bootcamp_progress.get('modules_completed', [])]
        
        # Check each certification
        for cert_id, cert_info in certifications.items():
            required_modules = cert_info['required_modules']
            
            # If all required modules are completed and this module is in the list
            if (module_id in required_modules and 
                all(req_module in completed_modules for req_module in required_modules)):
                
                # Check if already earned
                existing_certs = bootcamp_progress.get('certifications_earned', [])
                if any(cert['certification_id'] == cert_id for cert in existing_certs):
                    continue  # Already earned
                
                # Award certification
                certification = {
                    'certification_id': cert_id,
                    'certification_name': cert_info['name'],
                    'description': cert_info['description'],
                    'earned_at': get_current_timestamp(),
                    'expires_at': (datetime.utcnow() + timedelta(days=730)).isoformat() + 'Z',  # 2 years
                    'required_modules': required_modules
                }
                
                # Update profile with new certification
                existing_certs.append(certification)
                
                profiles_table.update_item(
                    Key={'profile_id': coach_id},
                    UpdateExpression='SET bootcamp_progress.certifications_earned = :certs',
                    ExpressionAttributeValues={':certs': existing_certs}
                )
                
                return certification
        
        return None
        
    except Exception as e:
        print(f"Error checking certification: {str(e)}")
        return None


def get_available_modules_for_coach(bootcamp_progress: Dict[str, Any]) -> List[int]:
    """Get list of module IDs that are available for the coach"""
    completed_modules = [m['module_id'] for m in bootcamp_progress.get('modules_completed', [])]
    available = []
    
    for module_id, module_data in BOOTCAMP_MODULES.items():
        prerequisites = module_data.get('prerequisites', [])
        if all(prereq in completed_modules for prereq in prerequisites):
            available.append(module_id)
    
    return available


def get_next_available_module(bootcamp_progress: Dict[str, Any]) -> Optional[int]:
    """Get the next module the coach should take"""
    completed_modules = [m['module_id'] for m in bootcamp_progress.get('modules_completed', [])]
    
    for module_id in sorted(BOOTCAMP_MODULES.keys()):
        if module_id not in completed_modules:
            prerequisites = BOOTCAMP_MODULES[module_id].get('prerequisites', [])
            if all(prereq in completed_modules for prereq in prerequisites):
                return module_id
    
    return None  # All modules completed


def get_next_available_module_id(coach_id: str) -> Optional[int]:
    """Get next available module for a specific coach"""
    try:
        profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
        response = profiles_table.get_item(Key={'profile_id': coach_id})
        
        if 'Item' not in response:
            return 1  # Start with first module
        
        bootcamp_progress = response['Item'].get('bootcamp_progress', {})
        return get_next_available_module(bootcamp_progress)
        
    except Exception as e:
        print(f"Error getting next module: {str(e)}")
        return None


def calculate_statistics(bootcamp_progress: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate comprehensive bootcamp statistics"""
    modules_completed_raw = bootcamp_progress.get('modules_completed', [])
    quiz_attempts = bootcamp_progress.get('quiz_attempts', [])
    
    # Extract module IDs from both formats (integers or dictionaries)
    module_ids = []
    for m in modules_completed_raw:
        if isinstance(m, dict):
            module_ids.append(m.get('module_id'))
        elif isinstance(m, str):
            module_ids.append(int(m))
        else:
            module_ids.append(m)
    
    # Count video vs quiz modules completed
    video_modules = 0
    quiz_modules = 0
    for module_id in module_ids:
        if module_id in BOOTCAMP_MODULES:
            if BOOTCAMP_MODULES[module_id]['type'] == 'video':
                video_modules += 1
            elif BOOTCAMP_MODULES[module_id]['type'] == 'quiz':
                quiz_modules += 1
    
    # Quiz statistics
    total_attempts = len(quiz_attempts)
    passed_quizzes = sum(1 for attempt in quiz_attempts if attempt.get('passed', False))
    average_score = sum(attempt.get('score', 0) for attempt in quiz_attempts) / max(total_attempts, 1)
    
    # Convert Decimal to float for statistics
    completion_percentage = float(bootcamp_progress.get('completion_percentage', 0))
    total_hours = float(bootcamp_progress.get('total_hours_completed', 0))
    
    return {
        'modules_completed': len(module_ids),
        'total_modules': len(BOOTCAMP_MODULES),
        'video_modules_completed': video_modules,
        'quiz_modules_completed': quiz_modules,
        'completion_percentage': completion_percentage,
        'total_hours_completed': total_hours,
        'quiz_statistics': {
            'total_attempts': total_attempts,
            'passed_quizzes': passed_quizzes,
            'average_score': average_score
        },
        'certifications_earned': len(bootcamp_progress.get('certifications_earned', [])),
        'enrollment_date': bootcamp_progress.get('enrollment_date'),
        'last_activity': bootcamp_progress.get('last_accessed')
    }


def get_video_chapters(module_id: int) -> List[Dict[str, Any]]:
    """Get video chapters for a specific module"""
    # This would be expanded with real chapter data
    chapters_map = {
        1: [
            {'title': 'Welcome & Introduction', 'timestamp': 0},
            {'title': 'What is TimeBack Learning?', 'timestamp': 120},
            {'title': 'Core Benefits', 'timestamp': 360},
            {'title': 'Getting Started', 'timestamp': 540}
        ],
        3: [
            {'title': 'Research Foundation', 'timestamp': 0},
            {'title': 'Learning Science', 'timestamp': 300},
            {'title': 'Implementation Studies', 'timestamp': 600},
            {'title': 'Real-World Results', 'timestamp': 900}
        ],
        4: [
            {'title': 'AI in Education Overview', 'timestamp': 0},
            {'title': 'Personalization Algorithms', 'timestamp': 240},
            {'title': 'Adaptive Learning Paths', 'timestamp': 480},
            {'title': 'Data-Driven Insights', 'timestamp': 720},
            {'title': 'Implementation Best Practices', 'timestamp': 960}
        ]
    }
    
    return chapters_map.get(module_id, [])


def get_module_resources(module_id: int) -> List[Dict[str, Any]]:
    """Get downloadable resources for a specific module"""
    # This would be expanded with real resource data
    resources_map = {
        1: [
            {'title': 'TSA Overview Slides', 'type': 'PDF', 'size': '2.3 MB', 'url': '/resources/tsa-overview.pdf'},
            {'title': 'Quick Start Guide', 'type': 'PDF', 'size': '1.1 MB', 'url': '/resources/quick-start.pdf'}
        ],
        3: [
            {'title': 'Research Papers Collection', 'type': 'PDF', 'size': '5.2 MB', 'url': '/resources/research.pdf'},
            {'title': 'Case Studies', 'type': 'PDF', 'size': '3.8 MB', 'url': '/resources/case-studies.pdf'}
        ],
        4: [
            {'title': 'AI Implementation Guide', 'type': 'PDF', 'size': '4.1 MB', 'url': '/resources/ai-guide.pdf'},
            {'title': 'Personalization Templates', 'type': 'ZIP', 'size': '2.7 MB', 'url': '/resources/templates.zip'}
        ]
    }
    
    return resources_map.get(module_id, [])


# Helper functions for bootcamp progress management

def calculate_completion_percentage(modules_completed: List[int]) -> float:
    """Calculate completion percentage based on completed modules"""
    if not modules_completed:
        return 0.0
    
    total_modules = len(BOOTCAMP_MODULES)
    completed_count = len(modules_completed)
    return round((completed_count / total_modules) * 100, 2)

def get_next_available_module(coach_id: str, modules_completed: List[int]) -> Optional[int]:
    """Get the next available module ID based on prerequisites"""
    for module_id in sorted(BOOTCAMP_MODULES.keys()):
        if module_id not in modules_completed:
            # Check if prerequisites are met
            prerequisites = BOOTCAMP_MODULES[module_id].get('prerequisites', [])
            if all(prereq in modules_completed for prereq in prerequisites):
                return module_id
    return None

def check_certifications(modules_completed: List[int]) -> List[str]:
    """Check which certifications the coach has earned"""
    certifications = []
    
    # Foundation Certificate (modules 1-3)
    if all(module_id in modules_completed for module_id in [1, 2, 3]):
        if "Foundation Certificate" not in certifications:
            certifications.append("Foundation Certificate")
    
    # Teaching Methods Certificate (modules 4-6)
    if all(module_id in modules_completed for module_id in [4, 5, 6]):
        if "Teaching Methods Certificate" not in certifications:
            certifications.append("Teaching Methods Certificate")
    
    # Practical Application Certificate (modules 7-9)
    if all(module_id in modules_completed for module_id in [7, 8, 9]):
        if "Practical Application Certificate" not in certifications:
            certifications.append("Practical Application Certificate")
    
    # Master Coach Certificate (all modules)
    if all(module_id in modules_completed for module_id in range(1, 11)):
        if "Master Coach Certificate" not in certifications:
            certifications.append("Master Coach Certificate")
    
    return certifications

def get_available_modules(coach_id: str, modules_completed: List[int]) -> List[int]:
    """Get list of available module IDs based on prerequisites"""
    available = []
    for module_id in sorted(BOOTCAMP_MODULES.keys()):
        if module_id not in modules_completed:
            # Check if prerequisites are met
            prerequisites = BOOTCAMP_MODULES[module_id].get('prerequisites', [])
            if all(prereq in modules_completed for prereq in prerequisites):
                available.append(module_id)
                break  # Only return the next available module
    return available if available else [] 