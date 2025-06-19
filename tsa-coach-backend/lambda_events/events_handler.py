"""
Coach Events Lambda Handler
Handles event management for coaches with Eventbrite integration
"""
import json
import os
import boto3
from typing import Dict, Any, Optional
import logging
import uuid
from datetime import datetime, timezone

# Import shared utilities
import sys
sys.path.append('/opt/python')
from tsa_shared.database import get_dynamodb_table, get_table_name, get_current_timestamp
from tsa_shared.table_models import Event, EventStatus, EventCategory, EventVisibility, TicketType
from user_identifier import UserIdentifier
from lambda_events.event_sync_service import EventSyncService
from lambda_events.eventbrite_client import EventbriteAPIError

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for coach events"""
    try:
        logger.info("Coach events handler called")
        
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        resource = event.get('resource', '')
        
        # Route requests based on method and path
        if http_method == 'GET':
            if '/events/{id}' in resource:
                return get_event_by_id(event)
            elif '/events/{id}/attendees' in resource:
                return get_event_attendees(event)
            elif '/events/{id}/sync' in resource:
                return sync_event_attendees(event)
            else:
                return get_events(event)
        elif http_method == 'POST':
            if '/events/{id}/publish' in resource:
                return publish_event(event)
            elif '/events/{id}/sync' in resource:
                return sync_event_attendees(event)
            else:
                return create_event(event)
        elif http_method == 'PUT':
            return update_event(event)
        elif http_method == 'DELETE':
            return delete_event(event)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in coach events handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def create_cors_response(status_code: int, body: dict) -> dict:
    """Create a CORS-enabled response"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }

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

def get_events(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get events for authenticated coach only"""
    try:
        query_params = event.get('queryStringParameters') or {}
        
        # Check for special timeline status action (can use auth context)
        action = query_params.get('action')
        if action == 'timeline_status':
            return get_timeline_status(event)
        
        # Extract authenticated user from token - NO EMAIL PARAMETERS!
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Fetching events for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping to get coach profile_id
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
        events_table = get_dynamodb_table(get_table_name('events'))
        
        # Query events by authenticated coach using GSI
        response = events_table.query(
            IndexName='coach-events-index',
            KeyConditionExpression='coach_id = :coach_id',
            ExpressionAttributeValues={':coach_id': normalized_coach_id},
            ScanIndexForward=False  # Most recent first
        )
        
        events = response.get('Items', [])
        
        # Transform events for frontend compatibility
        transformed_events = []
        for event_item in events:
            try:
                # Handle legacy events that might not have coach_id
                event_data = event_item.copy()
                if 'coach_id' not in event_data:
                    event_data['coach_id'] = event_data.get('created_by', normalized_coach_id)
                
                event_obj = Event(**event_data)
                transformed_event = transform_event_for_frontend(event_obj)
                transformed_events.append(transformed_event)
            except Exception as e:
                logger.warning(f"Error transforming event {event_item.get('event_id', 'unknown')}: {str(e)}")
                continue
        
        logger.info(f"Retrieved {len(transformed_events)} events for coach {normalized_coach_id}")
        
        return create_cors_response(200, {
            'events': transformed_events,
            'count': len(transformed_events)
        })
        
    except Exception as e:
        logger.error(f"Error getting events: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_timeline_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get timeline status for authenticated coach"""
    try:
        # Extract authenticated user from token
        authenticated_email = extract_user_from_auth_token(event)
        if not authenticated_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        print(f"🔐 Fetching timeline status for authenticated user: {authenticated_email}")
        
        # Use centralized ID mapping
        profiles_table = get_dynamodb_table(get_table_name('profiles'))
        
        try:
            normalized_coach_id = UserIdentifier.normalize_coach_id(authenticated_email, profiles_table)
        except ValueError as e:
            return create_cors_response(404, {'error': str(e)})
        
        # Get coach profile for timeline status
        response = profiles_table.get_item(Key={'profile_id': normalized_coach_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Coach profile not found'})
        
        profile = response['Item']
        
        # Verify the profile belongs to the authenticated user (security check)
        if profile.get('email', '').lower() != authenticated_email:
            print(f"🚨 Security violation: Authenticated user {authenticated_email} tried to access profile {profile.get('email')}")
            return create_cors_response(403, {'error': 'Access denied'})
        
        # Calculate timeline status based on profile completeness and activities
        timeline_status = {
            'profile_complete': bool(profile.get('first_name') and profile.get('last_name') and profile.get('school_name')),
            'onboarding_complete': profile.get('onboarding_completed', False),
            'events_created': 0,  # Will be calculated below
            'invitations_sent': 0,  # Will be calculated below
            'next_steps': []
        }
        
        # Count events created by this coach
        events_table = get_dynamodb_table(get_table_name('events'))
        try:
            events_response = events_table.query(
                IndexName='coach-events-index',
                KeyConditionExpression='coach_id = :coach_id',
                ExpressionAttributeValues={':coach_id': normalized_coach_id},
                Select='COUNT'
            )
            timeline_status['events_created'] = events_response.get('Count', 0)
        except Exception as e:
            logger.warning(f"Error counting events: {str(e)}")
        
        # Count invitations sent by this coach
        try:
                    invitations_table = get_dynamodb_table(get_table_name('parent-invitations'))
        invitations_response = invitations_table.scan(
                FilterExpression='coach_id = :coach_id',
                ExpressionAttributeValues={':coach_id': normalized_coach_id},
                Select='COUNT'
            )
            timeline_status['invitations_sent'] = invitations_response.get('Count', 0)
        except Exception as e:
            logger.warning(f"Error counting invitations: {str(e)}")
        
        # Generate next steps based on current status
        if not timeline_status['profile_complete']:
            timeline_status['next_steps'].append('Complete your profile information')
        
        if timeline_status['events_created'] == 0:
            timeline_status['next_steps'].append('Create your first event')
        
        if timeline_status['invitations_sent'] == 0:
            timeline_status['next_steps'].append('Send your first parent invitation')
        
        return create_cors_response(200, {
            'timeline_status': timeline_status,
            'coach_id': normalized_coach_id
        })
        
    except Exception as e:
        logger.error(f"Error getting timeline status: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_event_by_id(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get a specific event by ID"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        events_table = get_dynamodb_table(get_table_name('events'))
        
        response = events_table.get_item(Key={'event_id': event_id})
        
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Event not found'})
        
        # Handle legacy events that might not have coach_id
        event_data = response['Item']
        if 'coach_id' not in event_data:
            event_data['coach_id'] = event_data.get('created_by', 'unknown')
        
        event_obj = Event(**event_data)
        transformed_event = transform_event_for_frontend(event_obj)
        
        logger.info(f"Retrieved event {event_id}")
        
        return create_cors_response(200, {'event': transformed_event})
        
    except Exception as e:
        logger.error(f"Error getting event: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def create_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new event"""
    try:
        # Parse request body safely
        body = event.get('body')
        if body is None:
            return create_cors_response(400, {'error': 'Request body is required'})
        
        try:
            body = json.loads(body) if isinstance(body, str) else body
        except json.JSONDecodeError:
            return create_cors_response(400, {'error': 'Invalid JSON in request body'})
        
        # Validate required fields
        required_fields = ['title', 'start_date', 'end_date', 'coach_id']
        missing_fields = [field for field in required_fields if not body.get(field)]
        if missing_fields:
            return create_cors_response(400, {
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            })
        
        # Generate event ID
        event_id = f"event_{uuid.uuid4().hex[:12]}"
        
        # Parse and validate ticket types
        ticket_types = []
        for ticket_data in body.get('ticket_types', []):
            try:
                ticket_type = TicketType(**ticket_data)
                ticket_types.append(ticket_type)
            except Exception as e:
                logger.warning(f"Invalid ticket type data: {str(e)}")
                continue
        
        # Create Event object
        event_data = {
            'event_id': event_id,
            'coach_id': body['coach_id'],
            'title': body['title'],
            'description': body.get('description', ''),
            'summary': body.get('summary'),
            'start_date': body['start_date'],
            'end_date': body['end_date'],
            'timezone': body.get('timezone', 'America/Chicago'),
            'venue_name': body.get('venue_name'),
            'address_line_1': body.get('address_line_1'),
            'address_line_2': body.get('address_line_2'),
            'city': body.get('city'),
            'state': body.get('state'),
            'postal_code': body.get('postal_code'),
            'country': body.get('country', 'US'),
            'category': EventCategory(body.get('category', 'training')),
            'subcategory': body.get('subcategory'),
            'tags': body.get('tags', []),
            'status': EventStatus(body.get('status', 'draft')),
            'visibility': EventVisibility(body.get('visibility', 'public')),
            'capacity': body.get('capacity'),
            'registration_deadline': body.get('registration_deadline'),
            'ticket_types': [ticket.dict() for ticket in ticket_types],
            'currency': body.get('currency', 'USD'),
            'refund_policy': body.get('refund_policy'),
            'age_restrictions': body.get('age_restrictions'),
            'requirements': body.get('requirements', []),
            'what_to_bring': body.get('what_to_bring', []),
            'logo_url': body.get('logo_url'),
            'cover_image_url': body.get('cover_image_url'),
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        event_obj = Event(**event_data)
        
        # Save to DynamoDB
        events_table = get_dynamodb_table(get_table_name('events'))
        events_table.put_item(Item=event_obj.dict())
        
        # Sync to Eventbrite if status is published or draft
        sync_service = EventSyncService()
        eventbrite_result = None
        
        try:
            eventbrite_result = sync_service.create_event_on_eventbrite(event_obj.dict())
            logger.info(f"Successfully created event on Eventbrite: {eventbrite_result}")
        except EventbriteAPIError as e:
            logger.warning(f"Eventbrite sync failed for event {event_id}: {str(e)}")
            # Continue - event is still created in TSA even if Eventbrite fails
        except Exception as e:
            logger.warning(f"Unexpected error syncing to Eventbrite: {str(e)}")
        
        # Get updated event with Eventbrite details
        updated_response = events_table.get_item(Key={'event_id': event_id})
        if 'Item' in updated_response:
            # Handle legacy events that might not have coach_id
            event_data = updated_response['Item']
            if 'coach_id' not in event_data:
                event_data['coach_id'] = event_data.get('created_by', body.get('coach_id', 'unknown'))
            
            updated_event = Event(**event_data)
            transformed_event = transform_event_for_frontend(updated_event)
        else:
            transformed_event = transform_event_for_frontend(event_obj)
        
        logger.info(f"Successfully created event {event_id}")
        
        return create_cors_response(201, {
            'message': 'Event created successfully',
            'event': transformed_event,
            'eventbrite_sync': eventbrite_result
        })
        
    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def update_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing event"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        # Parse request body safely
        body = event.get('body')
        if body is None:
            return create_cors_response(400, {'error': 'Request body is required'})
        
        try:
            body = json.loads(body) if isinstance(body, str) else body
        except json.JSONDecodeError:
            return create_cors_response(400, {'error': 'Invalid JSON in request body'})
        events_table = get_dynamodb_table(get_table_name('events'))
        
        # Get existing event
        response = events_table.get_item(Key={'event_id': event_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Event not found'})
        
        # Handle legacy events that might not have coach_id
        event_data = response['Item']
        if 'coach_id' not in event_data:
            # For legacy events, extract coach_id from event_id or set a default
            event_data['coach_id'] = event_data.get('created_by', 'unknown')
        
        existing_event = Event(**event_data)
        
        # Build update expression dynamically
        update_expressions = []
        expression_values = {}
        expression_names = {}
        
        updatable_fields = {
            'title': 'title',
            'description': 'description',
            'summary': 'summary',
            'start_date': 'start_date',
            'end_date': 'end_date',
            'timezone': 'timezone',
            'venue_name': 'venue_name',
            'address_line_1': 'address_line_1',
            'address_line_2': 'address_line_2',
            'city': 'city',
            'state': 'state',
            'postal_code': 'postal_code',
            'country': 'country',
            'category': 'category',
            'subcategory': 'subcategory',
            'tags': 'tags',
            'status': '#status',  # Reserved word
            'visibility': 'visibility',
            'capacity': 'capacity',
            'registration_deadline': 'registration_deadline',
            'ticket_types': 'ticket_types',
            'currency': 'currency',
            'refund_policy': 'refund_policy',
            'age_restrictions': 'age_restrictions',
            'requirements': 'requirements',
            'what_to_bring': 'what_to_bring',
            'logo_url': 'logo_url',
            'cover_image_url': 'cover_image_url'
        }
        
        for field, db_field in updatable_fields.items():
            if field in body:
                if db_field.startswith('#'):
                    # Handle reserved words
                    attr_name = db_field
                    expression_names[attr_name] = field
                    update_expressions.append(f'{attr_name} = :{field}')
                else:
                    update_expressions.append(f'{db_field} = :{field}')
                expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_cors_response(400, {'error': 'No valid fields to update'})
        
        # Always update the updated_at timestamp
        update_expressions.append('updated_at = :updated_at')
        expression_values[':updated_at'] = get_current_timestamp()
        
        # Update in DynamoDB
        update_expression = 'SET ' + ', '.join(update_expressions)
        
        update_kwargs = {
            'Key': {'event_id': event_id},
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expression_names:
            update_kwargs['ExpressionAttributeNames'] = expression_names
        
        response = events_table.update_item(**update_kwargs)
        
        # Handle legacy events that might not have coach_id
        event_data = response['Attributes']
        if 'coach_id' not in event_data:
            event_data['coach_id'] = event_data.get('created_by', 'unknown')
        
        updated_event = Event(**event_data)
        
        # Sync to Eventbrite if event has Eventbrite integration
        sync_service = EventSyncService()
        eventbrite_result = None
        
        if updated_event.eventbrite.eventbrite_event_id:
            try:
                eventbrite_result = sync_service.update_event_on_eventbrite(updated_event.dict())
                logger.info(f"Successfully updated event on Eventbrite: {eventbrite_result}")
            except EventbriteAPIError as e:
                logger.warning(f"Eventbrite sync failed for event {event_id}: {str(e)}")
            except Exception as e:
                logger.warning(f"Unexpected error syncing to Eventbrite: {str(e)}")
        
        transformed_event = transform_event_for_frontend(updated_event)
        
        logger.info(f"Successfully updated event {event_id}")
        
        return create_cors_response(200, {
            'message': 'Event updated successfully',
            'event': transformed_event,
            'eventbrite_sync': eventbrite_result
        })
        
    except Exception as e:
        logger.error(f"Error updating event: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def delete_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Delete/cancel an event"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        # Cancel on Eventbrite first
        sync_service = EventSyncService()
        eventbrite_result = None
        
        try:
            eventbrite_result = sync_service.cancel_event_on_eventbrite(event_id)
            logger.info(f"Successfully cancelled event on Eventbrite: {eventbrite_result}")
        except EventbriteAPIError as e:
            logger.warning(f"Eventbrite cancellation failed for event {event_id}: {str(e)}")
        except Exception as e:
            logger.warning(f"Unexpected error cancelling on Eventbrite: {str(e)}")
        
        # Update status to cancelled in TSA (don't actually delete)
        events_table = get_dynamodb_table(get_table_name('events'))
        
        events_table.update_item(
            Key={'event_id': event_id},
            UpdateExpression='SET #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': EventStatus.CANCELLED,
                ':now': get_current_timestamp()
            }
        )
        
        logger.info(f"Successfully cancelled event {event_id}")
        
        return create_cors_response(200, {
            'message': 'Event cancelled successfully',
            'eventbrite_sync': eventbrite_result
        })
        
    except Exception as e:
        logger.error(f"Error cancelling event: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def publish_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Publish an event on Eventbrite"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        sync_service = EventSyncService()
        
        try:
            result = sync_service.publish_event_on_eventbrite(event_id)
            logger.info(f"Successfully published event on Eventbrite: {result}")
            
            return create_cors_response(200, {
                'message': 'Event published successfully on Eventbrite',
                'result': result
            })
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite publish failed for event {event_id}: {str(e)}")
            return create_cors_response(400, {'error': f'Failed to publish on Eventbrite: {str(e)}'})
        except Exception as e:
            logger.error(f"Error publishing event: {str(e)}")
            return create_cors_response(500, {'error': str(e)})
        
    except Exception as e:
        logger.error(f"Error in publish event handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_event_attendees(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get attendees for an event"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        attendees_table = get_dynamodb_table(get_table_name('event-attendees'))
        
        response = attendees_table.query(
            IndexName='event-attendees-index',
            KeyConditionExpression='event_id = :event_id',
            ExpressionAttributeValues={':event_id': event_id}
        )
        
        attendees = response.get('Items', [])
        
        logger.info(f"Retrieved {len(attendees)} attendees for event {event_id}")
        
        return create_cors_response(200, {
            'attendees': attendees,
            'count': len(attendees)
        })
        
    except Exception as e:
        logger.error(f"Error getting event attendees: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def sync_event_attendees(event: Dict[str, Any]) -> Dict[str, Any]:
    """Sync attendees from Eventbrite"""
    try:
        path_params = event.get('pathParameters') or {}
        event_id = path_params.get('id')
        
        if not event_id:
            return create_cors_response(400, {'error': 'event_id is required'})
        
        sync_service = EventSyncService()
        
        try:
            result = sync_service.sync_event_attendees(event_id)
            logger.info(f"Successfully synced attendees for event {event_id}: {result}")
            
            return create_cors_response(200, {
                'message': 'Attendees synced successfully',
                'result': result
            })
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite attendee sync failed for event {event_id}: {str(e)}")
            return create_cors_response(400, {'error': f'Failed to sync from Eventbrite: {str(e)}'})
        except Exception as e:
            logger.error(f"Error syncing attendees: {str(e)}")
            return create_cors_response(500, {'error': str(e)})
        
    except Exception as e:
        logger.error(f"Error in sync attendees handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def transform_event_for_frontend(event: Event) -> Dict[str, Any]:
    """Transform Event object to frontend-compatible format"""
    
    # Convert to dict and ensure compatibility with existing frontend
    event_dict = event.dict()
    
    # Map new fields to frontend expected fields for backward compatibility
    frontend_event = {
        'event_id': event_dict['event_id'],
        'title': event_dict['title'],
        'description': event_dict['description'],
        'start_date': event_dict['start_date'],
        'end_date': event_dict['end_date'],
        'location': event_dict.get('venue_name', ''),
        'street': event_dict.get('address_line_1', ''),
        'city': event_dict.get('city', ''),
        'state': event_dict.get('state', ''),
        'zip': event_dict.get('postal_code', ''),
        'category': event_dict['category'],
        'subcategory': event_dict.get('subcategory', ''),
        'max_participants': event_dict.get('capacity'),
        'current_participants': event_dict.get('current_registrations', 0),
        'cost': float(event_dict['ticket_types'][0]['cost']) if event_dict.get('ticket_types') else 0.0,
        'registration_deadline': event_dict.get('registration_deadline'),
        'is_public': event_dict['visibility'] == 'public',
        'status': event_dict['status'],
        'tags': event_dict.get('tags', []),
        'requirements': event_dict.get('requirements', []),
        'photos': [],  # TODO: Implement photo management
        'created_by': event_dict['coach_id'],
        'created_at': event_dict['created_at'],
        'updated_at': event_dict['updated_at'],
        
        # Add Eventbrite-specific fields
        'eventbrite_event_id': event_dict.get('eventbrite', {}).get('eventbrite_event_id'),
        'eventbrite_url': event_dict.get('eventbrite', {}).get('eventbrite_url'),
        'eventbrite_status': event_dict.get('eventbrite', {}).get('eventbrite_status'),
        'last_synced': event_dict.get('eventbrite', {}).get('last_synced'),
        
        # Include all original fields for full functionality
        **event_dict
    }
    
    return frontend_event 