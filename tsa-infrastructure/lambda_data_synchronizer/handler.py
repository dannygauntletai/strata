import asyncio
import json
import logging
import os
from typing import Any, Dict

from mappers import handle_event
from db import get_db_manager

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# Initialize database manager outside of the handler to reuse connections
db_manager = None

async def initialize_db():
    """Initializes the database manager if it's not already initialized."""
    global db_manager
    if db_manager is None:
        logger.info("Initializing database manager...")
        db_manager = await get_db_manager()
        logger.info("Database manager initialized successfully.")

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for processing DynamoDB stream events.
    """
    logger.info(f"Received {len(event.get('Records', []))} records to process.")
    
    # Ensure the database is initialized
    loop = asyncio.get_event_loop()
    loop.run_until_complete(initialize_db())

    # Process records
    try:
        loop.run_until_complete(handle_event(event, db_manager))
        return {"statusCode": 200, "body": "Successfully processed records."}
    except Exception as e:
        logger.error(f"Error processing records: {e}", exc_info=True)
        return {"statusCode": 500, "body": "Error processing records."} 