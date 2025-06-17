"""
Authentication utilities for coach backend services
Includes profile sync hardening mechanism
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
    Extract user email from JWT Authorization header
    Includes hardening with profile sync fallback
    
    Args:
        event: Lambda event containing headers
        
    Returns:
        User email if authentication successful, None otherwise
    """
    try:
        # Get Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header:
            logger.warning("No Authorization header found")
            return None
        
        # Extract token from "Bearer <token>" format
        if not auth_header.startswith('Bearer '):
            logger.warning("Authorization header doesn't start with 'Bearer '")
            return None
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        
        # Decode JWT token (without verification for now - add verification in production)
        try:
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            email = decoded_token.get('email')
            
            if not email:
                logger.warning("No email found in JWT token")
                return None
            
            logger.info(f"Successfully extracted email from JWT: {email}")
            
            # 🔧 HARDENING: Ensure profile exists for this email
            try:
                profile_ensured = ensure_profile_exists_for_email(email)
                if profile_ensured:
                    logger.info(f"✅ Profile verified/created for {email}")
                else:
                    logger.warning(f"⚠️ Could not ensure profile exists for {email}")
                    # Continue anyway - let the handler decide how to handle missing profiles
            except Exception as sync_error:
                logger.error(f"Profile sync error for {email}: {str(sync_error)}")
                # Continue anyway - authentication is still valid
            
            return email
            
        except jwt.DecodeError as e:
            logger.error(f"JWT decode error: {str(e)}")
            return None
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid JWT token: {str(e)}")
            return None
            
    except Exception as e:
        logger.error(f"Error extracting user from auth token: {str(e)}")
        return None 