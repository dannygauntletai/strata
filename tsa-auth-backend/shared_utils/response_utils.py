"""
Response Utilities for TSA Authentication
Standardized API response creation with consistent CORS headers
"""
import json
from datetime import datetime
from typing import Dict, Any, Optional


def create_response(status_code: int, body: Dict[str, Any], 
                   request_id: str = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Create standardized API response with CORS headers"""
    
    # Default CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
        "Content-Type": "application/json"
    }
    
    # Add request ID to headers if provided
    if request_id:
        cors_headers["X-Request-ID"] = request_id
    
    # Merge with any additional headers
    if headers:
        cors_headers.update(headers)
    
    # Add timestamp to error responses
    if status_code >= 400 and 'timestamp' not in body:
        body['timestamp'] = datetime.utcnow().isoformat()
    
    return {
        "statusCode": status_code,
        "headers": cors_headers,
        "body": json.dumps(body) if isinstance(body, dict) else str(body)
    }


def create_success_response(data: Dict[str, Any], message: str = None, 
                          request_id: str = None) -> Dict[str, Any]:
    """Create standardized success response (200)"""
    response_body = data.copy() if data else {}
    
    if message:
        response_body['message'] = message
    
    return create_response(200, response_body, request_id)


def create_error_response(error_message: str, status_code: int = 500, 
                         error_details: Dict[str, Any] = None, 
                         request_id: str = None) -> Dict[str, Any]:
    """Create standardized error response"""
    response_body = {
        'error': error_message
    }
    
    if error_details:
        response_body.update(error_details)
    
    return create_response(status_code, response_body, request_id)


def create_validation_error_response(missing_fields: list, 
                                   request_id: str = None) -> Dict[str, Any]:
    """Create standardized validation error response (400)"""
    return create_error_response(
        f"Missing required fields: {', '.join(missing_fields)}",
        400,
        {'missing_fields': missing_fields},
        request_id
    )


def create_unauthorized_response(reason: str = "Access denied", 
                               request_id: str = None) -> Dict[str, Any]:
    """Create standardized unauthorized response (403)"""
    return create_error_response(reason, 403, {'reason': reason}, request_id)


def create_health_response(service_name: str, status: str = "healthy", 
                         additional_data: Dict[str, Any] = None,
                         request_id: str = None) -> Dict[str, Any]:
    """Create standardized health check response"""
    response_body = {
        'status': status,
        'service': service_name,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if additional_data:
        response_body.update(additional_data)
    
    status_code = 200 if status == "healthy" else 500
    return create_response(status_code, response_body, request_id)


def handle_cors_preflight() -> Dict[str, Any]:
    """Handle CORS preflight OPTIONS request"""
    return create_response(204, {})  # No content for OPTIONS 