"""
Coach Google Calendar Handler - Clean Architecture with Centralized Models
Fixed CORS duplication, uses centralized models, focused on calendar integration.
"""
import json
from typing import Dict, Any, List, Optional

# Import centralized models and utilities - NO fallback pattern
from shared_utils import (
    create_api_response, parse_event_body, get_current_time, 
    standardize_error_response, get_table_name, get_dynamodb_table,
    generate_id, validate_email, UserIdentifier, CoachProfile
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler - NO CORS, uses centralized models"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_params = event.get('pathParameters') or {}
        
        print(f"📅 Calendar: {http_method} {path}")
        
        if http_method == 'GET':
            if '/oauth/url' in path:
                return get_oauth_url(event)
            elif '/oauth/callback' in path:
                return handle_oauth_callback(event)
            elif '/status' in path:
                return get_calendar_status(event)
            elif '/events' in path:
                return list_calendar_events(event)
            elif '/health' in path:
                return get_health_status()
            else:
                return create_response(404, {'error': 'Calendar endpoint not found'})
        elif http_method == 'POST':
            if '/sync' in path:
                return sync_calendar_events(event)
            elif '/create' in path:
                return create_calendar_event(event)
            else:
                return create_response(404, {'error': 'Calendar endpoint not found'})
        elif http_method == 'DELETE' and 'event_id' in path_params:
            return delete_calendar_event(path_params['event_id'], event)
        else:
            return create_response(404, {
                'error': 'Endpoint not found',
                'available_endpoints': [
                    'GET /calendar/oauth/url', 'GET /calendar/oauth/callback',
                    'GET /calendar/status', 'GET /calendar/events',
                    'POST /calendar/sync', 'POST /calendar/create',
                    'DELETE /calendar/events/{id}'
                ]
            })
            
    except Exception as e:
        print(f"💥 Handler Error: {str(e)}")
        return create_response(500, format_error_response(e, "lambda_handler"))


def get_oauth_url(event: Dict[str, Any]) -> Dict[str, Any]:
    """Generate Google Calendar OAuth URL"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Generate OAuth URL (simplified - actual implementation would use Google OAuth library)
        oauth_url = generate_google_oauth_url(normalized_profile_id)
        
        return create_response(200, {
            'oauth_url': oauth_url,
            'coach_id': normalized_profile_id,
            'message': 'Visit this URL to authorize Google Calendar access'
        })
        
    except Exception as e:
        print(f"💥 Error generating OAuth URL: {str(e)}")
        return create_response(500, format_error_response(e, "get_oauth_url"))


def generate_google_oauth_url(coach_id: str) -> str:
    """Generate Google Calendar OAuth URL - simplified for demo"""
    # In real implementation, this would use google-auth-oauthlib
    base_url = "https://accounts.google.com/o/oauth2/auth"
    client_id = "your-google-client-id"  # Would come from environment/secrets
    redirect_uri = "https://your-domain.com/api/calendar/oauth/callback"
    scope = "https://www.googleapis.com/auth/calendar"
    
    return (
        f"{base_url}?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}&"
        f"response_type=code&"
        f"state={coach_id}&"
        f"access_type=offline"
    )


def handle_oauth_callback(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Google OAuth callback and store tokens"""
    try:
        query_params = event.get('queryStringParameters') or {}
        code = query_params.get('code')
        state = query_params.get('state')  # This contains coach_id
        error = query_params.get('error')
        
        if error:
            return create_response(400, {
                'error': f'OAuth authorization failed: {error}'
            })
        
        if not code or not state:
            return create_response(400, {
                'error': 'Missing authorization code or state parameter'
            })
        
        coach_id = state  # State parameter contains normalized profile_id
        
        # Exchange code for tokens (simplified - would use Google OAuth library)
        tokens = exchange_code_for_tokens(code)
        
        # Store tokens in DynamoDB
        calendar_integrations_table = get_dynamodb_table(get_table_name('calendar_integrations'))
        
        integration_data = {
            'coach_id': coach_id,
            'provider': 'google',
            'access_token': tokens.get('access_token'),
            'refresh_token': tokens.get('refresh_token'),
            'token_expires_at': tokens.get('expires_at'),
            'status': 'active',
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        calendar_integrations_table.put_item(Item=integration_data)
        
        print(f"✅ Google Calendar connected for coach: {coach_id}")
        return create_response(200, {
            'message': 'Google Calendar successfully connected',
            'coach_id': coach_id,
            'status': 'active'
        })
        
    except Exception as e:
        print(f"💥 Error handling OAuth callback: {str(e)}")
        return create_response(500, format_error_response(e, "handle_oauth_callback"))


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchange authorization code for access tokens - simplified"""
    # In real implementation, this would make HTTP request to Google's token endpoint
    # For now, return mock tokens
    return {
        'access_token': f'mock_access_token_{code[:10]}',
        'refresh_token': f'mock_refresh_token_{code[:10]}',
        'expires_at': get_current_timestamp(),
        'token_type': 'Bearer'
    }


def get_calendar_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get calendar integration status for a coach"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        calendar_integrations_table = get_dynamodb_table(get_table_name('calendar_integrations'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Check integration status
        response = calendar_integrations_table.get_item(Key={'coach_id': normalized_profile_id})
        
        if 'Item' not in response:
            return create_response(200, {
                'status': 'not_connected',
                'coach_id': normalized_profile_id,
                'message': 'Google Calendar not connected'
            })
        
        integration = response['Item']
        
        return create_response(200, {
            'status': integration.get('status', 'unknown'),
            'provider': integration.get('provider', 'google'),
            'connected_at': integration.get('created_at'),
            'last_sync': integration.get('last_sync_at'),
            'coach_id': normalized_profile_id
        })
        
    except Exception as e:
        print(f"💥 Error getting calendar status: {str(e)}")
        return create_response(500, format_error_response(e, "get_calendar_status"))


def list_calendar_events(event: Dict[str, Any]) -> Dict[str, Any]:
    """List Google Calendar events for a coach"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get access token
        access_token = get_valid_access_token(normalized_profile_id)
        
        if not access_token:
            return create_response(401, {
                'error': 'Google Calendar not connected or token expired',
                'action': 'reconnect_required'
            })
        
        # Fetch events from Google Calendar (simplified)
        calendar_events = fetch_google_calendar_events(access_token, query_params)
        
        return create_response(200, {
            'events': calendar_events,
            'count': len(calendar_events),
            'coach_id': normalized_profile_id
        })
        
    except Exception as e:
        print(f"💥 Error listing calendar events: {str(e)}")
        return create_response(500, format_error_response(e, "list_calendar_events"))


def sync_calendar_events(event: Dict[str, Any]) -> Dict[str, Any]:
    """Sync TSA events to Google Calendar"""
    try:
        body = parse_event_body(event)
        coach_id = body.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id is required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get access token
        access_token = get_valid_access_token(normalized_profile_id)
        
        if not access_token:
            return create_response(401, {
                'error': 'Google Calendar not connected or token expired',
                'action': 'reconnect_required'
            })
        
        # Get TSA events for this coach
        events_table = get_dynamodb_table(get_table_name('events'))
        
        response = events_table.scan(
            FilterExpression='created_by = :coach_id',
            ExpressionAttributeValues={':coach_id': normalized_profile_id}
        )
        
        tsa_events = response.get('Items', [])
        
        # Sync each event to Google Calendar
        synced_events = []
        for tsa_event in tsa_events:
            try:
                google_event_id = sync_event_to_google(tsa_event, access_token)
                synced_events.append({
                    'tsa_event_id': tsa_event['event_id'],
                    'google_event_id': google_event_id,
                    'title': tsa_event['title']
                })
            except Exception as sync_error:
                print(f"Failed to sync event {tsa_event['event_id']}: {sync_error}")
        
        # Update last sync time
        calendar_integrations_table = get_dynamodb_table(get_table_name('calendar_integrations'))
        calendar_integrations_table.update_item(
            Key={'coach_id': normalized_profile_id},
            UpdateExpression='SET last_sync_at = :sync_time',
            ExpressionAttributeValues={':sync_time': get_current_timestamp()}
        )
        
        return create_response(200, {
            'message': f'Synced {len(synced_events)} events to Google Calendar',
            'synced_events': synced_events,
            'total_events': len(tsa_events)
        })
        
    except Exception as e:
        print(f"💥 Error syncing calendar events: {str(e)}")
        return create_response(500, format_error_response(e, "sync_calendar_events"))


def create_calendar_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new event in Google Calendar"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['coach_id', 'title', 'start_date', 'end_date']
        missing = [f for f in required_fields if f not in body or not body[f]]
        if missing:
            return create_response(400, {'error': f'Missing required fields: {", ".join(missing)}'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(body['coach_id'], profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get access token
        access_token = get_valid_access_token(normalized_profile_id)
        
        if not access_token:
            return create_response(401, {
                'error': 'Google Calendar not connected or token expired',
                'action': 'reconnect_required'
            })
        
        # Create event in Google Calendar
        google_event_id = create_google_calendar_event(body, access_token)
        
        return create_response(201, {
            'message': 'Event created in Google Calendar',
            'google_event_id': google_event_id,
            'title': body['title']
        })
        
    except Exception as e:
        print(f"💥 Error creating calendar event: {str(e)}")
        return create_response(500, format_error_response(e, "create_calendar_event"))


def get_valid_access_token(coach_id: str) -> Optional[str]:
    """Get valid access token for coach, refresh if needed"""
    try:
        calendar_integrations_table = get_dynamodb_table(get_table_name('calendar_integrations'))
        
        response = calendar_integrations_table.get_item(Key={'coach_id': coach_id})
        
        if 'Item' not in response:
            return None
        
        integration = response['Item']
        
        # In real implementation, would check token expiration and refresh if needed
        return integration.get('access_token')
        
    except Exception as e:
        print(f"Error getting access token: {str(e)}")
        return None


def fetch_google_calendar_events(access_token: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetch events from Google Calendar API - simplified"""
    # In real implementation, would make HTTP request to Google Calendar API
    # For now, return mock events
    return [
        {
            'id': 'mock_event_1',
            'title': 'Sample Calendar Event',
            'start_date': '2024-01-15T10:00:00Z',
            'end_date': '2024-01-15T11:00:00Z',
            'description': 'Mock event from Google Calendar'
        }
    ]


def sync_event_to_google(tsa_event: Dict[str, Any], access_token: str) -> str:
    """Sync a TSA event to Google Calendar - simplified"""
    # In real implementation, would make HTTP request to Google Calendar API
    return f"google_event_{tsa_event['event_id']}"


def create_google_calendar_event(event_data: Dict[str, Any], access_token: str) -> str:
    """Create event in Google Calendar - simplified"""
    # In real implementation, would make HTTP request to Google Calendar API
    return f"google_event_{generate_id('cal')}"


def delete_calendar_event(event_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Delete event from Google Calendar"""
    try:
        body = parse_event_body(event)
        coach_id = body.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id is required'})
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_profile_id = UserIdentifier.normalize_coach_id(coach_id, profiles_table)
        except ValueError as e:
            return create_response(404, {'error': str(e)})
        
        # Get access token
        access_token = get_valid_access_token(normalized_profile_id)
        
        if not access_token:
            return create_response(401, {
                'error': 'Google Calendar not connected or token expired',
                'action': 'reconnect_required'
            })
        
        # Delete from Google Calendar (simplified)
        delete_google_calendar_event(event_id, access_token)
        
        return create_response(200, {
            'message': 'Event deleted from Google Calendar',
            'event_id': event_id
        })
        
    except Exception as e:
        print(f"💥 Error deleting calendar event: {str(e)}")
        return create_response(500, format_error_response(e, "delete_calendar_event"))


def delete_google_calendar_event(event_id: str, access_token: str) -> None:
    """Delete event from Google Calendar - simplified"""
    # In real implementation, would make HTTP DELETE request to Google Calendar API
    print(f"Would delete Google Calendar event: {event_id}")


def get_health_status() -> Dict[str, Any]:
    """Health check with DynamoDB connectivity test"""
    try:
        calendar_integrations_table = get_dynamodb_table(get_table_name('calendar_integrations'))
        calendar_integrations_table.load()
        
        return create_response(200, {
            'status': 'healthy',
            'service': 'coach-google-calendar',
            'timestamp': get_current_timestamp(),
            'version': '2.0.0'
        })
        
    except Exception as e:
        print(f"💥 Health Error: {str(e)}")
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e)
        }) 