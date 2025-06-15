"""
Event Sync Service
Handles synchronization between TSA and Eventbrite events
"""
import json
import os
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime, timezone

# Import shared utilities
import sys
sys.path.append('/opt/python')
from tsa_shared.database import get_dynamodb_table, get_table_name, get_current_timestamp
from shared_utils.dynamodb_models import (
    Event, EventbriteConfig, EventbriteOAuthStatus, EventAttendee,
    EventStatus, AttendeeStatus, TicketType
)
from lambda_events.eventbrite_client import EventbriteClient, EventbriteAPIError, EventbriteCredentials

logger = logging.getLogger(__name__)


class EventSyncService:
    """Service for syncing events between TSA and Eventbrite"""
    
    def __init__(self):
        self.events_table = get_dynamodb_table(get_table_name('events'))
        self.config_table = get_dynamodb_table(get_table_name('eventbrite-config'))
        self.attendees_table = get_dynamodb_table(get_table_name('event-attendees'))
    
    def get_coach_eventbrite_client(self, coach_id: str) -> Optional[EventbriteClient]:
        """Get authenticated Eventbrite client for a coach"""
        try:
            response = self.config_table.get_item(Key={'coach_id': coach_id})
            if 'Item' not in response:
                logger.warning(f"No Eventbrite config found for coach {coach_id}")
                return None
            
            config = EventbriteConfig(**response['Item'])
            
            if config.oauth_status != EventbriteOAuthStatus.CONNECTED:
                logger.warning(f"Eventbrite not connected for coach {coach_id}")
                return None
            
            # Check if token is expired
            if config.token_expires_at:
                expires_at = datetime.fromisoformat(config.token_expires_at)
                if datetime.now(timezone.utc) >= expires_at:
                    logger.warning(f"Eventbrite token expired for coach {coach_id}")
                    return None
            
            # Decrypt token (placeholder - implement proper decryption)
            access_token = config.access_token
            
            credentials = EventbriteCredentials(access_token=access_token)
            return EventbriteClient(credentials)
        
        except Exception as e:
            logger.error(f"Error getting Eventbrite client for coach {coach_id}: {str(e)}")
            return None
    
    def create_event_on_eventbrite(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an event on Eventbrite and update TSA event with Eventbrite details"""
        try:
            coach_id = event_data['coach_id']
            event_id = event_data['event_id']
            
            # Get Eventbrite client
            eventbrite_client = self.get_coach_eventbrite_client(coach_id)
            if not eventbrite_client:
                raise Exception("Eventbrite not connected or token expired")
            
            # Create event on Eventbrite
            eventbrite_response = eventbrite_client.create_event(event_data)
            eventbrite_event_id = eventbrite_response['id']
            eventbrite_url = eventbrite_response['url']
            
            # Create ticket classes if specified
            if event_data.get('ticket_types'):
                eventbrite_client.create_ticket_classes(eventbrite_event_id, event_data['ticket_types'])
            
            # Auto-publish if enabled in coach settings
            config_response = self.config_table.get_item(Key={'coach_id': coach_id})
            if 'Item' in config_response:
                config = EventbriteConfig(**config_response['Item'])
                if config.auto_publish_events:
                    eventbrite_client.publish_event(eventbrite_event_id)
            
            # Update TSA event with Eventbrite details
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET eventbrite.eventbrite_event_id = :eb_id,
                        eventbrite.eventbrite_url = :eb_url,
                        eventbrite.eventbrite_status = :eb_status,
                        eventbrite.last_synced = :now,
                        updated_at = :now
                ''',
                ExpressionAttributeValues={
                    ':eb_id': eventbrite_event_id,
                    ':eb_url': eventbrite_url,
                    ':eb_status': eventbrite_response.get('status', 'draft'),
                    ':now': get_current_timestamp()
                }
            )
            
            logger.info(f"Successfully created Eventbrite event {eventbrite_event_id} for TSA event {event_id}")
            
            return {
                'success': True,
                'eventbrite_event_id': eventbrite_event_id,
                'eventbrite_url': eventbrite_url,
                'eventbrite_status': eventbrite_response.get('status', 'draft')
            }
        
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite API error creating event: {str(e)}")
            self._update_sync_error(event_data['event_id'], str(e))
            raise
        except Exception as e:
            logger.error(f"Error creating event on Eventbrite: {str(e)}")
            self._update_sync_error(event_data['event_id'], str(e))
            raise
    
    def update_event_on_eventbrite(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing event on Eventbrite"""
        try:
            coach_id = event_data['coach_id']
            event_id = event_data['event_id']
            eventbrite_event_id = event_data.get('eventbrite', {}).get('eventbrite_event_id')
            
            if not eventbrite_event_id:
                raise Exception("No Eventbrite event ID found - cannot update")
            
            # Get Eventbrite client
            eventbrite_client = self.get_coach_eventbrite_client(coach_id)
            if not eventbrite_client:
                raise Exception("Eventbrite not connected or token expired")
            
            # Update event on Eventbrite
            eventbrite_response = eventbrite_client.update_event(eventbrite_event_id, event_data)
            
            # Update TSA event sync status
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET eventbrite.eventbrite_status = :eb_status,
                        eventbrite.last_synced = :now,
                        updated_at = :now
                ''',
                ExpressionAttributeValues={
                    ':eb_status': eventbrite_response.get('status', 'draft'),
                    ':now': get_current_timestamp()
                }
            )
            
            logger.info(f"Successfully updated Eventbrite event {eventbrite_event_id}")
            
            return {
                'success': True,
                'eventbrite_event_id': eventbrite_event_id,
                'eventbrite_status': eventbrite_response.get('status', 'draft')
            }
        
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite API error updating event: {str(e)}")
            self._update_sync_error(event_data['event_id'], str(e))
            raise
        except Exception as e:
            logger.error(f"Error updating event on Eventbrite: {str(e)}")
            self._update_sync_error(event_data['event_id'], str(e))
            raise
    
    def cancel_event_on_eventbrite(self, event_id: str) -> Dict[str, Any]:
        """Cancel an event on Eventbrite"""
        try:
            # Get TSA event
            response = self.events_table.get_item(Key={'event_id': event_id})
            if 'Item' not in response:
                raise Exception("Event not found")
            
            event_data = response['Item']
            coach_id = event_data['coach_id']
            eventbrite_event_id = event_data.get('eventbrite', {}).get('eventbrite_event_id')
            
            if not eventbrite_event_id:
                logger.warning(f"No Eventbrite event ID found for event {event_id}")
                return {'success': True, 'message': 'No Eventbrite event to cancel'}
            
            # Get Eventbrite client
            eventbrite_client = self.get_coach_eventbrite_client(coach_id)
            if not eventbrite_client:
                raise Exception("Eventbrite not connected or token expired")
            
            # Cancel event on Eventbrite
            eventbrite_client.cancel_event(eventbrite_event_id)
            
            # Update TSA event status
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET #status = :status,
                        eventbrite.eventbrite_status = :eb_status,
                        eventbrite.last_synced = :now,
                        updated_at = :now
                ''',
                ExpressionAttributeNames={
                    '#status': 'status'  # 'status' is a reserved word
                },
                ExpressionAttributeValues={
                    ':status': EventStatus.CANCELLED,
                    ':eb_status': 'cancelled',
                    ':now': get_current_timestamp()
                }
            )
            
            logger.info(f"Successfully cancelled Eventbrite event {eventbrite_event_id}")
            
            return {
                'success': True,
                'eventbrite_event_id': eventbrite_event_id,
                'message': 'Event cancelled on Eventbrite'
            }
        
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite API error cancelling event: {str(e)}")
            self._update_sync_error(event_id, str(e))
            raise
        except Exception as e:
            logger.error(f"Error cancelling event on Eventbrite: {str(e)}")
            self._update_sync_error(event_id, str(e))
            raise
    
    def sync_event_attendees(self, event_id: str) -> Dict[str, Any]:
        """Sync attendees from Eventbrite to TSA"""
        try:
            # Get TSA event
            response = self.events_table.get_item(Key={'event_id': event_id})
            if 'Item' not in response:
                raise Exception("Event not found")
            
            event_data = response['Item']
            coach_id = event_data['coach_id']
            eventbrite_event_id = event_data.get('eventbrite', {}).get('eventbrite_event_id')
            
            if not eventbrite_event_id:
                raise Exception("No Eventbrite event ID found")
            
            # Get Eventbrite client
            eventbrite_client = self.get_coach_eventbrite_client(coach_id)
            if not eventbrite_client:
                raise Exception("Eventbrite not connected or token expired")
            
            # Get attendees from Eventbrite
            eventbrite_attendees = eventbrite_client.get_all_event_attendees(eventbrite_event_id)
            
            synced_count = 0
            errors = []
            
            for eb_attendee in eventbrite_attendees:
                try:
                    # Transform Eventbrite attendee to TSA format
                    tsa_attendee = self._transform_eventbrite_attendee(eb_attendee, event_id)
                    
                    # Upsert attendee in TSA
                    self.attendees_table.put_item(Item=tsa_attendee.dict())
                    synced_count += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing attendee {eb_attendee.get('id', 'unknown')}: {str(e)}")
                    errors.append(str(e))
            
            # Update event with registration count
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET current_registrations = :count,
                        eventbrite.last_synced = :now,
                        updated_at = :now
                ''',
                ExpressionAttributeValues={
                    ':count': synced_count,
                    ':now': get_current_timestamp()
                }
            )
            
            logger.info(f"Successfully synced {synced_count} attendees for event {event_id}")
            
            return {
                'success': True,
                'synced_count': synced_count,
                'total_attendees': len(eventbrite_attendees),
                'errors': errors
            }
        
        except Exception as e:
            logger.error(f"Error syncing attendees for event {event_id}: {str(e)}")
            self._update_sync_error(event_id, str(e))
            raise
    
    def _transform_eventbrite_attendee(self, eb_attendee: Dict[str, Any], event_id: str) -> EventAttendee:
        """Transform Eventbrite attendee data to TSA format"""
        
        # Extract attendee information
        profile = eb_attendee.get('profile', {})
        costs = eb_attendee.get('costs', {})
        ticket_class = eb_attendee.get('ticket_class', {})
        
        # Map status
        status_mapping = {
            'Attending': AttendeeStatus.ATTENDING,
            'Not Attending': AttendeeStatus.NOT_ATTENDING,
            'Checked In': AttendeeStatus.CHECKED_IN,
            'Cancelled': AttendeeStatus.CANCELLED,
            'Refunded': AttendeeStatus.REFUNDED
        }
        
        eb_status = eb_attendee.get('status', 'Attending')
        tsa_status = status_mapping.get(eb_status, AttendeeStatus.ATTENDING)
        
        # Extract registration answers
        answers = {}
        for answer in eb_attendee.get('answers', []):
            question = answer.get('question', '')
            response = answer.get('answer', '')
            if question and response:
                answers[question] = response
        
        return EventAttendee(
            attendee_id=eb_attendee['id'],
            event_id=event_id,
            first_name=profile.get('first_name', ''),
            last_name=profile.get('last_name', ''),
            email=profile.get('email', ''),
            ticket_class_name=ticket_class.get('name', 'General Admission'),
            order_id=eb_attendee.get('order_id', ''),
            cost=float(costs.get('gross', {}).get('value', 0)) / 100,  # Convert cents to dollars
            currency=costs.get('gross', {}).get('currency', 'USD'),
            status=tsa_status,
            checked_in=eb_attendee.get('checked_in', False),
            check_in_time=eb_attendee.get('checked_in_at'),
            registration_answers=answers,
            eventbrite_created=eb_attendee.get('created'),
            last_synced=get_current_timestamp()
        )
    
    def _update_sync_error(self, event_id: str, error_message: str):
        """Update event with sync error"""
        try:
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET eventbrite.sync_errors = list_append(
                        if_not_exists(eventbrite.sync_errors, :empty_list), 
                        :error
                    ),
                    eventbrite.last_synced = :now,
                    updated_at = :now
                ''',
                ExpressionAttributeValues={
                    ':empty_list': [],
                    ':error': [f"{get_current_timestamp()}: {error_message}"],
                    ':now': get_current_timestamp()
                }
            )
        except Exception as e:
            logger.error(f"Error updating sync error for event {event_id}: {str(e)}")
    
    def publish_event_on_eventbrite(self, event_id: str) -> Dict[str, Any]:
        """Publish an event on Eventbrite"""
        try:
            # Get TSA event
            response = self.events_table.get_item(Key={'event_id': event_id})
            if 'Item' not in response:
                raise Exception("Event not found")
            
            event_data = response['Item']
            coach_id = event_data['coach_id']
            eventbrite_event_id = event_data.get('eventbrite', {}).get('eventbrite_event_id')
            
            if not eventbrite_event_id:
                raise Exception("No Eventbrite event ID found")
            
            # Get Eventbrite client
            eventbrite_client = self.get_coach_eventbrite_client(coach_id)
            if not eventbrite_client:
                raise Exception("Eventbrite not connected or token expired")
            
            # Publish event on Eventbrite
            eventbrite_response = eventbrite_client.publish_event(eventbrite_event_id)
            
            # Update TSA event status
            self.events_table.update_item(
                Key={'event_id': event_id},
                UpdateExpression='''
                    SET #status = :status,
                        eventbrite.eventbrite_status = :eb_status,
                        eventbrite.last_synced = :now,
                        published_at = :now,
                        updated_at = :now
                ''',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': EventStatus.PUBLISHED,
                    ':eb_status': 'live',
                    ':now': get_current_timestamp()
                }
            )
            
            logger.info(f"Successfully published Eventbrite event {eventbrite_event_id}")
            
            return {
                'success': True,
                'eventbrite_event_id': eventbrite_event_id,
                'message': 'Event published on Eventbrite'
            }
        
        except EventbriteAPIError as e:
            logger.error(f"Eventbrite API error publishing event: {str(e)}")
            self._update_sync_error(event_id, str(e))
            raise
        except Exception as e:
            logger.error(f"Error publishing event on Eventbrite: {str(e)}")
            self._update_sync_error(event_id, str(e))
            raise 