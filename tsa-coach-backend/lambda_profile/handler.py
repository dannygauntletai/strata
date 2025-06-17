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

# Add shared layer to path
sys.path.append('/opt/python')

# Import from local directory (copied shared utilities)
from shared_utils import (
    create_response,
    get_dynamodb_table,
    get_table_name,
    parse_event_body,
    standardize_error_response,
    get_current_timestamp
)
# CoachProfile import removed - not used in this handler
from user_identifier import UserIdentifier


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for coach profile operations"""
    try:
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # Extract coach_id from path or query parameters
        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        
        if path.endswith('/profile') and method == 'GET':
            return get_coach_profile(query_params)
        elif path.endswith('/profile') and method == 'PATCH':
            return update_coach_profile(event)
        elif path.endswith('/profile/preferences') and method == 'PATCH':
            return update_coach_preferences(event)
        elif path.endswith('/health') and method == 'GET':
            return create_response(200, {'status': 'healthy', 'service': 'coach-profile'})
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, standardize_error_response(e, "lambda_handler"))


def get_coach_profile(query_params: Dict[str, Any]) -> Dict[str, Any]:
    """Get coach profile including preferences and tour completion status"""
    try:
        coach_id = query_params.get('coach_id')
        email = query_params.get('email')
        
        if not coach_id and not email:
            return create_response(400, {'error': 'coach_id or email parameter required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            if coach_id:
                normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
            else:
                normalized_profile_id = UserIdentifier.normalize_coach_id(email, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get coach profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Structure response with preferences
        profile_data = {
            'profile_id': profile.get('profile_id'),
            'email': profile.get('email'),
            'first_name': profile.get('first_name'),
            'last_name': profile.get('last_name'),
            'school_name': profile.get('school_name'),
            'role_type': profile.get('role_type', 'coach'),
            'preferences': profile.get('preferences', {}),
            'dashboard_tour_completed': profile.get('dashboard_tour_completed', False),
            'dashboard_tour_completed_at': profile.get('dashboard_tour_completed_at'),
            'onboarding_completed': profile.get('onboarding_completed', False),
            'created_at': profile.get('created_at'),
            'updated_at': profile.get('updated_at')
        }
        
        return create_response(200, {'profile': profile_data})
        
    except Exception as e:
        print(f"💥 Error getting coach profile: {str(e)}")
        return create_response(500, standardize_error_response(e, "get_coach_profile"))


def update_coach_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """Update basic coach profile information"""
    try:
        body = parse_event_body(event)
        
        coach_id = body.get('coach_id') or body.get('email')
        if not coach_id:
            return create_response(400, {'error': 'coach_id or email required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get existing profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
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
        print(f"💥 Error updating coach profile: {str(e)}")
        return create_response(500, standardize_error_response(e, "update_coach_profile"))


def update_coach_preferences(event: Dict[str, Any]) -> Dict[str, Any]:
    """Update coach preferences including tour completion status"""
    try:
        body = parse_event_body(event)
        
        coach_id = body.get('coach_id') or body.get('email')
        if not coach_id:
            return create_response(400, {'error': 'coach_id or email required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get existing profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
        existing_profile = response['Item']
        
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
        print(f"💥 Error updating coach preferences: {str(e)}")
        return create_response(500, standardize_error_response(e, "update_coach_preferences")) 