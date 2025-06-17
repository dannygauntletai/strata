"""
Database Manager for TSA Coach Portal
Handles SQLAlchemy connections and sessions for PostgreSQL
"""

import os
import json
import boto3
import logging
from typing import Dict, Any, Optional, AsyncContextManager, ContextManager, Union
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy import create_engine, Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool

from .models import Base

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages PostgreSQL database connections using SQLAlchemy
    Supports both sync and async operations with proper connection pooling
    """
    
    def __init__(self, use_async: bool = True):
        self.use_async = use_async
        self._engine: Optional[Union[Engine, AsyncEngine]] = None
        self._session_factory: Optional[Union[sessionmaker, async_sessionmaker]] = None
        self._database_url: Optional[str] = None
        
    async def get_database_credentials(self) -> Dict[str, Any]:
        """Get database credentials from AWS Secrets Manager"""
        try:
            secrets_client = boto3.client('secretsmanager')
            secret_arn = os.environ.get('DB_SECRET_ARN')
            
            if not secret_arn:
                raise ValueError("DB_SECRET_ARN environment variable not set")
            
            response = secrets_client.get_secret_value(SecretId=secret_arn)
            secret_data = json.loads(response['SecretString'])
            
            return {
                'host': secret_data.get('host', os.environ.get('DB_HOST')),
                'database': secret_data.get('dbname', os.environ.get('DB_NAME', 'coach_portal')),
                'username': secret_data.get('username'),
                'password': secret_data.get('password'),
                'port': secret_data.get('port', os.environ.get('DB_PORT', 5432))
            }
            
        except Exception as e:
            logger.error(f"Failed to get database credentials: {e}")
            raise
    
    def _build_database_url(self, credentials: Dict[str, Any]) -> str:
        """Build SQLAlchemy database URL"""
        if self.use_async:
            # Use asyncpg for async operations
            driver = "postgresql+asyncpg"
        else:
            # Use psycopg2 for sync operations  
            driver = "postgresql+psycopg2"
            
        return (
            f"{driver}://"
            f"{credentials['username']}:{credentials['password']}@"
            f"{credentials['host']}:{credentials['port']}/{credentials['database']}"
        )
    
    async def initialize(self) -> None:
        """Initialize database connection and create engine"""
        try:
            credentials = await self.get_database_credentials()
            self._database_url = self._build_database_url(credentials)
            
            if self.use_async:
                self._engine = create_async_engine(
                    self._database_url,
                    poolclass=NullPool,
                    pool_pre_ping=True,
                    echo=os.environ.get('SQL_ECHO', 'false').lower() == 'true'
                )
                self._session_factory = async_sessionmaker(
                    bind=self._engine,
                    class_=AsyncSession,
                    expire_on_commit=False
                )
            else:
                self._engine = create_engine(
                    self._database_url,
                    poolclass=QueuePool,
                    pool_size=5,
                    max_overflow=0,
                    pool_pre_ping=True,
                    echo=os.environ.get('SQL_ECHO', 'false').lower() == 'true'
                )
                self._session_factory = sessionmaker(
                    bind=self._engine,
                    expire_on_commit=False
                )
                
            logger.info(f"✅ Database engine initialized ({'async' if self.use_async else 'sync'})")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            raise
    
    @property
    def engine(self) -> Union[Engine, AsyncEngine]:
        """Get the SQLAlchemy engine"""
        if not self._engine:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._engine
    
    @property 
    def session_factory(self) -> Union[sessionmaker, async_sessionmaker]:
        """Get the session factory"""
        if not self._session_factory:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._session_factory
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncContextManager[AsyncSession]:
        """Get an async database session with automatic cleanup"""
        if not self.use_async:
            raise RuntimeError("DatabaseManager not configured for async operations")
            
        session = self.session_factory()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()
    
    @contextmanager
    def get_session(self) -> ContextManager[Session]:
        """Get a sync database session with automatic cleanup"""
        if self.use_async:
            raise RuntimeError("DatabaseManager configured for async operations")
            
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    async def create_tables(self) -> None:
        """Create all database tables"""
        try:
            if self.use_async:
                async with self._engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
            else:
                Base.metadata.create_all(bind=self._engine)
                
            logger.info("✅ Database tables created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create tables: {e}")
            raise
    
    async def create_default_data(self) -> None:
        """Insert default organizations and reference data"""
        try:
            from .models import Organization
            
            default_orgs = [
                {
                    'sourced_id': 'org_district_001',
                    'name': 'TSA Coach Portal District', 
                    'type': 'district',
                    'status': 'active'
                },
                {
                    'sourced_id': 'org_department_001',
                    'name': 'Athletic Department',
                    'type': 'department', 
                    'status': 'active'
                }
            ]
            
            if self.use_async:
                async with self.get_async_session() as session:
                    for org_data in default_orgs:
                        # Check if exists
                        result = await session.get(Organization, org_data['sourced_id'])
                        if not result:
                            org = Organization(**org_data)
                            session.add(org)
                            logger.info(f"Created default organization: {org_data['name']}")
            else:
                with self.get_session() as session:
                    for org_data in default_orgs:
                        result = session.get(Organization, org_data['sourced_id'])
                        if not result:
                            org = Organization(**org_data)
                            session.add(org)
                            logger.info(f"Created default organization: {org_data['name']}")
                            
            logger.info("✅ Default data created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create default data: {e}")
            raise
    
    async def close(self) -> None:
        """Close database connections"""
        if self._engine:
            if self.use_async:
                await self._engine.dispose()
            else:
                self._engine.dispose()
            logger.info("Database connections closed")

# Convenience functions for common usage patterns
async def get_async_db_manager() -> DatabaseManager:
    """Get an initialized async database manager"""
    db = DatabaseManager(use_async=True)
    await db.initialize()
    return db

def get_sync_db_manager() -> DatabaseManager:
    """Get an initialized sync database manager"""
    import asyncio
    
    db = DatabaseManager(use_async=False)
    # Run the async initialization in a sync context
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(db.initialize())
        return db
    finally:
        loop.close() 