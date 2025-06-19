import logging
from typing import Any, Dict

from shared_db_utils.db_utils import (
    upsert_user,
    upsert_organization,
    delete_user,
    delete_organization,
)

logger = logging.getLogger(__name__)

async def map_profile_to_user(record: Dict[str, Any], db_manager: Any) -> None:
    """Maps a profile record to the users table."""
    # This is a simplified example. In a real scenario, you would
    # have more complex logic to map the fields.
    user_data = {
        "user_id": record["dynamodb"]["Keys"]["profile_id"]["S"],
        "email": record["dynamodb"]["NewImage"]["email"]["S"],
        "name": record["dynamodb"]["NewImage"]["name"]["S"],
        # Add other fields as needed
    }
    await upsert_user(user_data, db_manager)
    logger.info(f"Upserted user {user_data['user_id']} from profile.")

async def map_organization(record: Dict[str, Any], db_manager: Any) -> None:
    """Maps an organization record to the organizations table."""
    org_data = {
        "org_id": record["dynamodb"]["Keys"]["org_id"]["S"],
        "name": record["dynamodb"]["NewImage"]["name"]["S"],
        # Add other fields as needed
    }
    await upsert_organization(org_data, db_manager)
    logger.info(f"Upserted organization {org_data['org_id']}.")

# Add other mappers for enrollments, events, etc.

EVENT_MAPPERS = {
    "profiles": map_profile_to_user,
    "organizations": map_organization,
    # Add other tables here
}

async def handle_event(event: Dict[str, Any], db_manager: Any) -> None:
    """
    Handles a DynamoDB stream event and routes it to the correct mapper.
    """
    for record in event["Records"]:
        event_name = record["eventName"]  # INSERT, MODIFY, REMOVE
        table_name = record["eventSourceARN"].split("/")[1]

        mapper = EVENT_MAPPERS.get(table_name)
        if not mapper:
            logger.warning(f"No mapper found for table {table_name}")
            continue

        if event_name in ["INSERT", "MODIFY"]:
            await mapper(record, db_manager)
        elif event_name == "REMOVE":
            # Handle deletions
            if table_name == "profiles":
                user_id = record["dynamodb"]["Keys"]["profile_id"]["S"]
                await delete_user(user_id, db_manager)
                logger.info(f"Deleted user {user_id} from profile.")
            elif table_name == "organizations":
                org_id = record["dynamodb"]["Keys"]["org_id"]["S"]
                await delete_organization(org_id, db_manager)
                logger.info(f"Deleted organization {org_id}.")
        else:
            logger.warning(f"Unknown event type {event_name}") 