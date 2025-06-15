"""
User Identity Utilities - Centralized ID mapping for TSA services

Solves the email ↔ profile_id mapping issues across all backend services
"""
from typing import Dict, Any, Optional
from .database import get_dynamodb_table, get_table_name


class UserIdentifier:
    """Handles the email ↔ profile_id mapping consistently across all services"""
    
    @staticmethod
    def normalize_coach_id(coach_id: str, profiles_table=None) -> str:
        """
        Convert any coach identifier (email or profile_id) to profile_id
        This is the single source of truth for ID mapping
        
        Args:
            coach_id: Email address or profile_id
            profiles_table: DynamoDB table resource (optional, will get if not provided)
            
        Returns:
            Normalized profile_id
            
        Raises:
            ValueError: If coach not found or invalid input
        """
        if not coach_id:
            raise ValueError("coach_id cannot be empty")
        
        coach_id = str(coach_id).strip()
        
        # If it looks like an email, lookup the profile_id
        if '@' in coach_id:
            if not profiles_table:
                profiles_table = get_dynamodb_table(get_table_name('profiles'))
                
            try:
                response = profiles_table.scan(
                    FilterExpression='email = :email',
                    ExpressionAttributeValues={':email': coach_id.lower()},
                    Limit=1
                )
                
                if response['Items']:
                    profile_id = response['Items'][0]['profile_id']
                    print(f"🔗 Email mapping: {coach_id} -> {profile_id}")
                    return profile_id
                else:
                    raise ValueError(f"No profile found for email: {coach_id}")
                    
            except Exception as e:
                if "No profile found" in str(e):
                    raise
                raise ValueError(f"Error looking up profile for email {coach_id}: {str(e)}")
        
        # Assume it's already a profile_id - validate it exists
        if not profiles_table:
            profiles_table = get_dynamodb_table(get_table_name('profiles'))
            
        try:
            response = profiles_table.get_item(Key={'profile_id': coach_id})
            if 'Item' not in response:
                raise ValueError(f"No profile found for profile_id: {coach_id}")
            
            print(f"✅ Profile ID validated: {coach_id}")
            return coach_id
            
        except Exception as e:
            if "No profile found" in str(e):
                raise
            raise ValueError(f"Error validating profile_id {coach_id}: {str(e)}")
    
    @staticmethod
    def get_email_from_profile_id(profile_id: str, profiles_table=None) -> Optional[str]:
        """
        Get email address from profile_id
        
        Args:
            profile_id: Profile identifier
            profiles_table: DynamoDB table resource (optional)
            
        Returns:
            Email address or None if not found
        """
        if not profile_id:
            return None
            
        if not profiles_table:
            profiles_table = get_dynamodb_table(get_table_name('profiles'))
            
        try:
            response = profiles_table.get_item(Key={'profile_id': profile_id})
            if 'Item' in response:
                email = response['Item'].get('email')
                print(f"🔗 Profile ID mapping: {profile_id} -> {email}")
                return email
            return None
        except Exception as e:
            print(f"❌ Error getting email for profile_id {profile_id}: {str(e)}")
            return None
    
    @staticmethod
    def normalize_user_id(user_id: str, user_type: str = "coach") -> str:
        """
        Normalize user ID for any user type (coach, parent, admin)
        
        Args:
            user_id: Email or ID to normalize
            user_type: Type of user ("coach", "parent", "admin")
            
        Returns:
            Normalized user ID
            
        Raises:
            ValueError: If user not found or invalid type
        """
        if user_type == "coach":
            return UserIdentifier.normalize_coach_id(user_id)
        elif user_type == "parent":
            return UserIdentifier.normalize_parent_id(user_id)
        elif user_type == "admin":
            return UserIdentifier.normalize_admin_id(user_id)
        else:
            raise ValueError(f"Invalid user_type: {user_type}")
    
    @staticmethod
    def normalize_parent_id(parent_id: str, profiles_table=None) -> str:
        """
        Convert parent identifier (email or profile_id) to profile_id
        
        Args:
            parent_id: Email address or profile_id
            profiles_table: DynamoDB table resource (optional)
            
        Returns:
            Normalized profile_id
            
        Raises:
            ValueError: If parent not found
        """
        if not parent_id:
            raise ValueError("parent_id cannot be empty")
        
        parent_id = str(parent_id).strip()
        
        # Use same logic as coach but could be different table/logic in future
        if '@' in parent_id:
            if not profiles_table:
                profiles_table = get_dynamodb_table(get_table_name('profiles'))
                
            try:
                response = profiles_table.scan(
                    FilterExpression='email = :email AND user_type = :user_type',
                    ExpressionAttributeValues={
                        ':email': parent_id.lower(),
                        ':user_type': 'parent'
                    },
                    Limit=1
                )
                
                if response['Items']:
                    profile_id = response['Items'][0]['profile_id']
                    print(f"🔗 Parent email mapping: {parent_id} -> {profile_id}")
                    return profile_id
                else:
                    raise ValueError(f"No parent profile found for email: {parent_id}")
                    
            except Exception as e:
                if "No parent profile found" in str(e):
                    raise
                raise ValueError(f"Error looking up parent profile for email {parent_id}: {str(e)}")
        
        return parent_id  # Assume it's already a profile_id
    
    @staticmethod
    def normalize_admin_id(admin_id: str, profiles_table=None) -> str:
        """
        Convert admin identifier (email or profile_id) to profile_id
        
        Args:
            admin_id: Email address or profile_id
            profiles_table: DynamoDB table resource (optional)
            
        Returns:
            Normalized profile_id
            
        Raises:
            ValueError: If admin not found
        """
        if not admin_id:
            raise ValueError("admin_id cannot be empty")
        
        admin_id = str(admin_id).strip()
        
        if '@' in admin_id:
            if not profiles_table:
                profiles_table = get_dynamodb_table(get_table_name('profiles'))
                
            try:
                response = profiles_table.scan(
                    FilterExpression='email = :email AND user_type = :user_type',
                    ExpressionAttributeValues={
                        ':email': admin_id.lower(),
                        ':user_type': 'admin'
                    },
                    Limit=1
                )
                
                if response['Items']:
                    profile_id = response['Items'][0]['profile_id']
                    print(f"🔗 Admin email mapping: {admin_id} -> {profile_id}")
                    return profile_id
                else:
                    raise ValueError(f"No admin profile found for email: {admin_id}")
                    
            except Exception as e:
                if "No admin profile found" in str(e):
                    raise
                raise ValueError(f"Error looking up admin profile for email {admin_id}: {str(e)}")
        
        return admin_id  # Assume it's already a profile_id


def get_coach_profile(coach_identifier: str) -> Optional[Dict[str, Any]]:
    """
    Get complete coach profile by email or profile_id
    
    Args:
        coach_identifier: Email or profile_id
        
    Returns:
        Coach profile dict or None if not found
    """
    try:
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        # Normalize to profile_id first
        profile_id = UserIdentifier.normalize_coach_id(coach_identifier, profiles_table)
        
        # Get the full profile
        response = profiles_table.get_item(Key={'profile_id': profile_id})
        
        if 'Item' in response:
            profile = response['Item']
            print(f"✅ Coach profile retrieved: {profile.get('email', profile_id)}")
            return profile
        
        return None
        
    except Exception as e:
        print(f"❌ Error getting coach profile for {coach_identifier}: {str(e)}")
        return None


def get_user_by_email(email: str, user_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get user profile by email address
    
    Args:
        email: Email address to lookup
        user_type: Optional user type filter ("coach", "parent", "admin")
        
    Returns:
        User profile dict or None if not found
    """
    try:
        if not email or '@' not in email:
            return None
            
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        # Build filter expression
        filter_expression = 'email = :email'
        expression_values = {':email': email.lower()}
        
        if user_type:
            filter_expression += ' AND user_type = :user_type'
            expression_values[':user_type'] = user_type
        
        response = profiles_table.scan(
            FilterExpression=filter_expression,
            ExpressionAttributeValues=expression_values,
            Limit=1
        )
        
        if response['Items']:
            profile = response['Items'][0]
            print(f"✅ User profile retrieved by email: {email} -> {profile.get('profile_id')}")
            return profile
        
        return None
        
    except Exception as e:
        print(f"❌ Error getting user by email {email}: {str(e)}")
        return None


def create_user_session(user_id: str, user_type: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Create a user session record for authentication tracking
    
    Args:
        user_id: Normalized user ID (profile_id)
        user_type: Type of user ("coach", "parent", "admin")
        metadata: Additional session metadata
        
    Returns:
        Session information dict
    """
    try:
        from .database import get_current_time
        from .utils import generate_id
        
        session_id = generate_id('session')
        
        session_data = {
            'session_id': session_id,
            'user_id': user_id,
            'user_type': user_type,
            'created_at': get_current_time(),
            'last_accessed': get_current_time(),
            'metadata': metadata or {},
            'status': 'active'
        }
        
        # Store session in sessions table (if exists)
        try:
            sessions_table = get_dynamodb_table(get_table_name('sessions'))
            sessions_table.put_item(Item=session_data)
            print(f"✅ User session created: {session_id} for {user_id}")
        except Exception:
            print(f"⚠️ Sessions table not available, session not persisted")
        
        return session_data
        
    except Exception as e:
        print(f"❌ Error creating user session: {str(e)}")
        return {}


def validate_user_access(user_id: str, resource_type: str, resource_id: str, action: str = "read") -> bool:
    """
    Validate if user has access to a specific resource
    
    Args:
        user_id: Normalized user ID
        resource_type: Type of resource ("event", "profile", "enrollment", etc.)
        resource_id: ID of the specific resource
        action: Action being attempted ("read", "write", "delete")
        
    Returns:
        True if access is allowed
    """
    try:
        # Get user profile to check permissions
        profile = get_coach_profile(user_id)
        if not profile:
            return False
        
        user_type = profile.get('user_type', 'coach')
        
        # Admin users have access to everything
        if user_type == 'admin':
            return True
        
        # Resource-specific access rules
        if resource_type == 'profile':
            # Users can access their own profile
            return resource_id == user_id
        
        elif resource_type == 'event':
            # Check if user created the event
            try:
                events_table = get_dynamodb_table(get_table_name('events'))
                response = events_table.get_item(Key={'event_id': resource_id})
                
                if 'Item' in response:
                    event = response['Item']
                    return event.get('created_by') == user_id
                    
            except Exception:
                pass
        
        elif resource_type == 'enrollment':
            # Check if user is the coach for this enrollment
            try:
                enrollments_table = get_dynamodb_table(get_table_name('enrollments'))
                response = enrollments_table.get_item(Key={'enrollment_id': resource_id})
                
                if 'Item' in response:
                    enrollment = response['Item']
                    return enrollment.get('coach_id') == user_id
                    
            except Exception:
                pass
        
        # Default: no access
        return False
        
    except Exception as e:
        print(f"❌ Error validating user access: {str(e)}")
        return False 