"""
Lambda handler for quiz questions CRUD operations
"""
import json
import os
from typing import Dict, Any
from shared_utils import (
    create_response, get_dynamodb_table, parse_event_body,
    get_current_timestamp, validate_required_fields, get_path_parameters
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for question requests"""
    try:
        http_method = event.get('httpMethod', '')
        path_params = get_path_parameters(event)
        
        if http_method == 'GET':
            if 'question_id' in path_params:
                return get_question(path_params['question_id'])
            else:
                return list_questions(event)
        elif http_method == 'POST':
            return create_question(event)
        elif http_method == 'PUT':
            if 'question_id' in path_params:
                return update_question(path_params['question_id'], event)
            else:
                return create_response(400, {'error': 'Question ID required for update'})
        elif http_method == 'DELETE':
            if 'question_id' in path_params:
                return delete_question(path_params['question_id'])
            else:
                return create_response(400, {'error': 'Question ID required for deletion'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in questions handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def create_question(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new question for a quiz"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['quiz_id', 'question_text', 'question_type', 'options', 'correct_answer']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        # Validate question type
        valid_types = ['multiple_choice', 'true_false', 'short_answer']
        if body['question_type'] not in valid_types:
            return create_response(400, {
                'error': f"Invalid question type. Must be one of: {', '.join(valid_types)}"
            })
        
        # Validate options for multiple choice
        if body['question_type'] == 'multiple_choice':
            if not isinstance(body['options'], list) or len(body['options']) < 2:
                return create_response(400, {
                    'error': 'Multiple choice questions must have at least 2 options'
                })
        
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Check if quiz exists
        quiz_response = quizzes_table.get_item(Key={'quiz_id': body['quiz_id']})
        if 'Item' not in quiz_response:
            return create_response(404, {'error': 'Quiz not found'})
        
        question_id = f"q_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        question_data = {
            'question_id': question_id,
            'quiz_id': body['quiz_id'],
            'question_text': body['question_text'],
            'question_type': body['question_type'],
            'options': body['options'],
            'correct_answer': body['correct_answer'],
            'explanation': body.get('explanation', ''),
            'points': body.get('points', 1),
            'order_index': body.get('order_index', 0),
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        questions_table.put_item(Item=question_data)
        
        # Update quiz question count
        update_quiz_question_count(body['quiz_id'])
        
        return create_response(201, {
            'message': 'Question created successfully',
            'question': question_data
        })
        
    except Exception as e:
        print(f"Error creating question: {str(e)}")
        return create_response(500, {'error': 'Failed to create question'})


def get_question(question_id: str) -> Dict[str, Any]:
    """Get a specific question by ID"""
    try:
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        response = questions_table.get_item(Key={'question_id': question_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Question not found'})
        
        return create_response(200, {'question': response['Item']})
        
    except Exception as e:
        print(f"Error getting question: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve question'})


def list_questions(event: Dict[str, Any]) -> Dict[str, Any]:
    """List questions for a quiz"""
    try:
        query_params = event.get('queryStringParameters') or {}
        quiz_id = query_params.get('quiz_id')
        
        if not quiz_id:
            return create_response(400, {'error': 'quiz_id parameter is required'})
        
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        response = questions_table.query(
            IndexName='quiz-id-index',
            KeyConditionExpression='quiz_id = :quiz_id',
            ExpressionAttributeValues={':quiz_id': quiz_id}
        )
        
        questions = response.get('Items', [])
        
        # Sort by order_index
        questions.sort(key=lambda x: x.get('order_index', 0))
        
        return create_response(200, {
            'questions': questions,
            'count': len(questions)
        })
        
    except Exception as e:
        print(f"Error listing questions: {str(e)}")
        return create_response(500, {'error': 'Failed to list questions'})


def update_question(question_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing question"""
    try:
        body = parse_event_body(event)
        
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        # Check if question exists
        response = questions_table.get_item(Key={'question_id': question_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Question not found'})
        
        # Build update expression
        update_expressions = []
        expression_values = {}
        expression_names = {}
        
        updatable_fields = [
            'question_text', 'question_type', 'options', 'correct_answer',
            'explanation', 'points', 'order_index'
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
        
        questions_table.update_item(
            Key={'question_id': question_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated question
        updated_response = questions_table.get_item(Key={'question_id': question_id})
        
        return create_response(200, {
            'message': 'Question updated successfully',
            'question': updated_response['Item']
        })
        
    except Exception as e:
        print(f"Error updating question: {str(e)}")
        return create_response(500, {'error': 'Failed to update question'})


def delete_question(question_id: str) -> Dict[str, Any]:
    """Delete a question"""
    try:
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        # Check if question exists and get quiz_id
        response = questions_table.get_item(Key={'question_id': question_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Question not found'})
        
        quiz_id = response['Item']['quiz_id']
        
        # Delete the question
        questions_table.delete_item(Key={'question_id': question_id})
        
        # Update quiz question count
        update_quiz_question_count(quiz_id)
        
        return create_response(200, {
            'message': 'Question deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting question: {str(e)}")
        return create_response(500, {'error': 'Failed to delete question'})


def update_quiz_question_count(quiz_id: str) -> None:
    """Update the question count for a quiz"""
    try:
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Count questions for this quiz
        response = questions_table.query(
            IndexName='quiz-id-index',
            KeyConditionExpression='quiz_id = :quiz_id',
            ExpressionAttributeValues={':quiz_id': quiz_id},
            Select='COUNT'
        )
        
        question_count = response['Count']
        
        # Update quiz with new count
        quizzes_table.update_item(
            Key={'quiz_id': quiz_id},
            UpdateExpression='SET question_count = :count, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':count': question_count,
                ':updated_at': get_current_timestamp()
            }
        )
        
    except Exception as e:
        print(f"Error updating quiz question count: {str(e)}")


def reorder_questions(event: Dict[str, Any]) -> Dict[str, Any]:
    """Reorder questions in a quiz"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['quiz_id', 'question_orders']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        
        # Update each question's order
        for question_order in body['question_orders']:
            questions_table.update_item(
                Key={'question_id': question_order['question_id']},
                UpdateExpression='SET order_index = :order_index, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':order_index': question_order['order_index'],
                    ':updated_at': get_current_timestamp()
                }
            )
        
        return create_response(200, {
            'message': 'Questions reordered successfully'
        })
        
    except Exception as e:
        print(f"Error reordering questions: {str(e)}")
        return create_response(500, {'error': 'Failed to reorder questions'}) 