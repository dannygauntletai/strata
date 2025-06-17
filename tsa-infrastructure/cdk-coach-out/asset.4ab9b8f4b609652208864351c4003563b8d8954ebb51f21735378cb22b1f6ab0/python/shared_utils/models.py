"""
Centralized Data Models for TSA Coach Backend
Ensures consistent data structures across all Lambda functions
"""
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json


class UserIdentifier:
    """Handles the email ↔ profile_id mapping consistently across all services"""
    
    @staticmethod
    def normalize_coach_id(coach_id: str, profiles_table) -> str:
        """
        Convert any coach identifier (email or profile_id) to profile_id
        This is the single source of truth for ID mapping
        """
        if not coach_id:
            raise ValueError("coach_id cannot be empty")
        
        # If it looks like an email, lookup the profile_id
        if '@' in coach_id:
            try:
                response = profiles_table.scan(
                    FilterExpression='email = :email',
                    ExpressionAttributeValues={':email': coach_id.lower().strip()},
                    Limit=1
                )
                
                if response['Items']:
                    return response['Items'][0]['profile_id']
                else:
                    # Email not found - this is a new user scenario
                    raise ValueError(f"No profile found for email: {coach_id}")
                    
            except Exception as e:
                raise ValueError(f"Error looking up profile for email {coach_id}: {str(e)}")
        
        # Assume it's already a profile_id
        return coach_id
    
    @staticmethod
    def get_email_from_profile_id(profile_id: str, profiles_table) -> Optional[str]:
        """Get email from profile_id"""
        try:
            response = profiles_table.get_item(Key={'profile_id': profile_id})
            if 'Item' in response:
                return response['Item'].get('email')
            return None
        except Exception:
            return None


class CoachProfile:
    """Standardized coach profile structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.profile_id = data.get('profile_id')
        self.email = data.get('email', '').lower().strip()
        self.first_name = data.get('first_name', '')
        self.last_name = data.get('last_name', '')
        self.school_name = data.get('school_name', '')
        self.sport = data.get('sport', '')
        self.phone = data.get('phone', '')
        self.status = data.get('status', 'active')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.onboarding_progress = data.get('onboarding_progress', {})
        self.bootcamp_progress = data.get('bootcamp_progress', {})
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        return {
            'profile_id': self.profile_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'school_name': self.school_name,
            'sport': self.sport,
            'phone': self.phone,
            'status': self.status,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'onboarding_progress': self.onboarding_progress,
            'bootcamp_progress': self.bootcamp_progress
        }
    
    def get_full_name(self) -> str:
        """Get formatted full name"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def is_onboarding_complete(self) -> bool:
        """Check if onboarding is complete"""
        return self.onboarding_progress.get('is_completed', False)
    
    def get_bootcamp_completion_percentage(self) -> float:
        """Get bootcamp completion percentage"""
        return float(self.bootcamp_progress.get('completion_percentage', 0))


class BootcampModule:
    """Standardized bootcamp module structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.type = data.get('type', 'video')  # 'video' or 'quiz'
        self.duration = data.get('duration', 0)  # in seconds
        self.module_group = data.get('module', '')
        self.prerequisites = data.get('prerequisites', [])
        self.questions = data.get('questions', 0)  # for quizzes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to API response format"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type,
            'duration': self.duration,
            'module': self.module_group,
            'prerequisites': self.prerequisites,
            'questions': self.questions if self.type == 'quiz' else None
        }


class BootcampProgress:
    """Standardized bootcamp progress tracking"""
    
    def __init__(self, data: Dict[str, Any]):
        self.coach_id = data.get('coach_id')
        self.enrollment_date = data.get('enrollment_date')
        self.completion_percentage = float(data.get('completion_percentage', 0))
        self.total_hours_completed = float(data.get('total_hours_completed', 0))
        self.current_module = data.get('current_module')
        self.modules_completed = data.get('modules_completed', [])
        self.quiz_attempts = data.get('quiz_attempts', [])
        self.certifications_earned = data.get('certifications_earned', [])
        self.video_progress = data.get('video_progress', {})
        self.last_accessed = data.get('last_accessed')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        return {
            'coach_id': self.coach_id,
            'enrollment_date': self.enrollment_date,
            'completion_percentage': self.completion_percentage,
            'total_hours_completed': self.total_hours_completed,
            'current_module': self.current_module,
            'modules_completed': self.modules_completed,
            'quiz_attempts': self.quiz_attempts,
            'certifications_earned': self.certifications_earned,
            'video_progress': self.video_progress,
            'last_accessed': self.last_accessed
        }
    
    def add_completed_module(self, module_id: int, completion_data: Dict[str, Any] = None):
        """Add a completed module with proper tracking"""
        if module_id not in [m.get('module_id', m) if isinstance(m, dict) else m for m in self.modules_completed]:
            completed_module = {
                'module_id': module_id,
                'completed_at': datetime.utcnow().isoformat(),
                'completion_data': completion_data or {}
            }
            self.modules_completed.append(completed_module)
    
    def get_available_modules(self, all_modules: List[BootcampModule]) -> List[int]:
        """Get list of available module IDs based on prerequisites"""
        completed_ids = [m.get('module_id', m) if isinstance(m, dict) else m for m in self.modules_completed]
        available = []
        
        for module in all_modules:
            prerequisites_met = all(prereq in completed_ids for prereq in module.prerequisites)
            if prerequisites_met and module.id not in completed_ids:
                available.append(module.id)
        
        return available


class Event:
    """Standardized event structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.event_id = data.get('event_id')
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.start_date = data.get('start_date')
        self.end_date = data.get('end_date')
        self.created_by = data.get('created_by')  # This should be profile_id, not email
        self.location = data.get('location', '')
        self.max_participants = data.get('max_participants')
        self.current_participants = data.get('current_participants', 0)
        self.status = data.get('status', 'scheduled')
        self.category = data.get('category', '')
        self.cost = data.get('cost', 0.0)
        self.photos = data.get('photos', [])
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        return {
            'event_id': self.event_id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'created_by': self.created_by,
            'location': self.location,
            'max_participants': self.max_participants,
            'current_participants': self.current_participants,
            'status': self.status,
            'category': self.category,
            'cost': self.cost,
            'photos': self.photos,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class ParentInvitation:
    """Standardized parent invitation structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.invitation_id = data.get('invitation_id')
        self.parent_email = data.get('parent_email', '').lower().strip()
        self.coach_id = data.get('coach_id')  # This should be profile_id
        self.student_name = data.get('student_name', '')
        self.status = data.get('status', 'pending')
        self.message = data.get('message', '')
        self.expires_at = data.get('expires_at')
        self.created_at = data.get('created_at')
        self.sent_at = data.get('sent_at')
        self.responded_at = data.get('responded_at')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        return {
            'invitation_id': self.invitation_id,
            'parent_email': self.parent_email,
            'coach_id': self.coach_id,
            'student_name': self.student_name,
            'status': self.status,
            'message': self.message,
            'expires_at': self.expires_at,
            'created_at': self.created_at,
            'sent_at': self.sent_at,
            'responded_at': self.responded_at
        }


class TimelineEvent:
    """Standardized timeline/progress event structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.event_id = data.get('event_id')
        self.coach_id = data.get('coach_id')  # profile_id
        self.event_type = data.get('event_type', '')  # 'onboarding', 'bootcamp', 'event_created', etc.
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.status = data.get('status', 'pending')
        self.progress_percentage = data.get('progress_percentage', 0)
        self.metadata = data.get('metadata', {})
        self.created_at = data.get('created_at')
        self.completed_at = data.get('completed_at')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        return {
            'event_id': self.event_id,
            'coach_id': self.coach_id,
            'event_type': self.event_type,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'metadata': self.metadata,
            'created_at': self.created_at,
            'completed_at': self.completed_at
        } 