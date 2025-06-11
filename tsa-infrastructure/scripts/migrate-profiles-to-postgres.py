#!/usr/bin/env python3
"""
Migration Script: DynamoDB Profiles -> PostgreSQL Users/Organizations
Ensures EdFi and OneRoster compliance by syncing coach profiles from DynamoDB to PostgreSQL

Usage:
    python migrate-profiles-to-postgres.py --dry-run  # Preview changes
    python migrate-profiles-to-postgres.py --execute  # Apply changes
"""

import boto3
import psycopg2
import psycopg2.extras
import json
import uuid
import argparse
import sys
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProfileMigrator:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.dynamodb = boto3.resource('dynamodb')
        self.profiles_table = self.dynamodb.Table('profiles')
        self.db_connection = None
        self.migration_stats = {
            'profiles_processed': 0,
            'users_created': 0,
            'organizations_created': 0,
            'errors': 0,
            'skipped': 0
        }
        
    def connect_to_postgres(self) -> bool:
        """Connect to PostgreSQL database using AWS Secrets Manager"""
        try:
            # Get database credentials from Secrets Manager
            secrets_client = boto3.client('secretsmanager')
            
            # Try different possible secret names/ARNs
            possible_secrets = [
                'tsa-coach/database-dev',
                'arn:aws:secretsmanager:us-east-1:164722634547:secret:tsa-coach/database-dev-S8EIlv'
            ]
            
            secret_data = None
            for secret_name in possible_secrets:
                try:
                    response = secrets_client.get_secret_value(SecretId=secret_name)
                    secret_data = json.loads(response['SecretString'])
                    break
                except Exception as e:
                    logger.warning(f"Failed to get secret {secret_name}: {e}")
                    continue
            
            if not secret_data:
                # Fallback to environment variables or manual input
                logger.error("Could not retrieve database credentials from Secrets Manager")
                return False
            
            # Connect to PostgreSQL
            self.db_connection = psycopg2.connect(
                host=secret_data.get('host', 'tsa-coach-portal-dev.c4jmsiuauast.us-east-1.rds.amazonaws.com'),
                database=secret_data.get('dbname', 'coach_portal'),
                user=secret_data.get('username'),
                password=secret_data.get('password'),
                port=secret_data.get('port', 5432)
            )
            
            logger.info("✅ Connected to PostgreSQL database")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            return False
    
    def get_all_profiles(self) -> List[Dict[str, Any]]:
        """Fetch all profiles from DynamoDB"""
        try:
            response = self.profiles_table.scan()
            profiles = response.get('Items', [])
            
            # Handle pagination
            while 'LastEvaluatedKey' in response:
                response = self.profiles_table.scan(
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
        if profile.get('school_id'):
            org_ids.append(f"org_{profile['school_id']}")
        
        user_record = {
            'sourced_id': sourced_id,
            'status': 'active',
            'date_last_modified': datetime.now(timezone.utc),
            'metadata': json.dumps({
                'original_profile_id': profile.get('profile_id'),
                'migrated_from': 'dynamodb_profiles',
                'migration_date': datetime.now(timezone.utc).isoformat(),
                'original_role_type': profile_role
            }),
            'username': profile.get('email', '').split('@')[0],  # Use email prefix as username
            'user_ids': json.dumps([{
                'type': 'email',
                'identifier': profile.get('email', '')
            }]),
            'enabled_user': True,
            'given_name': profile.get('first_name', ''),
            'family_name': profile.get('last_name', ''),
            'middle_name': profile.get('middle_name'),
            'role': oneroster_role,
            'identifier': profile.get('profile_id'),
            'email': profile.get('email', ''),
            'phone': profile.get('phone'),
            'birth_date': profile.get('birth_date'),
            'org_ids': json.dumps(org_ids),
            'profile_id': profile.get('profile_id'),  # Link back to DynamoDB
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        return user_record
    
    def create_organization_for_school(self, profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create OneRoster organization record for the school"""
        
        school_name = profile.get('school_name')
        school_id = profile.get('school_id')
        
        if not school_name:
            return None
        
        # Generate consistent sourced_id
        if school_id:
            sourced_id = f"org_{school_id}"
        else:
            # Generate from school name if no school_id
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
        
        organization = {
            'sourced_id': sourced_id,
            'status': 'active',
            'date_last_modified': datetime.now(timezone.utc),
            'metadata': json.dumps({
                'school_type': school_type,
                'created_from_profile': profile.get('profile_id'),
                'migration_date': datetime.now(timezone.utc).isoformat()
            }),
            'name': school_name,
            'type': org_type_mapping.get(school_type, 'school'),
            'identifier': school_id,
            'parent_id': 'org_district_001'  # Default district
        }
        
        return organization
    
    def execute_migration(self) -> bool:
        """Execute the migration process"""
        try:
            if not self.connect_to_postgres():
                return False
            
            profiles = self.get_all_profiles()
            if not profiles:
                logger.warning("⚠️ No profiles found to migrate")
                return True
            
            cursor = self.db_connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Track created organizations to avoid duplicates
            created_orgs = set()
            
            logger.info(f"🚀 Starting migration of {len(profiles)} profiles...")
            
            for profile in profiles:
                try:
                    self.migration_stats['profiles_processed'] += 1
                    
                    # Skip if profile lacks essential data
                    if not profile.get('email'):
                        logger.warning(f"⚠️ Skipping profile {profile.get('profile_id', 'unknown')} - missing email")
                        self.migration_stats['skipped'] += 1
                        continue
                    
                    # 1. Create organization if needed
                    organization = self.create_organization_for_school(profile)
                    if organization and organization['sourced_id'] not in created_orgs:
                        if not self.dry_run:
                            try:
                                cursor.execute("""
                                    INSERT INTO organizations (sourced_id, status, date_last_modified, metadata, name, type, identifier, parent_id)
                                    VALUES (%(sourced_id)s, %(status)s, %(date_last_modified)s, %(metadata)s, %(name)s, %(type)s, %(identifier)s, %(parent_id)s)
                                    ON CONFLICT (sourced_id) DO UPDATE SET
                                        name = EXCLUDED.name,
                                        date_last_modified = EXCLUDED.date_last_modified,
                                        metadata = EXCLUDED.metadata
                                """, organization)
                                self.migration_stats['organizations_created'] += 1
                                logger.info(f"✅ Created/Updated organization: {organization['name']}")
                            except Exception as e:
                                logger.error(f"❌ Failed to create organization {organization['name']}: {e}")
                        else:
                            logger.info(f"[DRY RUN] Would create organization: {organization['name']}")
                        
                        created_orgs.add(organization['sourced_id'])
                    
                    # 2. Create user record
                    user = self.map_profile_to_user(profile)
                    
                    if not self.dry_run:
                        try:
                            cursor.execute("""
                                INSERT INTO users (sourced_id, status, date_last_modified, metadata, username, user_ids, enabled_user,
                                                 given_name, family_name, middle_name, role, identifier, email, phone, birth_date,
                                                 org_ids, profile_id, created_at, updated_at)
                                VALUES (%(sourced_id)s, %(status)s, %(date_last_modified)s, %(metadata)s, %(username)s, %(user_ids)s, %(enabled_user)s,
                                       %(given_name)s, %(family_name)s, %(middle_name)s, %(role)s, %(identifier)s, %(email)s, %(phone)s, %(birth_date)s,
                                       %(org_ids)s, %(profile_id)s, %(created_at)s, %(updated_at)s)
                                ON CONFLICT (sourced_id) DO UPDATE SET
                                    email = EXCLUDED.email,
                                    given_name = EXCLUDED.given_name,
                                    family_name = EXCLUDED.family_name,
                                    role = EXCLUDED.role,
                                    date_last_modified = EXCLUDED.date_last_modified,
                                    updated_at = EXCLUDED.updated_at
                            """, user)
                            self.migration_stats['users_created'] += 1
                            logger.info(f"✅ Created/Updated user: {user['email']} ({user['role']})")
                        except Exception as e:
                            logger.error(f"❌ Failed to create user {user['email']}: {e}")
                            self.migration_stats['errors'] += 1
                    else:
                        logger.info(f"[DRY RUN] Would create user: {user['email']} ({user['role']})")
                
                except Exception as e:
                    logger.error(f"❌ Error processing profile {profile.get('profile_id', 'unknown')}: {e}")
                    self.migration_stats['errors'] += 1
            
            # Commit changes
            if not self.dry_run:
                self.db_connection.commit()
                logger.info("✅ All changes committed to database")
            else:
                logger.info("🔍 DRY RUN completed - no changes made")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            if self.db_connection:
                self.db_connection.rollback()
            return False
        
        finally:
            if self.db_connection:
                self.db_connection.close()
    
    def print_migration_summary(self):
        """Print migration statistics"""
        print("\n" + "="*50)
        print("📊 MIGRATION SUMMARY")
        print("="*50)
        print(f"Profiles processed: {self.migration_stats['profiles_processed']}")
        print(f"Users created/updated: {self.migration_stats['users_created']}")
        print(f"Organizations created: {self.migration_stats['organizations_created']}")
        print(f"Errors: {self.migration_stats['errors']}")
        print(f"Skipped: {self.migration_stats['skipped']}")
        print("="*50)


def main():
    parser = argparse.ArgumentParser(description='Migrate DynamoDB profiles to PostgreSQL for compliance')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without executing')
    parser.add_argument('--execute', action='store_true', help='Execute the migration')
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.execute:
        print("❌ Must specify either --dry-run or --execute")
        sys.exit(1)
    
    if args.dry_run and args.execute:
        print("❌ Cannot specify both --dry-run and --execute")
        sys.exit(1)
    
    migrator = ProfileMigrator(dry_run=args.dry_run)
    
    print("🔄 TSA Coach Portal: DynamoDB → PostgreSQL Migration")
    print("📋 Purpose: Ensure EdFi and OneRoster compliance")
    
    if args.dry_run:
        print("🔍 Running in DRY RUN mode - no changes will be made\n")
    else:
        print("⚡ EXECUTING migration - changes will be applied\n")
    
    success = migrator.execute_migration()
    migrator.print_migration_summary()
    
    if success:
        print("✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("❌ Migration failed!")
        sys.exit(1)


if __name__ == '__main__':
    main() 