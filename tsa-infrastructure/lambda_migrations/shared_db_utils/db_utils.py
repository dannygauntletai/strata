import logging
from typing import Any, Dict
from sqlalchemy.dialects.postgresql import insert
from .models import User, Organization
from .database import DatabaseManager

logger = logging.getLogger(__name__)

async def upsert_user(user_data: Dict[str, Any], db_manager: DatabaseManager) -> None:
    """Inserts or updates a user in the PostgreSQL database."""
    async with db_manager.get_session() as session:
        stmt = insert(User).values(user_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=['user_id'],
            set_=user_data
        )
        await session.execute(stmt)

async def delete_user(user_id: str, db_manager: DatabaseManager) -> None:
    """Deletes a user from the PostgreSQL database."""
    async with db_manager.get_session() as session:
        user = await session.get(User, user_id)
        if user:
            await session.delete(user)

async def upsert_organization(org_data: Dict[str, Any], db_manager: DatabaseManager) -> None:
    """Inserts or updates an organization in the PostgreSQL database."""
    async with db_manager.get_session() as session:
        stmt = insert(Organization).values(org_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=['org_id'],
            set_=org_data
        )
        await session.execute(stmt)

async def delete_organization(org_id: str, db_manager: DatabaseManager) -> None:
    """Deletes an organization from the PostgreSQL database."""
    async with db_manager.get_session() as session:
        org = await session.get(Organization, org_id)
        if org:
            await session.delete(org)

# Add other upsert/delete functions for other tables as needed. 