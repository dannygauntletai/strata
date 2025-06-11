"""
Token Verification Handler
Validates magic link tokens and issues Cognito authentication tokens
Extended to support both coaches and parents for unified TSA platform
Aligned with database.md schema
"""
import json
import os
import boto3
import hmac
import hashlib
import base64
from datetime import datetime
from typing import Dict, Any, Optional


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle token verification requests for coaches and parents"""
    try:
        if event.get('httpMethod') == 'POST':
            return handle_verify_token(event, context)
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in verify token handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def handle_verify_token(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Verify magic link token and issue authentication tokens for coaches/parents"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        token_id = body.get('token')
        email = body.get('email', '').lower().strip()
        
        if not token_id or not email:
            return create_response(400, {'error': 'Token and email are required'})
        
        # Retrieve token from DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['MAGIC_LINKS_TABLE'])
        
        try:
            response = table.get_item(Key={'token_id': token_id})
            if 'Item' not in response:
                return create_response(400, {'error': 'Invalid or expired token'})
            
            token_record = response['Item']
            
        except Exception as e:
            print(f"Error retrieving token: {str(e)}")
            return create_response(400, {'error': 'Invalid token'})
        
        # Validate token
        validation_result = validate_token(token_record, email)
        if not validation_result['valid']:
            return create_response(400, {'error': validation_result['error']})
        
        # Mark token as used
        table.update_item(
            Key={'token_id': token_id},
            UpdateExpression='SET used = :used, used_at = :used_at',
            ExpressionAttributeValues={
                ':used': True,
                ':used_at': datetime.utcnow().isoformat()
            }
        )
        
        # Generate Cognito tokens
        auth_result = generate_cognito_tokens(email)
        if not auth_result['success']:
            return create_response(500, {'error': auth_result['error']})
        
        # Get user profile information based on role
        user_role = token_record.get('user_role', 'coach')
        invitation_token = token_record.get('invitation_token')
        
        if user_role == 'parent':
            user_profile = get_parent_profile(email, invitation_token)
        else:
            user_profile = get_coach_profile(email)
        
        return create_response(200, {
            'message': 'Authentication successful',
            'tokens': {
                'access_token': auth_result['access_token'],
                'id_token': auth_result['id_token'],
                'refresh_token': auth_result['refresh_token']
            },
            'token_type': 'Bearer',
            'expires_in': auth_result['expires_in'],
            'user_role': user_role,
            'user': {
                'email': email,
                'email_verified': True,
                'role': user_role,
                'invitation_token': invitation_token,
                **user_profile
            }
        })
        
    except Exception as e:
        print(f"Error verifying token: {str(e)}")
        return create_response(500, {'error': 'Token verification failed'})


def validate_token(token_record: Dict[str, Any], email: str) -> Dict[str, Any]:
    """Validate magic link token"""
    
    # Check if token is already used
    if token_record.get('used', False):
        return {'valid': False, 'error': 'Token has already been used'}
    
    # Check if token has expired
    expires_at = token_record.get('expires_at', 0)
    current_timestamp = int(datetime.utcnow().timestamp())
    
    if current_timestamp > expires_at:
        return {'valid': False, 'error': 'Token has expired'}
    
    # Check if email matches
    if token_record.get('email') != email:
        return {'valid': False, 'error': 'Token email mismatch'}
    
    return {'valid': True}


def generate_cognito_tokens(email: str) -> Dict[str, Any]:
    """Generate Cognito authentication tokens"""
    try:
        cognito_client = boto3.client('cognito-idp')
        user_pool_id = os.environ['USER_POOL_ID']
        client_id = os.environ['CLIENT_ID']
        
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
            
            # Immediately invalidate the password by setting a new random one
            new_temp_password = generate_secure_password()
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=email,
                Password=new_temp_password,
                Permanent=True
            )
            
            return {
                'success': True,
                'access_token': auth_response['AuthenticationResult']['AccessToken'],
                'id_token': auth_response['AuthenticationResult']['IdToken'],
                'refresh_token': auth_response['AuthenticationResult']['RefreshToken'],
                'expires_in': auth_response['AuthenticationResult']['ExpiresIn']
            }
            
        except Exception as e:
            print(f"Error authenticating user {email}: {str(e)}")
            return {'success': False, 'error': 'Authentication failed'}
            
    except Exception as e:
        print(f"Error generating Cognito tokens: {str(e)}")
        return {'success': False, 'error': 'Token generation failed'}


def generate_secure_password() -> str:
    """Generate a secure random password"""
    import secrets
    import string
    
    # Generate a random password with uppercase, lowercase, digits, and symbols
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(chars) for _ in range(32))
    
    # Ensure password meets requirements
    if not any(c.isupper() for c in password):
        password = password[:-1] + 'A'
    if not any(c.islower() for c in password):
        password = password[:-1] + 'a'
    if not any(c.isdigit() for c in password):
        password = password[:-1] + '1'
    if not any(c in "!@#$%^&*" for c in password):
        password = password[:-1] + '!'
    
    return password


def get_coach_profile(email: str) -> Dict[str, Any]:
    """Get coach profile information from Cognito and DynamoDB (existing logic)"""
    try:
        # Get user attributes from Cognito
        cognito_client = boto3.client('cognito-idp')
        user_pool_id = os.environ['USER_POOL_ID']
        
        user_response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        
        # Extract user attributes
        user_attributes = {}
        for attr in user_response.get('UserAttributes', []):
            user_attributes[attr['Name']] = attr['Value']
        
        # Try to get additional profile info from DynamoDB (profiles table)
        profile_info = {}
        try:
            dynamodb = boto3.resource('dynamodb')
            profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles'))
            
            # Use email-index GSI for profile lookup
            scan_response = profiles_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email},
                Limit=1
            )
            
            if scan_response['Items']:
                profile = scan_response['Items'][0]
                profile_info = {
                    'profile_id': profile.get('profile_id'),
                    'first_name': profile.get('first_name'),
                    'last_name': profile.get('last_name'),
                    'school_name': profile.get('school_name'),
                    'role_type': profile.get('role_type', 'coach'),
                    'school_id': profile.get('school_id'),
                    'has_completed_onboarding': profile.get('onboarding_progress', {}).get('is_completed', False)
                }
        except Exception as e:
            print(f"Could not retrieve coach profile for {email}: {str(e)}")
            profile_info = {'role_type': 'coach', 'has_completed_onboarding': False}
        
        return {
            'given_name': user_attributes.get('given_name', ''),
            'family_name': user_attributes.get('family_name', ''),
            'phone_number': user_attributes.get('phone_number', ''),
            **profile_info
        }
        
    except Exception as e:
        print(f"Error getting coach profile for {email}: {str(e)}")
        return {'role_type': 'coach', 'has_completed_onboarding': False}


def get_parent_profile(email: str, invitation_token: str = None) -> Dict[str, Any]:
    """Get parent profile information and create if needed"""
    try:
        # Get user attributes from Cognito
        cognito_client = boto3.client('cognito-idp')
        user_pool_id = os.environ['USER_POOL_ID']
        
        user_response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email
        )
        
        # Extract user attributes
        user_attributes = {}
        for attr in user_response.get('UserAttributes', []):
            user_attributes[attr['Name']] = attr['Value']
        
        # Try to get parent profile from DynamoDB
        profile_info = {}
        enrollment_info = {}
        
        try:
            dynamodb = boto3.resource('dynamodb')
            profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles'))
            
            # Look for existing parent profile
            scan_response = profiles_table.scan(
                FilterExpression='email = :email AND role_type = :role',
                ExpressionAttributeValues={
                    ':email': email,
                    ':role': 'parent'
                },
                Limit=1
            )
            
            if scan_response['Items']:
                profile = scan_response['Items'][0]
                profile_info = {
                    'profile_id': profile.get('profile_id'),
                    'first_name': profile.get('first_name'),
                    'last_name': profile.get('last_name'),
                    'role_type': 'parent',
                    'has_completed_onboarding': profile.get('onboarding_progress', {}).get('is_completed', False)
                }
                
                # Check for enrollment information
                enrollment_info = profile.get('enrollment_info', {})
            else:
                # Create new parent profile if invitation token provided
                if invitation_token:
                    profile_info = create_parent_profile(email, invitation_token)
                else:
                    profile_info = {
                        'role_type': 'parent',
                        'has_completed_onboarding': False
                    }
        
        except Exception as e:
            print(f"Could not retrieve parent profile for {email}: {str(e)}")
            profile_info = {'role_type': 'parent', 'has_completed_onboarding': False}
        
        return {
            'given_name': user_attributes.get('given_name', ''),
            'family_name': user_attributes.get('family_name', ''),
            'phone_number': user_attributes.get('phone_number', ''),
            'enrollment_status': enrollment_info.get('status', 'pending'),
            'current_step': enrollment_info.get('current_step', 1),
            'progress_percentage': enrollment_info.get('progress_percentage', 0),
            **profile_info
        }
        
    except Exception as e:
        print(f"Error getting parent profile for {email}: {str(e)}")
        return {'role_type': 'parent', 'has_completed_onboarding': False}


def create_parent_profile(email: str, invitation_token: str) -> Dict[str, Any]:
    """Create a new parent profile with invitation data"""
    try:
        # Validate invitation token with coach API
        invitation_data = validate_invitation_with_coach_api(invitation_token)
        if not invitation_data:
            print(f"Invalid invitation token for parent {email}")
            return {'role_type': 'parent', 'has_completed_onboarding': False}
        
        # Generate profile ID
        import uuid
        profile_id = f"parent_{str(uuid.uuid4())[:8]}"
        
        # Create parent profile with invitation data
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles'))
        
        parent_profile = {
            'profile_id': profile_id,
            'email': email,
            'role_type': 'parent',
            'first_name': invitation_data.get('parent_first_name', ''),
            'last_name': invitation_data.get('parent_last_name', ''),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'onboarding_progress': {
                'is_completed': False,
                'current_step': 1,
                'completed_steps': []
            },
            'enrollment_info': {
                'invitation_token': invitation_token,
                'coach_name': invitation_data.get('coach_name', ''),
                'school_name': invitation_data.get('school_name', ''),
                'student_first_name': invitation_data.get('student_first_name', ''),
                'student_last_name': invitation_data.get('student_last_name', ''),
                'grade_level': invitation_data.get('grade_level', ''),
                'sport_interest': invitation_data.get('sport_interest', ''),
                'status': 'pending',
                'current_step': 1,
                'progress_percentage': 0,
                'enrollment_id': None  # Will be created when enrollment starts
            }
        }
        
        profiles_table.put_item(Item=parent_profile)
        
        print(f"Created parent profile for {email} with invitation {invitation_token}")
        
        return {
            'profile_id': profile_id,
            'first_name': parent_profile['first_name'],
            'last_name': parent_profile['last_name'],
            'role_type': 'parent',
            'has_completed_onboarding': False
        }
        
    except Exception as e:
        print(f"Error creating parent profile for {email}: {str(e)}")
        return {'role_type': 'parent', 'has_completed_onboarding': False}


def validate_invitation_with_coach_api(invitation_token: str) -> Optional[Dict[str, Any]]:
    """Validate invitation token with existing coach API"""
    try:
        # Use existing coach API endpoint
        coach_api_url = os.environ.get('COACH_API_URL', 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod')
        validation_url = f"{coach_api_url}/parent-invitations/validate/{invitation_token}"
        
        # Make request to coach API (using urllib to avoid external dependencies)
        import urllib.request
        import urllib.error
        
        try:
            with urllib.request.urlopen(validation_url, timeout=10) as response:
                if response.getcode() == 200:
                    response_data = json.loads(response.read().decode('utf-8'))
                    return response_data.get('invitation', {})
                else:
                    print(f"Coach API returned status {response.getcode()} for token {invitation_token}")
                    return None
        except urllib.error.HTTPError as e:
            print(f"HTTP error validating invitation: {e.code} - {e.reason}")
            return None
        except Exception as e:
            print(f"Error calling coach API: {str(e)}")
            return None
            
    except Exception as e:
        print(f"Error validating invitation token: {str(e)}")
        return None


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps(body)
    } 