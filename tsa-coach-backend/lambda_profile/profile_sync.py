"""
Profile Sync Utility
Hardening mechanism to ensure completed onboarding invitations have corresponding profiles
"""
import boto3
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class ProfileSyncManager:
    """Manages synchronization between completed onboarding and profiles table"""
    
    def __init__(self, users_table_name: str, profiles_table_name: str, invitations_table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.users_table = self.dynamodb.Table(users_table_name)
        self.profiles_table = self.dynamodb.Table(profiles_table_name)
        self.invitations_table = self.dynamodb.Table(invitations_table_name)
    
    def ensure_profile_exists_for_email(self, email: str) -> bool:
        """
        Ensure a profile exists for a given email. If not, create one from users table data.
        
        Args:
            email: Email address to check/create profile for
            
        Returns:
            True if profile exists or was created successfully, False otherwise
        """
        try:
            # Check if profile already exists
            coach_id = f"coach_{email.replace('@', '_').replace('.', '_')}"
            
            profile_response = self.profiles_table.get_item(
                Key={'profile_id': coach_id}
            )
            
            if 'Item' in profile_response:
                logger.info(f"Profile already exists for {email}")
                return True
            
            # Profile doesn't exist, try to create from users table
            logger.info(f"Profile missing for {email}, attempting to create from users table")
            return self._create_profile_from_users_table(email, coach_id)
            
        except Exception as e:
            logger.error(f"Error ensuring profile exists for {email}: {str(e)}")
            return False
    
    def _create_profile_from_users_table(self, email: str, coach_id: str) -> bool:
        """Create profile from corresponding users table entry"""
        try:
            # Get user data from users table
            user_response = self.users_table.get_item(
                Key={'user_id': coach_id}
            )
            
            if 'Item' not in user_response:
                logger.warning(f"No user data found in users table for {email}")
                return self._create_minimal_profile(email, coach_id)
            
            user_data = user_response['Item']
            
            # Create profile from user data
            profile_data = {
                'profile_id': coach_id,
                'coach_id': coach_id,
                'school_id': user_data.get('school_id', user_data.get('school_name', 'default_school')),
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
                'email': email,
                'phone': user_data.get('phone', ''),
                'specializations': user_data.get('specialties', user_data.get('specializations', [])),
                'certification_level': user_data.get('certification_level', ''),
                'years_experience': int(user_data.get('experience', 0)) if user_data.get('experience') else 0,
                'students_assigned': [],
                'active_programs': [],
                'preferences': {},
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'sync_source': 'users_table'  # Track that this was created via sync
            }
            
            self.profiles_table.put_item(Item=profile_data)
            logger.info(f"✅ Created profile for {email} from users table data")
            return True
            
        except Exception as e:
            logger.error(f"Error creating profile from users table for {email}: {str(e)}")
            return self._create_minimal_profile(email, coach_id)
    
    def _create_minimal_profile(self, email: str, coach_id: str) -> bool:
        """Create minimal profile as last resort"""
        try:
            # Extract name from email as fallback
            email_prefix = email.split('@')[0]
            name_parts = email_prefix.replace('.', ' ').replace('_', ' ').split()
            first_name = name_parts[0].title() if name_parts else 'Coach'
            last_name = name_parts[1].title() if len(name_parts) > 1 else 'User'
            
            minimal_profile = {
                'profile_id': coach_id,
                'coach_id': coach_id,
                'school_id': 'default_school',
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': '',
                'specializations': [],
                'certification_level': '',
                'years_experience': 0,
                'students_assigned': [],
                'active_programs': [],
                'preferences': {},
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'sync_source': 'minimal_fallback'  # Track fallback creation
            }
            
            self.profiles_table.put_item(Item=minimal_profile)
            logger.info(f"✅ Created minimal profile for {email} as fallback")
            return True
            
        except Exception as e:
            logger.error(f"Error creating minimal profile for {email}: {str(e)}")
            return False
    
    def sync_completed_invitations(self) -> Dict[str, int]:
        """
        Sync all completed onboarding invitations to ensure they have profiles
        
        Returns:
            Dictionary with sync statistics
        """
        stats = {
            'completed_invitations': 0,
            'existing_profiles': 0,
            'profiles_created': 0,
            'sync_failures': 0
        }
        
        try:
            # Scan for completed invitations
            response = self.invitations_table.scan(
                FilterExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': 'completed'}
            )
            
            completed_invitations = response.get('Items', [])
            stats['completed_invitations'] = len(completed_invitations)
            
            logger.info(f"Found {len(completed_invitations)} completed invitations to sync")
            
            for invitation in completed_invitations:
                email = invitation.get('email')
                if not email:
                    continue
                
                success = self.ensure_profile_exists_for_email(email)
                if success:
                    # Check if it already existed or was created
                    coach_id = f"coach_{email.replace('@', '_').replace('.', '_')}"
                    profile_response = self.profiles_table.get_item(
                        Key={'profile_id': coach_id}
                    )
                    
                    if 'Item' in profile_response:
                        profile = profile_response['Item']
                        if profile.get('sync_source'):
                            stats['profiles_created'] += 1
                        else:
                            stats['existing_profiles'] += 1
                else:
                    stats['sync_failures'] += 1
                    logger.error(f"Failed to ensure profile for {email}")
            
            logger.info(f"Sync completed: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error during invitation sync: {str(e)}")
            stats['sync_failures'] += 1
            return stats


def create_profile_sync_manager() -> ProfileSyncManager:
    """Factory function to create ProfileSyncManager with environment variables"""
    import os
    
    users_table = os.environ.get('USERS_TABLE')
    profiles_table = os.environ.get('PROFILES_TABLE') 
    invitations_table = os.environ.get('INVITATIONS_TABLE')
    
    if not all([users_table, profiles_table, invitations_table]):
        raise ValueError("Missing required environment variables for profile sync")
    
    return ProfileSyncManager(users_table, profiles_table, invitations_table)


def ensure_profile_exists_for_email(email: str) -> bool:
    """Convenience function to ensure profile exists for email"""
    try:
        sync_manager = create_profile_sync_manager()
        return sync_manager.ensure_profile_exists_for_email(email)
    except Exception as e:
        logger.error(f"Error in profile sync for {email}: {str(e)}")
        return False 