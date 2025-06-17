"""
Lambda handler for coach management from admin perspective
Handles listing, viewing, updating, and deleting coaches
"""
import json
import os
import boto3
from typing import Dict, Any
from datetime import datetime
import logging

# Set up logger first
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import shared utilities from consolidated shared layer
try:
    from shared_utils import create_cors_response, parse_event_body, log_admin_action
except ImportError as e:
    logger.error(f"Failed to import shared utilities: {e}")
    raise


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for coach management requests"""
    try:
        logger.info(f"Coach management handler called")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        http_method = event.get('httpMethod', '')
        path_parameters = event.get('pathParameters') or {}
        coach_id = path_parameters.get('coach_id')
        
        # Route to appropriate handler
        if http_method == 'GET':
            if coach_id:
                return get_coach(coach_id)
            else:
                return list_coaches(event)
        elif http_method == 'PUT':
            return update_coach(coach_id, event)
        elif http_method == 'DELETE':
            return delete_coach(coach_id)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in coach management handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def list_coaches(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all coaches with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')
        limit = int(query_params.get('limit', 100))
        
        dynamodb = boto3.resource('dynamodb')
        # Connect to the profiles table where coach data is stored
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profiles-v1-dev'))
        
        logger.info(f"Querying profiles table: {profiles_table.table_name}")
        
        # Query for coach profiles
        if status_filter:
            # Query by status using filter expression
            response = profiles_table.scan(
                FilterExpression='#role = :role AND #status = :status',
                ExpressionAttributeNames={
                    '#role': 'role',
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':role': 'coach',
                    ':status': status_filter
                },
                Limit=limit
            )
        else:
            # Scan for all coaches
            response = profiles_table.scan(
                FilterExpression='#role = :role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={':role': 'coach'},
                Limit=limit
            )
        
        coaches = response.get('Items', [])
        
        # Transform coach data to match frontend expectations
        transformed_coaches = []
        for coach in coaches:
            # Use the actual database key as coach_id
            actual_coach_id = coach.get('profile_id') or coach.get('user_id', '')
            
            transformed_coach = {
                'coach_id': actual_coach_id,  # Use actual database key
                'first_name': coach.get('first_name'),
                'last_name': coach.get('last_name'),
                'email': coach.get('email'),
                'sport': coach.get('sport'),
                'school_name': coach.get('school_name'),
                'school_type': coach.get('school_type'),
                'role': coach.get('role'),
                'status': coach.get('status', 'active'),
                'onboarding_completed': coach.get('onboarding_completed', False),
                'created_at': coach.get('created_at', datetime.utcnow().isoformat()),
                'phone': coach.get('phone')
            }
            
            transformed_coaches.append(transformed_coach)
        
        # Sort by created_at descending
        transformed_coaches.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        logger.info(f"Found {len(transformed_coaches)} coaches")
        
        return create_cors_response(200, {
            'coaches': transformed_coaches,
            'count': len(transformed_coaches)
        })
        
    except Exception as e:
        logger.error(f"Error listing coaches: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def get_coach(coach_id: str) -> Dict[str, Any]:
    """Get specific coach details"""
    try:
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profiles-v1-dev'))
        
        # Try to find coach by profile_id first
        response = profiles_table.scan(
            FilterExpression='profile_id = :coach_id OR user_id = :coach_id',
            ExpressionAttributeValues={':coach_id': coach_id}
        )
        
        coaches = response.get('Items', [])
        if not coaches:
            return create_cors_response(404, {'error': 'Coach not found'})
        
        coach = coaches[0]  # Get the first match
        
        # Transform to match frontend expectations
        transformed_coach = {
            'coach_id': coach.get('profile_id', coach.get('user_id', '')),
            'first_name': coach.get('first_name'),
            'last_name': coach.get('last_name'),
            'email': coach.get('email'),
            'sport': coach.get('sport'),
            'school_name': coach.get('school_name'),
            'school_type': coach.get('school_type'),
            'role': coach.get('role'),
            'status': coach.get('status', 'active'),
            'onboarding_completed': coach.get('onboarding_completed', False),
            'created_at': coach.get('created_at', datetime.utcnow().isoformat()),
            'phone': coach.get('phone')
        }
        
        return create_cors_response(200, transformed_coach)
        
    except Exception as e:
        logger.error(f"Error getting coach: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def update_coach(coach_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update coach information"""
    try:
        if not coach_id:
            return create_cors_response(400, {'error': 'Coach ID is required'})
        
        body = parse_event_body(event)
        
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profiles-v1-dev'))
        
        # Find the coach first
        response = profiles_table.scan(
            FilterExpression='profile_id = :coach_id OR user_id = :coach_id',
            ExpressionAttributeValues={':coach_id': coach_id}
        )
        
        coaches = response.get('Items', [])
        if not coaches:
            return create_cors_response(404, {'error': 'Coach not found'})
        
        coach = coaches[0]
        actual_key = coach.get('profile_id') or coach.get('user_id')
        
        # Build update expression dynamically
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': datetime.utcnow().isoformat()}
        expression_names = {}
        
        # Allow updating certain fields
        updatable_fields = [
            'first_name', 'last_name', 'email', 'sport', 
            'school_name', 'school_type', 'role', 'status', 'phone'
        ]
        
        for field in updatable_fields:
            if field in body and body[field] is not None:
                # Handle reserved keywords
                if field in ['status', 'role']:
                    field_name = f'#{field}'
                    expression_names[field_name] = field
                    update_expression += f", {field_name} = :{field}"
                else:
                    update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = body[field]
        
        # Update the record
        update_params = {
            'Key': {'profile_id': actual_key} if 'profile_id' in coach else {'user_id': actual_key},
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expression_names:
            update_params['ExpressionAttributeNames'] = expression_names
        
        updated_response = profiles_table.update_item(**update_params)
        
        # Log the action
        log_admin_action(
            admin_user_id=body.get('admin_user_id', 'system'),
            action='update_coach',
            details={
                'coach_id': coach_id,
                'updated_fields': list(body.keys()),
                'email': coach.get('email', 'unknown')
            }
        )
        
        # Transform updated coach for response
        updated_coach = updated_response['Attributes']
        transformed_coach = {
            'coach_id': updated_coach.get('profile_id', updated_coach.get('user_id', '')),
            'first_name': updated_coach.get('first_name'),
            'last_name': updated_coach.get('last_name'),
            'email': updated_coach.get('email'),
            'sport': updated_coach.get('sport'),
            'school_name': updated_coach.get('school_name'),
            'school_type': updated_coach.get('school_type'),
            'role': updated_coach.get('role'),
            'status': updated_coach.get('status', 'active'),
            'onboarding_completed': updated_coach.get('onboarding_completed', False),
            'created_at': updated_coach.get('created_at'),
            'phone': updated_coach.get('phone')
        }
        
        logger.info(f"Coach {coach_id} updated successfully")
        
        return create_cors_response(200, {
            'message': 'Coach updated successfully',
            'coach': transformed_coach
        })
        
    except Exception as e:
        logger.error(f"Error updating coach: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def delete_coach(coach_id: str) -> Dict[str, Any]:
    """Delete a coach (soft delete by setting status to inactive)"""
    try:
        if not coach_id:
            return create_cors_response(400, {'error': 'Coach ID is required'})
        
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profiles-v1-dev'))
        
        # Find the coach first
        response = profiles_table.scan(
            FilterExpression='profile_id = :coach_id OR user_id = :coach_id',
            ExpressionAttributeValues={':coach_id': coach_id}
        )
        
        coaches = response.get('Items', [])
        if not coaches:
            return create_cors_response(404, {'error': 'Coach not found'})
        
        coach = coaches[0]
        actual_key = coach.get('profile_id') or coach.get('user_id')
        
        # Soft delete - set status to inactive and add deleted timestamp
        update_params = {
            'Key': {'profile_id': actual_key} if 'profile_id' in coach else {'user_id': actual_key},
            'UpdateExpression': 'SET #status = :status, deleted_at = :timestamp, updated_at = :timestamp',
            'ExpressionAttributeNames': {'#status': 'status'},
            'ExpressionAttributeValues': {
                ':status': 'inactive',
                ':timestamp': datetime.utcnow().isoformat()
            }
        }
        
        profiles_table.update_item(**update_params)
        
        # Log the action
        log_admin_action(
            admin_user_id='system',
            action='delete_coach',
            details={
                'coach_id': coach_id,
                'email': coach.get('email', 'unknown'),
                'deletion_type': 'soft_delete'
            }
        )
        
        logger.info(f"Coach {coach_id} soft deleted successfully")
        
        return create_cors_response(200, {'message': 'Coach deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting coach: {str(e)}")
        return create_cors_response(500, {'error': str(e)}) 