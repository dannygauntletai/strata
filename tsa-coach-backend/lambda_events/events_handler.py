"""
Lambda handler for events CRUD operations
"""
import json
import os
import base64
import uuid
import boto3
from typing import Dict, Any, List
from urllib.parse import parse_qs
from datetime import datetime, timezone
import random
import string

# Try to import shared_utils, fall back to inline implementations if not available
try:
    from shared_utils import (
        create_response, get_dynamodb_table, parse_event_body,
        get_current_timestamp, validate_required_fields, get_path_parameters
    )
    SHARED_UTILS_AVAILABLE = True
except ImportError:
    SHARED_UTILS_AVAILABLE = False
    print("Warning: shared_utils not available, using inline implementations")
    
    # Inline utility functions as fallback
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
    
    def get_dynamodb_table(table_name: str):
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    
    def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
        try:
            body = event.get('body', '{}')
            if isinstance(body, str):
                return json.loads(body) if body else {}
            return body if isinstance(body, dict) else {}
        except Exception:
            return {}
    
    def get_current_timestamp() -> str:
        return datetime.utcnow().isoformat() + 'Z'
    
    def validate_required_fields(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
        missing_fields = [field for field in fields if field not in data or not data[field]]
        if missing_fields:
            return {
                'valid': False,
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }
        return {'valid': True}
    
    def get_path_parameters(event: Dict[str, Any]) -> Dict[str, Any]:
        return event.get('pathParameters') or {}

# Initialize S3 client
s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('TSA_EVENTS_PHOTOS_BUCKET', os.environ.get('EVENTS_PHOTOS_BUCKET', 'tsa-events-photos'))

def parse_multipart_form_data(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse multipart form data from API Gateway event"""
    try:
        print(f"🔍 Raw event keys: {list(event.keys())}")
        print(f"🔍 Headers: {event.get('headers', {})}")
        print(f"🔍 IsBase64Encoded: {event.get('isBase64Encoded', False)}")
        
        content_type = event.get('headers', {}).get('content-type', '') or event.get('headers', {}).get('Content-Type', '')
        print(f"🔍 Content-Type: {content_type}")
        
        body = event.get('body', '')
        print(f"🔍 Body type: {type(body)}, length: {len(body) if body else 0}")
        print(f"🔍 Body preview: {str(body)[:200]}...")
        
        # API Gateway specific handling
        if event.get('isBase64Encoded', False):
            print("🔄 Decoding base64 body...")
            body = base64.b64decode(body).decode('utf-8', errors='ignore')
            print(f"🔍 Decoded body preview: {str(body)[:200]}...")
        
        # Check if this is multipart form data
        if 'multipart/form-data' not in content_type:
            print("❌ Not multipart form data, trying JSON fallback")
            return {'form_data': {}, 'files': []}
        
        # Extract boundary from content-type header
        boundary = None
        for part in content_type.split(';'):
            part = part.strip()
            if part.startswith('boundary='):
                boundary = part.split('boundary=')[1].strip('\'"')
                break
        
        if not boundary:
            print("❌ No boundary found in content-type")
            return {'form_data': {}, 'files': []}
        
        print(f"🔍 Boundary: {boundary}")
        
        # Split by boundary
        boundary_delimiter = f'--{boundary}'
        parts = body.split(boundary_delimiter)
        print(f"🔍 Found {len(parts)} parts")
        
        form_data = {}
        files = []
        
        for i, part in enumerate(parts):
            if not part.strip() or part.strip() == '--':
                continue
                
            print(f"🔍 Processing part {i}: {part[:100]}...")
            
            # Split headers and content
            if '\r\n\r\n' in part:
                headers_section, content = part.split('\r\n\r\n', 1)
            elif '\n\n' in part:
                headers_section, content = part.split('\n\n', 1)
            else:
                print(f"❌ Part {i}: No content separator found")
                continue
            
            # Clean up content (remove trailing boundary markers)
            content = content.rstrip('\r\n-')
            
            # Parse headers
            headers = {}
            for line in headers_section.split('\r\n'):
                line = line.strip()
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip().lower()] = value.strip()
            
            print(f"🔍 Part {i} headers: {headers}")
            
            # Parse Content-Disposition
            disposition = headers.get('content-disposition', '')
            name = None
            filename = None
            
            # Parse form field name and filename
            for disp_part in disposition.split(';'):
                disp_part = disp_part.strip()
                if disp_part.startswith('name='):
                    name = disp_part.split('name=')[1].strip('\'"')
                elif disp_part.startswith('filename='):
                    filename = disp_part.split('filename=')[1].strip('\'"')
            
            print(f"🔍 Part {i}: name='{name}', filename='{filename}', content length={len(content)}")
            
            if name:
                if filename:  # File upload
                    files.append({
                        'name': name,
                        'filename': filename,
                        'content': content,
                        'content_type': headers.get('content-type', 'application/octet-stream')
                    })
                    print(f"📎 Added file: {name} -> {filename}")
                else:  # Form field
                    if name == 'event_data':
                        # This should be JSON data
                        try:
                            parsed_json = json.loads(content)
                            form_data.update(parsed_json)
                            print(f"✅ Successfully parsed event_data JSON with keys: {list(parsed_json.keys())}")
                            print(f"🔍 Parsed values: title='{parsed_json.get('title')}', description='{parsed_json.get('description')}', created_by='{parsed_json.get('created_by')}'")
                        except json.JSONDecodeError as e:
                            print(f"❌ Failed to parse event_data as JSON: {e}")
                            print(f"🔍 Raw content: {content[:500]}")
                            form_data[name] = content
                    else:
                        form_data[name] = content
                        print(f"📝 Added form field: {name} = {content[:50]}...")
        
        print(f"📋 Final parsing result:")
        print(f"   - form_data keys: {list(form_data.keys())}")
        print(f"   - files count: {len(files)}")
        print(f"   - Required fields present: title={form_data.get('title') is not None}, description={form_data.get('description') is not None}, start_date={form_data.get('start_date') is not None}, end_date={form_data.get('end_date') is not None}, created_by={form_data.get('created_by') is not None}")
        
        return {'form_data': form_data, 'files': files}
        
    except Exception as e:
        print(f"❌ Error parsing multipart data: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'form_data': {}, 'files': []}

def upload_photo_to_s3(file_content: str, filename: str, event_id: str) -> str:
    """Upload photo to S3 and return the URL"""
    try:
        # Generate unique filename
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        unique_filename = f"events/{event_id}/photos/{uuid.uuid4()}.{file_extension}"
        
        # Convert content to bytes (assuming it's base64 or raw content)
        if isinstance(file_content, str):
            # Try to decode as base64 first
            try:
                file_bytes = base64.b64decode(file_content)
            except:
                # If that fails, encode as UTF-8
                file_bytes = file_content.encode('utf-8')
        else:
            file_bytes = file_content
        
        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=unique_filename,
            Body=file_bytes,
            ContentType='image/jpeg',  # Default to JPEG
            CacheControl='max-age=31536000'  # 1 year cache
        )
        
        # Return the S3 URL
        return f"https://{BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"
        
    except Exception as e:
        print(f"Error uploading photo to S3: {str(e)}")
        raise

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for event requests"""
    try:
        http_method = event.get('httpMethod', '')
        path_params = get_path_parameters(event)
        resource_path = event.get('resource', event.get('path', ''))
        query_params = event.get('queryStringParameters') or {}
        
        # Check for timeline status endpoint
        if query_params.get('action') == 'timeline_status' and http_method == 'GET':
            return get_timeline_status(event)
        
        # Check if timeline status is requested via dedicated route
        if resource_path == '/timeline/status' and http_method == 'GET':
            return get_timeline_status(event)
        
        # Handle RSVP endpoints
        if '/rsvp' in resource_path:
            if http_method == 'GET' and 'event_id' in path_params:
                return list_event_rsvps(path_params['event_id'])
            elif http_method == 'POST' and 'event_id' in path_params:
                return create_event_rsvp(path_params['event_id'], event)
            elif http_method == 'PUT' and path_params.get('rsvp_id'):
                return update_rsvp_status(path_params['rsvp_id'], event)
            elif http_method == 'OPTIONS':
                # Handle CORS preflight requests
                return create_response(200, {'message': 'CORS preflight'})
            else:
                return create_response(400, {'error': 'Invalid RSVP endpoint'})
        
        # Handle standard event endpoints
        if http_method == 'GET':
            if 'event_id' in path_params:
                return get_event(path_params['event_id'])
            else:
                return list_events(event)
        elif http_method == 'POST':
            return create_event(event)
        elif http_method == 'PUT':
            if 'event_id' in path_params:
                return update_event(path_params['event_id'], event)
            else:
                return create_response(400, {'error': 'Event ID required for update'})
        elif http_method == 'DELETE':
            if 'event_id' in path_params:
                return delete_event(path_params['event_id'])
            else:
                return create_response(400, {'error': 'Event ID required for deletion'})
        elif http_method == 'OPTIONS':
            # Handle CORS preflight requests for all other endpoints
            return create_response(200, {'message': 'CORS preflight'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in events handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def create_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new event with optional photo uploads"""
    try:
        print(f"🔍 Received event: {json.dumps(event, default=str)[:500]}...")
        
        # Try multiple parsing approaches
        body = {}
        files = []
        
        # Approach 1: Try multipart form data parsing
        try:
            parsed_data = parse_multipart_form_data(event)
            body = parsed_data.get('form_data', {})
            files = parsed_data.get('files', [])
            print(f"📋 Multipart parsing result - body keys: {list(body.keys())}, files: {len(files)}")
        except Exception as e:
            print(f"❌ Multipart parsing failed: {e}")
            
        # Approach 2: If multipart parsing didn't work, try direct JSON parsing
        if not body:
            try:
                body = parse_event_body(event)
                print(f"📋 JSON parsing result - body keys: {list(body.keys())}")
            except Exception as e:
                print(f"❌ JSON parsing failed: {e}")
        
        # Approach 3: If still no body, try extracting from raw body
        if not body:
            try:
                raw_body = event.get('body', '')
                if raw_body:
                    # Check if it's URL-encoded form data
                    if 'event_data=' in raw_body:
                        import urllib.parse
                        parsed = urllib.parse.parse_qs(raw_body)
                        if 'event_data' in parsed:
                            body = json.loads(parsed['event_data'][0])
                            print(f"📋 URL-encoded parsing result - body keys: {list(body.keys())}")
                    else:
                        body = json.loads(raw_body)
                        print(f"📋 Raw JSON parsing result - body keys: {list(body.keys())}")
            except Exception as e:
                print(f"❌ Raw parsing failed: {e}")
        
        print(f"📋 Final body keys: {list(body.keys())}")
        print(f"📋 Required fields check: title='{body.get('title')}', description='{body.get('description')}', start_date='{body.get('start_date')}', end_date='{body.get('end_date')}', created_by='{body.get('created_by')}'")
        
        # Validate required fields
        required_fields = ['title', 'description', 'start_date', 'end_date', 'created_by']
        validation_result = validate_required_fields(body, required_fields)
        if not validation_result.get('valid', True):
            error_msg = validation_result.get('error', 'Validation failed')
            print(f"❌ Validation failed: {error_msg}")
            return create_response(400, {'error': error_msg})
        
        # Validate date format and logic
        try:
            start_date = datetime.fromisoformat(body['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(body['end_date'].replace('Z', '+00:00'))
            
            if end_date <= start_date:
                return create_response(400, {'error': 'End date must be after start date'})
                
        except ValueError as e:
            print(f"❌ Date parsing error: {e}")
            return create_response(400, {'error': 'Invalid date format. Use ISO format.'})
        
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events-v3-dev')))
        
        # Generate a cleaner event ID: YYYYMMDD-HHMMSS-XXX (random 3 chars)
        now = datetime.utcnow()
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=3))
        event_id = f"{now.strftime('%Y%m%d-%H%M%S')}-{random_suffix}"
        
        # Upload photos to S3
        photo_urls = []
        for file_info in files:
            if file_info['name'].startswith('photo_') and file_info['filename']:
                try:
                    photo_url = upload_photo_to_s3(
                        file_info['content'], 
                        file_info['filename'], 
                        event_id
                    )
                    photo_urls.append({
                        'url': photo_url,
                        'filename': file_info['filename'],
                        'uploaded_at': get_current_timestamp()
                    })
                except Exception as e:
                    print(f"Failed to upload photo {file_info['filename']}: {str(e)}")
                    # Continue with other photos
        
        event_data = {
            'event_id': event_id,
            'title': body['title'],
            'description': body['description'],
            'start_date': body['start_date'],
            'end_date': body['end_date'],
            'created_by': body['created_by'],
            'location': body.get('location', ''),
            'street': body.get('street', ''),
            'city': body.get('city', ''),
            'state': body.get('state', ''),
            'zip': body.get('zip', ''),
            'category': body.get('category', ''),
            'subcategory': body.get('subcategory', ''),
            'max_participants': body.get('max_participants', None),
            'current_participants': 0,
            'registration_deadline': body.get('registration_deadline', body['start_date']),
            'is_public': body.get('is_public', True),
            'status': 'scheduled',
            'tags': body.get('tags', []),
            'requirements': body.get('requirements', []),
            'cost': body.get('cost', 0.0),
            'photos': photo_urls,
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        print(f"💾 Saving event to DynamoDB: {event_data['event_id']}")
        events_table.put_item(Item=event_data)
        
        print(f"✅ Event created successfully: {event_data['event_id']}")
        return create_response(201, {
            'message': 'Event created successfully',
            'event': event_data,
            'photos_uploaded': len(photo_urls)
        })
        
    except Exception as e:
        print(f"❌ Error creating event: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Failed to create event'})


def get_event(event_id: str) -> Dict[str, Any]:
    """Get a specific event by ID"""
    try:
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        
        response = events_table.get_item(Key={'event_id': event_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Event not found'})
        
        event_data = response['Item']
        
        # Get event registrations count
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        registrations_response = registrations_table.query(
            IndexName='event-id-index',
            KeyConditionExpression='event_id = :event_id',
            ExpressionAttributeValues={':event_id': event_id},
            Select='COUNT'
        )
        
        event_data['current_participants'] = registrations_response['Count']
        
        return create_response(200, {'event': event_data})
        
    except Exception as e:
        print(f"Error getting event: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve event'})


def list_events(event: Dict[str, Any]) -> Dict[str, Any]:
    """List events with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        created_by = query_params.get('created_by')
        category = query_params.get('category')
        subcategory = query_params.get('subcategory')
        status = query_params.get('status')
        upcoming_only = query_params.get('upcoming_only', 'false').lower() == 'true'
        public_only = query_params.get('public_only', 'false').lower() == 'true'
        
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        
        # Build filter expression
        filter_expressions = []
        expression_values = {}
        expression_names = {}
        
        if created_by:
            filter_expressions.append('created_by = :created_by')
            expression_values[':created_by'] = created_by
        
        if category:
            filter_expressions.append('category = :category')
            expression_values[':category'] = category
        
        if subcategory:
            filter_expressions.append('subcategory = :subcategory')
            expression_values[':subcategory'] = subcategory
        
        if status:
            filter_expressions.append('#status = :status')
            expression_values[':status'] = status
            expression_names['#status'] = 'status'
        
        if public_only:
            filter_expressions.append('is_public = :is_public')
            expression_values[':is_public'] = True
        
        if upcoming_only:
            current_time = datetime.utcnow().isoformat()
            filter_expressions.append('start_date > :current_time')
            expression_values[':current_time'] = current_time
        
        scan_kwargs = {}
        if filter_expressions:
            scan_kwargs['FilterExpression'] = ' AND '.join(filter_expressions)
            scan_kwargs['ExpressionAttributeValues'] = expression_values
            if expression_names:
                scan_kwargs['ExpressionAttributeNames'] = expression_names
        
        response = events_table.scan(**scan_kwargs)
        
        events = response.get('Items', [])
        
        # Update current_participants count for each event by querying registrations
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        for event_item in events:
            try:
                registrations_response = registrations_table.query(
                    IndexName='event-id-index',
                    KeyConditionExpression='event_id = :event_id',
                    ExpressionAttributeValues={':event_id': event_item['event_id']},
                    Select='COUNT'
                )
                event_item['current_participants'] = registrations_response['Count']
            except Exception as e:
                print(f"Error getting participant count for event {event_item['event_id']}: {str(e)}")
                # Keep the existing value if query fails
                pass
        
        # Sort by start_date
        events.sort(key=lambda x: x.get('start_date', ''))
        
        return create_response(200, {
            'events': events,
            'count': len(events)
        })
        
    except Exception as e:
        print(f"Error listing events: {str(e)}")
        return create_response(500, {'error': 'Failed to list events'})


def update_event(event_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing event"""
    try:
        body = parse_event_body(event)
        
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        
        # Check if event exists
        response = events_table.get_item(Key={'event_id': event_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Event not found'})
        
        # Validate dates if provided
        if 'start_date' in body or 'end_date' in body:
            existing_event = response['Item']
            start_date_str = body.get('start_date', existing_event['start_date'])
            end_date_str = body.get('end_date', existing_event['end_date'])
            
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                
                if end_date <= start_date:
                    return create_response(400, {'error': 'End date must be after start date'})
                    
            except ValueError:
                return create_response(400, {'error': 'Invalid date format. Use ISO format.'})
        
        # Build update expression
        update_expressions = []
        expression_values = {}
        expression_names = {}
        
        updatable_fields = [
            'title', 'description', 'start_date', 'end_date', 'location',
            'category', 'subcategory', 'max_participants', 'registration_deadline',
            'is_public', 'status', 'tags', 'requirements', 'cost'
        ]
        
        for field in updatable_fields:
            if field in body:
                if field == 'status':
                    update_expressions.append('#status = :status')
                    expression_names['#status'] = 'status'
                    expression_values[':status'] = body[field]
                else:
                    update_expressions.append(f'{field} = :{field}')
                    expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No valid fields to update'})
        
        # Always update the updated_at timestamp
        update_expressions.append('updated_at = :updated_at')
        expression_values[':updated_at'] = get_current_timestamp()
        
        update_kwargs = {
            'Key': {'event_id': event_id},
            'UpdateExpression': 'SET ' + ', '.join(update_expressions),
            'ExpressionAttributeValues': expression_values
        }
        
        if expression_names:
            update_kwargs['ExpressionAttributeNames'] = expression_names
        
        events_table.update_item(**update_kwargs)
        
        # Get updated event
        updated_response = events_table.get_item(Key={'event_id': event_id})
        
        return create_response(200, {
            'message': 'Event updated successfully',
            'event': updated_response['Item']
        })
        
    except Exception as e:
        print(f"Error updating event: {str(e)}")
        return create_response(500, {'error': 'Failed to update event'})


def delete_event(event_id: str) -> Dict[str, Any]:
    """Delete an event and its associated registrations"""
    try:
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        
        # Check if event exists
        response = events_table.get_item(Key={'event_id': event_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Event not found'})
        
        # Check if event can be deleted (e.g., not already started)
        event_data = response['Item']
        start_date = datetime.fromisoformat(event_data['start_date'].replace('Z', '+00:00'))
        current_time = datetime.utcnow()
        
        if start_date <= current_time:
            return create_response(400, {'error': 'Cannot delete event that has already started'})
        
        # Delete associated registrations first
        registrations_response = registrations_table.query(
            IndexName='event-id-index',
            KeyConditionExpression='event_id = :event_id',
            ExpressionAttributeValues={':event_id': event_id}
        )
        
        for registration in registrations_response.get('Items', []):
            registrations_table.delete_item(Key={'registration_id': registration['registration_id']})
        
        # Delete the event
        events_table.delete_item(Key={'event_id': event_id})
        
        return create_response(200, {
            'message': 'Event and associated registrations deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting event: {str(e)}")
        return create_response(500, {'error': 'Failed to delete event'})


def register_for_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Register a participant for an event"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['event_id', 'participant_id']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        
        # Check if event exists and is open for registration
        event_response = events_table.get_item(Key={'event_id': body['event_id']})
        if 'Item' not in event_response:
            return create_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        # Check registration deadline
        current_time = datetime.utcnow().replace(tzinfo=timezone.utc)
        registration_deadline = datetime.fromisoformat(event_data['registration_deadline'].replace('Z', '+00:00'))
        
        if current_time > registration_deadline:
            return create_response(400, {'error': 'Registration deadline has passed'})
        
        # Check if participant is already registered
        existing_registration = registrations_table.scan(
            FilterExpression='event_id = :event_id AND participant_id = :participant_id',
            ExpressionAttributeValues={
                ':event_id': body['event_id'],
                ':participant_id': body['participant_id']
            }
        )
        
        if existing_registration['Items']:
            return create_response(400, {'error': 'Participant is already registered for this event'})
        
        # Check max participants
        if event_data.get('max_participants'):
            current_count = registrations_table.query(
                IndexName='event-id-index',
                KeyConditionExpression='event_id = :event_id',
                ExpressionAttributeValues={':event_id': body['event_id']},
                Select='COUNT'
            )['Count']
            
            if current_count >= event_data['max_participants']:
                return create_response(400, {'error': 'Event is full'})
        
        # Create registration
        registration_id = f"reg_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        registration_data = {
            'registration_id': registration_id,
            'event_id': body['event_id'],
            'participant_id': body['participant_id'],
            'guardian_id': body.get('guardian_id'),
            'registration_date': get_current_timestamp(),
            'status': 'confirmed',
            'notes': body.get('notes', ''),
            'emergency_contact': body.get('emergency_contact', {}),
            'dietary_restrictions': body.get('dietary_restrictions', ''),
            'medical_conditions': body.get('medical_conditions', ''),
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        registrations_table.put_item(Item=registration_data)
        
        return create_response(201, {
            'message': 'Successfully registered for event',
            'registration': registration_data
        })
        
    except Exception as e:
        print(f"Error registering for event: {str(e)}")
        return create_response(500, {'error': 'Failed to register for event'})


def create_event_rsvp(event_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Create an RSVP for an event (public endpoint for parent interest forms)"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields for RSVP
        required_fields = ['parent_name', 'parent_email', 'student_name', 'student_age']
        validation_result = validate_required_fields(body, required_fields)
        if not validation_result.get('valid', True):
            return create_response(400, {'error': validation_result.get('error', 'Validation failed')})
        
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events')))
        
        # Check if event exists and is open for RSVP
        event_response = events_table.get_item(Key={'event_id': event_id})
        if 'Item' not in event_response:
            return create_response(404, {'error': 'Event not found'})
        
        event_data = event_response['Item']
        
        # Check registration deadline
        current_time = datetime.utcnow().replace(tzinfo=timezone.utc)
        registration_deadline = datetime.fromisoformat(event_data['registration_deadline'].replace('Z', '+00:00'))
        
        if current_time > registration_deadline:
            return create_response(400, {'error': 'RSVP deadline has passed'})
        
        # Check if this parent/student combo already has an RSVP
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        
        existing_rsvp = registrations_table.scan(
            FilterExpression='event_id = :event_id AND parent_email = :parent_email AND student_name = :student_name',
            ExpressionAttributeValues={
                ':event_id': event_id,
                ':parent_email': body['parent_email'],
                ':student_name': body['student_name']
            }
        )
        
        if existing_rsvp['Items']:
            return create_response(400, {'error': 'RSVP already exists for this student'})
        
        # Check max participants
        if event_data.get('max_participants'):
            current_count = registrations_table.query(
                IndexName='event-id-index',
                KeyConditionExpression='event_id = :event_id',
                ExpressionAttributeValues={':event_id': event_id},
                Select='COUNT'
            )['Count']
            
            if current_count >= event_data['max_participants']:
                return create_response(400, {'error': 'Event is full'})
        
        # Create RSVP record
        rsvp_id = f"rsvp_{uuid.uuid4().hex[:8]}"
        
        rsvp_data = {
            'registration_id': rsvp_id,  # Use registration_id as primary key for compatibility
            'rsvp_id': rsvp_id,  # Also store as rsvp_id for clarity
            'event_id': event_id,
            'parent_name': body['parent_name'],
            'parent_email': body['parent_email'],
            'parent_phone': body.get('parent_phone', ''),
            'student_name': body['student_name'],
            'student_age': int(body['student_age']) if str(body['student_age']).isdigit() else body['student_age'],
            'rsvp_status': 'pending',
            'rsvp_date': get_current_timestamp(),
            'special_requirements': body.get('special_requirements', ''),
            'emergency_contact': body.get('emergency_contact', ''),
            'emergency_phone': body.get('emergency_phone', ''),
            'additional_notes': body.get('additional_notes', ''),
            'source': body.get('source', 'event_rsvp'),
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        registrations_table.put_item(Item=rsvp_data)
        
        return create_response(201, {
            'message': 'RSVP submitted successfully',
            'rsvp': rsvp_data
        })
        
    except Exception as e:
        print(f"Error creating RSVP: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Failed to create RSVP'})


def list_event_rsvps(event_id: str) -> Dict[str, Any]:
    """List all RSVPs for a specific event"""
    try:
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        
        # Get all RSVPs for this event
        response = registrations_table.query(
            IndexName='event-id-index',
            KeyConditionExpression='event_id = :event_id',
            ExpressionAttributeValues={':event_id': event_id}
        )
        
        rsvps = response.get('Items', [])
        
        # Filter to only RSVP records (those with parent_email field)
        rsvp_records = [rsvp for rsvp in rsvps if 'parent_email' in rsvp]
        
        # Sort by RSVP date
        rsvp_records.sort(key=lambda x: x.get('rsvp_date', x.get('created_at', '')), reverse=True)
        
        return create_response(200, {
            'rsvps': rsvp_records,
            'count': len(rsvp_records)
        })
        
    except Exception as e:
        print(f"Error listing RSVPs: {str(e)}")
        return create_response(500, {'error': 'Failed to list RSVPs'})


def update_rsvp_status(rsvp_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update RSVP status (for coaches to manage RSVPs)"""
    try:
        body = parse_event_body(event)
        
        if 'rsvp_status' not in body:
            return create_response(400, {'error': 'rsvp_status is required'})
        
        valid_statuses = ['pending', 'confirmed', 'declined', 'waitlist']
        if body['rsvp_status'] not in valid_statuses:
            return create_response(400, {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'})
        
        registrations_table = get_dynamodb_table(os.environ.get('TSA_EVENT_REGISTRATIONS_TABLE', os.environ.get('EVENT_REGISTRATIONS_TABLE', 'event-registrations')))
        
        # Update the RSVP status
        try:
            response = registrations_table.update_item(
                Key={'registration_id': rsvp_id},
                UpdateExpression='SET rsvp_status = :status, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':status': body['rsvp_status'],
                    ':updated_at': get_current_timestamp()
                },
                ReturnValues='ALL_NEW'
            )
            
            return create_response(200, {
                'message': 'RSVP status updated successfully',
                'rsvp': response['Attributes']
            })
            
        except registrations_table.meta.client.exceptions.ConditionalCheckFailedException:
            return create_response(404, {'error': 'RSVP not found'})
        
    except Exception as e:
        print(f"Error updating RSVP status: {str(e)}")
        return create_response(500, {'error': 'Failed to update RSVP status'})


def get_timeline_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get timeline status with auto-detection of completed steps"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        
        if not coach_id:
            return create_response(400, {'error': 'coach_id parameter required'})
        
        # Initialize status tracking
        timeline_status = {}
        
        # 1. Check if events have been created (Host Events step)
        events_table = get_dynamodb_table(os.environ.get('TSA_EVENTS_TABLE', os.environ.get('EVENTS_TABLE', 'events-v3-dev')))
        try:
            events_response = events_table.scan(
                FilterExpression='created_by = :coach_id',
                ExpressionAttributeValues={':coach_id': coach_id},
                Select='COUNT'
            )
            has_events = events_response['Count'] > 0
            timeline_status['host_events'] = {
                'status': 'completed' if has_events else 'upcoming',
                'auto_detected': True,
                'details': {
                    'events_created': events_response['Count']
                }
            }
        except Exception as e:
            print(f"Error checking events: {e}")
            timeline_status['host_events'] = {
                'status': 'upcoming',
                'auto_detected': False,
                'error': str(e)
            }
        
        # 2. Check if parent invitations have been sent (Invite Students step)
        try:
            parent_invitations_table = get_dynamodb_table(os.environ.get('TSA_PARENT_INVITATIONS_TABLE', os.environ.get('PARENT_INVITATIONS_TABLE', 'parent-invitations-v3-dev')))
            invitations_response = parent_invitations_table.scan(
                FilterExpression='created_by = :coach_id',
                ExpressionAttributeValues={':coach_id': coach_id},
                Select='COUNT'
            )
            has_invitations = invitations_response['Count'] > 0
            timeline_status['invite_students'] = {
                'status': 'completed' if has_invitations else 'upcoming',
                'auto_detected': True,
                'details': {
                    'invitations_sent': invitations_response['Count']
                }
            }
        except Exception as e:
            print(f"Error checking parent invitations: {e}")
            timeline_status['invite_students'] = {
                'status': 'upcoming',
                'auto_detected': False,
                'error': str(e)
            }
        
        # 3. Check if students have enrolled (Student Enrollment step)
        try:
            # Check for enrollment records
            enrollments_table = get_dynamodb_table(os.environ.get('TSA_ENROLLMENTS_TABLE', os.environ.get('ENROLLMENTS_TABLE', 'tsa-parent-enrollments-v3-dev')))
            enrollments_response = enrollments_table.scan(
                FilterExpression='coach_id = :coach_id AND enrollment_status = :status',
                ExpressionAttributeValues={
                    ':coach_id': coach_id,
                    ':status': 'enrolled'
                },
                Select='COUNT'
            )
            has_enrollments = enrollments_response['Count'] > 0
            timeline_status['student_enrollment'] = {
                'status': 'completed' if has_enrollments else 'upcoming',
                'auto_detected': True,
                'details': {
                    'students_enrolled': enrollments_response['Count']
                }
            }
        except Exception as e:
            print(f"Error checking enrollments: {e}")
            timeline_status['student_enrollment'] = {
                'status': 'upcoming',
                'auto_detected': False,
                'error': str(e)
            }
        
        # 4. Check coach profile completion (advanced onboarding indicators)
        try:
            profiles_table = get_dynamodb_table(os.environ.get('TSA_PROFILES_TABLE', os.environ.get('PROFILES_TABLE', 'profiles-v3-dev')))
            profile_response = profiles_table.get_item(Key={'profile_id': coach_id})
            
            if 'Item' in profile_response:
                profile = profile_response['Item']
                
                # Check for curriculum development indicators
                has_curriculum_docs = bool(profile.get('documents', []))
                has_certifications = bool(profile.get('bootcamp_progress', {}).get('certifications_earned', []))
                
                timeline_status['curriculum_development'] = {
                    'status': 'completed' if (has_curriculum_docs or has_certifications) else 'upcoming',
                    'auto_detected': True,
                    'details': {
                        'documents_uploaded': len(profile.get('documents', [])),
                        'certifications_earned': len(profile.get('bootcamp_progress', {}).get('certifications_earned', []))
                    }
                }
                
                # Check bootcamp completion as indicator of readiness
                bootcamp_progress = profile.get('bootcamp_progress', {})
                completion_percentage = bootcamp_progress.get('completion_percentage', 0)
                
                timeline_status['bootcamp_completion'] = {
                    'status': 'completed' if completion_percentage >= 80 else 'current' if completion_percentage > 0 else 'upcoming',
                    'auto_detected': True,
                    'details': {
                        'completion_percentage': completion_percentage,
                        'modules_completed': len(bootcamp_progress.get('modules_completed', [])),
                        'certifications_earned': len(bootcamp_progress.get('certifications_earned', []))
                    }
                }
            else:
                timeline_status['curriculum_development'] = {
                    'status': 'upcoming',
                    'auto_detected': False,
                    'error': 'Profile not found'
                }
                timeline_status['bootcamp_completion'] = {
                    'status': 'upcoming',
                    'auto_detected': False,
                    'error': 'Profile not found'
                }
        except Exception as e:
            print(f"Error checking profile: {e}")
            timeline_status['curriculum_development'] = {
                'status': 'upcoming',
                'auto_detected': False,
                'error': str(e)
            }
            timeline_status['bootcamp_completion'] = {
                'status': 'upcoming',
                'auto_detected': False,
                'error': str(e)
            }
        
        # 5. Static completed steps (these are always completed once coach is active)
        timeline_status['onboarding'] = {
            'status': 'completed',
            'auto_detected': True,
            'details': {
                'completed_date': '2024-01-15'  # This would come from actual onboarding data
            }
        }
        
        timeline_status['background_check'] = {
            'status': 'completed',
            'auto_detected': True,
            'details': {
                'completed_date': '2024-01-22'  # This would come from actual background check data
            }
        }
        
        # Calculate overall progress
        completed_auto_steps = sum(1 for step in timeline_status.values() if step['status'] == 'completed' and step['auto_detected'])
        total_auto_steps = sum(1 for step in timeline_status.values() if step['auto_detected'])
        
        progress_summary = {
            'auto_detected_completed': completed_auto_steps,
            'auto_detected_total': total_auto_steps,
            'auto_detection_percentage': (completed_auto_steps / total_auto_steps * 100) if total_auto_steps > 0 else 0
        }
        
        return create_response(200, {
            'timeline_status': timeline_status,
            'progress_summary': progress_summary,
            'coach_id': coach_id
        })
        
    except Exception as e:
        print(f"Error getting timeline status: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Failed to get timeline status'}) 