"""
Coach Profile Management Handler
Handles coach self-service profile updates including preferences and tour completion
"""
import json
import os
import boto3
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging
from botocore.exceptions import ClientError

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Add shared layer to path
sys.path.append('/opt/python')

# Import from centralized shared layer
from tsa_shared import (
    create_response,
    get_dynamodb_table,
    parse_event_body,
    format_error_response,
    get_current_timestamp,
    extract_user_from_auth_token,
    get_config
)

# Get table name from config
config = get_config()

def get_table_name(table_type):
    stage = os.environ.get('STAGE', 'dev')
    return config.get_table_name(table_type, stage)

def standardize_error_response(error, context):
    return {'error': str(error), 'context': context}
# CoachProfile import removed - not used in this handler
from user_identifier import UserIdentifier

# Environment variables
PROFILES_TABLE = os.environ.get('PROFILES_TABLE')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for coach profile operations"""
    try:
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        logger.info(f"Processing {method} request to {path}")
        
        if path.endswith('/profile') and method == 'GET':
            return get_coach_profile(event)
        elif path.endswith('/profile') and method == 'PATCH':
            return update_coach_profile(event)
        elif path.endswith('/profile/preferences') and method == 'PATCH':
            return update_coach_preferences(event)
        elif path.endswith('/health') and method == 'GET':
            return health_check()
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        logger.error(f"Unexpected error in lambda_handler: {str(e)}")
        return create_response(500, standardize_error_response(e, "lambda_handler"))

def health_check() -> dict:
    """Health check endpoint"""
    return create_response(200, {'status': 'healthy', 'service': 'coach-profile'})

def get_coach_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get coach profile including preferences and tour completion status"""
    try:
        # 🔧 HARDENED: Extract user with profile sync fallback
        email = extract_user_from_auth_token(event)
        if not email:
            return create_response(401, {'error': 'Authentication required'})
        
        logger.info(f"🔐 Fetching profile for authenticated user: {email}")
        
        # Get profile from profiles table  
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(PROFILES_TABLE)
        
        # Generate consistent coach_id
        coach_id = f"coach_{email.replace('@', '_').replace('.', '_')}"
        
        response = profiles_table.get_item(
            Key={'profile_id': coach_id}
        )
        
        if 'Item' not in response:
            logger.error(f"Profile not found for {email} (coach_id: {coach_id})")
            return create_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Convert DynamoDB types to JSON serializable
        profile_data = {
            'coach_id': profile.get('coach_id', coach_id),
            'profile_id': profile.get('profile_id', coach_id),
            'school_id': profile.get('school_id', ''),
            'first_name': profile.get('first_name', ''),
            'last_name': profile.get('last_name', ''),
            'email': profile.get('email', email),
            'phone': profile.get('phone', ''),
            'specializations': profile.get('specializations', []),
            'certification_level': profile.get('certification_level', ''),
            'years_experience': int(profile.get('years_experience', 0)),
            'students_assigned': profile.get('students_assigned', []),
            'active_programs': profile.get('active_programs', []),
            'preferences': profile.get('preferences', {}),
            'created_at': profile.get('created_at', ''),
            'updated_at': profile.get('updated_at', ''),
            'sync_source': profile.get('sync_source')  # Include sync metadata
        }
        
        logger.info(f"Successfully retrieved profile for {email}")
        return create_response(200, {'profile': profile_data})
        
    except Exception as e:
        logger.error(f"💥 Error getting coach profile: {str(e)}")
        return create_response(500, standardize_error_response(e, "get_coach_profile"))


def update_coach_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """Update basic coach profile information"""
    try:
        # Extract authenticated user from token
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_response(401, {'error': 'Authentication required'})
        
        body = parse_event_body(event)
        
        # Use centralized ID mapping with authenticated user
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get existing profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Verify ownership (security check)
        if profile.get('email', '').lower() != authenticated_email:
            return create_response(403, {'error': 'Access denied'})
        
        # Build update expression for allowed fields
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': get_current_timestamp()}
        expression_names = {}
        
        # Allow updating these profile fields
        updatable_fields = [
            'first_name', 'last_name', 'phone', 'bio', 
            'specializations', 'certification_level', 'years_experience'
        ]
        
        for field in updatable_fields:
            if field in body and body[field] is not None:
                if field in ['specializations']:
                    # Handle list fields
                    update_expression += f", {field} = :{field}"
                    expression_values[f':{field}'] = body[field] if isinstance(body[field], list) else []
                else:
                    update_expression += f", {field} = :{field}"
                    expression_values[f':{field}'] = body[field]
        
        # Update the profile
        updated_response = profiles_table.update_item(
            Key={'profile_id': normalized_profile_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names if expression_names else None,
            ReturnValues='ALL_NEW'
        )
        
        updated_profile = updated_response['Attributes']
        
        return create_response(200, {
            'message': 'Profile updated successfully',
            'profile': {
                'profile_id': updated_profile.get('profile_id'),
                'email': updated_profile.get('email'),
                'first_name': updated_profile.get('first_name'),
                'last_name': updated_profile.get('last_name'),
                'updated_at': updated_profile.get('updated_at')
            }
        })
        
    except Exception as e:
        logger.error(f"💥 Error updating coach profile: {str(e)}")
        return create_response(500, standardize_error_response(e, "update_coach_profile"))


def update_coach_preferences(event: Dict[str, Any]) -> Dict[str, Any]:
    """Update coach preferences including tour completion status"""
    try:
        # Extract authenticated user from token
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_response(401, {'error': 'Authentication required'})
        
        body = parse_event_body(event)
        
        # Use centralized ID mapping with authenticated user
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get existing profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
        existing_profile = response['Item']
        
        # Verify ownership (security check)
        if existing_profile.get('email', '').lower() != authenticated_email:
            return create_response(403, {'error': 'Access denied'})
        
        # Build update expression
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': get_current_timestamp()}
        
        # Handle preferences update
        if 'preferences' in body:
            current_preferences = existing_profile.get('preferences', {})
            updated_preferences = {**current_preferences, **body['preferences']}
            update_expression += ", preferences = :preferences"
            expression_values[':preferences'] = updated_preferences
        
        # Handle tour completion specifically
        if 'dashboard_tour_completed' in body:
            update_expression += ", dashboard_tour_completed = :tour_completed"
            expression_values[':tour_completed'] = bool(body['dashboard_tour_completed'])
            
            if body['dashboard_tour_completed']:
                update_expression += ", dashboard_tour_completed_at = :tour_completed_at"
                expression_values[':tour_completed_at'] = body.get('dashboard_tour_completed_at', get_current_timestamp())
        
        # Update the profile
        updated_response = profiles_table.update_item(
            Key={'profile_id': normalized_profile_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_profile = updated_response['Attributes']
        
        return create_response(200, {
            'message': 'Preferences updated successfully',
            'profile': {
                'profile_id': updated_profile.get('profile_id'),
                'email': updated_profile.get('email'),
                'preferences': updated_profile.get('preferences', {}),
                'dashboard_tour_completed': updated_profile.get('dashboard_tour_completed', False),
                'dashboard_tour_completed_at': updated_profile.get('dashboard_tour_completed_at'),
                'updated_at': updated_profile.get('updated_at')
            }
        })
        
    except Exception as e:
        logger.error(f"💥 Error updating coach preferences: {str(e)}")
        return create_response(500, standardize_error_response(e, "update_coach_preferences")) 