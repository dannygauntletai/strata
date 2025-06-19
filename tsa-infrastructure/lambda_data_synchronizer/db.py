from shared_db_utils.db_utils import DatabaseManager
import logging

logger = logging.getLogger(__name__)

async def get_db_manager():
    """
    Returns an initialized database manager.
    """
    db_manager = DatabaseManager()
    await db_manager.initialize()
    return db_manager 