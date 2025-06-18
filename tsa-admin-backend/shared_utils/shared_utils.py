"""
Shared utility functions for TSA Admin Backend
Contains common functions used across multiple lambda handlers
"""
import json
import os
import boto3
import uuid
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def get_allowed_origin(event: Dict[str, Any] = None) -> str:
    """Get allowed CORS origin based on environment and request origin"""
    # Environment-specific CORS origins (per .cursorrules security)
    cors_origins = {
        "dev": [
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3001"
        ],
        "staging": [
            "https://admin-staging.sportsacademy.tech",
            "https://staging.sportsacademy.tech",
            # Add localhost support for local development
            "http://localhost:3001",
            "https://localhost:3001"
        ],
        "prod": [
            "https://admin.sportsacademy.tech",
            "https://app.sportsacademy.tech"
        ]
    }
    
    # Get current environment (default to dev for safety)
    current_env = os.environ.get('STAGE', 'dev')
    allowed_origins = cors_origins.get(current_env, cors_origins['dev'])
    
    # Get request origin if event provided
    if event:
        request_origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin')
        if request_origin and request_origin in allowed_origins:
            return request_origin
    
    return allowed_origins[0]  # Safe fallback


def create_cors_response(status_code: int, body: dict, event: Dict[str, Any] = None) -> dict:
    """Create standardized response with proper CORS headers"""
    cors_origin = get_allowed_origin(event)
    
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event with error handling"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            return json.loads(body) if body else {}
        
        return body if isinstance(body, dict) else {}
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error parsing body: {str(e)}")
        return {}


def log_admin_action(admin_user_id: str, action: str, details: Dict[str, Any]) -> None:
    """Log admin action to audit table for compliance and monitoring"""
    try:
        from shared_config import get_config
        config = get_config()
        
        dynamodb = boto3.resource('dynamodb')
        audit_table = dynamodb.Table(config.get_table_name('audit-logs'))
        
        log_entry = {
            'log_id': str(uuid.uuid4()),
            'admin_user_id': admin_user_id,
            'action': action,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': 'unknown',
        }
        
        audit_table.put_item(Item=log_entry)
        logger.info(f"Admin action logged: {action} by {admin_user_id}")
        
    except Exception as e:
        logger.error(f"Error logging admin action: {str(e)}")
        # Don't raise - logging failure shouldn't break the main operation


def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource with error handling"""
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        logger.error(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise


def is_this_week(date_str: str) -> bool:
    """Check if a date string is within the current week"""
    try:
        if not date_str:
            return False
        
        from datetime import timedelta
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        now = datetime.utcnow()
        
        # Calculate start of current week (Monday)
        days_since_monday = now.weekday()
        start_of_week = now - timedelta(days=days_since_monday)
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return date_obj >= start_of_week
        
    except Exception as e:
        logger.error(f"Error checking if date is this week: {str(e)}")
        return False 