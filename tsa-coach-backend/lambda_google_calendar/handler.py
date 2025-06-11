import json
import os
import boto3
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import traceback
import requests
from urllib.parse import parse_qs

# API Configuration
API_BASE_URL = os.environ.get('API_BASE_URL', 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod')

# Fallback utility functions
def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }

def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        body = event.get('body', '{}')
        if isinstance(body, str):
            return json.loads(body) if body else {}
        return body if isinstance(body, dict) else {}
    except Exception:
        return {}

def get_dynamodb_table(table_name: str):
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        print(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise

def get_current_timestamp() -> str:
    return datetime.utcnow().isoformat() + 'Z'

def refresh_google_token(refresh_token: str) -> Optional[Dict[str, Any]]:
    """Refresh Google OAuth token"""
    try:
        response = requests.post('https://oauth2.googleapis.com/token', data={
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        })
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Token refresh failed: {response.text}")
            return None
    except Exception as e:
        print(f"Error refreshing token: {str(e)}")
        return None

def store_google_tokens(event: Dict[str, Any]) -> Dict[str, Any]:
    """Store Google OAuth tokens for a coach"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['coach_email', 'google_tokens', 'google_user_info']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # Get DynamoDB table
        table_name = os.environ.get('GOOGLE_TOKENS_TABLE', 'google-tokens-v3-dev')
        tokens_table = get_dynamodb_table(table_name)
        
        # Store tokens
        token_item = {
            'coach_email': body['coach_email'],
            'access_token': body['google_tokens']['access_token'],
            'refresh_token': body['google_tokens'].get('refresh_token'),
            'token_type': body['google_tokens'].get('token_type', 'Bearer'),
            'expires_at': datetime.utcnow() + timedelta(seconds=body['google_tokens'].get('expires_in', 3600)),
            'scope': body['google_tokens'].get('scope', ''),
            'google_user_info': body['google_user_info'],
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        tokens_table.put_item(Item=token_item)
        
        return create_response(200, {
            'message': 'Google tokens stored successfully',
            'google_email': body['google_user_info'].get('email')
        })
        
    except Exception as e:
        print(f"Error storing Google tokens: {str(e)}")
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'})

def check_google_calendar_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Check if a coach has connected Google Calendar"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_email = query_params.get('coach_email')
        
        if not coach_email:
            return create_response(400, {'error': 'Missing coach_email parameter'})
        
        # Get DynamoDB table
        table_name = os.environ.get('GOOGLE_TOKENS_TABLE', 'google-tokens-v3-dev')
        tokens_table = get_dynamodb_table(table_name)
        
        # Check if tokens exist
        try:
            response = tokens_table.get_item(Key={'coach_email': coach_email})
            
            if 'Item' in response:
                token_item = response['Item']
                
                # Check if token is still valid (or can be refreshed)
                if token_item.get('refresh_token') or datetime.fromisoformat(token_item['expires_at'].replace('Z', '+00:00')) > datetime.utcnow():
                    return create_response(200, {
                        'connected': True,
                        'google_email': token_item.get('google_user_info', {}).get('email')
                    })
            
            return create_response(200, {'connected': False})
            
        except Exception as e:
            print(f"Error checking token status: {str(e)}")
            return create_response(200, {'connected': False})
        
    except Exception as e:
        print(f"Error checking Google Calendar status: {str(e)}")
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'})

def disconnect_google_calendar(event: Dict[str, Any]) -> Dict[str, Any]:
    """Disconnect Google Calendar by deleting stored tokens"""
    try:
        body = parse_event_body(event)
        coach_email = body.get('coach_email')
        
        if not coach_email:
            return create_response(400, {'error': 'Missing coach_email'})
        
        # Get DynamoDB table
        table_name = os.environ.get('GOOGLE_TOKENS_TABLE', 'google-tokens-v3-dev')
        tokens_table = get_dynamodb_table(table_name)
        
        # Delete tokens
        tokens_table.delete_item(Key={'coach_email': coach_email})
        
        return create_response(200, {'message': 'Google Calendar disconnected successfully'})
        
    except Exception as e:
        print(f"Error disconnecting Google Calendar: {str(e)}")
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'})

def create_google_calendar_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a Google Calendar event from a TSA event"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['tsa_event_id', 'coach_email']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # Get Google tokens
        table_name = os.environ.get('GOOGLE_TOKENS_TABLE', 'google-tokens-v3-dev')
        tokens_table = get_dynamodb_table(table_name)
        
        tokens_response = tokens_table.get_item(Key={'coach_email': body['coach_email']})
        
        if 'Item' not in tokens_response:
            return create_response(400, {'error': 'Google Calendar not connected'})
        
        token_item = tokens_response['Item']
        access_token = token_item['access_token']
        
        # Check if token needs refresh
        if datetime.fromisoformat(token_item['expires_at'].replace('Z', '+00:00')) <= datetime.utcnow():
            if token_item.get('refresh_token'):
                new_tokens = refresh_google_token(token_item['refresh_token'])
                if new_tokens:
                    access_token = new_tokens['access_token']
                    # Update stored tokens
                    token_item['access_token'] = access_token
                    token_item['expires_at'] = datetime.utcnow() + timedelta(seconds=new_tokens.get('expires_in', 3600))
                    token_item['updated_at'] = get_current_timestamp()
                    tokens_table.put_item(Item=token_item)
                else:
                    return create_response(401, {'error': 'Google token refresh failed'})
            else:
                return create_response(401, {'error': 'Google token expired and no refresh token available'})
        
        # Get TSA event details
        events_response = requests.get(f"{API_BASE_URL}/events/{body['tsa_event_id']}")
        if events_response.status_code != 200:
            return create_response(404, {'error': 'TSA event not found'})
        
        tsa_event = events_response.json()['event']
        
        # Create Google Calendar event
        start_datetime = datetime.fromisoformat(tsa_event['start_date'].replace('Z', '+00:00'))
        
        # Calculate end time (use end_date if available, otherwise add 1 hour)
        if tsa_event.get('end_date'):
            end_datetime = datetime.fromisoformat(tsa_event['end_date'].replace('Z', '+00:00'))
        else:
            end_datetime = start_datetime + timedelta(hours=1)
        
        # Build event description
        description_parts = []
        if tsa_event.get('description'):
            description_parts.append(tsa_event['description'])
        
        if tsa_event.get('requirements'):
            description_parts.append("\nRequirements:")
            for req in tsa_event['requirements']:
                description_parts.append(f"• {req}")
        
        if tsa_event.get('cost') and float(tsa_event['cost']) > 0:
            description_parts.append(f"\nCost: ${tsa_event['cost']}")
        
        description = "\n".join(description_parts)
        
        calendar_event = {
            'summary': tsa_event['title'],
            'description': description,
            'start': {
                'dateTime': start_datetime.isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': end_datetime.isoformat(),
                'timeZone': 'UTC'
            }
        }
        
        # Add location if available
        if tsa_event.get('location'):
            calendar_event['location'] = tsa_event['location']
        
        # Create the event in Google Calendar
        google_response = requests.post(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            },
            json=calendar_event
        )
        
        if google_response.status_code == 200:
            google_event = google_response.json()
            return create_response(200, {
                'message': 'Google Calendar event created successfully',
                'google_event_id': google_event['id'],
                'google_event_link': google_event.get('htmlLink')
            })
        else:
            print(f"Google Calendar API error: {google_response.text}")
            return create_response(400, {'error': 'Failed to create Google Calendar event'})
        
    except Exception as e:
        print(f"Error creating Google Calendar event: {str(e)}")
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'})

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for Google Calendar operations"""
    try:
        print(f"Event: {json.dumps(event)}")
        
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        # Handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})
        
        # Route requests based on path
        if path.endswith('/connect') and http_method == 'POST':
            return store_google_tokens(event)
        elif path.endswith('/status') and http_method == 'GET':
            return check_google_calendar_status(event)
        elif path.endswith('/disconnect') and http_method == 'POST':
            return disconnect_google_calendar(event)
        elif path.endswith('/create-event') and http_method == 'POST':
            return create_google_calendar_event(event)
        else:
            return create_response(404, {'error': 'Endpoint not found'})
        
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error'}) 