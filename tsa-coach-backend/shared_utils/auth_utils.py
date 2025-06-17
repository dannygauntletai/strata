"""
Authentication utilities for coach backend services
Includes profile sync hardening mechanism and server-side session restoration
"""
import json
import os
import boto3
import logging
from typing import Optional, Dict, Any
from profile_sync import ensure_profile_exists_for_email
from session_manager import create_session_manager

logger = logging.getLogger(__name__)

def extract_user_from_auth_token(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user email from JWT Authorization header with session restoration fallback
    
    Flow:
    1. Try to extract from JWT token in Authorization header
    2. If no token, try to restore from server-side session
    3. If session found, optionally store tokens back to response headers
    4. Include profile sync hardening as final fallback
    
    Args:
        event: Lambda event containing headers
        
    Returns:
        User email if authentication successful, None otherwise
    """
    try:
        # Step 1: Try JWT token extraction first
        headers = event.get('headers', {})
        auth_header = None
        for header_name, header_value in headers.items():
            if header_name.lower() == 'authorization':
                auth_header = header_value
                break
        
        if auth_header and auth_header.startswith('Bearer '):
            # Extract JWT token
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            email = _extract_email_from_jwt(token)
            if email:
                logger.info(f"✅ JWT authentication successful for {email}")
                # Ensure profile exists (hardening)
                ensure_profile_exists_for_email(email)
                return email
            else:
                logger.info("⚠️ JWT token invalid or expired")
        else:
            logger.info("⚠️ No valid Authorization header found")
        
        # Step 2: Try session restoration fallback
        session_id = _extract_session_id_from_event(event)
        if session_id:
            email = _restore_from_server_session(session_id)
            if email:
                logger.info(f"✅ Session restoration successful for {email}")
                # Ensure profile exists (hardening)
                ensure_profile_exists_for_email(email)
                return email
        
        # Step 3: No authentication method succeeded
        logger.info("❌ No valid authentication found (JWT or session)")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error in authentication: {str(e)}")
        return None

def _extract_email_from_jwt(token: str) -> Optional[str]:
    """Extract email from JWT token payload"""
    try:
        import base64
        
        # Split token into parts
        token_parts = token.split('.')
        if len(token_parts) != 3:
            return None
        
        # Decode payload (second part)
        payload_b64 = token_parts[1]
        # Add padding if necessary
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload = json.loads(base64.b64decode(payload_b64))
        
        # Check token expiration
        import time
        current_time = int(time.time())
        if payload.get('exp', 0) <= current_time:
            logger.info("JWT token is expired")
            return None
        
        # Extract email from token payload
        email = payload.get('email') or payload.get('username')
        if email:
            return email.lower().strip()
        
        return None
        
    except Exception as e:
        logger.warning(f"Error extracting email from JWT: {str(e)}")
        return None

def _extract_session_id_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract session ID from various sources in the event
    
    Sources (in order of preference):
    1. X-Session-ID header
    2. sessionId query parameter  
    3. session_id in body
    4. Cookies
    """
    try:
        headers = event.get('headers', {})
        
        # Check X-Session-ID header
        for header_name, header_value in headers.items():
            if header_name.lower() == 'x-session-id':
                return header_value
        
        # Check query parameters
        query_params = event.get('queryStringParameters') or {}
        if query_params.get('sessionId'):
            return query_params['sessionId']
        
        # Check body (for POST requests)
        body = event.get('body')
        if body:
            try:
                body_data = json.loads(body) if isinstance(body, str) else body
                if body_data.get('session_id'):
                    return body_data['session_id']
            except:
                pass
        
        # Check cookies
        cookie_header = headers.get('cookie') or headers.get('Cookie')
        if cookie_header:
            session_id = _extract_session_from_cookies(cookie_header)
            if session_id:
                return session_id
        
        return None
        
    except Exception as e:
        logger.warning(f"Error extracting session ID: {str(e)}")
        return None

def _extract_session_from_cookies(cookie_header: str) -> Optional[str]:
    """Extract session ID from cookie header"""
    try:
        cookies = {}
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                key, value = cookie.strip().split('=', 1)
                cookies[key] = value
        
        return cookies.get('tsa_session_id') or cookies.get('sessionId')
        
    except Exception as e:
        logger.warning(f"Error parsing cookies: {str(e)}")
        return None

def _restore_from_server_session(session_id: str) -> Optional[str]:
    """
    Restore user authentication from server-side session
    
    Args:
        session_id: The session identifier
        
    Returns:
        User email if session is valid, None otherwise
    """
    try:
        # Get stage from environment
        stage = os.environ.get('STAGE', 'dev')
        session_manager = create_session_manager(stage)
        
        # Retrieve session from DynamoDB
        session = session_manager.get_session(session_id)
        if not session:
            logger.info(f"No valid session found for ID: {session_id}")
            return None
        
        user_email = session.get('user_email')
        if not user_email:
            logger.warning(f"Session {session_id} missing user_email")
            return None
        
        # TODO: Optionally refresh tokens if they're close to expiry
        auth_tokens = session.get('auth_tokens', {})
        if auth_tokens.get('access_token'):
            # Could validate token freshness here
            pass
        
        logger.info(f"✅ Restored session for {user_email}")
        return user_email
        
    except Exception as e:
        logger.error(f"❌ Error restoring session {session_id}: {str(e)}")
        return None

def create_auth_session(user_email: str, user_role: str, auth_tokens: Dict[str, str], 
                       metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Create a server-side session for the authenticated user
    
    Args:
        user_email: User's email address
        user_role: User's role (coach, parent, etc.)
        auth_tokens: JWT tokens to store
        metadata: Additional session metadata
        
    Returns:
        Session ID if created successfully, None otherwise
    """
    try:
        stage = os.environ.get('STAGE', 'dev')
        session_manager = create_session_manager(stage)
        
        session_data = session_manager.create_session(
            user_email=user_email,
            user_role=user_role, 
            auth_tokens=auth_tokens,
            metadata=metadata
        )
        
        session_id = session_data.get('session_id')
        logger.info(f"✅ Created auth session {session_id} for {user_email}")
        return session_id
        
    except Exception as e:
        logger.error(f"❌ Error creating auth session for {user_email}: {str(e)}")
        return None

def invalidate_auth_sessions(user_email: str) -> int:
    """
    Invalidate all sessions for a user (logout from all devices)
    
    Args:
        user_email: User's email address
        
    Returns:
        Number of sessions invalidated
    """
    try:
        stage = os.environ.get('STAGE', 'dev')
        session_manager = create_session_manager(stage)
        
        deleted_count = session_manager.delete_user_sessions(user_email)
        logger.info(f"✅ Invalidated {deleted_count} sessions for {user_email}")
        return deleted_count
        
    except Exception as e:
        logger.error(f"❌ Error invalidating sessions for {user_email}: {str(e)}")
        return 0 