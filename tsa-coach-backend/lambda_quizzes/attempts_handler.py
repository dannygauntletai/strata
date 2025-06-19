"""
Lambda handler for quiz attempts and scoring
"""
import json
import os
from typing import Dict, Any, List
from tsa_shared import (
    create_response, get_dynamodb_table, parse_event_body,
    get_current_timestamp, validate_required_fields, get_path_parameters
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for quiz attempt requests"""
    try:
        http_method = event.get('httpMethod', '')
        path_params = get_path_parameters(event)
        path = event.get('path', '')
        
        if http_method == 'GET':
            if 'attempt_id' in path_params:
                return get_attempt(path_params['attempt_id'])
            else:
                return list_attempts(event)
        elif http_method == 'POST':
            if '/start' in path:
                return start_attempt(event)
            elif '/submit' in path:
                return submit_attempt(event)
            else:
                return create_response(400, {'error': 'Invalid endpoint'})
        elif http_method == 'PUT':
            if 'attempt_id' in path_params:
                return update_attempt(path_params['attempt_id'], event)
            else:
                return create_response(400, {'error': 'Attempt ID required for update'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error in attempts handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})


def start_attempt(event: Dict[str, Any]) -> Dict[str, Any]:
    """Start a new quiz attempt"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['quiz_id', 'student_id']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        attempts_table = get_dynamodb_table(os.environ.get('ATTEMPTS_TABLE', 'quiz-attempts'))
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Get quiz details
        quiz_response = quizzes_table.get_item(Key={'quiz_id': body['quiz_id']})
        if 'Item' not in quiz_response:
            return create_response(404, {'error': 'Quiz not found'})
        
        quiz = quiz_response['Item']
        
        # Check if quiz is published
        if not quiz.get('is_published', False):
            return create_response(400, {'error': 'Quiz is not published'})
        
        attempt_id = f"attempt_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        # Calculate due time (current time + time limit)
        time_limit_minutes = quiz.get('time_limit_minutes', 30)
        from datetime import datetime, timedelta
        start_time = datetime.utcnow()
        due_time = start_time + timedelta(minutes=time_limit_minutes)
        
        attempt_data = {
            'attempt_id': attempt_id,
            'quiz_id': body['quiz_id'],
            'student_id': body['student_id'],
            'status': 'in_progress',
            'started_at': start_time.isoformat(),
            'due_at': due_time.isoformat(),
            'time_limit_minutes': time_limit_minutes,
            'answers': {},  # Will store question_id -> answer mappings
            'score': None,
            'percentage': None,
            'passed': None,
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        attempts_table.put_item(Item=attempt_data)
        
        return create_response(201, {
            'message': 'Quiz attempt started successfully',
            'attempt': attempt_data,
            'quiz': {
                'title': quiz['title'],
                'description': quiz['description'],
                'question_count': quiz.get('question_count', 0),
                'time_limit_minutes': time_limit_minutes,
                'passing_score': quiz.get('passing_score', 70)
            }
        })
        
    except Exception as e:
        print(f"Error starting attempt: {str(e)}")
        return create_response(500, {'error': 'Failed to start quiz attempt'})


def submit_attempt(event: Dict[str, Any]) -> Dict[str, Any]:
    """Submit and score a quiz attempt"""
    try:
        body = parse_event_body(event)
        
        # Validate required fields
        required_fields = ['attempt_id', 'answers']
        error = validate_required_fields(body, required_fields)
        if error:
            return create_response(400, {'error': error})
        
        attempts_table = get_dynamodb_table(os.environ.get('ATTEMPTS_TABLE', 'quiz-attempts'))
        
        # Get attempt details
        attempt_response = attempts_table.get_item(Key={'attempt_id': body['attempt_id']})
        if 'Item' not in attempt_response:
            return create_response(404, {'error': 'Attempt not found'})
        
        attempt = attempt_response['Item']
        
        # Check if attempt is still in progress
        if attempt['status'] != 'in_progress':
            return create_response(400, {'error': 'Attempt is not in progress'})
        
        # Check if attempt is past due
        from datetime import datetime
        due_time = datetime.fromisoformat(attempt['due_at'].replace('Z', '+00:00'))
        current_time = datetime.utcnow()
        
        if current_time > due_time:
            return create_response(400, {'error': 'Attempt time limit exceeded'})
        
        # Score the attempt
        score_result = score_attempt(attempt['quiz_id'], body['answers'])
        
        # Update attempt with results
        completion_time = current_time.isoformat()
        
        attempts_table.update_item(
            Key={'attempt_id': body['attempt_id']},
            UpdateExpression='''SET 
                #status = :status,
                answers = :answers,
                score = :score,
                percentage = :percentage,
                passed = :passed,
                completed_at = :completed_at,
                updated_at = :updated_at
            ''',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':answers': body['answers'],
                ':score': score_result['score'],
                ':percentage': score_result['percentage'],
                ':passed': score_result['passed'],
                ':completed_at': completion_time,
                ':updated_at': get_current_timestamp()
            }
        )
        
        return create_response(200, {
            'message': 'Quiz attempt submitted successfully',
            'results': {
                'attempt_id': body['attempt_id'],
                'score': score_result['score'],
                'total_points': score_result['total_points'],
                'percentage': score_result['percentage'],
                'passed': score_result['passed'],
                'correct_answers': score_result['correct_count'],
                'total_questions': score_result['total_questions'],
                'detailed_results': score_result['detailed_results']
            }
        })
        
    except Exception as e:
        print(f"Error submitting attempt: {str(e)}")
        return create_response(500, {'error': 'Failed to submit quiz attempt'})


def score_attempt(quiz_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
    """Score a quiz attempt"""
    try:
        questions_table = get_dynamodb_table(os.environ.get('QUESTIONS_TABLE', 'quiz-questions'))
        quizzes_table = get_dynamodb_table(os.environ.get('QUIZZES_TABLE', 'quizzes'))
        
        # Get quiz passing score
        quiz_response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        passing_score = quiz_response['Item'].get('passing_score', 70) if 'Item' in quiz_response else 70
        
        # Get all questions for the quiz
        questions_response = questions_table.query(
            IndexName='quiz-id-index',
            KeyConditionExpression='quiz_id = :quiz_id',
            ExpressionAttributeValues={':quiz_id': quiz_id}
        )
        
        questions = questions_response.get('Items', [])
        
        total_points = 0
        earned_points = 0
        correct_count = 0
        total_questions = len(questions)
        detailed_results = []
        
        for question in questions:
            question_id = question['question_id']
            correct_answer = question['correct_answer']
            points = question.get('points', 1)
            total_points += points
            
            # Get student's answer
            student_answer = answers.get(question_id, '')
            
            # Check if answer is correct
            is_correct = False
            if question['question_type'] == 'multiple_choice':
                is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
            elif question['question_type'] == 'true_false':
                is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
            elif question['question_type'] == 'short_answer':
                # For short answer, do case-insensitive comparison
                is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
            
            if is_correct:
                earned_points += points
                correct_count += 1
            
            detailed_results.append({
                'question_id': question_id,
                'question_text': question['question_text'],
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'points_earned': points if is_correct else 0,
                'points_possible': points,
                'explanation': question.get('explanation', '')
            })
        
        # Calculate percentage
        percentage = (earned_points / total_points * 100) if total_points > 0 else 0
        passed = percentage >= passing_score
        
        return {
            'score': earned_points,
            'total_points': total_points,
            'percentage': round(percentage, 2),
            'passed': passed,
            'correct_count': correct_count,
            'total_questions': total_questions,
            'detailed_results': detailed_results
        }
        
    except Exception as e:
        print(f"Error scoring attempt: {str(e)}")
        raise


def get_attempt(attempt_id: str) -> Dict[str, Any]:
    """Get a specific attempt by ID"""
    try:
        attempts_table = get_dynamodb_table(os.environ.get('ATTEMPTS_TABLE', 'quiz-attempts'))
        
        response = attempts_table.get_item(Key={'attempt_id': attempt_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Attempt not found'})
        
        return create_response(200, {'attempt': response['Item']})
        
    except Exception as e:
        print(f"Error getting attempt: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve attempt'})


def list_attempts(event: Dict[str, Any]) -> Dict[str, Any]:
    """List quiz attempts with optional filtering"""
    try:
        query_params = event.get('queryStringParameters') or {}
        quiz_id = query_params.get('quiz_id')
        student_id = query_params.get('student_id')
        status = query_params.get('status')
        
        attempts_table = get_dynamodb_table(os.environ.get('ATTEMPTS_TABLE', 'quiz-attempts'))
        
        # Build filter expression
        filter_expressions = []
        expression_values = {}
        
        if quiz_id:
            filter_expressions.append('quiz_id = :quiz_id')
            expression_values[':quiz_id'] = quiz_id
        
        if student_id:
            filter_expressions.append('student_id = :student_id')
            expression_values[':student_id'] = student_id
        
        if status:
            filter_expressions.append('#status = :status')
            expression_values[':status'] = status
        
        scan_kwargs = {}
        if filter_expressions:
            scan_kwargs['FilterExpression'] = ' AND '.join(filter_expressions)
            scan_kwargs['ExpressionAttributeValues'] = expression_values
            if status:
                scan_kwargs['ExpressionAttributeNames'] = {'#status': 'status'}
        
        response = attempts_table.scan(**scan_kwargs)
        
        return create_response(200, {
            'attempts': response.get('Items', []),
            'count': len(response.get('Items', []))
        })
        
    except Exception as e:
        print(f"Error listing attempts: {str(e)}")
        return create_response(500, {'error': 'Failed to list attempts'})


def update_attempt(attempt_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update an attempt (mainly for saving progress)"""
    try:
        body = parse_event_body(event)
        
        attempts_table = get_dynamodb_table(os.environ.get('ATTEMPTS_TABLE', 'quiz-attempts'))
        
        # Check if attempt exists
        response = attempts_table.get_item(Key={'attempt_id': attempt_id})
        if 'Item' not in response:
            return create_response(404, {'error': 'Attempt not found'})
        
        attempt = response['Item']
        
        # Only allow updates to in-progress attempts
        if attempt['status'] != 'in_progress':
            return create_response(400, {'error': 'Cannot update completed attempt'})
        
        # Update answers (for saving progress)
        if 'answers' in body:
            attempts_table.update_item(
                Key={'attempt_id': attempt_id},
                UpdateExpression='SET answers = :answers, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':answers': body['answers'],
                    ':updated_at': get_current_timestamp()
                }
            )
        
        return create_response(200, {
            'message': 'Attempt updated successfully'
        })
        
    except Exception as e:
        print(f"Error updating attempt: {str(e)}")
        return create_response(500, {'error': 'Failed to update attempt'}) 