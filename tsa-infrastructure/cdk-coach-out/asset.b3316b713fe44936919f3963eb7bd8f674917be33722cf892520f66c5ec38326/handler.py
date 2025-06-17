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
            return get_coach_profile(event)  # Pass entire event for auth extraction
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


def extract_user_from_auth_token(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user email from JWT auth token in Authorization header
    Returns the authenticated user's email, or None if not authenticated
    """
    try:
        headers = event.get('headers', {})
        
        # Get authorization header (case-insensitive)
        auth_header = None
        for header_name, header_value in headers.items():
            if header_name.lower() == 'authorization':
                auth_header = header_value
                break
        
        if not auth_header:
            print("⚠️ No Authorization header found")
            return None
        
        if not auth_header.startswith('Bearer '):
            print("⚠️ Invalid Authorization header format")
            return None
        
        # Extract JWT token
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Decode JWT payload (basic validation - assumes token is already validated by API Gateway)
        import base64
        import json
        
        # Split token into parts
        token_parts = token.split('.')
        if len(token_parts) != 3:
            print("⚠️ Invalid JWT token format")
            return None
        
        # Decode payload (second part)
        payload_b64 = token_parts[1]
        # Add padding if necessary
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload = json.loads(base64.b64decode(payload_b64))
        
        # Extract email from token payload
        email = payload.get('email') or payload.get('username')
        if email:
            print(f"✅ Authenticated user extracted from token: {email}")
            return email.lower().strip()
        
        print("⚠️ No email found in token payload")
        return None
        
    except Exception as e:
        print(f"❌ Error extracting user from auth token: {str(e)}")
        return None


def get_coach_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get coach profile including preferences and tour completion status"""
    try:
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Fetching profile for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get coach profile
        response = profiles_table.get_item(Key={'profile_id': normalized_profile_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Verify the profile belongs to the authenticated user (security check)
        if profile.get('email', '').lower() != authenticated_email:
            print(f"🚨 Security violation: Authenticated user {authenticated_email} tried to access profile {profile.get('email')}")
            return create_response(403, {'error': 'Access denied'})
        
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
        print(f"💥 Error updating coach profile: {str(e)}")
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
        print(f"💥 Error updating coach preferences: {str(e)}")
        return create_response(500, standardize_error_response(e, "update_coach_preferences")) 