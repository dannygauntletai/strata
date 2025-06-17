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
        
        # Step 2: No valid JWT found
        logger.info("❌ No valid authentication found (JWT)")
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