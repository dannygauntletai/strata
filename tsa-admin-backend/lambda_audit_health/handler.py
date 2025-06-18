"""
Lambda handler for audit logging and health check functionality
Handles audit log retrieval and system health monitoring
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any
import logging

# Set up basic logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for audit and health requests"""
    try:
        logger.info(f"✅ Audit/health handler called successfully")
        logger.info(f"Event: {json.dumps(event, default=str)}")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return {
                "statusCode": 204,
                "headers": {
                    "Access-Control-Allow-Origin": "http://localhost:3001",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "600"
                },
                "body": ""
            }
        
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')
        
        logger.info(f"Processing request - Path: {path}, Method: {http_method}")
        
        # Simple health check
        if '/health' in path:
            health_status = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'service': 'tsa-admin-backend',
                'version': '1.0.0',
                'message': 'Health check successful'
            }
            
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "http://localhost:3001",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "600",
                    "Content-Type": "application/json"
                },
                "body": json.dumps(health_status)
            }
        else:
            return {
                "statusCode": 404,
                "headers": {
                    "Access-Control-Allow-Origin": "http://localhost:3001",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "600",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"❌ Error in audit/health handler: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "http://localhost:3001",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "600",
                "Content-Type": "application/json"
            },
            "body": json.dumps({'error': str(e)})
        }

