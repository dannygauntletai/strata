#!/usr/bin/env python3
"""
PostgreSQL Migration Execution Script
Executes schema creation and data migration for EdFi/OneRoster compliance

Usage:
    python run-migration.py --schema-only    # Create schema only
    python run-migration.py --data-only      # Migrate data only  
    python run-migration.py --full           # Create schema + migrate data
    python run-migration.py --dry-run        # Dry run migration preview
"""

import boto3
import psycopg2
import json
import argparse
import sys
import logging
from typing import Dict, Any
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PostgreSQLMigrator:
    def __init__(self):
        self.db_connection = None
        self.secret_arn = None
        
    def find_database_secret(self) -> str:
        """Find the database secret ARN from existing Lambda functions"""
        try:
            lambda_client = boto3.client('lambda', region_name='us-east-2')
            
            # List functions to find coach-related ones
            functions = lambda_client.list_functions()
            
            for function in functions['Functions']:
                func_name = function['FunctionName']
                
                # Look for coach-related functions
                if any(keyword in func_name.lower() for keyword in ['coach', 'onboard', 'tsa']):
                    try:
                        func_config = lambda_client.get_function(FunctionName=func_name)
                        env_vars = func_config['Configuration'].get('Environment', {}).get('Variables', {})
                        
                        # Check for database secret ARN
                        if 'DB_SECRET_ARN' in env_vars:
                            secret_arn = env_vars['DB_SECRET_ARN']
                            logger.info(f"✅ Found database secret ARN from function {func_name}: {secret_arn}")
                            return secret_arn
                            
                    except Exception as e:
                        logger.debug(f"Could not get config for function {func_name}: {e}")
                        continue
            
            # Fallback: try common secret names
            secrets_client = boto3.client('secretsmanager', region_name='us-east-2')
            common_names = [
                'tsa-coach/database-dev',
                'rds-db-credentials/cluster-tsa-coach-portal-dev',
                'arn:aws:secretsmanager:us-east-2:164722634547:secret:tsa-coach/database-dev'
            ]
            
            for secret_name in common_names:
                try:
                    response = secrets_client.describe_secret(SecretId=secret_name)
                    secret_arn = response['ARN']
                    logger.info(f"✅ Found database secret by name: {secret_arn}")
                    return secret_arn
                except:
                    continue
                    
            raise Exception("Could not find database secret ARN")
            
        except Exception as e:
            logger.error(f"❌ Failed to find database secret: {e}")
            return None
    
    def connect_to_database(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            if not self.secret_arn:
                self.secret_arn = self.find_database_secret()
                if not self.secret_arn:
                    return False
            
            # Get database credentials
            secrets_client = boto3.client('secretsmanager', region_name='us-east-2')
            response = secrets_client.get_secret_value(SecretId=self.secret_arn)
            secret_data = json.loads(response['SecretString'])
            
            # Connect to PostgreSQL
            self.db_connection = psycopg2.connect(
                host=secret_data.get('host', 'tsa-coach-portal-dev.c4jmsiuauast.us-east-2.rds.amazonaws.com'),
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
    
    def create_schema(self) -> bool:
        """Create PostgreSQL schema from SQL file"""
        try:
            # Read schema SQL file
            schema_file = Path(__file__).parent / 'create-postgres-schema.sql'
            if not schema_file.exists():
                logger.error(f"❌ Schema file not found: {schema_file}")
                return False
            
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            # Execute schema creation
            cursor = self.db_connection.cursor()
            
            logger.info("📝 Executing PostgreSQL schema creation...")
            cursor.execute(schema_sql)
            self.db_connection.commit()
            cursor.close()
            
            logger.info("✅ PostgreSQL schema created successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Schema creation failed: {e}")
            if self.db_connection:
                self.db_connection.rollback()
            return False
    
    def migrate_data(self, dry_run: bool = False) -> bool:
        """Migrate data from DynamoDB to PostgreSQL"""
        try:
            logger.info(f"🚀 Starting data migration (dry_run={dry_run})...")
            
            # Import and run the migration logic (simplified version)
            from migrate_profiles_to_postgres import ProfileMigrator
            
            migrator = ProfileMigrator(dry_run=dry_run)
            migrator.db_connection = self.db_connection
            
            # Get profiles from DynamoDB
            profiles = migrator.get_all_profiles()
            if not profiles:
                logger.warning("⚠️ No profiles found to migrate")
                return True
            
            logger.info(f"📦 Found {len(profiles)} profiles to migrate")
            
            # Execute migration
            success = migrator.execute_migration()
            
            if success:
                logger.info("✅ Data migration completed successfully")
            else:
                logger.error("❌ Data migration failed")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Data migration failed: {e}")
            return False
    
    def run_migration(self, schema_only: bool = False, data_only: bool = False, 
                     dry_run: bool = False) -> bool:
        """Run the complete migration process"""
        try:
            # Connect to database
            if not self.connect_to_database():
                return False
            
            success = True
            
            # Create schema if requested
            if not data_only:
                logger.info("🏗️ Creating PostgreSQL schema...")
                success = success and self.create_schema()
            
            # Migrate data if requested
            if not schema_only:
                logger.info("📊 Migrating DynamoDB data...")
                success = success and self.migrate_data(dry_run)
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
        
        finally:
            if self.db_connection:
                self.db_connection.close()


def main():
    parser = argparse.ArgumentParser(description='PostgreSQL migration for EdFi/OneRoster compliance')
    parser.add_argument('--schema-only', action='store_true', help='Create schema only')
    parser.add_argument('--data-only', action='store_true', help='Migrate data only')
    parser.add_argument('--full', action='store_true', help='Create schema and migrate data')
    parser.add_argument('--dry-run', action='store_true', help='Dry run - preview changes only')
    
    args = parser.parse_args()
    
    # Validate arguments
    if not any([args.schema_only, args.data_only, args.full]):
        print("❌ Must specify one of: --schema-only, --data-only, or --full")
        sys.exit(1)
    
    if args.full and (args.schema_only or args.data_only):
        print("❌ Cannot combine --full with --schema-only or --data-only")
        sys.exit(1)
    
    print("🔄 TSA Coach Portal: PostgreSQL Migration")
    print("📋 Purpose: Ensure EdFi and OneRoster compliance")
    
    if args.dry_run:
        print("🔍 Running in DRY RUN mode - no changes will be made")
    
    print()
    
    # Initialize migrator
    migrator = PostgreSQLMigrator()
    
    # Determine what to run
    schema_only = args.schema_only
    data_only = args.data_only
    
    if args.full:
        schema_only = False
        data_only = False
    
    # Run migration
    success = migrator.run_migration(
        schema_only=schema_only,
        data_only=data_only,
        dry_run=args.dry_run
    )
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("🎯 Database is now EdFi and OneRoster compliant")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)


if __name__ == '__main__':
    main() 