"""
TSA Coach Onboarding Handler
Handles invitation validation, progress tracking, and onboarding completion
"""

import json
import boto3
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
ONBOARDING_SESSIONS_TABLE = os.environ.get('ONBOARDING_SESSIONS_TABLE')
INVITATIONS_TABLE = os.environ.get('INVITATIONS_TABLE')
USERS_TABLE = os.environ.get('USERS_TABLE')

def lambda_handler(event, context):
    """Main Lambda handler for coach onboarding"""
    
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        body = event.get('body', '{}')
        
        # Parse body if it exists
        if body:
            try:
                body_data = json.loads(body)
            except json.JSONDecodeError:
                body_data = {}
        else:
            body_data = {}
        
        logger.info(f"Coach onboarding request: {http_method} {path}")
        
        # Route requests
        if path.endswith('/validate-invitation') and http_method == 'POST':
            return validate_invitation(body_data)
        elif path.endswith('/progress') and http_method == 'POST':
            return get_onboarding_progress(body_data)
        elif path.endswith('/progress') and http_method == 'PUT':
            return update_onboarding_progress(body_data)
        elif path.endswith('/complete') and http_method == 'POST':
            return complete_onboarding(body_data)
        elif http_method == 'GET':
            return health_check()
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in coach onboarding handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def validate_invitation(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate invitation token and return comprehensive coach data"""
    
    try:
        invitation_token = data.get('invitation_token')
        if not invitation_token:
            return create_response(400, {'error': 'invitation_token is required'})
        
        # Get invitation from admin backend table
        invitations_table = dynamodb.Table(INVITATIONS_TABLE)
        
        # Query by invitation_token (assuming there's a GSI for this)
        response = invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': invitation_token}
        )
        
        if not response['Items']:
            return create_response(400, {
                'valid': False,
                'error': 'Invalid or expired invitation token'
            })
        
        invitation = response['Items'][0]
        
        # Check if invitation is still valid
        if invitation.get('status') != 'pending':
            return create_response(400, {
                'valid': False,
                'error': f'Invitation is {invitation.get("status", "invalid")}'
            })
        
        # Check expiration
        expires_at = invitation.get('expires_at')
        if expires_at and datetime.now(timezone.utc).timestamp() > float(expires_at):
            return create_response(400, {
                'valid': False,
                'error': 'Invitation has expired'
            })
        
        # Return comprehensive invitation data
        invitation_data = {
            'email': invitation.get('email'),
            'role': 'coach',  # Default role
            'first_name': invitation.get('first_name'),
            'last_name': invitation.get('last_name'),
            'phone': invitation.get('phone'),
            'city': invitation.get('city'),
            'state': invitation.get('state'),
            'bio': invitation.get('bio'),
            'message': invitation.get('message'),
            'full_name': invitation.get('full_name'),
            'location': invitation.get('location'),
            'phone_formatted': invitation.get('phone_formatted')
        }
        
        logger.info(f"Validated invitation for coach: {invitation_data['email']}")
        
        return create_response(200, {
            'valid': True,
            'invitation': invitation_data
        })
        
    except Exception as e:
        logger.error(f"Error validating invitation: {str(e)}")
        return create_response(500, {'error': 'Failed to validate invitation'})

def get_onboarding_progress(data: Dict[str, Any]) -> Dict[str, Any]:
    """Get or create onboarding progress for a coach"""
    
    try:
        email = data.get('email')
        invitation_token = data.get('invitation_token')
        
        if not email:
            return create_response(400, {'error': 'email is required'})
        
        # Get existing progress
        sessions_table = dynamodb.Table(ONBOARDING_SESSIONS_TABLE)
        
        try:
            response = sessions_table.get_item(Key={'session_id': email})
            
            if 'Item' in response:
                progress = response['Item']
                
                # Convert DynamoDB types to regular Python types
                progress = convert_dynamodb_to_dict(progress)
                
                return create_response(200, {'progress': progress})
            else:
                # Create new progress record
                new_progress = {
                    'session_id': email,  # Use email as session_id for now
                    'user_id': email,
                    'email': email,
                    'current_step': 'personal-info',
                    'completed_steps': [],
                    'step_data': {},
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'invitation_based': bool(invitation_token),
                    'invitation_token': invitation_token,
                    'expires_at': int((datetime.now(timezone.utc).timestamp() + (7 * 24 * 60 * 60)))  # 7 days TTL
                }
                
                sessions_table.put_item(Item=new_progress)
                
                # 🎯 Status Flow: Set to "accepted" when coach STARTS onboarding
                # - pending: Invitation sent, coach hasn't started onboarding
                # - accepted: Coach STARTED onboarding but hasn't finished 
                # - completed: Coach FINISHED onboarding completely (set in complete_onboarding)
                if invitation_token:
                    invitation_updated = update_invitation_status_by_token(invitation_token, 'accepted')
                    if invitation_updated:
                        logger.info(f"✅ Marked invitation as accepted for session: {email}")
                    else:
                        logger.warning(f"⚠️ Failed to update invitation status for token: {invitation_token}")
                
                logger.info(f"Created new onboarding progress for: {email}")
                
                return create_response(200, {'progress': new_progress})
                
        except Exception as e:
            logger.error(f"Error accessing onboarding sessions table: {str(e)}")
            return create_response(500, {'error': 'Failed to access progress data'})
            
    except Exception as e:
        logger.error(f"Error getting onboarding progress: {str(e)}")
        return create_response(500, {'error': 'Failed to get onboarding progress'})

def update_onboarding_progress(data: Dict[str, Any]) -> Dict[str, Any]:
    """Update onboarding progress and step data"""
    
    try:
        email = data.get('email')
        current_step = data.get('current_step')
        step_data = data.get('step_data', {})
        completed_steps = data.get('completed_steps', [])
        invitation_token = data.get('invitation_token')
        
        if not email or not current_step:
            return create_response(400, {'error': 'email and current_step are required'})
        
        sessions_table = dynamodb.Table(ONBOARDING_SESSIONS_TABLE)
        
        # Update the progress record
        update_expression = """
            SET current_step = :current_step,
                step_data = :step_data,
                completed_steps = :completed_steps,
                last_updated = :last_updated
        """
        
        expression_values = {
            ':current_step': current_step,
            ':step_data': step_data,
            ':completed_steps': completed_steps,
            ':last_updated': datetime.now(timezone.utc).isoformat()
        }
        
        # Add invitation_token if provided
        if invitation_token:
            update_expression += ", invitation_token = :invitation_token, invitation_based = :invitation_based"
            expression_values[':invitation_token'] = invitation_token
            expression_values[':invitation_based'] = True
        
        sessions_table.update_item(
            Key={'session_id': email},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        logger.info(f"Updated onboarding progress for {email}: step {current_step}")
        
        return create_response(200, {'message': 'Progress updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating onboarding progress: {str(e)}")
        return create_response(500, {'error': 'Failed to update progress'})

def complete_onboarding(data: Dict[str, Any]) -> Dict[str, Any]:
    """Complete the onboarding process and create user profile"""
    
    try:
        email = data.get('email')
        invitation_token = data.get('invitation_token')
        
        if not email:
            return create_response(400, {'error': 'email is required'})
        
        # Get the onboarding progress
        sessions_table = dynamodb.Table(ONBOARDING_SESSIONS_TABLE)
        progress_response = sessions_table.get_item(Key={'session_id': email})
        
        if 'Item' not in progress_response:
            return create_response(404, {'error': 'Onboarding session not found'})
        
        progress = progress_response['Item']
        step_data = progress.get('step_data', {})
        
        # Create user profile in users table
        users_table = dynamodb.Table(USERS_TABLE)
        
        user_profile = {
            'user_id': f"coach_{email.replace('@', '_').replace('.', '_')}",
            'email': email,
            'role': 'coach',
            
            # Basic personal information - map frontend field names
            'first_name': step_data.get('first_name', ''),
            'last_name': step_data.get('last_name', ''),
            'middle_name': step_data.get('middle_name', ''),
            'generation_code_suffix': step_data.get('generation_code_suffix', ''),
            'phone': step_data.get('cell_phone', step_data.get('phone', '')),  # Frontend uses 'cell_phone'
            'city': step_data.get('city', ''),
            'state': step_data.get('state', ''),
            'bio': step_data.get('bio', ''),
            
            # Ed-Fi compliant birth information
            'birth_date': step_data.get('birth_date', ''),
            'birth_city': step_data.get('birth_city', ''),
            'birth_state_abbreviation_descriptor': step_data.get('birth_state_abbreviation_descriptor', ''),
            
            # Ed-Fi compliant demographic information
            'gender': step_data.get('gender', ''),
            'hispanic_latino_ethnicity': step_data.get('hispanic_latino_ethnicity'),
            'races': step_data.get('races', []),
            
            # TSA-specific fields - map frontend field names
            'experience': step_data.get('years_experience', step_data.get('experience', '')),  # Frontend uses 'years_experience'
            'certifications': step_data.get('certifications', []),
            'specialties': step_data.get('specializations', step_data.get('specialties', [])),  # Frontend uses 'specializations'
            'emergency_contact': step_data.get('emergency_contact', ''),
            'role_type': step_data.get('role_type', 'coach'),  # Add role_type field
            'certification_level': step_data.get('certification_level', ''),  # Add certification_level
            
            # School/organizational information (Ed-Fi compliant) - map frontend field names
            'school_name': step_data.get('school_name', ''),
            'school_type': step_data.get('school_type', ''),
            'grade_levels': step_data.get('grade_levels_served', step_data.get('grade_levels', [])),  # Frontend uses 'grade_levels_served'
            'school_id': step_data.get('school_id'),  # Ed-Fi school identifier
            'state_organization_id': step_data.get('state_organization_id', ''),
            'local_education_agency_id': step_data.get('local_education_agency_id'),
            'operational_status_descriptor': step_data.get('operational_status_descriptor', 'active'),
            'charter_status_descriptor': step_data.get('charter_status_descriptor', ''),
            
            # Additional school fields from frontend
            'school_street': step_data.get('school_street', ''),
            'school_city': step_data.get('school_city', ''),
            'school_state': step_data.get('school_state', ''),
            'school_zip': step_data.get('school_zip', ''),
            'school_phone': step_data.get('school_phone', ''),
            'website': step_data.get('website', ''),
            'has_physical_location': step_data.get('has_physical_location', True),
            'academic_year': step_data.get('academic_year', '2024-2025'),
            
            # Sports and focus
            'sport': step_data.get('sport', ''),
            'football_type': step_data.get('football_type', ''),
            'school_categories': step_data.get('school_categories', []),
            'program_focus': step_data.get('program_focus', []),
            
            # Student planning
            'estimated_student_count': step_data.get('estimated_student_count', 0),
            'student_grade_levels': step_data.get('student_grade_levels', []),
            'enrollment_capacity': step_data.get('enrollment_capacity', 100),
            'has_current_students': step_data.get('has_current_students', False),
            'current_student_details': step_data.get('current_student_details', ''),
            
            # Compliance and agreements
            'platform_agreement': step_data.get('platform_agreement', False),
            'microschool_agreement': step_data.get('microschool_agreement', False),
            'background_check_status': step_data.get('background_check_status', 'pending'),
            
            # OneRoster compliant organizational data
            'org_ids': step_data.get('org_ids', []),
            'enabled_user': step_data.get('enabled_user', True),
            'sourced_id': f"coach_{email.replace('@', '_').replace('.', '_')}",  # OneRoster ID
            'username': email,  # OneRoster username
            
            # System fields
            'onboarding_completed': True,
            'onboarding_completed_at': datetime.now(timezone.utc).isoformat(),
            'invitation_based': progress.get('invitation_based', False),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Save user profile
        users_table.put_item(Item=user_profile)
        
        # ✅ Register user with auth service for magic link compatibility
        auth_registration_success = False
        try:
            logger.info(f"🔐 Registering user with auth service: {email}")
            auth_registration_success = register_user_with_auth_service(user_profile)
            if auth_registration_success:
                logger.info(f"✅ Successfully registered {email} with auth service")
            else:
                logger.warning(f"⚠️ Failed to register {email} with auth service")
        except Exception as e:
            logger.warning(f"⚠️ Error registering user with auth service: {str(e)}")
            # Don't fail the onboarding if auth registration fails
        
        # 🎯 IMPORTANT: Status Flow Clarification
        # - pending: Invitation sent, coach hasn't started onboarding
        # - accepted: Coach STARTED onboarding but hasn't finished 
        # - completed: Coach FINISHED onboarding completely
        
        # Mark invitation as COMPLETED when onboarding finishes
        if invitation_token:
            try:
                # Use the helper function to properly update invitation status
                invitation_updated = update_invitation_status_by_token(invitation_token, 'completed')
                if invitation_updated:
                    logger.info(f"✅ Marked invitation as completed for: {email}")
                else:
                    logger.warning(f"⚠️ Failed to update invitation status to completed for token: {invitation_token}")
            except Exception as e:
                logger.warning(f"Could not update invitation status to completed: {str(e)}")
        
        # Update onboarding session to completed
        sessions_table.update_item(
            Key={'session_id': email},
            UpdateExpression="SET current_step = :step, completed_steps = :completed, onboarding_completed = :completed_flag",
            ExpressionAttributeValues={
                ':step': 'complete',
                ':completed': progress.get('completed_steps', []) + ['complete'],
                ':completed_flag': True
            }
        )
        
        logger.info(f"Completed onboarding for coach: {email}")
        
        return create_response(200, {
            'message': 'Onboarding completed successfully',
            'profile_id': user_profile['user_id'],
            'status': 'completed',
            'invitation_based': progress.get('invitation_based', False)
        })
        
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        return create_response(500, {'error': 'Failed to complete onboarding'})

def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return create_response(200, {
        'status': 'healthy',
        'service': 'coach-onboarding',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create a standardized HTTP response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        },
        'body': json.dumps(body, default=str)
    }

def convert_dynamodb_to_dict(item: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DynamoDB item to regular Python dict"""
    def convert_value(value):
        if isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, dict):
            return {k: convert_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [convert_value(v) for v in value]
        else:
            return value
    
    return convert_value(item) 

def update_invitation_status_by_token(invitation_token: str, status: str) -> bool:
    """Update invitation status by finding invitation by token"""
    try:
        if not invitation_token:
            return False
            
        invitations_table = dynamodb.Table(INVITATIONS_TABLE)
        
        # Find invitation by token using scan (since token is not the partition key)
        response = invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': invitation_token}
        )
        
        if not response.get('Items'):
            logger.warning(f"No invitation found with token: {invitation_token}")
            return False
        
        invitation = response['Items'][0]
        invitation_id = invitation['invitation_id']
        
        # Update the invitation status
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET #status = :status, accepted_at = :accepted_at, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': status,
                ':accepted_at': datetime.now(timezone.utc).isoformat(),
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(f"Updated invitation {invitation_id} status to {status}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating invitation status: {str(e)}")
        return False

def register_user_with_auth_service(user_profile: Dict[str, Any]) -> bool:
    """Register user with auth service Cognito user pool"""
    try:
        # Get auth service configuration from environment
        auth_user_pool_id = os.environ.get('AUTH_USER_POOL_ID')
        if not auth_user_pool_id:
            logger.warning("AUTH_USER_POOL_ID not configured, skipping auth service registration")
            return False
        
        email = user_profile.get('email')
        if not email:
            logger.error("No email in user profile, cannot register with auth service")
            return False
        
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp')
        
        # Check if user already exists
        try:
            cognito_client.admin_get_user(
                UserPoolId=auth_user_pool_id,
                Username=email
            )
            logger.info(f"User {email} already exists in auth service")
            return True  # Consider this a success
        except cognito_client.exceptions.UserNotFoundException:
            # User doesn't exist, create them
            pass
        
        # Prepare user attributes
        user_attributes = [
            {'Name': 'email', 'Value': email},
            {'Name': 'email_verified', 'Value': 'true'},
            {'Name': 'custom:user_role', 'Value': 'coach'}
        ]
        
        # Add name attributes if available
        first_name = user_profile.get('first_name', '').strip()
        last_name = user_profile.get('last_name', '').strip()
        if first_name:
            user_attributes.append({'Name': 'given_name', 'Value': first_name})
        if last_name:
            user_attributes.append({'Name': 'family_name', 'Value': last_name})
        
        # Add phone if available - format for E.164 compatibility
        phone = user_profile.get('phone', '').strip()
        if phone:
            formatted_phone = format_phone_for_cognito(phone)
            if formatted_phone:
                user_attributes.append({'Name': 'phone_number', 'Value': formatted_phone})
                logger.info(f"Formatted phone {phone} -> {formatted_phone} for Cognito")
            else:
                logger.warning(f"Could not format phone number for Cognito: {phone}")
        
        # Create user in auth service Cognito
        cognito_client.admin_create_user(
            UserPoolId=auth_user_pool_id,
            Username=email,
            UserAttributes=user_attributes,
            MessageAction='SUPPRESS'  # Don't send Cognito welcome email
        )
        
        logger.info(f"Successfully created user {email} in auth service")
        return True
        
    except Exception as e:
        logger.error(f"Error registering user with auth service: {str(e)}")
        return False

def format_phone_for_cognito(phone: str) -> str:
    """Format phone number to E.164 format for Cognito compatibility"""
    import re
    
    if not phone:
        return ""
    
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Handle different US phone number formats
    if len(digits_only) == 10:
        # 10 digits - add US country code
        return f"+1{digits_only}"
    elif len(digits_only) == 11 and digits_only.startswith('1'):
        # 11 digits starting with 1 - add plus sign
        return f"+{digits_only}"
    elif phone.startswith('+') and len(digits_only) >= 10:
        # Already has plus - validate format
        return phone if re.match(r'^\+\d{10,15}$', phone) else ""
    else:
        # Invalid format - return empty to skip phone attribute
        logger.warning(f"Invalid phone format for Cognito: {phone} (digits: {digits_only})")
        return "" 