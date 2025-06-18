"""
Lambda handler for custom reports functionality
Handles report creation, execution, and management
"""
import json
import uuid
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any
import logging

# Import shared utilities from consolidated shared layer
try:
    from shared_utils import create_cors_response, parse_event_body, log_admin_action
    logger = logging.getLogger()
    logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))
except ImportError as e:
    logger.error(f"Failed to import shared utilities: {e}")
    raise

# AWS clients
dynamodb = boto3.resource('dynamodb')

def get_reports_tables():
    """Lazy initialization of reports tables"""
    return {
        'custom_reports': dynamodb.Table(os.environ.get('TSA_CUSTOM_REPORTS_TABLE', 'coach-custom-reportsdev')),
        'analytics_events': dynamodb.Table(os.environ.get('TSA_ANALYTICS_EVENTS_TABLE', 'coach-analytics-eventsdev')),
        'invitations': dynamodb.Table(os.environ.get('TSA_INVITATIONS_TABLE', 'coach-invitationsdev')),
        'profiles': dynamodb.Table(os.environ.get('TSA_PROFILES_TABLE', 'profilesdev'))
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for reports requests"""
    try:
        logger.info(f"Reports handler called")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')
        path_parameters = event.get('pathParameters') or {}
        
        # Route to appropriate handler
        if '/execute' in path:
            report_id = path_parameters.get('report_id')
            return handle_report_execution(event, context, report_id)
        elif '/admin/reports' in path:
            report_id = path_parameters.get('report_id')
            if report_id:
                return handle_custom_report(event, context, report_id)
            else:
                return handle_custom_reports(event, context)
        else:
            return create_cors_response(404, {'error': 'Reports endpoint not found'})
            
    except Exception as e:
        logger.error(f"Error in reports handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_custom_reports(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle custom reports listing and creation"""
    try:
        http_method = event.get('httpMethod', '')
        
        if http_method == 'GET':
            return list_custom_reports(event)
        elif http_method == 'POST':
            return create_custom_report(event)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error handling custom reports: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def list_custom_reports(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all custom reports"""
    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        
        response = reports_table.scan(Limit=limit)
        reports = response.get('Items', [])
        
        # Sort by created_at descending
        reports.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_cors_response(200, {
            'reports': reports,
            'count': len(reports)
        })
        
    except Exception as e:
        logger.error(f"Error listing custom reports: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def create_custom_report(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new custom report"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['report_name', 'report_type', 'data_source']
        for field in required_fields:
            if field not in body:
                return create_cors_response(400, {'error': f'Missing required field: {field}'})
        
        report_id = str(uuid.uuid4())
        
        report_record = {
            'report_id': report_id,
            'report_name': body['report_name'],
            'report_type': body['report_type'],  # 'dashboard', 'export', 'scheduled'
            'data_source': body['data_source'],  # 'invitations', 'coaches', 'analytics'
            'filters': body.get('filters', {}),
            'columns': body.get('columns', []),
            'schedule': body.get('schedule', {}),  # For scheduled reports
            'format': body.get('format', 'json'),  # 'json', 'csv', 'pdf'
            'status': 'active',
            'last_run': None,
            'run_count': 0,
            'created_at': datetime.utcnow().isoformat(),
            'created_by': body.get('admin_user_id', 'system')
        }
        
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        reports_table.put_item(Item=report_record)
        
        # Log the action
        log_admin_action(
            admin_user_id=body.get('admin_user_id', 'system'),
            action='create_custom_report',
            details={
                'report_id': report_id,
                'report_name': body['report_name']
            }
        )
        
        return create_cors_response(201, {
            'message': 'Custom report created successfully',
            'report_id': report_id,
            'report': report_record
        })
        
    except Exception as e:
        logger.error(f"Error creating custom report: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_custom_report(event: Dict[str, Any], context: Any, report_id: str) -> Dict[str, Any]:
    """Handle individual custom report operations"""
    try:
        http_method = event.get('httpMethod', '')
        
        if http_method == 'GET':
            return get_custom_report(report_id)
        elif http_method == 'PUT':
            return update_custom_report(report_id, event)
        elif http_method == 'DELETE':
            return delete_custom_report(report_id)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error handling custom report {report_id}: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def get_custom_report(report_id: str) -> Dict[str, Any]:
    """Get specific custom report details"""
    try:
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        
        response = reports_table.get_item(Key={'report_id': report_id})
        
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Report not found'})
        
        return create_cors_response(200, response['Item'])
        
    except Exception as e:
        logger.error(f"Error getting custom report: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def update_custom_report(report_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update custom report"""
    try:
        body = parse_event_body(event)
        
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        
        # Build update expression dynamically
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': datetime.utcnow().isoformat()}
        
        # Allow updating certain fields
        updatable_fields = ['report_name', 'filters', 'columns', 'schedule', 'format', 'status']
        for field in updatable_fields:
            if field in body:
                update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = body[field]
        
        reports_table.update_item(
            Key={'report_id': report_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return create_cors_response(200, {'message': 'Report updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating custom report: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def delete_custom_report(report_id: str) -> Dict[str, Any]:
    """Delete custom report"""
    try:
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        
        # First check if report exists
        response = reports_table.get_item(Key={'report_id': report_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Report not found'})
        
        report = response['Item']
        
        # Delete the report
        reports_table.delete_item(Key={'report_id': report_id})
        
        # Log the deletion
        log_admin_action(
            admin_user_id='system',
            action='delete_custom_report',
            details={
                'report_id': report_id,
                'report_name': report.get('report_name', 'unknown')
            }
        )
        
        return create_cors_response(200, {'message': 'Report deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting custom report: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_report_execution(event: Dict[str, Any], context: Any, report_id: str) -> Dict[str, Any]:
    """Execute a custom report and return results"""
    try:
        # Get report configuration
        tables = get_reports_tables()
        reports_table = tables['custom_reports']
        
        response = reports_table.get_item(Key={'report_id': report_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Report not found'})
        
        report = response['Item']
        
        # Execute report based on data source
        data_source = report.get('data_source')
        filters = report.get('filters', {})
        columns = report.get('columns', [])
        
        if data_source == 'invitations':
            results = execute_invitations_report(filters, columns, tables)
        elif data_source == 'coaches':
            results = execute_coaches_report(filters, columns, tables)
        elif data_source == 'analytics':
            results = execute_analytics_report(filters, columns, tables)
        else:
            return create_cors_response(400, {'error': f'Unsupported data source: {data_source}'})
        
        # Update report run statistics
        reports_table.update_item(
            Key={'report_id': report_id},
            UpdateExpression='SET last_run = :timestamp, run_count = run_count + :inc',
            ExpressionAttributeValues={
                ':timestamp': datetime.utcnow().isoformat(),
                ':inc': 1
            }
        )
        
        return create_cors_response(200, {
            'report_id': report_id,
            'report_name': report.get('report_name'),
            'data_source': data_source,
            'executed_at': datetime.utcnow().isoformat(),
            'row_count': len(results),
            'data': results
        })
        
    except Exception as e:
        logger.error(f"Error executing report {report_id}: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def execute_invitations_report(filters: Dict[str, Any], columns: list, tables: Dict) -> list:
    """Execute invitations-based report"""
    try:
        invitations_table = tables['invitations']
        
        # Get all invitations
        response = invitations_table.scan()
        invitations = response.get('Items', [])
        
        # Apply filters
        if filters:
            filtered_invitations = []
            for inv in invitations:
                include = True
                for key, value in filters.items():
                    if key in inv and inv[key] != value:
                        include = False
                        break
                if include:
                    filtered_invitations.append(inv)
            invitations = filtered_invitations
        
        # Select specific columns if specified
        if columns:
            results = []
            for inv in invitations:
                filtered_inv = {col: inv.get(col) for col in columns if col in inv}
                results.append(filtered_inv)
            return results
        
        return invitations
        
    except Exception as e:
        logger.error(f"Error executing invitations report: {str(e)}")
        return []


def execute_coaches_report(filters: Dict[str, Any], columns: list, tables: Dict) -> list:
    """Execute coaches-based report"""
    try:
        profiles_table = tables['profiles']
        
        # Get all coaches
        response = profiles_table.scan()
        coaches = response.get('Items', [])
        
        # Apply filters
        if filters:
            filtered_coaches = []
            for coach in coaches:
                include = True
                for key, value in filters.items():
                    if key in coach and coach[key] != value:
                        include = False
                        break
                if include:
                    filtered_coaches.append(coach)
            coaches = filtered_coaches
        
        # Select specific columns if specified
        if columns:
            results = []
            for coach in coaches:
                filtered_coach = {col: coach.get(col) for col in columns if col in coach}
                results.append(filtered_coach)
            return results
        
        return coaches
        
    except Exception as e:
        logger.error(f"Error executing coaches report: {str(e)}")
        return []


def execute_analytics_report(filters: Dict[str, Any], columns: list, tables: Dict) -> list:
    """Execute analytics-based report"""
    try:
        analytics_table = tables['analytics_events']
        
        # Get analytics events (limited for performance)
        response = analytics_table.scan(Limit=100)
        events = response.get('Items', [])
        
        # Apply filters
        if filters:
            filtered_events = []
            for event in events:
                include = True
                for key, value in filters.items():
                    if key in event and event[key] != value:
                        include = False
                        break
                if include:
                    filtered_events.append(event)
            events = filtered_events
        
        # Select specific columns if specified
        if columns:
            results = []
            for event in events:
                filtered_event = {col: event.get(col) for col in columns if col in event}
                results.append(filtered_event)
            return results
        
        return events
        
    except Exception as e:
        logger.error(f"Error executing analytics report: {str(e)}")
        return []

