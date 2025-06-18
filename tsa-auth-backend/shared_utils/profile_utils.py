"""
Profile Utilities for TSA Authentication
Centralized user profile retrieval and management functions
"""
import boto3
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from shared_config import get_config

# Initialize shared config
config = get_config()


def get_profile_by_email(email: str, request_id: str = None) -> Optional[Dict[str, Any]]:
    """Get user profile by email from profiles table"""
    try:
        if request_id:
            print(f"[{request_id}] Getting profile for {email}")
        
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(config.get_table_name('profiles'))
        
        # Query by email using GSI
        response = profiles_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email.lower()}
        )
        
        if response.get('Items'):
            return response['Items'][0]
        else:
            if request_id:
                print(f"[{request_id}] No profile found for {email}")
            return None
        
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error getting profile: {str(e)}")
        return None


def get_coach_profile(email: str, request_id: str = None) -> Dict[str, Any]:
    """Get coach profile information"""
    try:
        profile = get_profile_by_email(email, request_id)
        
        if profile:
            return {
                'profile_id': profile.get('profile_id'),
                'first_name': profile.get('first_name', ''),
                'last_name': profile.get('last_name', ''),
                'phone': profile.get('phone', ''),
                'school_id': profile.get('school_id', ''),
                'coach_id': profile.get('coach_id', profile.get('profile_id')),
                'role_specific_data': profile.get('coach_specific', {})
            }
        else:
            # No profile found, return basic info
            return {
                'profile_id': None,
                'first_name': '',
                'last_name': '',
                'phone': '',
                'school_id': '',
                'coach_id': None,
                'role_specific_data': {}
            }
            
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error getting coach profile: {str(e)}")
        return {
            'profile_id': None,
            'first_name': '',
            'last_name': '',
            'phone': '',
            'school_id': '',
            'coach_id': None,
            'role_specific_data': {},
            'error': str(e)
        }


def get_parent_profile(email: str, invitation_token: str = None, request_id: str = None) -> Dict[str, Any]:
    """Get parent profile information"""
    try:
        profile = get_profile_by_email(email, request_id)
        
        if profile:
            # Existing parent profile
            return {
                'profile_id': profile.get('profile_id'),
                'first_name': profile.get('first_name', ''),
                'last_name': profile.get('last_name', ''),
                'phone': profile.get('phone', ''),
                'parent_id': profile.get('parent_id', profile.get('profile_id')),
                'children': profile.get('parent_specific', {}).get('children', []),
                'role_specific_data': profile.get('parent_specific', {})
            }
        else:
            # New parent - create profile from invitation if available
            if invitation_token:
                return create_parent_profile(email, invitation_token, request_id)
            else:
                # Return minimal profile for now
                return {
                    'profile_id': None,
                    'first_name': '',
                    'last_name': '',
                    'phone': '',
                    'parent_id': None,
                    'children': [],
                    'role_specific_data': {}
                }
        
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error getting parent profile: {str(e)}")
        return {
            'profile_id': None,
            'first_name': '',
            'last_name': '',
            'phone': '',
            'parent_id': None,
            'children': [],
            'role_specific_data': {},
            'error': str(e)
        }


def get_admin_profile(email: str, request_id: str = None) -> Dict[str, Any]:
    """Get admin profile information"""
    try:
        if request_id:
            print(f"[{request_id}] Getting admin profile for {email}")
        
        # For admins, we can create a basic profile or check if they have a profile
        # Admin users might not have detailed profiles like coaches/parents
        
        return {
            'profile_id': f"admin-{email.split('@')[0]}",
            'first_name': '',
            'last_name': '',
            'phone': '',
            'admin_level': 'super_admin',  # Could be configured per admin
            'permissions': ['full_access'],  # Could be role-based
            'role_specific_data': {
                'admin_since': datetime.utcnow().isoformat(),
                'access_level': 'full'
            }
        }
        
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error getting admin profile: {str(e)}")
        return {
            'profile_id': None,
            'first_name': '',
            'last_name': '',
            'phone': '',
            'admin_level': 'basic',
            'permissions': [],
            'role_specific_data': {},
            'error': str(e)
        }


def create_parent_profile(email: str, invitation_token: str, request_id: str = None) -> Dict[str, Any]:
    """Create parent profile from invitation data"""
    try:
        if request_id:
            print(f"[{request_id}] Creating parent profile for {email} with invitation {invitation_token}")
        
        # Get invitation details
        invitation_data = get_invitation_data(invitation_token, request_id)
        
        if not invitation_data:
            if request_id:
                print(f"[{request_id}] No invitation data found for token {invitation_token}")
            return {
                'profile_id': None,
                'first_name': '',
                'last_name': '',
                'phone': '',
                'parent_id': None,
                'children': [],
                'role_specific_data': {},
                'error': 'Invalid invitation token'
            }
        
        # Create parent profile in profiles table
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(config.get_table_name('profiles'))
        
        profile_id = str(uuid.uuid4())
        parent_profile = {
            'profile_id': profile_id,
            'email': email.lower(),
            'role': 'parent',
            'first_name': invitation_data.get('parent_first_name', ''),
            'last_name': invitation_data.get('parent_last_name', ''),
            'phone': invitation_data.get('parent_phone', ''),
            'parent_id': profile_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'parent_specific': {
                'invitation_token': invitation_token,
                'coach_id': invitation_data.get('coach_id'),
                'school_id': invitation_data.get('school_id'),
                'children': invitation_data.get('children', []),
                'invitation_accepted_at': datetime.utcnow().isoformat()
            }
        }
        
        profiles_table.put_item(Item=parent_profile)
        
        return {
            'profile_id': profile_id,
            'first_name': parent_profile['first_name'],
            'last_name': parent_profile['last_name'],
            'phone': parent_profile['phone'],
            'parent_id': profile_id,
            'children': parent_profile['parent_specific']['children'],
            'role_specific_data': parent_profile['parent_specific']
        }
        
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error creating parent profile: {str(e)}")
        return {
            'profile_id': None,
            'first_name': '',
            'last_name': '',
            'phone': '',
            'parent_id': None,
            'children': [],
            'role_specific_data': {},
            'error': str(e)
        }


def get_invitation_data(invitation_token: str, request_id: str = None) -> Optional[Dict[str, Any]]:
    """Get invitation details from coach invitations table"""
    try:
        if request_id:
            print(f"[{request_id}] Getting invitation data for token {invitation_token}")
        
        dynamodb = boto3.resource('dynamodb')
        invitations_table = dynamodb.Table(config.get_table_name('coach-invitations'))
        
        # Scan for invitation with this token (could optimize with GSI)
        response = invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': invitation_token}
        )
        
        if response.get('Items'):
            invitation = response['Items'][0]
            return {
                'coach_id': invitation.get('coach_id'),
                'school_id': invitation.get('school_id'),
                'parent_first_name': invitation.get('parent_first_name', ''),
                'parent_last_name': invitation.get('parent_last_name', ''),
                'parent_phone': invitation.get('parent_phone', ''),
                'children': invitation.get('children', []),
                'invitation_details': invitation
            }
        else:
            return None
            
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error getting invitation data: {str(e)}")
        return None


def update_profile(profile_id: str, updates: Dict[str, Any], request_id: str = None) -> Dict[str, Any]:
    """Update user profile with new data"""
    try:
        if request_id:
            print(f"[{request_id}] Updating profile {profile_id}")
        
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(config.get_table_name('profiles'))
        
        # Add updated timestamp
        updates['updated_at'] = datetime.utcnow().isoformat()
        
        # Build update expression
        update_expression = "SET "
        expression_values = {}
        expression_names = {}
        
        for key, value in updates.items():
            attr_name = f"#{key}"
            attr_value = f":{key}"
            update_expression += f"{attr_name} = {attr_value}, "
            expression_names[attr_name] = key
            expression_values[attr_value] = value
        
        # Remove trailing comma and space
        update_expression = update_expression.rstrip(', ')
        
        response = profiles_table.update_item(
            Key={'profile_id': profile_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        return {
            'success': True,
            'updated_profile': response.get('Attributes', {})
        }
        
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error updating profile: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 