"""
Authentication Utilities for TSA Authentication
Centralized Cognito and authentication helper functions
"""
import boto3
import string
import random
import secrets
from typing import Dict, Any
from shared_config import get_config

# Initialize shared config
config = get_config()


def create_cognito_user(email: str, user_role: str, invitation_token: str = None) -> Dict[str, Any]:
    """Create passwordless Cognito user with role-specific attributes"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        # Check if user already exists
        try:
            cognito_client.admin_get_user(
                UserPoolId=user_pool_id,
                Username=email
            )
            return {'success': True, 'user_exists': True, 'message': 'User already exists'}
        except cognito_client.exceptions.UserNotFoundException:
            pass  # User doesn't exist, proceed with creation
        
        # Create user with role-specific attributes
        user_attributes = [
            {'Name': 'email', 'Value': email},
            {'Name': 'email_verified', 'Value': 'true'},
            {'Name': 'custom:user_role', 'Value': user_role}
        ]
        
        # Add invitation token for parents
        if user_role == 'parent' and invitation_token:
            user_attributes.append({
                'Name': 'custom:invitation_token', 
                'Value': invitation_token
            })
        
        # 1. Create user WITHOUT password
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=user_attributes,
            MessageAction='SUPPRESS'  # Don't send Cognito's default email
        )
        
        # 2. Set user as CONFIRMED (skip password setup)
        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=secrets.token_urlsafe(32),  # Random, never used
            Permanent=True
        )
        
        return {
            'success': True, 
            'user_exists': False, 
            'message': f'Created passwordless Cognito user for {email}'
        }
        
    except Exception as e:
        print(f"Error creating Cognito user: {str(e)}")
        return {
            'success': False,
            'error': f'Failed to create user: {str(e)}'
        }


def generate_cognito_tokens(email: str, request_id: str = None) -> Dict[str, Any]:
    """Generate Cognito authentication tokens"""
    try:
        # Get environment variables
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        client_id = env_vars.get('CLIENT_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        # Set a temporary password for the user
        temp_password = generate_secure_password()
        
        try:
            # Set user password
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=email,
                Password=temp_password,
                Permanent=True
            )
            
            # Authenticate user to get tokens
            auth_response = cognito_client.admin_initiate_auth(
                UserPoolId=user_pool_id,
                ClientId=client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': temp_password
                }
            )
            
            tokens = auth_response['AuthenticationResult']
            
            return {
                'success': True,
                'access_token': tokens['AccessToken'],
                'id_token': tokens['IdToken'],
                'refresh_token': tokens['RefreshToken'],
                'expires_in': tokens['ExpiresIn']
            }
            
        except Exception as e:
            if request_id:
                print(f"[{request_id}] Error in Cognito authentication: {str(e)}")
            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
            
    except Exception as e:
        if request_id:
            print(f"[{request_id}] Error generating Cognito tokens: {str(e)}")
        return {
            'success': False,
            'error': f'Token generation failed: {str(e)}'
        }


def generate_secure_password() -> str:
    """Generate a secure temporary password for Cognito"""
    # Generate a password that meets Cognito requirements
    # At least 8 characters with uppercase, lowercase, number, and symbol
    
    # Ensure at least one of each required character type
    chars = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase), 
        random.choice(string.digits),
        random.choice('!@#$%^&*')
    ]
    
    # Fill the rest with random characters
    all_chars = string.ascii_letters + string.digits + '!@#$%^&*'
    chars.extend(random.choice(all_chars) for _ in range(28))  # Total 32 chars
    
    # Shuffle and join
    random.shuffle(chars)
    return ''.join(chars)


def get_cognito_user_attributes(email: str) -> Dict[str, Any]:
    """Get user attributes from Cognito"""
    try:
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        
        # Convert attributes to dict
        attributes = {}
        for attr in response.get('UserAttributes', []):
            attributes[attr['Name']] = attr['Value']
        
        return {
            'success': True,
            'attributes': attributes,
            'user_status': response.get('UserStatus'),
            'user_create_date': response.get('UserCreateDate'),
            'user_last_modified_date': response.get('UserLastModifiedDate')
        }
        
    except cognito_client.exceptions.UserNotFoundException:
        return {'success': False, 'error': 'User not found'}
    except Exception as e:
        print(f"Error getting Cognito user attributes: {str(e)}")
        return {'success': False, 'error': str(e)}


def validate_user_exists(email: str) -> bool:
    """Check if user exists in Cognito"""
    try:
        env_vars = config.get_env_vars('auth')
        user_pool_id = env_vars.get('USER_POOL_ID')
        
        cognito_client = boto3.client('cognito-idp')
        
        cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        return True
        
    except cognito_client.exceptions.UserNotFoundException:
        return False
    except Exception as e:
        print(f"Error checking if user exists: {str(e)}")
        return False 