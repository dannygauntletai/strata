"""
Shared models and utilities for admin functionality
"""
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum


class InvitationStatus(Enum):
    """Invitation status enumeration"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class CoachRole(Enum):
    """Coach role enumeration"""
    SCHOOL_OWNER = "school_owner"
    INSTRUCTOR = "instructor"
    ADMINISTRATOR = "administrator"
    COACH = "coach"
    DIRECTOR = "director"
    PRINCIPAL = "principal"
    COUNSELOR = "counselor"


class Invitation:
    """Invitation model"""
    
    def __init__(self, data: Dict[str, Any]):
        self.invitation_id = data.get('invitation_id')
        self.invitation_token = data.get('invitation_token')
        self.email = data.get('email')
        self.role = data.get('role')
        self.school_name = data.get('school_name')
        self.school_type = data.get('school_type')
        self.sport = data.get('sport')
        self.message = data.get('message')
        self.status = data.get('status', InvitationStatus.PENDING.value)
        self.created_at = data.get('created_at')
        self.expires_at = data.get('expires_at')
        self.created_by = data.get('created_by')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'invitation_id': self.invitation_id,
            'invitation_token': self.invitation_token,
            'email': self.email,
            'role': self.role,
            'school_name': self.school_name,
            'school_type': self.school_type,
            'sport': self.sport,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at,
            'expires_at': self.expires_at,
            'created_by': self.created_by
        }
    
    def is_expired(self) -> bool:
        """Check if invitation is expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow().timestamp() > self.expires_at


class AdminUser:
    """Admin user model"""
    
    def __init__(self, data: Dict[str, Any]):
        self.user_id = data.get('user_id')
        self.email = data.get('email')
        self.name = data.get('name')
        self.role = data.get('role')
        self.permissions = data.get('permissions', [])
        self.created_at = data.get('created_at')
        self.last_login = data.get('last_login')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'permissions': self.permissions,
            'created_at': self.created_at,
            'last_login': self.last_login
        }


def validate_email(email: str) -> bool:
    """Basic email validation"""
    return '@' in email and '.' in email.split('@')[1]


def generate_invite_url(base_url: str, token: str) -> str:
    """Generate invitation URL"""
    return f"{base_url}/onboarding?invite={token}" 