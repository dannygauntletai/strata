"""
Data Migration Lambda Handler
Migrates DynamoDB profiles to PostgreSQL users/organizations using SQLAlchemy
"""
import json
import os
import asyncio
import logging
from typing import Dict, Any

# Import shared database utilities from layer
from shared_db_utils import migrate_profiles

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for DynamoDB to PostgreSQL migration using SQLAlchemy"""
    try:
        logger.info("🚀 Starting DynamoDB profiles to PostgreSQL migration with SQLAlchemy")
        
        # Check if this is a dry run
        dry_run = event.get('dry_run', False)
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(migrate_profiles(dry_run))
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