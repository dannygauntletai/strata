"""
Role Validation Utility
Validates if users should have access to specific roles (coach, parent, admin)
Integrates with existing DynamoDB tables and business logic
"""
import os
import boto3
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from shared_config import get_config

# Initialize shared config
config = get_config()


class RoleValidator:
    """Validates user roles against business rules and database records"""
    
    def __init__(self):
        """Initialize role validator with database connections"""
        self.dynamodb = boto3.resource('dynamodb')
        
        # Admin emails (could be moved to Parameter Store)
        self.admin_emails = self._get_admin_emails()
    
    def _get_admin_emails(self) -> List[str]:
        """Get list of authorized admin emails"""
        try:
            # Try to get from environment variable first
            env_vars = config.get_env_vars('auth')
            admin_emails_str = env_vars.get('ADMIN_EMAILS', '')
            if admin_emails_str:
                return [email.strip().lower() for email in admin_emails_str.split(',')]
            
            # Try SSM Parameter Store as fallback
            ssm = boto3.client('ssm')
            response = ssm.get_parameter(
                Name='/tsa/admin/authorized-emails',
                WithDecryption=True
            )
            return json.loads(response['Parameter']['Value'])
        except Exception:
            # Hardcoded fallback (should be moved to Parameter Store)
            return [
                'admin@sportsacademy.tech',
                'danny.mota@superbuilders.school',
                'malekai.mischke@superbuilders.school',
            ]
    
    def validate_role_access(self, email: str, requested_role: str, invitation_token: str = None) -> Dict[str, Any]:
        """
        Validate if user should have access to the requested role
        
        Args:
            email: User's email address
            requested_role: Role being requested ('coach', 'parent', 'admin')
            invitation_token: Optional invitation token for parents
            
        Returns:
            Dict with validation result and details
        """
        print(f"🔍 Validating role access: {email} -> {requested_role}")
        
        validation_result = {
            'valid': False,
            'role': requested_role,
            'email': email,
            'reason': '',
            'additional_data': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            if requested_role == 'admin':
                return self._validate_admin_access(email, validation_result)
            elif requested_role == 'coach':
                return self._validate_coach_access(email, validation_result)
            elif requested_role == 'parent':
                return self._validate_parent_access(email, invitation_token, validation_result)
            else:
                validation_result['reason'] = f'Invalid role: {requested_role}'
                return validation_result
                
        except Exception as e:
            print(f"❌ Error validating role access: {str(e)}")
            validation_result['reason'] = f'Validation error: {str(e)}'
            return validation_result
    
    def _validate_admin_access(self, email: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate admin role access"""
        print(f"🔐 Validating admin access for: {email}")
        
        # Check if email is in authorized admin list
        if email.lower() in [admin_email.lower() for admin_email in self.admin_emails]:
            result['valid'] = True
            result['reason'] = 'Email found in authorized admin list'
            result['additional_data']['admin_level'] = 'full'
            print(f"✅ Admin access granted for: {email}")
        else:
            result['reason'] = 'Email not found in authorized admin list'
            print(f"❌ Admin access denied for: {email}")
        
        return result
    
    def _validate_coach_access(self, email: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate coach role access using DynamoDB invitations table"""
        print(f"🏃 Validating coach access for: {email}")
        
        try:
            # Check coach invitations table in DynamoDB
            invitations_table = self.dynamodb.Table(config.get_table_name('coach-invitations'))
            
            # Query by email using GSI
            response = invitations_table.query(
                IndexName='email-index',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': email.lower()}
            )
            
            if response.get('Items'):
                invitation = response['Items'][0]  # Get most recent
                status = invitation.get('status', '')
                coach_id = invitation.get('coach_id', invitation.get('id'))
                
                if status == 'completed':
                    # Completed coach - can proceed with magic link
                    result['valid'] = True
                    result['reason'] = f'Coach found with completed status'
                    result['additional_data'] = {
                        'coach_id': coach_id,
                        'status': status,
                        'source': 'dynamodb',
                        'can_login': True
                    }
                    print(f"✅ Coach access granted for: {email} (Status: {status})")
                    
                elif status in ['pending', 'accepted']:
                    # Pending/accepted coach - needs onboarding
                    result['valid'] = False
                    result['reason'] = f'Coach needs to complete onboarding (Status: {status})'
                    result['additional_data'] = {
                        'coach_id': coach_id,
                        'status': status,
                        'requires_onboarding': True,
                        'onboarding_url': f"{config.get_env_vars('auth').get('FRONTEND_URL', 'http://localhost:3000')}/onboarding"
                    }
                    print(f"🔄 Coach needs onboarding: {email} (Status: {status})")
                    
                else:
                    result['reason'] = f'Coach invitation status does not allow login: {status}'
                    print(f"❌ Coach access denied for: {email} (Status: {status})")
            else:
                # No invitation found
                result['reason'] = 'No coach invitation found'
                print(f"❌ No coach invitation found for: {email}")
                
        except Exception as e:
            print(f"⚠️ Error querying coach invitations: {str(e)}")
            result['reason'] = f'Database error during coach validation: {str(e)}'
        
        return result
    
    def _validate_parent_access(self, email: str, invitation_token: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate parent role access using DynamoDB invitations table"""
        print(f"👨‍👩‍👧‍👦 Validating parent access for: {email}")
        
        # Parents MUST have a valid invitation token
        if not invitation_token:
            result['reason'] = 'Parent access requires valid invitation token'
            print(f"❌ Parent access denied for: {email} - no invitation token")
            return result
        
        try:
            # Check main invitations table for parent invitations
            invitations_table = self.dynamodb.Table(config.get_table_name('coach-invitations'))
            
            # Look up invitation by token and role
            response = invitations_table.scan(
                FilterExpression='invitation_token = :token AND #role = :role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={
                    ':token': invitation_token,
                    ':role': 'parent'
                }
                )
                
            if response.get('Items'):
                invitation = response['Items'][0]
                invitation_email = invitation.get('email', '').lower()
                status = invitation.get('status', '')
                expires_at = invitation.get('expires_at')
                coach_id = invitation.get('coach_id')
                children = invitation.get('children', [])
                
                # Validate email matches
                if invitation_email != email.lower():
                    result['reason'] = f'Email mismatch: invitation for {invitation_email}, login attempt by {email}'
                    print(f"❌ Parent invitation email mismatch: {email} vs {invitation_email}")
                    return result
                
                # Validate status
                if status not in ['pending', 'sent']:
                    result['reason'] = f'Parent invitation status is {status}, expected pending or sent'
                    print(f"❌ Parent invitation invalid status for: {email} (Status: {status})")
                    return result
                
                # Check expiration
                if expires_at and datetime.utcnow().timestamp() > expires_at:
                    result['reason'] = 'Parent invitation has expired'
                    print(f"❌ Parent invitation expired for: {email}")
                    return result
                
                # Valid parent invitation
                result['valid'] = True
                result['reason'] = 'Valid parent invitation found'
                result['additional_data'] = {
                    'coach_id': coach_id,
                    'children': children,
                    'invitation_token': invitation_token,
                    'expires_at': expires_at,
                    'source': 'dynamodb'
                }
                print(f"✅ Parent access granted for: {email} (Coach: {coach_id})")
                
            else:
                result['reason'] = 'Invalid parent invitation token'
                print(f"❌ Parent invitation token not found: {invitation_token}")
                
        except Exception as e:
            print(f"⚠️ Error validating parent invitation: {str(e)}")
            result['reason'] = f'Database error during parent validation: {str(e)}'
        
        return result
    
    def get_role_permissions(self, role: str) -> Dict[str, Any]:
        """Get permissions and capabilities for a specific role"""
        permissions = {
            'admin': {
                'can_manage_coaches': True,
                'can_manage_parents': True,
                'can_view_analytics': True,
                'can_manage_system': True,
                'frontend_url': config.get_env_vars('auth').get('ADMIN_FRONTEND_URL', 'http://localhost:3001')
            },
            'coach': {
                'can_manage_students': True,
                'can_invite_parents': True,
                'can_view_own_analytics': True,
                'can_manage_system': False,
                'frontend_url': config.get_env_vars('auth').get('FRONTEND_URL', 'http://localhost:3000')
            },
            'parent': {
                'can_view_student_progress': True,
                'can_communicate_with_coach': True,
                'can_manage_system': False,
                'frontend_url': config.get_env_vars('auth').get('FRONTEND_URL', 'http://localhost:3000')
            }
        }
        
        return permissions.get(role, {})


# Convenience function for Lambda handlers
def validate_user_role(email: str, role: str, invitation_token: str = None) -> Dict[str, Any]:
    """Convenience function to validate user role access"""
    validator = RoleValidator()
    return validator.validate_role_access(email, role, invitation_token) 