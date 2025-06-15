"""
SendGrid Email Utilities for TSA Admin Portal
Enhanced security and administrative email capabilities using Jinja2 templates
"""
import os
import json
import logging
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)


class SendGridEmailService:
    """SendGrid email service for admin portal with proper template integration"""
    
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@texassportsacademy.com')
        self.from_name = os.environ.get('SENDGRID_FROM_NAME', 'TSA Admin Portal')
        
        # Initialize template service
        try:
            from .template_service import template_service
            self.template_service = template_service
            logger.info("✅ Template service integrated with SendGrid")
        except ImportError as e:
            logger.error(f"❌ Failed to import template service: {str(e)}")
            self.template_service = None
        
        if not self.api_key:
            logger.warning("SENDGRID_API_KEY not found in environment variables")
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> Dict[str, Any]:
        """
        Send email using SendGrid API
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (optional)
            
        Returns:
            Dict with success status and message_id or error
        """
        try:
            if not self.api_key:
                return {
                    'success': False,
                    'error': 'SendGrid API key not configured'
                }
            
            # Import SendGrid here to avoid import issues if not installed
            try:
                import sendgrid
                from sendgrid.helpers.mail import Mail, Email, To, Content
            except ImportError:
                logger.error("SendGrid library not installed. Please install: pip install sendgrid")
                return {
                    'success': False,
                    'error': 'SendGrid library not installed'
                }
            
            # Create SendGrid client
            sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
            
            # Create email
            from_email_obj = Email(self.from_email, self.from_name)
            to_email_obj = To(to_email)
            
            # Create mail object
            if text_content:
                plain_text_content = Content("text/plain", text_content)
                html_content_obj = Content("text/html", html_content)
                mail = Mail(from_email_obj, to_email_obj, subject, plain_text_content)
                mail.add_content(html_content_obj)
            else:
                html_content_obj = Content("text/html", html_content)
                mail = Mail(from_email_obj, to_email_obj, subject, html_content_obj)
            
            # Send email
            response = sg.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}. Status: {response.status_code}")
                return {
                    'success': True,
                    'message_id': response.headers.get('X-Message-Id', 'unknown'),
                    'status_code': response.status_code
                }
            else:
                logger.error(f"SendGrid API error. Status: {response.status_code}, Body: {response.body}")
                return {
                    'success': False,
                    'error': f'SendGrid API error: {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"Error sending email via SendGrid: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_coach_invitation_email(self, email: str, invite_url: str, invitation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send coach invitation email using Jinja2 templates
        """
        try:
            if not self.template_service:
                return {
                    'success': False,
                    'error': 'Template service not available'
                }
            
            # Render templates using the template service
            templates = self.template_service.render_coach_invitation_email(email, invite_url, invitation)
            
            # Send email with both HTML and text versions
            return self.send_email(
                to_email=email,
                subject=templates['subject'],
                html_content=templates['html'],
                text_content=templates['text']
            )
            
        except Exception as e:
            logger.error(f"Error sending coach invitation email: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to send coach invitation email: {str(e)}'
            }
    
    def send_admin_notification_email_direct(self, admin_email: str, notification_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send admin notification email using Jinja2 templates
        """
        try:
            if not self.template_service:
                return {
                    'success': False,
                    'error': 'Template service not available'
                }
            
            # Render templates using the template service
            templates = self.template_service.render_admin_notification_email(notification_type, details)
            
            # Send email with both HTML and text versions
            return self.send_email(
                to_email=admin_email,
                subject=templates['subject'],
                html_content=templates['html'],
                text_content=templates['text']
            )
            
        except Exception as e:
            logger.error(f"Error sending admin notification email: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to send admin notification email: {str(e)}'
            }
    
    def get_send_quota(self) -> Dict[str, Any]:
        """Get SendGrid account send quota and usage"""
        try:
            if not self.api_key:
                return {
                    'status': 'error',
                    'error': 'API key not configured'
                }
            
            # Import SendGrid here
            try:
                import sendgrid
            except ImportError:
                return {
                    'status': 'error',
                    'error': 'SendGrid library not installed'
                }
            
            sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
            
            # Get account information
            response = sg.client.user.account.get()
            
            if response.status_code == 200:
                return {
                    'status': 'healthy',
                    'account_info': json.loads(response.body)
                }
            else:
                return {
                    'status': 'error',
                    'error': f'API error: {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"Error getting SendGrid quota: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }


def send_admin_notification_email(admin_email: str, notification_type: str, details: Dict[str, Any]) -> bool:
    """
    Send admin notification email for security events using templates
    """
    try:
        sendgrid_service = SendGridEmailService()
        result = sendgrid_service.send_admin_notification_email_direct(admin_email, notification_type, details)
        return result['success']
        
    except Exception as e:
        logger.error(f"Error sending admin notification: {str(e)}")
        return False 