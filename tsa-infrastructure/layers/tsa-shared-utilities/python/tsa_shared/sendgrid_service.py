"""
SendGrid Service - Consolidated email service for TSA platform
Centralized email functionality for all Lambda functions across all services

Features:
- Magic link authentication emails
- Notification emails  
- Template-based emails
- Error handling and logging
- Environment-aware configuration
"""

import os
import base64
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Subject, PlainTextContent, HtmlContent, Attachment, FileContent, FileName, FileType, Disposition, ContentId
from typing import Optional, List, Dict, Any
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SendGridService:
    """Centralized SendGrid service for all TSA email operations"""
    
    def __init__(self):
        """Initialize SendGrid service with environment configuration"""
        # Try to get API key from environment variable first (for backward compatibility)
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        
        # If not found, try to get from AWS Parameter Store, then Secrets Manager
        if not self.api_key:
            try:
                # Try Parameter Store first
                import boto3
                ssm = boto3.client('ssm')
                stage = os.environ.get('STAGE', 'dev')
                param_response = ssm.get_parameter(
                    Name=f'/tsa/{stage}/sendgrid/api_key',
                    WithDecryption=True
                )
                self.api_key = param_response['Parameter']['Value']
                logger.info("Successfully retrieved SendGrid API key from Parameter Store")
            except Exception as e:
                logger.warning(f"Failed to get SendGrid API key from Parameter Store: {str(e)}")
                
                # Fallback to Secrets Manager
                try:
                    from .auth_utils import get_sendgrid_api_key
                    self.api_key = get_sendgrid_api_key()
                    logger.info("Successfully retrieved SendGrid API key from Secrets Manager")
                except Exception as e2:
                    logger.error(f"Failed to get SendGrid API key from Secrets Manager: {str(e2)}")
                    raise ValueError("SENDGRID_API_KEY environment variable or Parameter Store value is required")
        
        self.client = SendGridAPIClient(api_key=self.api_key)
        self.from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@totalskillsacademy.com')
        self.from_name = os.environ.get('SENDGRID_FROM_NAME', 'Total Skills Academy')
        
        # Environment-specific settings
        self.stage = os.environ.get('STAGE', 'dev')
        self.frontend_url = self._get_frontend_url()
        
    def _get_frontend_url(self) -> str:
        """Get environment-specific frontend URL"""
        stage = self.stage.lower()
        if stage == 'prod':
            return 'https://platform.totalskillsacademy.com'
        elif stage == 'staging':
            return 'https://staging-platform.totalskillsacademy.com'
        else:
            return 'https://dev-platform.totalskillsacademy.com'
    
    def send_magic_link_email(self, email: str, magic_link: str, user_type: str = 'user') -> Dict[str, Any]:
        """
        Send magic link authentication email
        
        Args:
            email: Recipient email address
            magic_link: Magic link URL for authentication
            user_type: Type of user (coach, parent, admin)
            
        Returns:
            Dict with success status and message info
        """
        try:
            # Create email content
            subject = f"TSA {user_type.title()} Portal - Secure Login Link"
            
            plain_content = f"""
Hi,

Click the link below to securely sign in to your TSA {user_type.title()} Portal:

{magic_link}

This link will expire in 15 minutes for security.

If you didn't request this login, please ignore this email.

Best regards,
Total Skills Academy Team
            """.strip()
            
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TSA Secure Login</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TSA {user_type.title()} Portal</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Secure Login Access</p>
    </div>
    
    <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Secure Sign In</h2>
        
        <p>Click the button below to securely sign in to your TSA {user_type.title()} Portal:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{magic_link}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🔐 Sign In Securely
            </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #495057;">🔒 Security Information</h4>
            <ul style="margin-bottom: 0; color: #6c757d;">
                <li>This link expires in <strong>15 minutes</strong></li>
                <li>One-time use only for security</li>
                <li>If you didn't request this, please ignore</li>
            </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Having trouble? Copy and paste this link into your browser:<br>
            <span style="background: #f1f3f4; padding: 8px; border-radius: 4px; word-break: break-all; display: inline-block; margin-top: 5px;">
                {magic_link}
            </span>
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        <p>© 2024 Total Skills Academy. All rights reserved.</p>
    </div>
</body>
</html>
            """.strip()
            
            # Send email
            response = self._send_email(
                to_email=email,
                subject=subject,
                plain_content=plain_content,
                html_content=html_content
            )
            
            logger.info(f"Magic link email sent successfully to {email}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to send magic link email to {email}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to send magic link email'
            }
    
    def send_notification_email(self, email: str, subject: str, message: str, 
                              notification_type: str = 'info') -> Dict[str, Any]:
        """
        Send notification email
        
        Args:
            email: Recipient email address
            subject: Email subject
            message: Email message content
            notification_type: Type of notification (info, warning, error, success)
            
        Returns:
            Dict with success status and message info
        """
        try:
            # Icon mapping for notification types
            icons = {
                'info': '📋',
                'warning': '⚠️',
                'error': '❌',
                'success': '✅'
            }
            
            icon = icons.get(notification_type, '📋')
            
            plain_content = f"""
{message}

Best regards,
Total Skills Academy Team
            """.strip()
            
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TSA Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">{icon} TSA Notification</h1>
    </div>
    
    <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">{subject}</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {message}
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        <p>© 2024 Total Skills Academy. All rights reserved.</p>
    </div>
</body>
</html>
            """.strip()
            
            # Send email
            response = self._send_email(
                to_email=email,
                subject=f"TSA: {subject}",
                plain_content=plain_content,
                html_content=html_content
            )
            
            logger.info(f"Notification email sent successfully to {email}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to send notification email to {email}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to send notification email'
            }
    
    def send_template_email(self, email: str, template_id: str, 
                          template_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send email using SendGrid template
        
        Args:
            email: Recipient email address
            template_id: SendGrid template ID
            template_data: Data to populate template
            
        Returns:
            Dict with success status and message info
        """
        try:
            message = Mail(
                from_email=From(self.from_email, self.from_name),
                to_emails=To(email)
            )
            
            message.template_id = template_id
            message.dynamic_template_data = template_data
            
            response = self.client.send(message)
            
            return {
                'success': True,
                'message_id': response.headers.get('X-Message-Id'),
                'status_code': response.status_code
            }
            
        except Exception as e:
            logger.error(f"Failed to send template email to {email}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to send template email'
            }
    
    def send_email_with_attachment(self, email: str, subject: str, 
                                 plain_content: str, html_content: str,
                                 attachments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Send email with attachments
        
        Args:
            email: Recipient email address
            subject: Email subject
            plain_content: Plain text content
            html_content: HTML content
            attachments: List of attachment dicts with keys: content, filename, type
            
        Returns:
            Dict with success status and message info
        """
        try:
            message = Mail(
                from_email=From(self.from_email, self.from_name),
                to_emails=To(email),
                subject=Subject(subject),
                plain_text_content=PlainTextContent(plain_content),
                html_content=HtmlContent(html_content)
            )
            
            # Add attachments
            for attachment_data in attachments:
                attachment = Attachment(
                    FileContent(attachment_data['content']),
                    FileName(attachment_data['filename']),
                    FileType(attachment_data.get('type', 'application/octet-stream')),
                    Disposition('attachment')
                )
                message.add_attachment(attachment)
            
            response = self.client.send(message)
            
            return {
                'success': True,
                'message_id': response.headers.get('X-Message-Id'),
                'status_code': response.status_code
            }
            
        except Exception as e:
            logger.error(f"Failed to send email with attachments to {email}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to send email with attachments'
            }
    
    def _send_email(self, to_email: str, subject: str, 
                   plain_content: str, html_content: str) -> Dict[str, Any]:
        """
        Internal method to send email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            plain_content: Plain text content
            html_content: HTML content
            
        Returns:
            Dict with success status and message info
        """
        try:
            message = Mail(
                from_email=From(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=Subject(subject),
                plain_text_content=PlainTextContent(plain_content),
                html_content=HtmlContent(html_content)
            )
            
            response = self.client.send(message)
            
            return {
                'success': True,
                'message_id': response.headers.get('X-Message-Id'),
                'status_code': response.status_code,
                'to_email': to_email,
                'subject': subject
            }
            
        except Exception as e:
            logger.error(f"SendGrid API error: {str(e)}")
            raise


# Convenience functions for backward compatibility
def send_magic_link_email(email: str, magic_link: str, user_type: str = 'user') -> Dict[str, Any]:
    """Send magic link email - convenience function"""
    service = SendGridService()
    return service.send_magic_link_email(email, magic_link, user_type)


def send_notification_email(email: str, subject: str, message: str, 
                          notification_type: str = 'info') -> Dict[str, Any]:
    """Send notification email - convenience function"""
    service = SendGridService()
    return service.send_notification_email(email, subject, message, notification_type)


def send_template_email(email: str, template_id: str, 
                       template_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send template email - convenience function"""
    service = SendGridService()
    return service.send_template_email(email, template_id, template_data) 