"""
Enrollment Service - Business Logic Layer
Handles parent enrollment operations with proper data access patterns
"""
from typing import Dict, Any, List
from tsa_shared import get_table, UserIdentifier
import os
from shared_config import get_config



config = get_config()

class EnrollmentService:
    """Service for parent enrollment business logic"""
    
    @staticmethod
    def get_parent_enrollments(parent_email: str) -> List[Dict[str, Any]]:
        """Get all enrollments for parent using proper GSI lookup"""
        try:
            table = get_table(config.get_env_vars('SERVICE')['ENROLLMENTS_TABLE'], get_table_name('enrollments')))
            
            # Use GSI for efficient lookup instead of scanning
            response = table.query(
                IndexName='parent-email-index',  # Proper GSI, not scan
                KeyConditionExpression='parent_email = :email',
                ExpressionAttributeValues={':email': parent_email}
            )
            
            enrollments = []
            for item in response.get('Items', []):
                # Calculate progress efficiently
                enrollment_summary = EnrollmentService._format_enrollment_summary(item)
                enrollments.append(enrollment_summary)
            
            # Sort by creation date (most recent first)
            enrollments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return enrollments
            
        except Exception as e:
            print(f"Enrollment service error: {str(e)}")
            return []
    
    @staticmethod
    def _format_enrollment_summary(item: Dict[str, Any]) -> Dict[str, Any]:
        """Format enrollment item into clean summary"""
        completed_steps = item.get('completed_steps', [])
        total_steps = 6  # Define total steps as constant
        progress_percentage = (len(completed_steps) / total_steps) * 100
        
        return {
            'enrollment_id': item.get('enrollment_id'),
            'student_name': f"{item.get('student_first_name', '')} {item.get('student_last_name', '')}".strip(),
            'coach_name': item.get('coach_name', ''),
            'school_name': item.get('school_name', ''),
            'grade_level': item.get('grade_level', ''),
            'sport_interest': item.get('sport_interest', ''),
            'status': item.get('status', 'pending'),
            'current_step': item.get('current_step', 1),
            'progress_percentage': round(progress_percentage, 1),
            'completed_steps': completed_steps,
            'created_at': item.get('created_at'),
            'updated_at': item.get('updated_at')
        }
    
    @staticmethod
    def get_enrollment_by_id(enrollment_id: str) -> Dict[str, Any]:
        """Get specific enrollment by ID"""
        try:
            table = get_table(config.get_env_vars('SERVICE')['ENROLLMENTS_TABLE'], get_table_name('enrollments')))
            
            response = table.get_item(Key={'enrollment_id': enrollment_id})
            return response.get('Item', {})
            
        except Exception as e:
            print(f"Get enrollment error: {str(e)}")
            return {} 