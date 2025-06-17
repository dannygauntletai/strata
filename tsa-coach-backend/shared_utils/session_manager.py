"""
Session Management Utility for TSA Coach Backend
Provides server-side session storage and restoration capabilities
"""
import boto3
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages server-side user sessions with DynamoDB storage"""
    
    def __init__(self, sessions_table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.sessions_table = self.dynamodb.Table(sessions_table_name)
        
    def create_session(self, user_email: str, user_role: str, auth_tokens: Dict[str, str], 
                      metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new server-side session
        
        Args:
            user_email: User's email address
            user_role: User's role (coach, parent, etc.)
            auth_tokens: JWT tokens to store
            metadata: Additional session metadata
            
        Returns:
            Session data including session_id
        """
        try:
            session_id = str(uuid.uuid4())
            current_time = datetime.now(timezone.utc)
            expires_at = current_time + timedelta(days=30)  # 30-day session
            
            session_data = {
                'session_id': session_id,
                'user_email': user_email.lower().strip(),
                'user_role': user_role,
                'auth_tokens': auth_tokens,
                'metadata': metadata or {},
                'created_at': current_time.isoformat(),
                'updated_at': current_time.isoformat(),
                'expires_at': int(expires_at.timestamp()),  # TTL for auto-cleanup
                'last_accessed': current_time.isoformat()
            }
            
            # Store session in DynamoDB
            self.sessions_table.put_item(Item=session_data)
            
            logger.info(f"✅ Created session {session_id} for user {user_email}")
            return session_data
            
        except Exception as e:
            logger.error(f"❌ Error creating session for {user_email}: {str(e)}")
            raise
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session by session ID
        
        Args:
            session_id: The session identifier
            
        Returns:
            Session data if found and valid, None otherwise
        """
        try:
            response = self.sessions_table.get_item(Key={'session_id': session_id})
            
            if 'Item' not in response:
                logger.info(f"Session {session_id} not found")
                return None
                
            session = response['Item']
            
            # Check if session is expired
            if self._is_session_expired(session):
                logger.info(f"Session {session_id} is expired, cleaning up")
                self.delete_session(session_id)
                return None
                
            # Update last accessed time
            self._update_last_accessed(session_id)
            
            logger.info(f"✅ Retrieved valid session {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"❌ Error retrieving session {session_id}: {str(e)}")
            return None
    
    def get_session_by_email(self, user_email: str) -> Optional[Dict[str, Any]]:
        """
        Find active session by user email
        
        Args:
            user_email: User's email address
            
        Returns:
            Most recent valid session for the user, None if none found
        """
        try:
            # Scan for sessions by email (could be optimized with GSI)
            response = self.sessions_table.scan(
                FilterExpression='user_email = :email',
                ExpressionAttributeValues={':email': user_email.lower().strip()}
            )
            
            sessions = response.get('Items', [])
            
            # Filter out expired sessions and get the most recent
            valid_sessions = []
            for session in sessions:
                if not self._is_session_expired(session):
                    valid_sessions.append(session)
                else:
                    # Clean up expired session
                    self.delete_session(session['session_id'])
            
            if not valid_sessions:
                logger.info(f"No valid sessions found for {user_email}")
                return None
                
            # Return the most recently accessed session
            most_recent = max(valid_sessions, key=lambda s: s.get('last_accessed', ''))
            
            # Update last accessed time
            self._update_last_accessed(most_recent['session_id'])
            
            logger.info(f"✅ Found valid session for {user_email}")
            return most_recent
            
        except Exception as e:
            logger.error(f"❌ Error finding session for {user_email}: {str(e)}")
            return None
    
    def update_session_tokens(self, session_id: str, auth_tokens: Dict[str, str]) -> bool:
        """
        Update auth tokens for an existing session
        
        Args:
            session_id: The session identifier
            auth_tokens: New JWT tokens
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            current_time = datetime.now(timezone.utc)
            
            self.sessions_table.update_item(
                Key={'session_id': session_id},
                UpdateExpression='SET auth_tokens = :tokens, updated_at = :updated, last_accessed = :accessed',
                ExpressionAttributeValues={
                    ':tokens': auth_tokens,
                    ':updated': current_time.isoformat(),
                    ':accessed': current_time.isoformat()
                }
            )
            
            logger.info(f"✅ Updated tokens for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error updating session {session_id}: {str(e)}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session
        
        Args:
            session_id: The session identifier
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            self.sessions_table.delete_item(Key={'session_id': session_id})
            logger.info(f"✅ Deleted session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error deleting session {session_id}: {str(e)}")
            return False
    
    def delete_user_sessions(self, user_email: str) -> int:
        """
        Delete all sessions for a user (logout from all devices)
        
        Args:
            user_email: User's email address
            
        Returns:
            Number of sessions deleted
        """
        try:
            # Find all sessions for the user
            response = self.sessions_table.scan(
                FilterExpression='user_email = :email',
                ExpressionAttributeValues={':email': user_email.lower().strip()}
            )
            
            sessions = response.get('Items', [])
            deleted_count = 0
            
            for session in sessions:
                if self.delete_session(session['session_id']):
                    deleted_count += 1
            
            logger.info(f"✅ Deleted {deleted_count} sessions for {user_email}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Error deleting sessions for {user_email}: {str(e)}")
            return 0
    
    def _is_session_expired(self, session: Dict[str, Any]) -> bool:
        """Check if a session is expired"""
        try:
            expires_at = session.get('expires_at', 0)
            current_timestamp = int(datetime.now(timezone.utc).timestamp())
            return current_timestamp > expires_at
        except:
            return True
    
    def _update_last_accessed(self, session_id: str) -> None:
        """Update the last accessed timestamp for a session"""
        try:
            current_time = datetime.now(timezone.utc)
            self.sessions_table.update_item(
                Key={'session_id': session_id},
                UpdateExpression='SET last_accessed = :accessed',
                ExpressionAttributeValues={':accessed': current_time.isoformat()}
            )
        except Exception as e:
            logger.warning(f"Could not update last_accessed for session {session_id}: {str(e)}")


def create_session_manager(stage: str = 'dev') -> SessionManager:
    """Factory function to create a SessionManager instance"""
    sessions_table_name = f"sessions-{stage}"
    return SessionManager(sessions_table_name) 