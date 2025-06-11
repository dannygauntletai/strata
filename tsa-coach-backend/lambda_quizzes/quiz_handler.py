"""
Lambda handler for quiz CRUD operations
"""
import json
import os
from typing import Dict, Any
from shared_utils import (
    create_response, get_dynamodb_table, parse_event_body, 
    get_current_timestamp, validate_required_fields, get_path_parameters
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for quiz requests"""
    try:
        http_method = event.get('httpMethod', '')
        path_params = get_path_parameters(event)
        
        if http_method == 'GET':
            if 'quiz_id' in path_params:
                return get_quiz(path_params['quiz_id'])
            else:
                return list_quizzes(event)
        elif http_method == 'POST':
            return create_quiz(event)
        elif http_method == 'PUT':
            if 'quiz_id' in path_params:
                return update_quiz(path_params['quiz_id'], event)
            else:
                return create_response(400, {'error': 'Quiz ID required for update'})
        elif http_method == 'DELETE':
            if 'quiz_id' in path_params:
                return delete_quiz(path_params['quiz_id'])
            else:
                return create_response(400, {'error': 'Quiz ID required for deletion'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in quiz handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def create_quiz(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new quiz"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['title', 'description', 'coach_id', 'sport']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        quiz_id = f"quiz_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        quiz_data = {
            'quiz_id': quiz_id,
            'title': body['title'],
            'description': body['description'],
            'coach_id': body['coach_id'],
            'sport': body['sport'],
            'difficulty_level': body.get('difficulty_level', 'intermediate'),
            'time_limit_minutes': body.get('time_limit_minutes', 30),
            'passing_score': body.get('passing_score', 70),
            'tags': body.get('tags', []),
            'is_published': body.get('is_published', False),
            'question_count': 0,  # Will be updated when questions are added
            'status': 'draft',
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        quizzes_table.put_item(Item=quiz_data)
        
        return create_response(201, {
            'message': 'Quiz created successfully',
            'quiz': quiz_data
        })
        
    except Exception as e:
        print(f"Error creating quiz: {str(e)}")
        return create_response(500, {'error': 'Failed to create quiz'})


def get_quiz(quiz_id: str) -> Dict[str, Any]:
    """Get a specific quiz by ID"""
    try:
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Quiz not found'})
        
        quiz = response['Item']
        
        # Get associated questions
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        questions_response = questions_table.query(
            IndexName='quiz-id-index',
            KeyConditionExpression='quiz_id = :quiz_id',
            ExpressionAttributeValues={':quiz_id': quiz_id}
        )
        
        quiz['questions'] = questions_response.get('Items', [])
        
        return create_response(200, {'quiz': quiz})
        
    except Exception as e:
        print(f"Error getting quiz: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve quiz'})


def list_quizzes(event: Dict[str, Any]) -> Dict[str, Any]:
    """List quizzes with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        coach_id = query_params.get('coach_id')
        sport = query_params.get('sport')
        published_only = query_params.get('published_only', 'false').lower() == 'true'
        
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Build filter expression
        filter_expressions = []
        expression_values = {}
        
        if coach_id:
            filter_expressions.append('coach_id = :coach_id')
            expression_values[':coach_id'] = coach_id
        
        if sport:
            filter_expressions.append('sport = :sport')
            expression_values[':sport'] = sport
        
        if published_only:
            filter_expressions.append('is_published = :published')
            expression_values[':published'] = True
        
        scan_kwargs = {}
        if filter_expressions:
            scan_kwargs['FilterExpression'] = ' AND '.join(filter_expressions)
            scan_kwargs['ExpressionAttributeValues'] = expression_values
        
        response = quizzes_table.scan(**scan_kwargs)
        
        return create_response(200, {
            'quizzes': response.get('Items', []),
            'count': len(response.get('Items', []))
        })
        
    except Exception as e:
        print(f"Error listing quizzes: {str(e)}")
        return create_response(500, {'error': 'Failed to list quizzes'})


def update_quiz(quiz_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing quiz"""
    try:
        body = parse_event_body(event)
        
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Check if quiz exists
        response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Quiz not found'})
        
        # Build update expression
        update_expressions = []
        expression_values = {}
        expression_names = {}
        
        updatable_fields = [
            'title', 'description', 'difficulty_level', 'time_limit_minutes',
            'passing_score', 'tags', 'is_published'
        ]
        
        for field in updatable_fields:
            if field in body:
                update_expressions.append(f'#{field} = :{field}')
                expression_names[f'#{field}'] = field
                expression_values[f':{field}'] = body[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No valid fields to update'})
        
        # Always update the updated_at timestamp
        update_expressions.append('#updated_at = :updated_at')
        expression_names['#updated_at'] = 'updated_at'
        expression_values[':updated_at'] = get_current_timestamp()
        
        # Update status based on published state
        if 'is_published' in body:
            update_expressions.append('#status = :status')
            expression_names['#status'] = 'status'
            expression_values[':status'] = 'published' if body['is_published'] else 'draft'
        
        quizzes_table.update_item(
            Key={'quiz_id': quiz_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated quiz
        updated_response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        
        return create_response(200, {
            'message': 'Quiz updated successfully',
            'quiz': updated_response['Item']
        })
        
    except Exception as e:
        print(f"Error updating quiz: {str(e)}")
        return create_response(500, {'error': 'Failed to update quiz'})


def delete_quiz(quiz_id: str) -> Dict[str, Any]:
    """Delete a quiz and its associated questions"""
    try:
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        # Check if quiz exists
        response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Quiz not found'})
        
        # Delete associated questions first
        questions_response = questions_table.query(
            IndexName='quiz-id-index',
            KeyConditionExpression='quiz_id = :quiz_id',
            ExpressionAttributeValues={':quiz_id': quiz_id}
        )
        
        for question in questions_response.get('Items', []):
            questions_table.delete_item(Key={'question_id': question['question_id']})
        
        # Delete the quiz
        quizzes_table.delete_item(Key={'quiz_id': quiz_id})
        
        return create_response(200, {
            'message': 'Quiz and associated questions deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting quiz: {str(e)}")
        return create_response(500, {'error': 'Failed to delete quiz'}) 