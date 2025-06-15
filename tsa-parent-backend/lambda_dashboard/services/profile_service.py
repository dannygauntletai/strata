"""
Profile Service - Business Logic Layer
Handles parent profile operations with proper data access patterns
"""
from typing import Dict, Any, Optional
from tsa_shared import get_table, UserIdentifier
import os
import time

class ProfileService:
    """Service for parent profile business logic"""
    
    @staticmethod
    def get_parent_profile(email: str) -> Optional[Dict[str, Any]]:
        """Get parent profile using proper GSI lookup, not scan"""
        try:
            table = get_table(os.environ.get('PROFILES_TABLE', 'profiles'))
            
            # Use GSI for efficient lookup instead of scanning
            response = table.query(
                IndexName='email-index',  # Proper GSI, not scan
                KeyConditionExpression='email = :email',
                FilterExpression='role_type = :role',
                ExpressionAttributeValues={
                    ':email': email,
                    ':role': 'parent'
                }
            )
            
            return response['Items'][0] if response['Items'] else None
            
        except Exception as e:
            print(f"Profile service error: {str(e)}")
            return None
    
    @staticmethod
    def update_parent_profile(email: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update parent profile with validation"""
        try:
            profile = ProfileService.get_parent_profile(email)
            if not profile:
                return None
            
            table = get_table(os.environ.get('PROFILES_TABLE', 'profiles'))
            profile_id = profile['profile_id']
            
            # Build update expression safely
            update_expr = []
            expr_values = {}
            expr_names = {}
            
            # Only allow specific fields to be updated
            allowed_fields = ['first_name', 'last_name', 'phone_number', 'emergency_contact']
            
            for field in allowed_fields:
                if field in updates:
                    update_expr.append(f"#{field} = :{field}")
                    expr_names[f"#{field}"] = field
                    expr_values[f":{field}"] = updates[field]
            
            if update_expr:
                table.update_item(
                    Key={'profile_id': profile_id},
                    UpdateExpression=f"SET {', '.join(update_expr)}, updated_at = :updated_at",
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues={**expr_values, ':updated_at': int(time.time())},
                    ReturnValues='ALL_NEW'
                )
            
            return ProfileService.get_parent_profile(email)
            
        except Exception as e:
            print(f"Profile update error: {str(e)}")
            return None
    
    @staticmethod
    def is_profile_complete(profile: Dict[str, Any]) -> bool:
        """Check if profile has required fields"""
        required_fields = ['first_name', 'last_name', 'phone_number']
        return all(profile.get(field) for field in required_fields) 