"""
Activity Component - Clean Architecture
Handles all parent activity operations with explicit functions
"""
from typing import Dict, Any
from tsa_shared import create_api_response, UserIdentifier
from services.activity_service import ActivityService


class ActivityComponent:
    """Clean component for parent activity operations"""
    
    @staticmethod
    def get_recent_activity(user_email: str) -> Dict[str, Any]:
        """Get recent activity for dashboard composition"""
        try:
            activities = ActivityService.get_recent_activity_for_parent(user_email)
            
            return {
                'activities': activities,
                'count': len(activities)
            }
            
        except Exception as e:
            print(f"Activity component error: {str(e)}")
            return {'activities': [], 'count': 0}
