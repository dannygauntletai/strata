"""
Coach Backend Shared Layer
Contains utilities and models for coach Lambda functions
"""

# Basic shared utilities
__all__ = [
    'create_cors_response',
    'parse_event_body'
]

def create_cors_response(status_code: int, body: dict) -> dict:
    """Create standardized response with proper CORS headers"""
    import json
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }

def parse_event_body(event: dict) -> dict:
    """Parse event body from API Gateway"""
    import json
    body = event.get('body', '{}')
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}
    return body or {} 