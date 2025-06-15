"""
Tasks Component - Clean Architecture  
Handles all parent task operations with explicit functions
"""
from typing import Dict, Any, List
from tsa_shared import create_api_response, parse_request_body, UserIdentifier
from services.task_service import TaskService


class TasksComponent:
    """Clean component for parent task operations"""
    
    @staticmethod
    def get_pending_tasks(user_email: str) -> Dict[str, Any]:
        """Get pending tasks for dashboard composition"""
        try:
            tasks = TaskService.get_pending_tasks_for_parent(user_email)
            
            return {
                'tasks': tasks,
                'count': len(tasks),
                'high_priority': len([t for t in tasks if t.get('priority') == 'high'])
            }
            
        except Exception as e:
            print(f"Tasks component error: {str(e)}")
            return {'tasks': [], 'count': 0, 'high_priority': 0}
    
    @staticmethod
    def complete_task(event: Dict[str, Any]) -> Dict[str, Any]:
        """Mark task as completed"""
        try:
            user_email = UserIdentifier.extract_user_email(event)
            if not user_email:
                return create_api_response(401, {'error': 'Authentication required'})
            
            # Get task_id from request body or path
            body = parse_request_body(event)
            task_id = body.get('task_id')
            
            if not task_id:
                return create_api_response(400, {'error': 'Task ID required'})
            
            success = TaskService.complete_task(user_email, task_id)
            
            if success:
                return create_api_response(200, {'message': 'Task completed'})
            else:
                return create_api_response(400, {'error': 'Failed to complete task'})
                
        except Exception as e:
            print(f"Task completion error: {str(e)}")
            return create_api_response(500, {'error': 'Task completion failed'}) 