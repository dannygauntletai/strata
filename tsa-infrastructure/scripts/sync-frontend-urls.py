#!/usr/bin/env python3
"""
Texas Sports Academy Frontend URL Sync Script

This script automatically synchronizes frontend environment files with CDK deployment outputs.
It fetches API Gateway URLs from CloudFormation stacks and updates frontend .env files.

SECURITY: This creates LOCAL .env files that are gitignored and never committed to the repository.

Usage:
    python sync-frontend-urls.py [--stage dev|staging|prod] [--dry-run]

Example:
    python sync-frontend-urls.py --stage dev
    python sync-frontend-urls.py --stage prod --dry-run
"""

import boto3
import argparse
import json
import os
from pathlib import Path
from typing import Dict, Optional
import sys
from datetime import datetime

class FrontendUrlSyncer:
    def __init__(self, stage: str = "dev", dry_run: bool = False):
        self.stage = stage
        self.dry_run = dry_run
        self.cloudformation = boto3.client('cloudformation')
        
        # Get project root (two levels up from this script)
        script_dir = Path(__file__).parent
        self.project_root = script_dir.parent.parent
        
        print(f"🔍 Project Root: {self.project_root}")
        print(f"🏷️  Stage: {self.stage}")
        print(f"🧪 Dry Run: {self.dry_run}")
        print(f"🔐 Security Note: Creating local .env files (gitignored, never committed)")

    def get_stack_output(self, stack_name: str, output_key: str) -> Optional[str]:
        """Get CloudFormation stack output value"""
        try:
            response = self.cloudformation.describe_stacks(StackName=stack_name)
            stack = response['Stacks'][0]
            
            for output in stack.get('Outputs', []):
                if output['OutputKey'] == output_key:
                    return output['OutputValue']
            
            print(f"⚠️  Output key '{output_key}' not found in stack '{stack_name}'")
            return None
            
        except Exception as e:
            print(f"❌ Error getting stack output for {stack_name}: {str(e)}")
            return None

    def get_api_urls(self) -> Dict[str, Optional[str]]:
        """Get all API URLs from CDK deployment outputs"""
        print(f"\n📡 Fetching API URLs for stage '{self.stage}'...")
        
        # Define stack names and output keys
        stack_configs = {
            'admin_api': {
                'stack': f'tsa-admin-backend-{self.stage}',
                'output': 'AdminApiUrl'
            },
            'coach_api': {
                'stack': f'tsa-coach-backend-{self.stage}',
                'output': 'CoachApiUrl'
            },
            'passwordless_auth': {
                'stack': f'tsa-coach-backend-{self.stage}',
                'output': 'PasswordlessApiUrl'
            }
        }
        
        urls = {}
        for service, config in stack_configs.items():
            url = self.get_stack_output(config['stack'], config['output'])
            urls[service] = url
            
            if url:
                print(f"✅ {service}: {url}")
            else:
                print(f"❌ {service}: Not found")
        
        return urls

    def validate_urls(self, urls: Dict[str, Optional[str]]) -> bool:
        """Validate that all required URLs are present"""
        missing_urls = [service for service, url in urls.items() if not url]
        
        if missing_urls:
            print(f"\n❌ Missing API URLs for: {', '.join(missing_urls)}")
            print("💡 Make sure CDK stacks are deployed and try again")
            return False
        
        print("\n✅ All API URLs retrieved successfully")
        return True

    def create_env_files(self, urls: Dict[str, str]) -> None:
        """Create LOCAL .env files (gitignored for security)"""
        print("\n📝 Creating single .env file at project root...")
        
        # Single .env file for the entire monorepo
        env_content = f"""# === TSA MONOREPO ENVIRONMENT VARIABLES ===
# Generated on {datetime.now().isoformat()}
# Single .env file for both admin and coach frontends

# API Endpoints (consolidated naming)
NEXT_PUBLIC_TSA_ADMIN_API_URL={urls['admin_api']}
NEXT_PUBLIC_TSA_COACH_API_URL={urls['coach_api']}
NEXT_PUBLIC_TSA_AUTH_API_URL={urls['passwordless_auth']}

# Backwards compatibility (can be removed later)
NEXT_PUBLIC_ADMIN_API_URL={urls['admin_api']}
NEXT_PUBLIC_COACH_API_URL={urls['coach_api']}
NEXT_PUBLIC_API_URL={urls['coach_api']}
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL={urls['passwordless_auth']}

# Google Services (consolidated naming)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA_ViglJnReu97sVF_jAVrV1OQb0rq3jeQ
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyA_ViglJnReu97sVF_jAVrV1OQb0rq3jeQ

# Google OAuth & AI (backend only, but included for completeness)
GOOGLE_CLIENT_ID=235403886268-f2s585025sr5p4la4e9ar9qrbighlpe5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_AI_API_KEY=AIzaSyArj6KYaWa6a7RLIXcU9i0yJsZeNPQEoME

# Mapbox Services
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZGFubnlhbW90YSIsImEiOiJjbWJwNjFpeXEwMTQwMnJvOTRhMnBjeXZjIn0.vlbe5hguGZhGcGoH7hnwNA

# Environment Settings
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STAGE={self.stage}
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_APP_NAME=TSA Portal ({self.stage.upper()})
NEXT_PUBLIC_ADMIN_EMAIL=admin@texassportsacademy.com
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
"""
        
        if not self.dry_run:
            try:
                env_path = self.project_root / ".env"
                env_path.write_text(env_content)
                print(f"✅ Created single .env file: {env_path}")
            except Exception as e:
                print(f"❌ Error creating .env file: {e}")
        else:
            print(f"🧪 Would create single .env file: {self.project_root / '.env'}")

    def run(self) -> None:
        """Main execution flow"""
        try:
            print("🚀 TSA Frontend URL Synchronization")
            print(f"📂 Project root: {self.project_root}")
            print(f"🎯 Stage: {self.stage}")
            
            if self.dry_run:
                print("🧪 DRY RUN MODE - No files will be modified")
            
            print("\n🔍 Discovering API endpoints from CDK...")
            urls = self.get_api_urls()
            
            if self.validate_urls(urls):
                print("\n✅ All required API endpoints discovered successfully!")
                self.create_env_files(urls)
                
                print("\n🎯 Environment setup complete!")
                print("   API URLs have been automatically configured")
                print("   Both admin and coach frontends will read from the single .env file")
                print("\n🚀 Ready to start development:")
                print("   npm run dev:admin    # Start admin frontend")  
                print("   npm run dev:coach    # Start coach frontend")
                print("   npm run dev          # Start both frontends")
                
            else:
                print("\n❌ Failed to discover all required API endpoints")
                print("   Missing endpoints will be reported above")
                print("\n💡 Try deploying the infrastructure first:")
                print("   cd tsa-infrastructure && cdk deploy --all")
                
        except Exception as e:
            print(f"\n❌ Error during synchronization: {e}")
            if not self.dry_run:
                print("💡 Try running with --dry-run flag to see what would be changed")
            raise

def main():
    parser = argparse.ArgumentParser(
        description="Sync frontend environment files with CDK deployment outputs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sync-frontend-urls.py --stage dev
  python sync-frontend-urls.py --stage prod --dry-run
  python sync-frontend-urls.py --stage staging

SECURITY: This creates LOCAL .env files that are gitignored and never committed.
        """
    )
    
    parser.add_argument(
        '--stage',
        choices=['dev', 'staging', 'prod'],
        default='dev',
        help='Deployment stage (default: dev)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    
    args = parser.parse_args()
    
    # Create syncer and run
    syncer = FrontendUrlSyncer(stage=args.stage, dry_run=args.dry_run)
    
    try:
        syncer.run()
        sys.exit(0)
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 