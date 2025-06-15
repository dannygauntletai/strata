"""
Parent Dashboard Handler - Clean Architecture
Routes requests to specific dashboard components
"""
import json
from typing import Dict, Any

# Import new shared utilities (no CORS - API Gateway handles it)
from tsa_shared import create_api_response, parse_request_body, UserIdentifier

# Import dashboard components
from components.profile_component import ProfileComponent
from components.enrollments_component import EnrollmentsComponent  
from components.tasks_component import TasksComponent
from components.activity_component import ActivityComponent
from components.auth_component import AuthComponent


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Thin handler - routes to appropriate components"""
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        
        # Route to components based on path
        if '/parent/auth/magic-link' in path and method == 'POST':
            return AuthComponent.handle_magic_link_request(event)
            
        elif '/parent/dashboard' in path and method == 'GET':
            return get_dashboard_data(event)
            
        elif '/parent/profile' in path:
            return ProfileComponent.handle_request(event, method)
            
        elif '/parent/enrollments' in path and method == 'GET':
            return EnrollmentsComponent.get_enrollments(event)
            
        else:
            return create_api_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Dashboard handler error: {str(e)}")
        return create_api_response(500, {'error': 'Internal server error'})


def get_dashboard_data(event: Dict[str, Any]) -> Dict[str, Any]:
    """Compose dashboard from multiple components"""
    try:
        # Get user from authenticated request
        user_email = UserIdentifier.extract_user_email(event)
        if not user_email:
            return create_api_response(401, {'error': 'Authentication required'})
        
        # Get data from each component
        profile_data = ProfileComponent.get_profile_summary(user_email)
        enrollments_data = EnrollmentsComponent.get_enrollments_summary(user_email)  
        tasks_data = TasksComponent.get_pending_tasks(user_email)
        activity_data = ActivityComponent.get_recent_activity(user_email)
        
        # Compose dashboard response
        dashboard = {
            'profile': profile_data,
            'enrollments': enrollments_data,
            'tasks': tasks_data,
            'activity': activity_data,
            'summary': {
                'total_enrollments': enrollments_data.get('total', 0),
                'active_enrollments': enrollments_data.get('active', 0),
                'pending_tasks': len(tasks_data.get('tasks', []))
            }
        }
        
        return create_api_response(200, dashboard)
        
    except Exception as e:
        print(f"Dashboard composition error: {str(e)}")
        return create_api_response(500, {'error': 'Failed to load dashboard'}) 