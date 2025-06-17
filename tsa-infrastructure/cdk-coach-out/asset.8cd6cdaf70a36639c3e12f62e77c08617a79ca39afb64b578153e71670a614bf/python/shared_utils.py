"""
Shared utility functions for TSA Admin Backend
Contains common functions used across multiple lambda handlers
"""
import json
import os
import boto3
import uuid
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def create_cors_response(status_code: int, body: dict) -> dict:
    """Create standardized response with proper CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event with error handling"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            return json.loads(body) if body else {}
        
        return body if isinstance(body, dict) else {}
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error parsing body: {str(e)}")
        return {}


def log_admin_action(admin_user_id: str, action: str, details: Dict[str, Any]) -> None:
    """Log admin action to audit table for compliance and monitoring"""
    try:
        dynamodb = boto3.resource('dynamodb')
        audit_table = dynamodb.Table(os.environ.get('TSA_AUDIT_LOGS_TABLE', 'admin-audit-logs-v1-dev'))
        
        log_entry = {
            'log_id': str(uuid.uuid4()),
            'admin_user_id': admin_user_id,
            'action': action,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': 'unknown',
        }
        
        audit_table.put_item(Item=log_entry)
        logger.info(f"Admin action logged: {action} by {admin_user_id}")
        
    except Exception as e:
        logger.error(f"Error logging admin action: {str(e)}")
        # Don't raise - logging failure shouldn't break the main operation


def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource with error handling"""
    try:
        dynamodb = boto3.resource('dynamodb')
        return dynamodb.Table(table_name)
    except Exception as e:
        logger.error(f"Error getting DynamoDB table {table_name}: {str(e)}")
        raise


def is_this_week(date_str: str) -> bool:
    """Check if a date string is within the current week"""
    try:
        if not date_str:
            return False
        
        from datetime import timedelta
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        now = datetime.utcnow()
        
        # Calculate start of current week (Monday)
        days_since_monday = now.weekday()
        start_of_week = now - timedelta(days=days_since_monday)
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return date_obj >= start_of_week
        
    except Exception as e:
        logger.error(f"Error checking if date is this week: {str(e)}")
        return False


class SendGridEmailService:
    """SendGrid email service for sending invitations and notifications"""
    
    def __init__(self):
        self.api_key = None
        self.from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@strata.school')
        self.from_name = os.environ.get('SENDGRID_FROM_NAME', 'Texas Sports Academy')
        self._initialize_api_key()
    
    def _initialize_api_key(self):
        """Initialize SendGrid API key from AWS Secrets Manager"""
        try:
            secret_arn = os.environ.get('SENDGRID_SECRET_ARN')
            if not secret_arn:
                logger.warning("SENDGRID_SECRET_ARN not found in environment")
                return
            
            secrets_client = boto3.client('secretsmanager')
            response = secrets_client.get_secret_value(SecretId=secret_arn)
            secret_data = json.loads(response['SecretString'])
            self.api_key = secret_data.get('api_key')
            
            if not self.api_key:
                logger.error("SendGrid API key not found in secret")
            else:
                logger.info("✅ SendGrid API key loaded successfully from Secrets Manager")
            
        except Exception as e:
            logger.error(f"Error initializing SendGrid API key: {str(e)}")
    
    def send_invitation_email(self, to_email: str, invite_url: str, invitation_data: Dict[str, Any]) -> bool:
        """Send coach invitation email using the same approach as working magic links"""
        try:
            if not self.api_key:
                logger.error("SendGrid API key not available")
                return False
            
            # Use the same simple approach as the working magic link handler
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail, Email, To, Content
            except ImportError:
                logger.error("SendGrid library not installed. Please install: pip install sendgrid")
                return False
            
            # Initialize SendGrid client (same as magic link handler)
            sg = SendGridAPIClient(self.api_key)
            
            # Create personalized email content
            coach_name = invitation_data.get('coach_name', invitation_data.get('full_name', 'Coach'))
            location = invitation_data.get('location', '')
            
            subject = f"Welcome to Texas Sports Academy, {coach_name}!"
            
            # Create simple HTML content (similar to magic link approach)
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c5aa0;">Texas Sports Academy</h1>
                        <h2 style="color: #666;">Coach Invitation</h2>
                    </div>
                    
                    <p>Dear {coach_name},</p>
                    
                    <p>We are excited to invite you to join the Texas Sports Academy coaching team!</p>
                    
                    {f'<p><strong>Location:</strong> {location}</p>' if location else ''}
                    
                    <p>To complete your coach onboarding, please click the link below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_url}" style="background-color: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Complete Your Onboarding</a>
                    </div>
                    
                    <p>Link: <a href="{invite_url}">{invite_url}</a></p>
                    
                    <p>This invitation will expire in 7 days.</p>
                    
                    <p>Welcome to the team!</p>
                    
                    <p>Best regards,<br>Texas Sports Academy Team</p>
                </div>
            </body>
            </html>
            """
            
            # Email objects (same pattern as magic link handler)
            from_email = Email(self.from_email, self.from_name)
            to_email_obj = To(to_email)
            content = Content("text/html", html_content)
            
            # Create and send email (same as magic link handler)
            mail = Mail(from_email, to_email_obj, subject, content)
            response = sg.client.mail.send.post(request_body=mail.get())
            
            logger.info(f"SendGrid response status: {response.status_code}")
            
            if response.status_code == 202:  # SendGrid success code
                logger.info(f"✅ Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"❌ SendGrid API error. Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error sending invitation email via SendGrid: {str(e)}")
            return False 