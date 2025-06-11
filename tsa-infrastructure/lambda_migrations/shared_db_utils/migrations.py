"""
Migration Manager for TSA Coach Portal
Handles schema creation and data migration using SQLAlchemy
"""

import boto3
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert

from .database import DatabaseManager
from .models import Organization, User, ProfileSyncLog

logger = logging.getLogger(__name__)

class MigrationManager:
    """
    Manages database schema creation and data migration
    Uses SQLAlchemy for type-safe, maintainable operations
    """
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.migration_stats = {
            'profiles_processed': 0,
            'users_created': 0,
            'organizations_created': 0,
            'errors': 0,
            'skipped': 0
        }
    
    async def create_schema(self) -> Dict[str, Any]:
        """Create complete database schema using SQLAlchemy"""
        try:
            logger.info("🏗️ Creating PostgreSQL schema using SQLAlchemy...")
            
            # Create all tables defined in models
            await self.db_manager.create_tables()
            
            # Insert default data
            await self.db_manager.create_default_data()
            
            logger.info("✅ PostgreSQL schema created successfully")
            return {
                "message": "PostgreSQL schema created successfully",
                "status": "completed",
                "compliance": "EdFi and OneRoster compliant",
                "method": "SQLAlchemy"
            }
            
        except Exception as e:
            logger.error(f"❌ Schema creation failed: {e}")
            raise
    
    async def get_all_profiles(self) -> List[Dict[str, Any]]:
        """Fetch all profiles from DynamoDB"""
        try:
            dynamodb = boto3.resource('dynamodb')
            profiles_table = dynamodb.Table('profiles')
            
            response = profiles_table.scan()
            profiles = response.get('Items', [])
            
            # Handle pagination
            while 'LastEvaluatedKey' in response:
                response = profiles_table.scan(
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                profiles.extend(response.get('Items', []))
            
            logger.info(f"📦 Found {len(profiles)} profiles in DynamoDB")
            return profiles
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch profiles from DynamoDB: {e}")
            return []
    
    def map_profile_to_user(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB profile to OneRoster compliant user record"""
        
        # Generate OneRoster compliant sourced_id
        sourced_id = f"user_{profile.get('profile_id', str(uuid.uuid4()))}"
        
        # Map role types from profile to OneRoster roles
        role_mapping = {
            'school_owner': 'administrator',
            'instructor': 'teacher', 
            'administrator': 'administrator',
            'coach': 'teacher',  # Coaches are teachers in OneRoster
            'director': 'administrator',
            'principal': 'administrator',
            'counselor': 'teacher'
        }
        
        profile_role = profile.get('role_type', 'teacher')
        oneroster_role = role_mapping.get(profile_role, 'teacher')
        
        # Create org_ids array for school associations
        org_ids = []
        school_name = profile.get('school_name', '')
        if school_name:
            # Generate consistent org ID from school name
            org_id = f"org_{school_name.lower().replace(' ', '_').replace('-', '_')}"
            org_ids.append(org_id)
        
        return {
            'sourced_id': sourced_id,
            'status': 'active',
            'date_last_modified': datetime.now(timezone.utc),
            'model_metadata': {
                'original_profile_id': profile.get('profile_id'),
                'migrated_from': 'dynamodb_profiles',
                'migration_date': datetime.now(timezone.utc).isoformat(),
                'original_role_type': profile_role
            },
            'username': profile.get('email', '').split('@')[0] if profile.get('email') else None,
            'user_ids': [{
                'type': 'email',
                'identifier': profile.get('email', '')
            }],
            'enabled_user': True,
            'given_name': profile.get('first_name', ''),
            'family_name': profile.get('last_name', ''),
            'middle_name': profile.get('middle_name'),
            'role': oneroster_role,
            'identifier': profile.get('profile_id'),
            'email': profile.get('email', ''),
            'phone': profile.get('phone'),
            'birth_date': profile.get('birth_date'),
            'org_ids': org_ids,
            'profile_id': profile.get('profile_id'),  # Link back to DynamoDB
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
    
    def create_organization_for_school(self, profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create OneRoster organization record for the school"""
        
        school_name = profile.get('school_name')
        if not school_name:
            return None
        
        # Generate consistent sourced_id from school name
        sourced_id = f"org_{school_name.lower().replace(' ', '_').replace('-', '_')}"
        
        # Determine organization type based on school_type
        school_type = profile.get('school_type', 'school')
        org_type_mapping = {
            'elementary': 'school',
            'middle': 'school', 
            'high': 'school',
            'k-12': 'school',
            'combined': 'school',
            'district': 'district'
        }
        
        return {
            'sourced_id': sourced_id,
            'status': 'active',
            'date_last_modified': datetime.now(timezone.utc),
            'model_metadata': {
                'school_type': school_type,
                'created_from_profile': profile.get('profile_id'),
                'migration_date': datetime.now(timezone.utc).isoformat()
            },
            'name': school_name,
            'type': org_type_mapping.get(school_type, 'school'),
            'identifier': None,  # No school_id available in profiles
            'parent_id': 'org_district_001'  # Default district
        }
    
    async def migrate_profiles(self, dry_run: bool = False) -> Dict[str, Any]:
        """Execute the migration process using SQLAlchemy"""
        try:
            # Get profiles from DynamoDB
            profiles = await self.get_all_profiles()
            if not profiles:
                logger.warning("⚠️ No profiles found to migrate")
                return {
                    "message": "No profiles found to migrate",
                    "stats": self.migration_stats,
                    "dry_run": dry_run
                }
            
            logger.info(f"🚀 Starting migration of {len(profiles)} profiles (dry_run={dry_run})...")
            
            # Track created organizations to avoid duplicates
            created_orgs = set()
            
            # Use database session
            async with self.db_manager.get_async_session() as session:
                for profile in profiles:
                    try:
                        self.migration_stats['profiles_processed'] += 1
                        
                        # Skip if profile lacks essential data
                        if not profile.get('email'):
                            logger.warning(f"⚠️ Skipping profile {profile.get('profile_id', 'unknown')} - missing email")
                            self.migration_stats['skipped'] += 1
                            continue
                        
                        # 1. Create organization if needed
                        organization_data = self.create_organization_for_school(profile)
                        if organization_data and organization_data['sourced_id'] not in created_orgs:
                            if not dry_run:
                                try:
                                    # Use SQLAlchemy upsert (PostgreSQL UPSERT)
                                    stmt = insert(Organization).values(**organization_data)
                                    stmt = stmt.on_conflict_do_update(
                                        index_elements=['sourced_id'],
                                        set_=dict(
                                            name=stmt.excluded.name,
                                            date_last_modified=stmt.excluded.date_last_modified,
                                            model_metadata=stmt.excluded.model_metadata
                                        )
                                    )
                                    await session.execute(stmt)
                                    self.migration_stats['organizations_created'] += 1
                                    logger.info(f"✅ Created/Updated organization: {organization_data['name']}")
                                except Exception as e:
                                    logger.error(f"❌ Failed to create organization {organization_data['name']}: {e}")
                            else:
                                logger.info(f"[DRY RUN] Would create organization: {organization_data['name']}")
                            
                            created_orgs.add(organization_data['sourced_id'])
                        
                        # 2. Create user record
                        user_data = self.map_profile_to_user(profile)
                        
                        if not dry_run:
                            try:
                                # Use SQLAlchemy upsert for user
                                stmt = insert(User).values(**user_data)
                                stmt = stmt.on_conflict_do_update(
                                    index_elements=['sourced_id'],
                                    set_=dict(
                                        email=stmt.excluded.email,
                                        given_name=stmt.excluded.given_name,
                                        family_name=stmt.excluded.family_name,
                                        role=stmt.excluded.role,
                                        date_last_modified=stmt.excluded.date_last_modified,
                                        updated_at=stmt.excluded.updated_at
                                    )
                                )
                                await session.execute(stmt)
                                self.migration_stats['users_created'] += 1
                                logger.info(f"✅ Created/Updated user: {user_data['email']} ({user_data['role']})")
                                
                                # Log the sync operation
                                sync_log = ProfileSyncLog(
                                    profile_id=user_data['profile_id'],
                                    user_sourced_id=user_data['sourced_id'],
                                    sync_type='migration',
                                    sync_status='completed',
                                    sync_data=user_data,
                                    completed_at=datetime.now(timezone.utc)
                                )
                                session.add(sync_log)
                                
                            except Exception as e:
                                logger.error(f"❌ Failed to create user {user_data['email']}: {e}")
                                self.migration_stats['errors'] += 1
                                
                                # Log the error
                                sync_log = ProfileSyncLog(
                                    profile_id=user_data['profile_id'],
                                    sync_type='migration',
                                    sync_status='failed',
                                    error_message=str(e)
                                )
                                session.add(sync_log)
                        else:
                            logger.info(f"[DRY RUN] Would create user: {user_data['email']} ({user_data['role']})")
                    
                    except Exception as e:
                        logger.error(f"❌ Error processing profile {profile.get('profile_id', 'unknown')}: {e}")
                        self.migration_stats['errors'] += 1
                
                # Session automatically commits due to context manager
            
            if not dry_run:
                logger.info("✅ All changes committed to database")
            else:
                logger.info("🔍 DRY RUN completed - no changes made")
            
            return {
                "message": "Migration completed successfully" if not dry_run else "Dry run completed",
                "stats": self.migration_stats,
                "dry_run": dry_run,
                "compliance": "EdFi and OneRoster compliant",
                "method": "SQLAlchemy"
            }
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            raise

# Convenience functions for direct usage
async def create_schema() -> Dict[str, Any]:
    """Create schema using async SQLAlchemy"""
    from .database import get_async_db_manager
    
    db_manager = await get_async_db_manager()
    try:
        migration_manager = MigrationManager(db_manager)
        return await migration_manager.create_schema()
    finally:
        await db_manager.close()

async def migrate_profiles(dry_run: bool = False) -> Dict[str, Any]:
    """Migrate profiles using async SQLAlchemy"""
    from .database import get_async_db_manager
    
    db_manager = await get_async_db_manager()
    try:
        migration_manager = MigrationManager(db_manager)
        return await migration_manager.migrate_profiles(dry_run)
    finally:
        await db_manager.close() 