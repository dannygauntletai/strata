"""
Eventbrite API Client
Handles OAuth authentication, event management, and attendee synchronization
"""
import requests
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from dataclasses import dataclass
import logging
import urllib.parse

# Import shared utilities for DynamoDB integration
import sys
sys.path.append('/opt/python')
from tsa_shared.database import get_dynamodb_table, get_current_timestamp
from tsa_shared.config import get_table_name
from tsa_shared.table_models import EventbriteConfig, EventbriteOAuthStatus

logger = logging.getLogger(__name__)

@dataclass
class EventbriteCredentials:
    """Eventbrite OAuth credentials"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None

    @classmethod
    def from_config(cls, config: EventbriteConfig) -> 'EventbriteCredentials':
        """Create credentials from DynamoDB config"""
        expires_at = None
        if config.token_expires_at:
            expires_at = datetime.fromisoformat(config.token_expires_at)
        
        return cls(
            access_token=config.access_token,
            refresh_token=config.refresh_token,
            expires_at=expires_at
        )


class EventbriteAPIError(Exception):
    """Eventbrite API error"""
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}
        super().__init__(self.message)


class EventbriteClient:
    """Eventbrite API client with OAuth and rate limiting support"""
    
    BASE_URL = "https://www.eventbriteapi.com/v3"
    OAUTH_URL = "https://www.eventbrite.com/oauth"
    
    def __init__(self, credentials: EventbriteCredentials):
        self.credentials = credentials
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {credentials.access_token}',
            'Content-Type': 'application/json'
        })
        
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request with error handling and rate limiting"""
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                logger.warning(f"Rate limited. Waiting {retry_after} seconds...")
                time.sleep(retry_after)
                response = self.session.request(method, url, **kwargs)
            
            # Parse response
            try:
                data = response.json()
            except ValueError:
                data = {}
            
            if not response.ok:
                error_msg = data.get('error_description', data.get('error', f'HTTP {response.status_code}'))
                raise EventbriteAPIError(
                    message=error_msg,
                    status_code=response.status_code,
                    response_data=data
                )
            
            return data
            
        except requests.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            raise EventbriteAPIError(f"Request failed: {str(e)}")
    
    def get_user_info(self) -> Dict[str, Any]:
        """Get current user information"""
        return self._make_request('GET', '/users/me/')
    
    def get_organizations(self) -> List[Dict[str, Any]]:
        """Get user's organizations"""
        response = self._make_request('GET', '/users/me/organizations/')
        return response.get('organizations', [])
    
    def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event on Eventbrite"""
        # Transform TSA event data to Eventbrite format
        eventbrite_data = self._transform_to_eventbrite_format(event_data)
        
        response = self._make_request('POST', '/events/', json={'event': eventbrite_data})
        return response
    
    def update_event(self, event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing event on Eventbrite"""
        eventbrite_data = self._transform_to_eventbrite_format(event_data)
        
        response = self._make_request('POST', f'/events/{event_id}/', json={'event': eventbrite_data})
        return response
    
    def publish_event(self, event_id: str) -> Dict[str, Any]:
        """Publish an event on Eventbrite"""
        return self._make_request('POST', f'/events/{event_id}/publish/')
    
    def cancel_event(self, event_id: str) -> Dict[str, Any]:
        """Cancel an event on Eventbrite"""
        return self._make_request('POST', f'/events/{event_id}/cancel/')
    
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get event details from Eventbrite"""
        return self._make_request('GET', f'/events/{event_id}/')
    
    def create_ticket_classes(self, event_id: str, ticket_types: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create ticket classes for an event"""
        created_tickets = []
        
        for ticket_type in ticket_types:
            ticket_data = self._transform_ticket_to_eventbrite_format(ticket_type)
            
            response = self._make_request(
                'POST', 
                f'/events/{event_id}/ticket_classes/',
                json={'ticket_class': ticket_data}
            )
            created_tickets.append(response)
        
        return created_tickets
    
    def get_event_attendees(self, event_id: str, page: int = 1) -> Dict[str, Any]:
        """Get event attendees with pagination"""
        params = {
            'page': page,
            'expand': 'answers,promotional_code,ticket_class,order'
        }
        
        return self._make_request('GET', f'/events/{event_id}/attendees/', params=params)
    
    def get_all_event_attendees(self, event_id: str) -> List[Dict[str, Any]]:
        """Get all event attendees (handles pagination)"""
        attendees = []
        page = 1
        
        while True:
            response = self.get_event_attendees(event_id, page)
            page_attendees = response.get('attendees', [])
            
            if not page_attendees:
                break
            
            attendees.extend(page_attendees)
            
            # Check if there are more pages
            pagination = response.get('pagination', {})
            if not pagination.get('has_more_items', False):
                break
            
            page += 1
        
        return attendees
    
    def _transform_to_eventbrite_format(self, tsa_event: Dict[str, Any]) -> Dict[str, Any]:
        """Transform TSA event data to Eventbrite API format"""
        
        # Parse start and end dates
        start_utc = datetime.fromisoformat(tsa_event['start_date'].replace('Z', '+00:00'))
        end_utc = datetime.fromisoformat(tsa_event['end_date'].replace('Z', '+00:00'))
        
        eventbrite_event = {
            'name': {
                'html': tsa_event['title']
            },
            'description': {
                'html': tsa_event.get('description', '')
            },
            'start': {
                'timezone': tsa_event.get('timezone', 'America/Chicago'),
                'utc': start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
            },
            'end': {
                'timezone': tsa_event.get('timezone', 'America/Chicago'),
                'utc': end_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
            },
            'currency': tsa_event.get('currency', 'USD'),
            'online_event': False,  # TSA events are typically in-person
            'listed': tsa_event.get('visibility', 'public') == 'public',
            'shareable': True,
            'invite_only': tsa_event.get('visibility', 'public') == 'private',
            'show_remaining': True,
            'capacity': tsa_event.get('capacity'),
        }
        
        # Add venue if location details provided
        if any(tsa_event.get(field) for field in ['venue_name', 'address_line_1', 'city']):
            venue_data = {}
            
            if tsa_event.get('venue_name'):
                venue_data['name'] = tsa_event['venue_name']
            
            # Build address
            address_parts = []
            if tsa_event.get('address_line_1'):
                address_parts.append(tsa_event['address_line_1'])
            if tsa_event.get('address_line_2'):
                address_parts.append(tsa_event['address_line_2'])
            
            if address_parts:
                venue_data['address'] = {
                    'address_1': address_parts[0] if len(address_parts) > 0 else '',
                    'address_2': address_parts[1] if len(address_parts) > 1 else '',
                    'city': tsa_event.get('city', ''),
                    'region': tsa_event.get('state', ''),
                    'postal_code': tsa_event.get('postal_code', ''),
                    'country': tsa_event.get('country', 'US')
                }
            
            if venue_data:
                eventbrite_event['venue'] = venue_data
        
        # Add category mapping
        category_mapping = {
            'training': '113',  # Sports & Fitness
            'tournament': '113', # Sports & Fitness
            'camp': '113',      # Sports & Fitness
            'meeting': '101',   # Business & Professional
            'clinic': '113',    # Sports & Fitness
            'showcase': '113',  # Sports & Fitness
            'tryout': '113',    # Sports & Fitness
            'social': '110'     # Community & Culture
        }
        
        category = tsa_event.get('category', 'training')
        if category in category_mapping:
            eventbrite_event['category_id'] = category_mapping[category]
        
        return eventbrite_event
    
    def _transform_ticket_to_eventbrite_format(self, tsa_ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Transform TSA ticket type to Eventbrite format"""
        
        eventbrite_ticket = {
            'name': tsa_ticket['name'],
            'description': tsa_ticket.get('description', ''),
            'cost': f"{tsa_ticket.get('cost', 0):.2f}",
            'currency': tsa_ticket.get('currency', 'USD'),
            'free': tsa_ticket.get('cost', 0) == 0,
            'include_fee': tsa_ticket.get('include_fee', True),
            'split_fee_with_organizer': tsa_ticket.get('split_fee_with_organizer', False),
            'hidden': tsa_ticket.get('hidden', False),
        }
        
        # Add quantity if specified
        if tsa_ticket.get('quantity_total'):
            eventbrite_ticket['quantity_total'] = tsa_ticket['quantity_total']
        
        # Add sales dates if specified
        if tsa_ticket.get('sales_start'):
            start_date = datetime.fromisoformat(tsa_ticket['sales_start'].replace('Z', '+00:00'))
            eventbrite_ticket['sales_start'] = start_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        if tsa_ticket.get('sales_end'):
            end_date = datetime.fromisoformat(tsa_ticket['sales_end'].replace('Z', '+00:00'))
            eventbrite_ticket['sales_end'] = end_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        return eventbrite_ticket
    
    @staticmethod
    def get_oauth_url(client_id: str, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL with comprehensive scopes"""
        import urllib.parse
        
        # Request comprehensive scopes for event management
        scopes = [
            'event:write',      # Create and modify events
            'event:read',       # Read event data
            'user:read',        # Read user profile information
            'organization:read' # Read organization details
        ]
        
        params = {
            'response_type': 'code',
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': ' '.join(scopes)  # Space-separated scopes
        }
        
        if state:
            params['state'] = state
        
        # Use proper URL encoding
        param_string = urllib.parse.urlencode(params)
        return f"{EventbriteClient.OAUTH_URL}/authorize?{param_string}"
    
    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, 
                               code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange OAuth code for access token"""
        
        data = {
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }
        
        response = requests.post(f"{EventbriteClient.OAUTH_URL}/token", data=data)
        
        if not response.ok:
            try:
                error_data = response.json()
                error_msg = error_data.get('error_description', error_data.get('error', 'OAuth failed'))
            except ValueError:
                error_msg = f'OAuth failed with status {response.status_code}'
            
            raise EventbriteAPIError(error_msg, response.status_code)
        
        return response.json() 