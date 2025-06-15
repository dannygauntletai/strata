"""
Enrollments Component - Clean Architecture
Handles all parent enrollment operations with explicit functions
"""
from typing import Dict, Any, List
from tsa_shared import create_api_response, UserIdentifier
from services.enrollment_service import EnrollmentService


class EnrollmentsComponent:
    """Clean component for parent enrollment operations"""
    
    @staticmethod
    def get_enrollments(event: Dict[str, Any]) -> Dict[str, Any]:
        """Get all enrollments for parent"""
        try:
            user_email = UserIdentifier.extract_user_email(event)
            if not user_email:
                return create_api_response(401, {'error': 'Authentication required'})
            
            enrollments = EnrollmentService.get_parent_enrollments(user_email)
            
            return create_api_response(200, {
                'enrollments': enrollments,
                'total_count': len(enrollments)
            })
            
        except Exception as e:
            print(f"Enrollments component error: {str(e)}")
            return create_api_response(500, {'error': 'Failed to load enrollments'})
    
    @staticmethod
    def get_enrollments_summary(user_email: str) -> Dict[str, Any]:
        """Get enrollment summary for dashboard composition"""
        try:
            enrollments = EnrollmentService.get_parent_enrollments(user_email)
            
            active_count = len([e for e in enrollments if e.get('status') == 'active'])
            pending_count = len([e for e in enrollments if e.get('status') == 'pending'])
            
            return {
                'total': len(enrollments),
                'active': active_count,
                'pending': pending_count,
                'recent': enrollments[:3] if enrollments else []  # Most recent 3
            }
            
        except Exception as e:
            print(f"Enrollments summary error: {str(e)}")
            return {'total': 0, 'active': 0, 'pending': 0, 'recent': []} 