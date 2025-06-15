"""
Role Validation Utility
Validates if users should have access to specific roles (coach, parent, admin)
Integrates with existing databases and business logic
"""
import os
import boto3
import json
from typing import Dict, Any, Optional, List
from datetime import datetime


class RoleValidator:
    """Validates user roles against business rules and database records"""
    
    def __init__(self):
        """Initialize role validator with database connections"""
        self.dynamodb = boto3.resource('dynamodb')
        self.rds_client = boto3.client('rds-data')
        
        # Get database configuration from environment
        self.coach_db_arn = os.environ.get('COACH_DB_CLUSTER_ARN')
        self.coach_secret_arn = os.environ.get('COACH_DB_SECRET_ARN')
        self.parent_db_arn = os.environ.get('PARENT_DB_CLUSTER_ARN') 
        self.parent_secret_arn = os.environ.get('PARENT_DB_SECRET_ARN')
        
        # Admin emails (could be moved to Parameter Store)
        self.admin_emails = self._get_admin_emails()
    
    def _get_admin_emails(self) -> List[str]:
        """Get list of authorized admin emails"""
        try:
            # Try to get from SSM Parameter Store first
            ssm = boto3.client('ssm')
            response = ssm.get_parameter(
                Name='/tsa/admin/authorized-emails',
                WithDecryption=True
            )
            return json.loads(response['Parameter']['Value'])
        except Exception:
            # Fallback to environment variable or hardcoded list
            admin_emails_str = os.environ.get('ADMIN_EMAILS', '')
            if admin_emails_str:
                return [email.strip() for email in admin_emails_str.split(',')]
            
            # Hardcoded fallback (should be moved to Parameter Store)
            return [
                'admin@sportsacademy.tech',
                'danny.mota@superbuilders.school',
                # Add other authorized admin emails
            ]
    
    async def validate_role_access(self, email: str, requested_role: str, invitation_token: str = None) -> Dict[str, Any]:
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
                return await self._validate_admin_access(email, validation_result)
            elif requested_role == 'coach':
                return await self._validate_coach_access(email, validation_result)
            elif requested_role == 'parent':
                return await self._validate_parent_access(email, invitation_token, validation_result)
            else:
                validation_result['reason'] = f'Invalid role: {requested_role}'
                return validation_result
                
        except Exception as e:
            print(f"❌ Error validating role access: {str(e)}")
            validation_result['reason'] = f'Validation error: {str(e)}'
            return validation_result
    
    async def _validate_admin_access(self, email: str, result: Dict[str, Any]) -> Dict[str, Any]:
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
    
    async def _validate_coach_access(self, email: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate coach role access"""
        print(f"🏃 Validating coach access for: {email}")
        
        if not self.coach_db_arn or not self.coach_secret_arn:
            print("⚠️ Coach database not configured, allowing access")
            result['valid'] = True
            result['reason'] = 'Coach database not configured - allowing access'
            return result
        
        try:
            # Query coach database to check if email exists
            response = await self._execute_rds_query(
                cluster_arn=self.coach_db_arn,
                secret_arn=self.coach_secret_arn,
                sql="SELECT id, email, status, created_at FROM coaches WHERE email = :email",
                parameters=[{'name': 'email', 'value': {'stringValue': email}}]
            )
            
            if response['records']:
                coach_record = response['records'][0]
                coach_id = coach_record[0]['longValue'] if coach_record[0].get('longValue') else None
                status = coach_record[2]['stringValue'] if coach_record[2].get('stringValue') else 'unknown'
                
                if status in ['active', 'pending', 'invited']:
                    result['valid'] = True
                    result['reason'] = f'Coach found in database with status: {status}'
                    result['additional_data'] = {
                        'coach_id': coach_id,
                        'status': status,
                        'source': 'database'
                    }
                    print(f"✅ Coach access granted for: {email} (ID: {coach_id}, Status: {status})")
                else:
                    result['reason'] = f'Coach found but status is: {status}'
                    print(f"❌ Coach access denied for: {email} (Status: {status})")
            else:
                # Coach not found in database - could be new registration
                result['valid'] = True  # Allow new coach registrations
                result['reason'] = 'New coach registration - allowing access'
                result['additional_data']['source'] = 'new_registration'
                print(f"✅ New coach registration allowed for: {email}")
                
        except Exception as e:
            print(f"⚠️ Error querying coach database: {str(e)}")
            # Fail open - allow access if database is unavailable
            result['valid'] = True
            result['reason'] = f'Database error - allowing access: {str(e)}'
        
        return result
    
    async def _validate_parent_access(self, email: str, invitation_token: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate parent role access"""
        print(f"👨‍👩‍👧‍👦 Validating parent access for: {email}")
        
        # Parents MUST have a valid invitation token
        if not invitation_token:
            result['reason'] = 'Parent access requires valid invitation token'
            print(f"❌ Parent access denied for: {email} - no invitation token")
            return result
        
        try:
            # Check invitation token in parent database
            if self.parent_db_arn and self.parent_secret_arn:
                response = await self._execute_rds_query(
                    cluster_arn=self.parent_db_arn,
                    secret_arn=self.parent_secret_arn,
                    sql="""
                        SELECT pi.id, pi.email, pi.status, pi.expires_at, pi.coach_id, pi.student_name
                        FROM parent_invitations pi 
                        WHERE pi.invitation_token = :token AND pi.email = :email
                    """,
                    parameters=[
                        {'name': 'token', 'value': {'stringValue': invitation_token}},
                        {'name': 'email', 'value': {'stringValue': email}}
                    ]
                )
                
                if response['records']:
                    invitation = response['records'][0]
                    invitation_id = invitation[0]['longValue'] if invitation[0].get('longValue') else None
                    status = invitation[2]['stringValue'] if invitation[2].get('stringValue') else 'unknown'
                    expires_at = invitation[3]['stringValue'] if invitation[3].get('stringValue') else None
                    coach_id = invitation[4]['longValue'] if invitation[4].get('longValue') else None
                    student_name = invitation[5]['stringValue'] if invitation[5].get('stringValue') else None
                    
                    # Check if invitation is valid and not expired
                    if status == 'pending':
                        if expires_at:
                            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                            if datetime.utcnow().replace(tzinfo=expiry_date.tzinfo) > expiry_date:
                                result['reason'] = 'Invitation token has expired'
                                print(f"❌ Parent invitation expired for: {email}")
                                return result
                        
                        result['valid'] = True
                        result['reason'] = 'Valid parent invitation found'
                        result['additional_data'] = {
                            'invitation_id': invitation_id,
                            'coach_id': coach_id,
                            'student_name': student_name,
                            'expires_at': expires_at
                        }
                        print(f"✅ Parent access granted for: {email} (Coach: {coach_id}, Student: {student_name})")
                    else:
                        result['reason'] = f'Invitation status is: {status}'
                        print(f"❌ Parent invitation invalid status for: {email} (Status: {status})")
                else:
                    result['reason'] = 'Invalid invitation token or email mismatch'
                    print(f"❌ Parent invitation not found for: {email}")
            else:
                # Fallback: check DynamoDB for invitation tokens
                print("⚠️ Parent database not configured, checking DynamoDB...")
                result = await self._validate_parent_invitation_dynamodb(email, invitation_token, result)
                
        except Exception as e:
            print(f"⚠️ Error validating parent invitation: {str(e)}")
            result['reason'] = f'Invitation validation error: {str(e)}'
        
        return result
    
    async def _validate_parent_invitation_dynamodb(self, email: str, invitation_token: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback validation using DynamoDB for parent invitations"""
        try:
            # Check if there's a parent invitations table in DynamoDB
            invitations_table_name = os.environ.get('PARENT_INVITATIONS_TABLE')
            if not invitations_table_name:
                result['reason'] = 'Parent invitation system not configured'
                return result
            
            table = self.dynamodb.Table(invitations_table_name)
            response = table.get_item(
                Key={'invitation_token': invitation_token}
            )
            
            if 'Item' in response:
                invitation = response['Item']
                if invitation.get('email', '').lower() == email.lower():
                    if invitation.get('status') == 'pending':
                        result['valid'] = True
                        result['reason'] = 'Valid parent invitation found in DynamoDB'
                        result['additional_data'] = {
                            'coach_id': invitation.get('coach_id'),
                            'student_name': invitation.get('student_name'),
                            'source': 'dynamodb'
                        }
                        print(f"✅ Parent access granted via DynamoDB for: {email}")
                    else:
                        result['reason'] = f'Invitation status is: {invitation.get("status")}'
                else:
                    result['reason'] = 'Email does not match invitation'
            else:
                result['reason'] = 'Invitation token not found'
                
        except Exception as e:
            print(f"⚠️ Error checking DynamoDB invitations: {str(e)}")
            result['reason'] = f'DynamoDB validation error: {str(e)}'
        
        return result
    
    async def _execute_rds_query(self, cluster_arn: str, secret_arn: str, sql: str, parameters: List[Dict] = None) -> Dict[str, Any]:
        """Execute RDS Data API query"""
        try:
            params = {
                'resourceArn': cluster_arn,
                'secretArn': secret_arn,
                'sql': sql,
                'database': 'tsa_platform'  # Adjust database name as needed
            }
            
            if parameters:
                params['parameters'] = parameters
            
            response = self.rds_client.execute_statement(**params)
            return response
            
        except Exception as e:
            print(f"❌ RDS query error: {str(e)}")
            raise
    
    def get_role_permissions(self, role: str) -> Dict[str, Any]:
        """Get permissions and capabilities for a specific role"""
        permissions = {
            'admin': {
                'can_manage_coaches': True,
                'can_manage_parents': True,
                'can_view_analytics': True,
                'can_manage_system': True,
                'frontend_url': os.environ.get('ADMIN_FRONTEND_URL', 'http://localhost:3001')
            },
            'coach': {
                'can_manage_students': True,
                'can_invite_parents': True,
                'can_view_own_analytics': True,
                'can_manage_system': False,
                'frontend_url': os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            },
            'parent': {
                'can_view_student_progress': True,
                'can_communicate_with_coach': True,
                'can_manage_system': False,
                'frontend_url': os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            }
        }
        
        return permissions.get(role, {})


# Convenience function for Lambda handlers
async def validate_user_role(email: str, role: str, invitation_token: str = None) -> Dict[str, Any]:
    """Convenience function to validate user role access"""
    validator = RoleValidator()
    return await validator.validate_role_access(email, role, invitation_token) 