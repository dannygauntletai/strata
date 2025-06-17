"""
Simple test handler for parent invitations to verify API Gateway routing
This bypasses the complex shared_utils imports to test basic functionality
"""
import json
from typing import Dict, Any


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Simple test handler - no complex imports"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        print(f"📨 Simple Invitations Test: {http_method} {path}")
        
        # Create simple response
        response_body = {
            'message': 'Parent invitations endpoint is working!',
            'method': http_method,
            'path': path,
            'timestamp': '2025-06-17T01:57:00Z',
            'status': 'success'
        }
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps(response_body)
        }
        
    except Exception as e:
        print(f"💥 Simple Handler Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                'error': 'Simple handler error',
                'message': str(e)
            })
        } 