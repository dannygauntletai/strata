"""
Auth Service - Business Logic Layer
Handles parent authentication operations with proper service integration
"""
from typing import Dict, Any
import boto3
import json
import os


class AuthService:
    """Service for parent authentication business logic"""
    
    @staticmethod
    def send_parent_magic_link(email: str, invitation_token: str = None) -> Dict[str, Any]:
        """Send magic link for parent authentication"""
        try:
            # Prepare magic link request
            magic_link_request = {
                'email': email,
                'user_role': 'parent',
                'invitation_token': invitation_token
            }
            
            # Call existing magic link lambda (proper service integration)
            lambda_client = boto3.client('lambda')
            magic_link_function = os.environ.get('MAGIC_LINK_FUNCTION_NAME', 'tsa-coach-magic-link-handler')
            
            response = lambda_client.invoke(
                FunctionName=magic_link_function,
                InvocationType='RequestResponse',
                Payload=json.dumps({
                    'httpMethod': 'POST',
                    'body': json.dumps(magic_link_request)
                })
            )
            
            result = json.loads(response['Payload'].read().decode('utf-8'))
            
            if result.get('statusCode') == 200:
                return {
                    'success': True,
                    'message': 'Magic link sent successfully'
                }
            else:
                error_body = json.loads(result.get('body', '{}'))
                return {
                    'success': False,
                    'error': error_body.get('error', 'Failed to send magic link')
                }
                
        except Exception as e:
            print(f"Auth service error: {str(e)}")
            return {
                'success': False,
                'error': 'Authentication service unavailable'
            }

