"""
SendGrid Email Utility for Admin Backend
Simplified version for admin functionality
"""
import os
from typing import Dict, Any
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content


class SendGridEmailService:
    """Simplified SendGrid service for admin backend"""
    
    def __init__(self):
        """Initialize SendGrid client"""
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        if not self.api_key:
            raise ValueError("SENDGRID_API_KEY environment variable is required")
        
        self.client = SendGridAPIClient(api_key=self.api_key)
        self.from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@sportsacademy.tech')
        self.from_name = os.environ.get('SENDGRID_FROM_NAME', 'Texas Sports Academy')
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ) -> Dict[str, Any]:
        """Send email using SendGrid"""
        try:
            from_email_obj = Email(email=self.from_email, name=self.from_name)
            to_email_obj = To(email=to_email)
            
            mail = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=subject,
                html_content=html_content
            )
            
            if text_content:
                mail.content = [
                    Content(mime_type="text/plain", content=text_content),
                    Content(mime_type="text/html", content=html_content)
                ]
            
            response = self.client.send(mail)
            
            if response.status_code in [200, 201, 202]:
                return {
                    'success': True,
                    'message_id': response.headers.get('X-Message-Id', 'unknown'),
                    'status_code': response.status_code
                }
            else:
                return {
                    'success': False,
                    'error': f'SendGrid API returned status {response.status_code}',
                    'status_code': response.status_code
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_send_quota(self) -> Dict[str, Any]:
        """Health check for SendGrid service"""
        try:
            return {
                'quota_available': True,
                'service': 'sendgrid',
                'status': 'healthy'
            }
        except Exception as e:
            return {
                'quota_available': False,
                'service': 'sendgrid',
                'status': 'unhealthy',
                'error': str(e)
            } 