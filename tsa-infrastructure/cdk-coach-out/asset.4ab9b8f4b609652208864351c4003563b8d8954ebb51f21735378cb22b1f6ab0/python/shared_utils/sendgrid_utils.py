"""
SendGrid Email Utility
Centralized email sending functionality using SendGrid API
Replaces AWS SES for Texas Sports Academy
"""
import os
import json
from typing import Dict, Any, List, Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content


class SendGridEmailService:
    """SendGrid email service wrapper"""
    
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
        text_content: str = None,
        from_email: str = None,
        from_name: str = None,
        reply_to: str = None
    ) -> Dict[str, Any]:
        """
        Send email using SendGrid
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text content (optional)
            from_email: Sender email (optional, uses default)
            from_name: Sender name (optional, uses default)
            reply_to: Reply-to email (optional)
            
        Returns:
            Dict containing success status and message ID or error
        """
        try:
            # Use provided or default sender info
            sender_email = from_email or self.from_email
            sender_name = from_name or self.from_name
            
            # Create mail object
            from_email_obj = Email(email=sender_email, name=sender_name)
            to_email_obj = To(email=to_email)
            
            # Create mail with HTML content
            mail = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=subject,
                html_content=html_content
            )
            
            # Add plain text content if provided
            if text_content:
                mail.content = [
                    Content(mime_type="text/plain", content=text_content),
                    Content(mime_type="text/html", content=html_content)
                ]
            
            # Add reply-to if specified
            if reply_to:
                mail.reply_to = Email(email=reply_to)
            
            # Send email
            response = self.client.send(mail)
            
            # Check if successful
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
                    'status_code': response.status_code,
                    'body': response.body
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'exception_type': type(e).__name__
            }
    
    def send_bulk_emails(
        self,
        emails: List[Dict[str, str]],
        subject: str,
        html_template: str,
        text_template: str = None,
        from_email: str = None,
        from_name: str = None
    ) -> Dict[str, Any]:
        """
        Send bulk emails with personalization
        
        Args:
            emails: List of dicts with 'email' and optional personalization data
            subject: Email subject (can include {{variable}} placeholders)
            html_template: HTML template (can include {{variable}} placeholders)
            text_template: Text template (optional)
            from_email: Sender email (optional)
            from_name: Sender name (optional)
            
        Returns:
            Dict with results summary
        """
        results = {
            'total': len(emails),
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for email_data in emails:
            try:
                recipient_email = email_data['email']
                
                # Replace template variables
                personalized_subject = self._replace_template_vars(subject, email_data)
                personalized_html = self._replace_template_vars(html_template, email_data)
                personalized_text = self._replace_template_vars(text_template, email_data) if text_template else None
                
                # Send individual email
                result = self.send_email(
                    to_email=recipient_email,
                    subject=personalized_subject,
                    html_content=personalized_html,
                    text_content=personalized_text,
                    from_email=from_email,
                    from_name=from_name
                )
                
                if result['success']:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'email': recipient_email,
                        'error': result['error']
                    })
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'email': email_data.get('email', 'unknown'),
                    'error': str(e)
                })
        
        return results
    
    def _replace_template_vars(self, template: str, data: Dict[str, Any]) -> str:
        """Replace {{variable}} placeholders in template with data values"""
        if not template:
            return template
            
        result = template
        for key, value in data.items():
            if key != 'email':  # Don't replace email in content
                placeholder = f"{{{{{key}}}}}"
                result = result.replace(placeholder, str(value))
        
        return result
    
    def get_send_quota(self) -> Dict[str, Any]:
        """Get SendGrid account sending quota and usage"""
        try:
            # SendGrid doesn't have a direct quota endpoint like SES
            # This is a placeholder for monitoring/health checks
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


def send_coach_invitation_email(email: str, invite_url: str, invitation: Dict[str, Any]) -> bool:
    """Send coach invitation email (replacement for SES version)"""
    try:
        sendgrid_service = SendGridEmailService()
        
        subject = "Invitation to Join Texas Sports Academy Coach Portal"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">Texas Sports Academy</h1>
                <p style="margin: 10px 0 0 0;">Coach Portal Invitation</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">You're Invited to Join Our Team!</h2>
                <p>Hello,</p>
                <p>You've been invited to join the Texas Sports Academy Coach Portal.</p>
                
                {f"<div style='background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0;'><p style='margin: 0; font-style: italic;'><strong>Personal message:</strong><br>{invitation['message']}</p></div>" if invitation.get('message') else ""}
                
                <p>Click the button below to complete your coach application:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_url}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Application</a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #856404;">Quick Setup Process:</h4>
                    <ul style="margin-bottom: 0; color: #856404;">
                        <li>Your name and contact information</li>
                        <li>Coaching experience and certifications</li>
                        <li>School/organization details</li>
                        <li>Sport specializations</li>
                    </ul>
                </div>
                
                <p style="color: #dc2626; font-weight: bold;">⏰ This invitation expires in 7 days.</p>
                
                <p>If the button doesn't work, copy and paste this link:<br>
                <a href="{invite_url}" style="color: #0288d1; word-break: break-all;">{invite_url}</a></p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
                <p>Best regards,<br>The Texas Sports Academy Team</p>
                <p><em>Building Champions On and Off the Field</em></p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Texas Sports Academy - Coach Portal Invitation
        
        You're Invited to Join Our Team!
        
        Hello,
        
        You've been invited to join the Texas Sports Academy Coach Portal.
        
        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}
        
        Complete your coach application: {invite_url}
        
        Quick Setup Process:
        • Your name and contact information
        • Coaching experience and certifications  
        • School/organization details
        • Sport specializations
        
        ⏰ This invitation expires in 7 days.
        
        Best regards,
        The Texas Sports Academy Team
        Building Champions On and Off the Field
        """
        
        result = sendgrid_service.send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if result['success']:
            print(f"Coach invitation email sent via SendGrid to {email}. Message ID: {result['message_id']}")
            return True
        else:
            print(f"Failed to send coach invitation email via SendGrid: {result['error']}")
            return False
            
    except Exception as e:
        print(f"Error sending coach invitation email via SendGrid: {str(e)}")
        return False


def send_parent_invitation_email(invitation: Dict[str, Any]) -> bool:
    """Send parent invitation email (replacement for SES version)"""
    try:
        sendgrid_service = SendGridEmailService()
        
        student_name = f"{invitation.get('student_first_name', '')} {invitation.get('student_last_name', '')}".strip()
        if not student_name:
            student_name = "your child"
        
        invitation_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/parent/invitation?token={invitation['invitation_token']}"
        
        subject = f"Invitation to Enroll {student_name} at Texas Sports Academy"
        
        # Handle expires_at as string or number
        expires_at_timestamp = float(invitation['expires_at']) if isinstance(invitation['expires_at'], str) else invitation['expires_at']
        from datetime import datetime
        expires_at = datetime.fromtimestamp(expires_at_timestamp)
        formatted_expiry = expires_at.strftime("%B %d, %Y")
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">Texas Sports Academy</h1>
                <p style="margin: 10px 0 0 0;">Enrollment Invitation</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">You're Invited to Enroll {student_name}!</h2>
                <p>Hello!</p>
                
                <p>You've been invited by <strong>{invitation['coach_name']}</strong> to enroll {student_name} at <strong>{invitation.get('school_name', 'Texas Sports Academy')}</strong>.</p>
                
                {f"<div style='background-color: #e8f4fd; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;'><p style='margin: 0; font-style: italic;'><strong>Personal message:</strong><br>{invitation['message']}</p></div>" if invitation.get('message') else ""}
                
                <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e40af; margin-top: 0;">What's Included:</h3>
                    <ul style="color: #374151; margin-bottom: 0;">
                        <li>Expert coaching and athletic development</li>
                        <li>Academic support and college preparation</li>
                        <li>State-of-the-art facilities and equipment</li>
                        <li>Scholarship and financial aid opportunities</li>
                        <li>Character development and leadership training</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invitation_url}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Enrollment Application</a>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>⏰ Important:</strong> This invitation expires on {formatted_expiry}. Please complete your enrollment before this date.</p>
                </div>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #374151;">Enrollment Process:</h4>
                    <ol style="margin-bottom: 0; color: #6b7280;">
                        <li>Student information and academic history</li>
                        <li>Parent/guardian contact details</li>
                        <li>Tuition and payment arrangements</li>
                        <li>Required document submission</li>
                    </ol>
                </div>
                
                <p>Questions? Contact us:</p>
                <ul style="color: #6b7280;">
                    <li>Email: <a href="mailto:admissions@sportsacademy.tech" style="color: #2563eb;">admissions@sportsacademy.tech</a></li>
                    <li>Phone: (512) 555-0123</li>
                </ul>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
                <p>Best regards,<br>The Texas Sports Academy Team</p>
                <p><em>Building Champions On and Off the Field</em></p>
                <p style="font-size: 12px;">If the button doesn't work, copy and paste this link:<br>
                <a href="{invitation_url}" style="color: #2563eb; word-break: break-all;">{invitation_url}</a></p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Texas Sports Academy - Enrollment Invitation
        
        You're Invited to Enroll {student_name}!
        
        Hello!
        
        You've been invited by {invitation['coach_name']} to enroll {student_name} at {invitation.get('school_name', 'Texas Sports Academy')}.
        
        {f"Personal message: {invitation['message']}" if invitation.get('message') else ""}
        
        What's Included:
        • Expert coaching and athletic development
        • Academic support and college preparation  
        • State-of-the-art facilities and equipment
        • Scholarship and financial aid opportunities
        • Character development and leadership training
        
        Complete enrollment: {invitation_url}
        
        ⏰ IMPORTANT: This invitation expires on {formatted_expiry}.
        
        Enrollment Process:
        1. Student information and academic history
        2. Parent/guardian contact details
        3. Tuition and payment arrangements
        4. Required document submission
        
        Questions? Contact us:
        • Email: admissions@sportsacademy.tech
        • Phone: (512) 555-0123
        
        Best regards,
        The Texas Sports Academy Team
        Building Champions On and Off the Field
        """
        
        result = sendgrid_service.send_email(
            to_email=invitation['parent_email'],
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if result['success']:
            print(f"Parent invitation email sent via SendGrid to {invitation['parent_email']}. Message ID: {result['message_id']}")
            return True
        else:
            print(f"Failed to send parent invitation email via SendGrid: {result['error']}")
            return False
            
    except Exception as e:
        print(f"Error sending parent invitation email via SendGrid: {str(e)}")
        return False


def send_magic_link_email(email: str, magic_link: str, user_exists: bool, user_role: str, invitation_token: str = None) -> bool:
    """Send magic link email (replacement for SES version)"""
    try:
        sendgrid_service = SendGridEmailService()
        
        # Role-specific email content
        if user_role == 'parent':
            if invitation_token:
                subject = "Complete Your Child's Enrollment at Texas Sports Academy"
                greeting = "Welcome to the Texas Sports Academy family!"
                action_text = "continue your child's enrollment process"
                portal_name = "Admissions Portal"
                additional_info = """
                <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Your coach has invited your child to join TSA.</strong> Click the link below to:</p>
                    <ul style="margin: 10px 0 0 0;">
                        <li>Review program details</li>
                        <li>Complete enrollment forms</li>
                        <li>Schedule consultation and shadow day</li>
                        <li>Submit required documents</li>
                    </ul>
                </div>
                """
            else:
                subject = "Access Your TSA Parent Portal"
                greeting = "Welcome back!"
                action_text = "access your TSA Parent Portal"
                portal_name = "Parent Portal"
                additional_info = "<p>Access your child's enrollment status, documents, and communications.</p>"
        else:
            # Coach email content
            if user_exists:
                subject = "Sign in to your TSA Coach Portal"
                greeting = "Welcome back!"
                action_text = "sign in to"
                portal_name = "Coach Portal"
                additional_info = ""
            else:
                subject = "Complete your TSA Coach Portal registration"
                greeting = "Welcome to Texas Sports Academy!"
                action_text = "complete your registration for"
                portal_name = "Coach Portal"
                additional_info = ""
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">Texas Sports Academy</h1>
                <p style="margin: 10px 0 0 0;">{portal_name}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">{greeting}</h2>
                {additional_info}
                <p>Click the button below to {action_text} your TSA {portal_name}:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{magic_link}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access {portal_name}</a>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>🔒 Security Notice:</strong></p>
                    <ul style="margin: 5px 0 0 0; color: #92400e;">
                        <li>This link expires in 15 minutes</li>
                        <li>Can only be used once</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb; font-size: 12px;">{magic_link}</p>
                
                {'''
                <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af;"><strong>Questions about enrollment?</strong><br>
                    Contact us at <a href="mailto:admissions@sportsacademy.tech" style="color: #2563eb;">admissions@sportsacademy.tech</a><br>
                    or call (512) 555-0123</p>
                </div>
                ''' if user_role == 'parent' else ''}
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
                <p>This email was sent to {email}</p>
                <p>Texas Sports Academy {portal_name}</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Texas Sports Academy - {portal_name}
        
        {greeting}
        
        Click this link to {action_text} your TSA {portal_name}:
        {magic_link}
        
        SECURITY NOTICE:
        - This link expires in 15 minutes
        - Can only be used once  
        - If you didn't request this, please ignore this email
        
        This email was sent to {email}
        
        {'Questions about enrollment? Contact admissions@sportsacademy.tech or (512) 555-0123' if user_role == 'parent' else ''}
        """
        
        result = sendgrid_service.send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if result['success']:
            print(f"Magic link email sent via SendGrid to {email} ({user_role}). Message ID: {result['message_id']}")
            return True
        else:
            print(f"Failed to send magic link email via SendGrid: {result['error']}")
            return False
            
    except Exception as e:
        print(f"Error sending magic link email via SendGrid: {str(e)}")
        return False 