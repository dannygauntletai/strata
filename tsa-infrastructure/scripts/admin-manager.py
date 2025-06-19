#!/usr/bin/env python3
"""
TSA Admin User Management Script
Manages admin users in Cognito User Pool and DynamoDB profiles table
"""

import boto3
import json
import sys
import argparse
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import re


class TSAAdminManager:
    def __init__(self, stage: str = 'dev'):
        """Initialize the admin manager for a specific stage"""
        self.stage = stage
        self.cognito_client = boto3.client('cognito-idp')
        self.dynamodb = boto3.resource('dynamodb')
        self.ssm_client = boto3.client('ssm')
        
        # Get configuration from CloudFormation/SSM
        self._load_config()
    
    def _load_config(self):
        """Load configuration from AWS resources"""
        try:
            # Get User Pool ID from CloudFormation
            cf_client = boto3.client('cloudformation')
            
            # Try to get from security stack
            security_stack_name = f"tsa-infra-security-{self.stage}"
            security_response = cf_client.describe_stacks(StackName=security_stack_name)
            
            self.user_pool_id = None
            for output in security_response['Stacks'][0]['Outputs']:
                if output['OutputKey'] == 'UserPoolId':
                    self.user_pool_id = output['OutputValue']
                    break
            
            if not self.user_pool_id:
                raise ValueError(f"Could not find UserPoolId in {security_stack_name}")
            
            # Get profiles table name from SSM
            try:
                profiles_param = self.ssm_client.get_parameter(
                    Name=f"/tsa-shared/{self.stage}/table-names/profiles"
                )
                self.profiles_table_name = profiles_param['Parameter']['Value']
            except:
                # Fallback to conventional naming
                self.profiles_table_name = f"profiles-{self.stage}"
            
            # Get users table name from SSM  
            try:
                users_param = self.ssm_client.get_parameter(
                    Name=f"/tsa-shared/{self.stage}/table-names/users"
                )
                self.users_table_name = users_param['Parameter']['Value']
            except:
                # Fallback to conventional naming
                self.users_table_name = f"users-{self.stage}"
                
            print(f"✅ Configuration loaded:")
            print(f"   Stage: {self.stage}")
            print(f"   User Pool: {self.user_pool_id}")
            print(f"   Profiles Table: {self.profiles_table_name}")
            print(f"   Users Table: {self.users_table_name}")
            
        except Exception as e:
            print(f"❌ Error loading configuration: {e}")
            sys.exit(1)
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email.strip()) is not None
    
    def check_cognito_user_exists(self, email: str) -> bool:
        """Check if user exists in Cognito"""
        try:
            self.cognito_client.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )
            return True
        except self.cognito_client.exceptions.UserNotFoundException:
            return False
        except Exception as e:
            print(f"❌ Error checking Cognito user: {e}")
            return False
    
    def create_cognito_admin(self, email: str, first_name: str, last_name: str) -> bool:
        """Create admin user in Cognito"""
        try:
            if self.check_cognito_user_exists(email):
                print(f"⚠️  User {email} already exists in Cognito")
                return True
            
            # Create user attributes
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'custom:user_role', 'Value': 'admin'},
                {'Name': 'given_name', 'Value': first_name},
                {'Name': 'family_name', 'Value': last_name}
            ]
            
            # Create user
            self.cognito_client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=user_attributes,
                MessageAction='SUPPRESS'  # Don't send default email
            )
            
            # Generate secure password and set it as permanent
            import secrets
            import string
            password_chars = string.ascii_letters + string.digits + "!@#$%^&*"
            temp_password = ''.join(secrets.choice(password_chars) for _ in range(16))
            
            self.cognito_client.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=email,
                Password=temp_password,
                Permanent=True
            )
            
            print(f"✅ Created Cognito user: {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error creating Cognito user: {e}")
            return False
    
    def create_profile_record(self, email: str, first_name: str, last_name: str) -> bool:
        """Create admin profile in DynamoDB profiles table"""
        try:
            profiles_table = self.dynamodb.Table(self.profiles_table_name)
            
            # Check if profile already exists
            response = profiles_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email.lower()}
            )
            
            if response['Items']:
                print(f"⚠️  Profile for {email} already exists")
                return True
            
            # Create profile record
            profile_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            
            profile_item = {
                'profile_id': profile_id,
                'email': email.lower(),
                'first_name': first_name,
                'last_name': last_name,
                'user_type': 'admin',
                'status': 'active',
                'created_at': now,
                'updated_at': now,
                'permissions': {
                    'admin_access': True,
                    'coach_management': True,
                    'parent_management': True,
                    'event_management': True,
                    'analytics_access': True,
                    'system_settings': True
                }
            }
            
            profiles_table.put_item(Item=profile_item)
            print(f"✅ Created profile record: {profile_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error creating profile record: {e}")
            return False
    
    def create_user_record(self, email: str, first_name: str, last_name: str) -> bool:
        """Create admin user record in DynamoDB users table (if it exists)"""
        try:
            # Check if users table exists
            try:
                users_table = self.dynamodb.Table(self.users_table_name)
                users_table.load()
            except:
                print(f"ℹ️  Users table {self.users_table_name} doesn't exist, skipping user record creation")
                return True
            
            # Check if user already exists
            response = users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email.lower()}
            )
            
            if response['Items']:
                print(f"⚠️  User record for {email} already exists")
                return True
            
            # Create user record
            user_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            
            user_item = {
                'user_id': user_id,
                'sourced_id': f"tsa-admin-{user_id}",
                'username': email,
                'email': email.lower(),
                'given_name': first_name,
                'family_name': last_name,
                'role': 'administrator',
                'status': 'active',
                'date_last_modified': now
            }
            
            users_table.put_item(Item=user_item)
            print(f"✅ Created user record: {user_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error creating user record: {e}")
            return False
    
    def add_admin(self, email: str, first_name: str, last_name: str) -> bool:
        """Add a new admin user (complete process)"""
        print(f"\n🔧 Adding admin user: {email}")
        print("=" * 50)
        
        # Validate input
        if not self.validate_email(email):
            print(f"❌ Invalid email format: {email}")
            return False
        
        if not first_name.strip() or not last_name.strip():
            print("❌ First name and last name are required")
            return False
        
        # Create in all systems
        success = True
        success &= self.create_cognito_admin(email, first_name, last_name)
        success &= self.create_profile_record(email, first_name, last_name)
        success &= self.create_user_record(email, first_name, last_name)
        
        if success:
            print(f"\n✅ Successfully added admin: {email}")
            print("🔗 Next steps:")
            print("   1. Admin can now request a magic link at the admin login page")
            print("   2. They will receive an email with a secure login link")
            print("   3. No password required - uses passwordless authentication")
        else:
            print(f"\n❌ Failed to add admin: {email}")
        
        return success
    
    def list_admins(self) -> List[Dict[str, Any]]:
        """List all admin users"""
        print(f"\n📋 Listing admin users for stage: {self.stage}")
        print("=" * 50)
        
        admins = []
        
        try:
            # Get from profiles table
            profiles_table = self.dynamodb.Table(self.profiles_table_name)
            response = profiles_table.scan(
                FilterExpression='user_type = :user_type',
                ExpressionAttributeValues={':user_type': 'admin'}
            )
            
            for item in response['Items']:
                admin_info = {
                    'email': item.get('email'),
                    'first_name': item.get('first_name'),
                    'last_name': item.get('last_name'),
                    'profile_id': item.get('profile_id'),
                    'status': item.get('status'),
                    'created_at': item.get('created_at'),
                    'cognito_exists': self.check_cognito_user_exists(item.get('email', ''))
                }
                admins.append(admin_info)
                
                # Print admin info
                status_icon = "✅" if admin_info['cognito_exists'] else "⚠️"
                print(f"{status_icon} {admin_info['email']}")
                print(f"   Name: {admin_info['first_name']} {admin_info['last_name']}")
                print(f"   Status: {admin_info['status']}")
                print(f"   Profile ID: {admin_info['profile_id']}")
                print(f"   Created: {admin_info['created_at']}")
                print(f"   Cognito: {'✅ Active' if admin_info['cognito_exists'] else '❌ Missing'}")
                print()
            
            print(f"📊 Total admins found: {len(admins)}")
            
        except Exception as e:
            print(f"❌ Error listing admins: {e}")
        
        return admins
    
    def remove_admin(self, email: str) -> bool:
        """Remove admin user (disable, don't delete)"""
        print(f"\n🗑️  Removing admin user: {email}")
        print("=" * 50)
        
        if not self.validate_email(email):
            print(f"❌ Invalid email format: {email}")
            return False
        
        success = True
        
        try:
            # Disable in Cognito
            if self.check_cognito_user_exists(email):
                self.cognito_client.admin_disable_user(
                    UserPoolId=self.user_pool_id,
                    Username=email
                )
                print(f"✅ Disabled Cognito user: {email}")
            else:
                print(f"⚠️  Cognito user {email} not found")
            
            # Update profile status
            profiles_table = self.dynamodb.Table(self.profiles_table_name)
            response = profiles_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email.lower()}
            )
            
            if response['Items']:
                profile = response['Items'][0]
                profiles_table.update_item(
                    Key={'profile_id': profile['profile_id']},
                    UpdateExpression='SET #status = :status, updated_at = :updated_at',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':status': 'disabled',
                        ':updated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
                    }
                )
                print(f"✅ Disabled profile: {profile['profile_id']}")
            else:
                print(f"⚠️  Profile for {email} not found")
                success = False
            
        except Exception as e:
            print(f"❌ Error removing admin: {e}")
            success = False
        
        if success:
            print(f"\n✅ Successfully removed admin: {email}")
        else:
            print(f"\n❌ Failed to remove admin: {email}")
        
        return success


def main():
    parser = argparse.ArgumentParser(description='TSA Admin User Management')
    parser.add_argument('--stage', '-s', default='dev', help='Environment stage (dev, staging, prod)')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Add admin command
    add_parser = subparsers.add_parser('add', help='Add a new admin user')
    add_parser.add_argument('--email', '-e', required=True, help='Admin email address')
    add_parser.add_argument('--first-name', '-f', required=True, help='First name')
    add_parser.add_argument('--last-name', '-l', required=True, help='Last name')
    
    # List admins command
    list_parser = subparsers.add_parser('list', help='List all admin users')
    
    # Remove admin command
    remove_parser = subparsers.add_parser('remove', help='Remove/disable admin user')
    remove_parser.add_argument('--email', '-e', required=True, help='Admin email address')
    
    # Quick add command for the specific request
    quick_parser = subparsers.add_parser('quick-add-danny', help='Quick add danny.a.mota@gmail.com as admin')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize admin manager
    admin_manager = TSAAdminManager(args.stage)
    
    # Execute command
    if args.command == 'add':
        admin_manager.add_admin(args.email, args.first_name, args.last_name)
    
    elif args.command == 'list':
        admin_manager.list_admins()
    
    elif args.command == 'remove':
        admin_manager.remove_admin(args.email)
    
    elif args.command == 'quick-add-danny':
        admin_manager.add_admin('danny.a.mota@gmail.com', 'Danny', 'Mota')
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main() 