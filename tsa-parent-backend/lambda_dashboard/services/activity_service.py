"""
Activity Service - Business Logic Layer
Handles parent activity tracking with proper data access patterns
"""
from typing import Dict, Any, List
from services.enrollment_service import EnrollmentService
import datetime


class ActivityService:
    """Service for parent activity business logic"""
    
    @staticmethod
    def get_recent_activity_for_parent(parent_email: str) -> List[Dict[str, Any]]:
        """Get recent activity for parent based on enrollment changes"""
        try:
            enrollments = EnrollmentService.get_parent_enrollments(parent_email)
            recent_activity = []
            
            for enrollment in enrollments:
                # Create activity based on enrollment updates
                if enrollment.get('updated_at'):
                    activity = {
                        'type': 'enrollment_update',
                        'message': f"Enrollment progress updated for {enrollment['student_name']}",
                        'enrollment_id': enrollment['enrollment_id'],
                        'student_name': enrollment['student_name'],
                        'timestamp': enrollment['updated_at'],
                        'details': {
                            'current_step': enrollment.get('current_step'),
                            'status': enrollment.get('status'),
                            'progress': enrollment.get('progress_percentage')
                        }
                    }
                    recent_activity.append(activity)
            
            # Sort by timestamp (most recent first)
            recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Return last 10 activities
            return recent_activity[:10]
            
        except Exception as e:
            print(f"Activity service error: {str(e)}")
            return []
    
    @staticmethod
    def log_activity(parent_email: str, activity_type: str, message: str, details: Dict[str, Any] = None) -> bool:
        """Log new activity for parent (placeholder for future implementation)"""
        try:
            # In real implementation, this would write to an activity log table
            activity_entry = {
                'parent_email': parent_email,
                'type': activity_type,
                'message': message,
                'details': details or {},
                'timestamp': datetime.datetime.now().isoformat()
            }
            
            # TODO: Write to activity log table
            print(f"Activity logged: {activity_entry}")
            return True
            
        except Exception as e:
            print(f"Activity logging error: {str(e)}")
            return False

