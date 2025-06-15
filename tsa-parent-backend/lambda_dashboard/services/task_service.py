"""
Task Service - Business Logic Layer  
Handles parent task operations with proper workflow logic
"""
from typing import Dict, Any, List
from services.enrollment_service import EnrollmentService


class TaskService:
    """Service for parent task business logic"""
    
    # Define task templates based on enrollment steps
    STEP_TASKS = {
        1: {
            'title': 'Review program information and confirm interest',
            'description': 'Please review the program details and confirm your interest',
            'priority': 'high'
        },
        2: {
            'title': 'Schedule phone consultation with coach',
            'description': 'Schedule a consultation call with your assigned coach',
            'priority': 'high'
        },
        3: {
            'title': 'Schedule and attend shadow day',
            'description': 'Arrange a shadow day for your student to experience the program',
            'priority': 'medium'
        },
        4: {
            'title': 'Complete student enrollment forms',
            'description': 'Fill out all required enrollment documentation',
            'priority': 'medium'
        },
        5: {
            'title': 'Upload required documents',
            'description': 'Submit all necessary documents and verifications',
            'priority': 'medium'
        },
        6: {
            'title': 'Complete payment and finalize enrollment',
            'description': 'Complete payment process and finalize enrollment',
            'priority': 'high'
        }
    }
    
    @staticmethod
    def get_pending_tasks_for_parent(parent_email: str) -> List[Dict[str, Any]]:
        """Get pending tasks based on enrollment status"""
        try:
            enrollments = EnrollmentService.get_parent_enrollments(parent_email)
            pending_tasks = []
            
            for enrollment in enrollments:
                if enrollment.get('status') == 'pending':
                    current_step = enrollment.get('current_step', 1)
                    
                    if current_step in TaskService.STEP_TASKS:
                        task_template = TaskService.STEP_TASKS[current_step]
                        
                        task = {
                            'task_id': f"{enrollment['enrollment_id']}-step-{current_step}",
                            'enrollment_id': enrollment['enrollment_id'],
                            'student_name': enrollment['student_name'],
                            'title': task_template['title'],
                            'description': task_template['description'],
                            'priority': task_template['priority'],
                            'step_number': current_step,
                            'created_at': enrollment.get('created_at'),
                            'due_date': TaskService._calculate_due_date(current_step)
                        }
                        pending_tasks.append(task)
            
            # Sort by priority and step number
            priority_order = {'high': 0, 'medium': 1, 'low': 2}
            pending_tasks.sort(key=lambda x: (priority_order.get(x['priority'], 3), x['step_number']))
            
            return pending_tasks
            
        except Exception as e:
            print(f"Task service error: {str(e)}")
            return []
    
    @staticmethod
    def complete_task(parent_email: str, task_id: str) -> bool:
        """Mark task as completed (would update enrollment progress)"""
        try:
            # Extract enrollment_id and step from task_id
            if '-step-' not in task_id:
                return False
                
            enrollment_id = task_id.split('-step-')[0]
            step = int(task_id.split('-step-')[1])
            
            # Here you would update the enrollment to mark step as completed
            # For now, return True as placeholder
            return True
            
        except Exception as e:
            print(f"Task completion error: {str(e)}")
            return False
    
    @staticmethod
    def _calculate_due_date(step: int) -> str:
        """Calculate due date based on step (placeholder logic)"""
        # In real implementation, this would calculate actual due dates
        import datetime
        
        days_to_add = {1: 3, 2: 7, 3: 14, 4: 7, 5: 5, 6: 3}
        days = days_to_add.get(step, 7)
        
        due_date = datetime.datetime.now() + datetime.timedelta(days=days)
        return due_date.isoformat()

