"""
JWT Utilities for TSA Authentication
Centralized JWT token generation and validation functions
"""
import json
import boto3
import jwt
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from shared_config import get_config

# Initialize shared config
config = get_config()


def get_jwt_secret() -> str:
    """Get JWT signing secret from AWS Secrets Manager"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        secret_arn = env_vars.get('JWT_SECRET_ARN')
        
        if not secret_arn:
            print("JWT_SECRET_ARN not found in environment, using SendGrid secret ARN")
            secret_arn = env_vars.get('SENDGRID_SECRET_ARN')
        
        if not secret_arn:
            raise Exception("No secret ARN available for JWT signing")
        
        # Retrieve secret from AWS Secrets Manager
        secrets_client = boto3.client('secretsmanager')
        secret_response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret_data = json.loads(secret_response['SecretString'])
        
        # Try to get JWT secret, fallback to SendGrid key for now
        jwt_secret = secret_data.get('jwt_secret') or secret_data.get('api_key')
        
        if not jwt_secret:
            raise Exception("JWT secret not found in AWS Secrets Manager")
        
        return jwt_secret
        
    except Exception as e:
        print(f"Error retrieving JWT secret: {str(e)}")
        raise


def generate_magic_link_jwt(email: str, user_role: str, invitation_token: str = None, 
                           expires_minutes: int = 15) -> str:
    """Generate JWT token for magic link authentication"""
    try:
        # Get JWT secret from AWS Secrets Manager
        jwt_secret = get_jwt_secret()
        
        # Create JWT payload
        now = datetime.utcnow()
        payload = {
            'email': email,
            'user_role': user_role,
            'invitation_token': invitation_token,
            'iat': now,
            'exp': now + timedelta(minutes=expires_minutes),
            'aud': 'tsa-auth',
            'iss': 'tsa-magic-link-handler',
            'purpose': 'magic_link',
            'jti': str(uuid.uuid4())  # Unique token ID
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        # Generate JWT
        token = jwt.encode(payload, jwt_secret, algorithm='HS256')
        
        return token
        
    except Exception as e:
        print(f"Error generating JWT: {str(e)}")
        raise


def verify_magic_link_jwt(token: str) -> Dict[str, Any]:
    """Verify JWT magic link token"""
    try:
        # Get JWT secret
        jwt_secret = get_jwt_secret()
        
        # Decode and validate JWT
        payload = jwt.decode(
            token, 
            jwt_secret, 
            algorithms=['HS256'],
            audience='tsa-auth'
        )
        
        # Additional validation
        if payload.get('purpose') != 'magic_link':
            return {'valid': False, 'error': 'Invalid token purpose'}
        
        return {'valid': True, 'payload': payload}
        
    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}
    except jwt.InvalidTokenError as e:
        return {'valid': False, 'error': f'Invalid token: {str(e)}'}
    except Exception as e:
        return {'valid': False, 'error': f'Token validation failed: {str(e)}'}


def extract_jwt_payload(token: str) -> Optional[Dict[str, Any]]:
    """Extract payload from JWT without verification (for debugging)"""
    try:
        # Decode without verification for debugging purposes
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        print(f"Error extracting JWT payload: {str(e)}")
        return None 