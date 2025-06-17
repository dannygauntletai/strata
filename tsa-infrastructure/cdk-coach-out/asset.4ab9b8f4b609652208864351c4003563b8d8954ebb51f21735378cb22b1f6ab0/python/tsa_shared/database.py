"""
Database Utilities - Centralized DynamoDB access for TSA services

Provides consistent table naming, connection handling, and timestamp utilities
"""
import boto3
import os
from datetime import datetime
from typing import Optional, Any


def get_table_name(table_key: str) -> str:
    """
    Get standardized table name using centralized naming convention
    
    Args:
        table_key: Key identifier for the table (e.g., 'profiles', 'events', 'enrollments')
    
    Returns:
        Full table name with environment prefix
    """
    # Environment-based table naming
    stage = os.environ.get('STAGE', 'dev')
    
    # Standardized table name mapping
    table_mapping = {
        # Core user tables (OneRoster/EdFi standard)
        'users': f'users-{stage}',
        'profiles': f'profiles-{stage}',
        'organizations': f'organizations-{stage}',
        
        # Enrollment and academic tables
        'enrollments': f'tsa-parent-enrollments-{stage}',
        'students': f'students-{stage}',
        'academic_sessions': f'academic-sessions-{stage}',
        
        # Event and activity tables
        'events': f'events-{stage}',
        'event_registrations': f'event-registrations-{stage}',
        'event_invitations': f'event-invitations-{stage}',
        
        # Communication tables
        'parent_invitations': f'parent-invitations-{stage}',
        'notifications': f'notifications-{stage}',
        'messages': f'messages-{stage}',
        
        # Progress and assessment tables
        'bootcamp_progress': f'bootcamp-progress-{stage}',
        'quiz_attempts': f'quiz-attempts-{stage}',
        'assessments': f'assessments-{stage}',
        'timeline_events': f'timeline-events-{stage}',
        
        # Administrative tables
        'background_checks': f'background-checks-{stage}',
        'legal_requirements': f'legal-requirements-{stage}',
        'documents': f'tsa-coach-documents-{stage}',
        
        # Integration tables
        'calendar_integrations': f'calendar-integrations-{stage}',
        'external_integrations': f'external-integrations-{stage}',
        
        # System tables
        'audit_logs': f'audit-logs-{stage}',
        'system_config': f'system-config-{stage}'
    }
    
    # Get table name or construct default
    table_name = table_mapping.get(table_key)
    if not table_name:
        # Fallback: construct name from key
        table_name = f'{table_key.lower().replace("_", "-")}-{stage}'
        print(f"⚠️ Using fallback table name for '{table_key}': {table_name}")
    
    print(f"🗄️ Table lookup: {table_key} -> {table_name}")
    return table_name


def get_dynamodb_table(table_name: str):
    """
    Get DynamoDB table resource with error handling
    
    Args:
        table_name: Full DynamoDB table name
        
    Returns:
        DynamoDB Table resource
        
    Raises:
        Exception: If table access fails
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Verify table exists by loading metadata
        table.load()
        
        return table
        
    except Exception as e:
        print(f"❌ Error accessing DynamoDB table '{table_name}': {str(e)}")
        raise


def get_current_time() -> str:
    """
    Get current timestamp in ISO format
    Standardized across all TSA services
    
    Returns:
        ISO formatted timestamp string
    """
    return datetime.utcnow().isoformat() + 'Z'


def get_current_timestamp() -> str:
    """
    Alias for get_current_time() for backward compatibility
    
    Returns:
        ISO formatted timestamp string
    """
    return get_current_time()


def batch_get_items(table, keys: list, consistent_read: bool = False) -> list:
    """
    Batch get items from DynamoDB with error handling
    
    Args:
        table: DynamoDB table resource
        keys: List of key dictionaries
        consistent_read: Whether to use consistent reads
        
    Returns:
        List of items found
    """
    try:
        if not keys:
            return []
        
        # DynamoDB batch_get_item has 100 item limit
        items = []
        for i in range(0, len(keys), 100):
            batch_keys = keys[i:i+100]
            
            response = table.batch_get_item(
                RequestItems={
                    table.table_name: {
                        'Keys': batch_keys,
                        'ConsistentRead': consistent_read
                    }
                }
            )
            
            items.extend(response.get('Responses', {}).get(table.table_name, []))
        
        return items
        
    except Exception as e:
        print(f"❌ Error in batch get items: {str(e)}")
        return []


def batch_write_items(table, items: list, operation: str = 'put') -> dict:
    """
    Batch write items to DynamoDB with error handling
    
    Args:
        table: DynamoDB table resource
        items: List of items to write
        operation: 'put' or 'delete'
        
    Returns:
        Dict with success status and any unprocessed items
    """
    try:
        if not items:
            return {'success': True, 'unprocessed_items': []}
        
        unprocessed_items = []
        
        # DynamoDB batch_write_item has 25 item limit
        for i in range(0, len(items), 25):
            batch_items = items[i:i+25]
            
            # Format items for batch write
            request_items = []
            for item in batch_items:
                if operation == 'put':
                    request_items.append({'PutRequest': {'Item': item}})
                elif operation == 'delete':
                    request_items.append({'DeleteRequest': {'Key': item}})
            
            response = table.batch_write_item(
                RequestItems={
                    table.table_name: request_items
                }
            )
            
            # Collect any unprocessed items
            unprocessed = response.get('UnprocessedItems', {}).get(table.table_name, [])
            unprocessed_items.extend(unprocessed)
        
        return {
            'success': len(unprocessed_items) == 0,
            'unprocessed_items': unprocessed_items
        }
        
    except Exception as e:
        print(f"❌ Error in batch write items: {str(e)}")
        return {'success': False, 'error': str(e)}


def query_with_pagination(table, **query_kwargs) -> dict:
    """
    Query DynamoDB with automatic pagination
    
    Args:
        table: DynamoDB table resource
        **query_kwargs: Query parameters
        
    Returns:
        Dict with all items and pagination info
    """
    try:
        all_items = []
        last_evaluated_key = None
        page_count = 0
        
        while True:
            # Add pagination key if we have one
            if last_evaluated_key:
                query_kwargs['ExclusiveStartKey'] = last_evaluated_key
            
            response = table.query(**query_kwargs)
            
            # Add items from this page
            items = response.get('Items', [])
            all_items.extend(items)
            page_count += 1
            
            # Check if there are more pages
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
            
            # Safety check to prevent infinite loops
            if page_count > 100:
                print("⚠️ Query pagination exceeded 100 pages, stopping")
                break
        
        return {
            'Items': all_items,
            'Count': len(all_items),
            'PageCount': page_count,
            'ScannedCount': response.get('ScannedCount', 0)
        }
        
    except Exception as e:
        print(f"❌ Error in paginated query: {str(e)}")
        return {'Items': [], 'Count': 0, 'PageCount': 0, 'ScannedCount': 0}


def scan_with_pagination(table, **scan_kwargs) -> dict:
    """
    Scan DynamoDB with automatic pagination
    
    Args:
        table: DynamoDB table resource
        **scan_kwargs: Scan parameters
        
    Returns:
        Dict with all items and pagination info
    """
    try:
        all_items = []
        last_evaluated_key = None
        page_count = 0
        
        while True:
            # Add pagination key if we have one
            if last_evaluated_key:
                scan_kwargs['ExclusiveStartKey'] = last_evaluated_key
            
            response = table.scan(**scan_kwargs)
            
            # Add items from this page
            items = response.get('Items', [])
            all_items.extend(items)
            page_count += 1
            
            # Check if there are more pages
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
            
            # Safety check to prevent infinite loops
            if page_count > 100:
                print("⚠️ Scan pagination exceeded 100 pages, stopping")
                break
        
        return {
            'Items': all_items,
            'Count': len(all_items),
            'PageCount': page_count,
            'ScannedCount': response.get('ScannedCount', 0)
        }
        
    except Exception as e:
        print(f"❌ Error in paginated scan: {str(e)}")
        return {'Items': [], 'Count': 0, 'PageCount': 0, 'ScannedCount': 0}


def check_table_health(table_name: str) -> dict:
    """
    Check if a DynamoDB table is accessible and healthy
    
    Args:
        table_name: Name of the table to check
        
    Returns:
        Dict with health status information
    """
    try:
        table = get_dynamodb_table(table_name)
        
        # Get table metadata
        table_status = table.table_status
        item_count = table.item_count
        
        # Perform a simple query to test responsiveness
        start_time = datetime.utcnow()
        table.scan(Limit=1)
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            'healthy': True,
            'table_name': table_name,
            'status': table_status,
            'item_count': item_count,
            'response_time_seconds': response_time,
            'checked_at': get_current_time()
        }
        
    except Exception as e:
        return {
            'healthy': False,
            'table_name': table_name,
            'error': str(e),
            'checked_at': get_current_time()
        } 