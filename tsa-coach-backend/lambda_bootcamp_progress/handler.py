"""
Coach Bootcamp Progress Handler - Clean Architecture with Centralized Models
Fixed ID mapping issues and CORS duplication. Uses shared data models.
"""
import json
from typing import Dict, Any, List, Optional

# Import centralized models and utilities - NO fallback pattern
from shared_utils import (
    create_api_response, parse_event_body, get_current_time, 
    standardize_error_response, get_table_name, get_dynamodb_table,
    UserIdentifier, CoachProfile, BootcampModule, BootcampProgress
)

# Bootcamp module definitions - centralized configuration
BOOTCAMP_MODULES = [
    BootcampModule({
        "id": 1,
        "title": "Introduction to TimeBack Learning",
        "description": "Learn the fundamentals of our revolutionary education model",
        "type": "video",
        "duration": 720,
        "module": "Foundation",
        "prerequisites": []
    }),
    BootcampModule({
        "id": 2,
        "title": "Core Principles Quiz",
        "description": "Test your understanding of the basic concepts",
        "type": "quiz",
        "duration": 600,
        "questions": 15,
        "module": "Foundation",
        "prerequisites": [1]
    }),
    BootcampModule({
        "id": 3,
        "title": "The Science Behind TBL",
        "description": "Understand the research and methodology",
        "type": "video",
        "duration": 1080,
        "module": "Foundation",
        "prerequisites": [2]
    }),
    BootcampModule({
        "id": 4,
        "title": "AI-Powered Personalization",
        "description": "Learn how AI adapts to individual student needs",
        "type": "video",
        "duration": 1200,
        "module": "Teaching Methods",
        "prerequisites": [3]
    }),
    BootcampModule({
        "id": 5,
        "title": "Final Assessment",
        "description": "Complete the final assessment to earn your certificate",
        "type": "quiz",
        "duration": 2700,
        "questions": 50,
        "module": "Certification",
        "prerequisites": [4]
    })
]


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler - NO CORS, uses centralized models"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        print(f"🎓 Bootcamp: {http_method} {path}")
        
        if '/progress' in path and http_method == 'GET':
            return get_progress(event)
        elif '/modules' in path and http_method == 'GET':
            return get_modules_status(event)
        elif '/start-module' in path and http_method == 'POST':
            return start_module(event)
        elif '/complete-video' in path and http_method == 'POST':
            return complete_video(event)
        elif '/complete-quiz' in path and http_method == 'POST':
            return complete_quiz_module(event)
        elif '/save-progress' in path and http_method == 'POST':
            return save_video_progress(event)
        elif '/health' in path and http_method == 'GET':
            return get_health_status()
        else:
            return create_api_response(404, {
                'error': 'Endpoint not found',
                'available_endpoints': [
                    'GET /progress', 'GET /modules', 'POST /start-module',
                    'POST /complete-video', 'POST /complete-quiz', 'POST /save-progress'
                ]
            })
            
    except Exception as e:
        print(f"💥 Handler Error: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "lambda_handler"))


def get_progress(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get coach's bootcamp progress with proper ID mapping"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_api_response(400, {'error': 'Missing coach_id parameter'})
        
        # Use centralized ID mapping - converts email to profile_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_api_response(404, {'error': str(e)})
        
        # Get coach profile using centralized model
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_api_response(404, {'error': 'Coach profile not found'})
        
        coach_profile = CoachProfile(response['Item'])
        
        # Get or create bootcamp progress
        bootcamp_progress_data = coach_profile.bootcamp_progress
        if not bootcamp_progress_data:
            # Initialize new progress
            bootcamp_progress_data = {
                'coach_id': normalized_profile_id,
                'enrollment_date': get_current_time(),
                'completion_percentage': 0,
                'total_hours_completed': 0,
                'current_module': 1,
                'modules_completed': [],
                'quiz_attempts': [],
                'certifications_earned': [],
                'video_progress': {},
                'last_accessed': get_current_time()
            }
        
        bootcamp_progress = BootcampProgress(bootcamp_progress_data)
        
        # Calculate available modules and statistics
        available_modules = bootcamp_progress.get_available_modules(BOOTCAMP_MODULES)
        if not available_modules and not bootcamp_progress.modules_completed:
            available_modules = [1]  # Always start with module 1
        
        # Build response with module statuses
        modules_with_status = []
        completed_ids = [m.get('module_id', m) if isinstance(m, dict) else m for m in bootcamp_progress.modules_completed]
        
        for module in BOOTCAMP_MODULES:
            status = 'completed' if module.id in completed_ids else 'available' if module.id in available_modules else 'locked'
            module_dict = module.to_dict()
            module_dict['status'] = status
            module_dict['locked'] = status == 'locked'
            modules_with_status.append(module_dict)
        
        return create_api_response(200, {
            'progress': bootcamp_progress.to_dict(),
            'modules': modules_with_status,
            'statistics': calculate_statistics(bootcamp_progress, BOOTCAMP_MODULES)
        })
        
    except Exception as e:
        print(f"💥 Error getting progress: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "get_progress"))


def start_module(event: Dict[str, Any]) -> Dict[str, Any]:
    """Start a module with proper validation"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['coach_id', 'module_id']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_api_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Normalize coach ID
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_api_response(404, {'error': str(e)})
        
        module_id = int(body['module_id'])
        
        # Validate module exists
        target_module = next((m for m in BOOTCAMP_MODULES if m.id == module_id), None)
        if not target_module:
            return create_api_response(404, {'error': 'Module not found'})
        
        # Update current module in profile
        profiles_table.update_item(
            Key={'profile_id': normalized_profile_id},
            UpdateExpression='SET bootcamp_progress.current_module = :module, bootcamp_progress.last_accessed = :timestamp',
            ExpressionAttributeValues={
                ':module': module_id,
                ':timestamp': get_current_time()
            }
        )
        
        return create_api_response(200, {
            'message': f'Started module {module_id}',
            'module': target_module.to_dict(),
            'started_at': get_current_time()
        })
        
    except Exception as e:
        print(f"💥 Error starting module: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "start_module"))


def complete_video(event: Dict[str, Any]) -> Dict[str, Any]:
    """Complete a video module"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['coach_id', 'module_id', 'watch_time']
        missing = [f for f in required_fields if f not in body or body[f] is None]
        if missing:
            return create_api_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Normalize coach ID
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_api_response(404, {'error': str(e)})
        
        module_id = int(body['module_id'])
        watch_time = float(body['watch_time'])
        
        # Mark module as completed
        result = mark_module_completed(normalized_profile_id, module_id, {
            'watch_time': watch_time,
            'completed_at': get_current_time()
        })
        
        return create_api_response(200, {
            'message': 'Video module completed successfully',
            'completion_result': result
        })
        
    except Exception as e:
        print(f"💥 Error completing video: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "complete_video"))


def complete_quiz_module(event: Dict[str, Any]) -> Dict[str, Any]:
    """Complete a quiz module"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['coach_id', 'module_id', 'score', 'percentage', 'passed']
        missing = [f for f in required_fields if f not in body or body[f] is None]
        if missing:
            return create_api_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Normalize coach ID
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_api_response(404, {'error': str(e)})
        
        module_id = int(body['module_id'])
        
        if not body['passed']:
            return create_api_response(400, {'error': 'Quiz must be passed to complete module'})
        
        # Mark module as completed
        result = mark_module_completed(normalized_profile_id, module_id, {
            'quiz_score': body['score'],
            'quiz_percentage': body['percentage'],
            'attempt_id': body.get('attempt_id'),
            'completed_at': get_current_time()
        })
        
        return create_api_response(200, {
            'message': 'Quiz module completed successfully',
            'completion_result': result
        })
        
    except Exception as e:
        print(f"💥 Error completing quiz: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "complete_quiz_module"))


def save_video_progress(event: Dict[str, Any]) -> Dict[str, Any]:
    """Save video watch progress"""
    try:
        body = parse_event_body(event)
        
        required_fields = ['coach_id', 'module_id', 'current_time']
        missing = [f for f in required_fields if f not in body or body[f] is None]
        if missing:
            return create_api_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Normalize coach ID
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_api_response(404, {'error': str(e)})
        
        # Update video progress
        profiles_table.update_item(
            Key={'profile_id': normalized_profile_id},
            UpdateExpression='SET bootcamp_progress.video_progress.#module_id = :progress',
            ExpressionAttributeNames={'#module_id': str(body['module_id'])},
            ExpressionAttributeValues={
                ':progress': {
                    'current_time': body['current_time'],
                    'duration': body.get('duration', 0),
                    'last_updated': get_current_time()
                }
            }
        )
        
        return create_api_response(200, {'message': 'Progress saved successfully'})
        
    except Exception as e:
        print(f"💥 Error saving progress: {str(e)}")
        return create_api_response(500, standardize_error_response(e, "save_video_progress"))


def mark_module_completed(profile_id: str, module_id: int, completion_data: Dict[str, Any]) -> Dict[str, Any]:
    """Mark a module as completed with centralized logic"""
    try:
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        # Get current profile
        response = profiles_table.get_item(Key={'profile_id': profile_id})
        if 'Item' not in response:
            raise Exception('Profile not found')
        
        coach_profile = CoachProfile(response['Item'])
        bootcamp_progress = BootcampProgress(coach_profile.bootcamp_progress or {})
        
        # Add completed module
        bootcamp_progress.add_completed_module(module_id, completion_data)
        
        # Recalculate progress
        completed_count = len(bootcamp_progress.modules_completed)
        total_modules = len(BOOTCAMP_MODULES)
        completion_percentage = (completed_count / total_modules * 100) if total_modules > 0 else 0
        
        # Update profile
        profiles_table.update_item(
            Key={'profile_id': profile_id},
            UpdateExpression='''SET 
                bootcamp_progress = :progress,
                updated_at = :updated_at
            ''',
            ExpressionAttributeValues={
                ':progress': bootcamp_progress.to_dict(),
                ':updated_at': get_current_time()
            }
        )
        
        return {
            'module_id': module_id,
            'completion_percentage': completion_percentage,
            'modules_completed': completed_count,
            'total_modules': total_modules
        }
        
    except Exception as e:
        print(f"💥 Error marking module completed: {str(e)}")
        raise


def calculate_statistics(progress: BootcampProgress, modules: List[BootcampModule]) -> Dict[str, Any]:
    """Calculate progress statistics"""
    completed_count = len(progress.modules_completed)
    total_modules = len(modules)
    
    video_modules = [m for m in modules if m.type == 'video']
    quiz_modules = [m for m in modules if m.type == 'quiz']
    
    completed_ids = [m.get('module_id', m) if isinstance(m, dict) else m for m in progress.modules_completed]
    video_completed = len([m for m in video_modules if m.id in completed_ids])
    quiz_completed = len([m for m in quiz_modules if m.id in completed_ids])
    
    return {
        'modules_completed': completed_count,
        'total_modules': total_modules,
        'video_modules_completed': video_completed,
        'quiz_modules_completed': quiz_completed,
        'completion_percentage': progress.completion_percentage,
        'total_hours_completed': progress.total_hours_completed,
        'enrollment_date': progress.enrollment_date,
        'last_activity': progress.last_accessed
    }


def get_health_status() -> Dict[str, Any]:
    """Health check with DynamoDB connectivity test"""
    try:
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        profiles_table.load()
        
        return create_api_response(200, {
            'status': 'healthy',
            'service': 'coach-bootcamp',
            'timestamp': get_current_time(),
            'version': '2.0.0',
            'modules_available': len(BOOTCAMP_MODULES)
        })
        
    except Exception as e:
        print(f"💥 Health Error: {str(e)}")
        return create_api_response(500, {
            'status': 'unhealthy',
            'error': str(e)
        }) 