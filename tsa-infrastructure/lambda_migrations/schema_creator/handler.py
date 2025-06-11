"""
Schema Creation Lambda Handler
Creates PostgreSQL schema for EdFi and OneRoster compliance using SQLAlchemy
"""
import json
import os
import asyncio
import logging
from typing import Dict, Any

# Import shared database utilities from layer
from shared_db_utils import create_schema

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for PostgreSQL schema creation using SQLAlchemy"""
    try:
        logger.info("🚀 Starting PostgreSQL schema creation with SQLAlchemy")
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(create_schema())
            return create_response(200, result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return create_response(500, {"error": str(e)})

def create_response(status_code: int, body: dict) -> dict:
    """Create Lambda response"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    } 