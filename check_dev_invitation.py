import boto3
import json
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('coach-invitations-dev')

invitation_id = 'ee458d56-cc5a-4d84-88c6-e40bdb6e0d41'

try:
    # Check specific invitation
    response = table.get_item(Key={'invitation_id': invitation_id})
    if 'Item' in response:
        item = response['Item']
        print(f'✅ Found invitation: {invitation_id}')
        print(f'  Email: {item.get("email")}')
        print(f'  Status: {item.get("status")}')
        print(f'  Expires: {item.get("expires_at")}')
        
        # Check if expired
        expires_at = item.get('expires_at')
        if expires_at:
            exp_timestamp = float(expires_at)
            now_timestamp = datetime.now(timezone.utc).timestamp()
            print(f'  Current time: {now_timestamp}')
            print(f'  Expired: {now_timestamp > exp_timestamp}')
            
        # Check status validity
        valid_statuses = ['pending', 'accepted']
        print(f'  Status valid: {item.get("status") in valid_statuses}')
    else:
        print(f'❌ Invitation not found: {invitation_id}')
        
    # Also scan for all invitations in dev to see what's there
    print('\n📋 All invitations in dev:')
    scan_response = table.scan(Limit=10)
    items = scan_response.get('Items', [])
    
    if items:
        print(f'Found {len(items)} invitations:')
        for item in items:
            print(f'  ID: {item.get("invitation_id")}')
            print(f'  Email: {item.get("email")}')
            print(f'  Status: {item.get("status")}')
            print('  ---')
    else:
        print('No invitations found in dev')
        
except Exception as e:
    print(f'Error: {e}') 