"""
SendGrid Email Utility
Centralized email sending functionality using SendGrid API
Replaces AWS SES for Texas Sports Academy
"""
import os
import json
import boto3
from typing import Dict, Any, List, Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content


class SendGridEmailService:
    """SendGrid email service wrapper"""
    
    def __init__(self):
        """Initialize SendGrid client"""
        print("🔧 Initializing SendGrid Email Service...")
        
        # Try to get API key from Secrets Manager first, then environment variable
        self.api_key = self._get_sendgrid_api_key()
        print(f"🔑 SendGrid API Key present: {bool(self.api_key)}")
        if self.api_key:
            print(f"🔑 SendGrid API Key length: {len(self.api_key)} characters")
            print(f"🔑 SendGrid API Key starts with: {self.api_key[:10]}...")
        
        if not self.api_key:
            error_msg = "SendGrid API key not found in Secrets Manager or environment variables"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        try:
            self.client = SendGridAPIClient(api_key=self.api_key)
            print("✅ SendGrid client initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize SendGrid client: {str(e)}")
            raise
        
        self.from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@sportsacademy.tech')
        self.from_name = os.environ.get('SENDGRID_FROM_NAME', 'Texas Sports Academy')
        
        print(f"📧 From Email: {self.from_email}")
        print(f"👤 From Name: {self.from_name}")
        print("🎉 SendGrid Email Service initialized successfully")
    
    def _get_sendgrid_api_key(self) -> Optional[str]:
        """Get SendGrid API key from Secrets Manager or environment variable"""
        
        # Debug: Print all SendGrid-related environment variables
        print("🔍 DEBUG: Environment variables:")
        print(f"🔍 SENDGRID_SECRET_ARN: {os.environ.get('SENDGRID_SECRET_ARN', 'NOT_SET')}")
        print(f"🔍 SENDGRID_API_KEY: {os.environ.get('SENDGRID_API_KEY', 'NOT_SET')}")
        print(f"🔍 SENDGRID_FROM_EMAIL: {os.environ.get('SENDGRID_FROM_EMAIL', 'NOT_SET')}")
        
        # Try Secrets Manager first
        secret_arn_or_key = os.environ.get('SENDGRID_SECRET_ARN')
        if secret_arn_or_key:
            print(f"🔐 Attempting to retrieve API key from Secrets Manager: {secret_arn_or_key}")
            
            # Check if this looks like an API key instead of an ARN
            if secret_arn_or_key.startswith('SG.'):
                print("⚠️ WARNING: SENDGRID_SECRET_ARN contains what looks like an API key, not an ARN!")
                print("⚠️ Using it directly as API key...")
                return secret_arn_or_key
            
            # Try to get from Secrets Manager (proper ARN)
            try:
                secrets_client = boto3.client('secretsmanager')
                response = secrets_client.get_secret_value(SecretId=secret_arn_or_key)
                secret_data = json.loads(response['SecretString'])
                api_key = secret_data.get('api_key')
                if api_key:
                    print("✅ Successfully retrieved API key from Secrets Manager")
                    return api_key
                else:
                    print("⚠️ No 'api_key' field found in secret")
            except Exception as e:
                print(f"⚠️ Failed to retrieve from Secrets Manager: {str(e)}")
        
        # Fallback to direct environment variable
        api_key = os.environ.get('SENDGRID_API_KEY')
        if api_key and api_key != 'NOT_SET':
            print("✅ Using SENDGRID_API_KEY environment variable")
            return api_key
        
        print("❌ No SendGrid API key found in any source")
        return None
    
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
        print(f"📨 Starting email send process...")
        print(f"📧 To: {to_email}")
        print(f"📝 Subject: {subject}")
        print(f"📄 HTML content length: {len(html_content)} characters")
        print(f"📄 Text content length: {len(text_content) if text_content else 0} characters")
        
        try:
            # Use provided or default sender info
            sender_email = from_email or self.from_email
            sender_name = from_name or self.from_name
            
            print(f"👤 From: {sender_name} <{sender_email}>")
            
            # Create email objects
            from_email_obj = Email(email=sender_email, name=sender_name)
            to_email_obj = To(email=to_email)
            
            # Create mail object without content initially
            print("📦 Creating mail object...")
            mail = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=subject
            )
            
            # Set content properly to avoid duplicates
            content_list = []
            if text_content:
                print("📝 Adding text content...")
                content_list.append(Content(mime_type="text/plain", content=text_content))
            
            print("📝 Adding HTML content...")
            content_list.append(Content(mime_type="text/html", content=html_content))
            
            # Set the content array
            mail.content = content_list
            
            # Add reply-to if specified
            if reply_to:
                print(f"↩️ Adding reply-to: {reply_to}")
                mail.reply_to = Email(email=reply_to)
            
            # Send email
            print("🚀 Sending email via SendGrid API...")
            response = self.client.send(mail)
            print(f"✅ Email sent successfully! Status: {response.status_code}")
            print(f"📊 Response headers: {dict(response.headers) if hasattr(response, 'headers') else 'N/A'}")
            return {
                'success': True, 
                'status_code': response.status_code,
                'message': 'Email sent successfully'
            }
        except Exception as e:
            print(f"💥 Exception during email send: {str(e)}")
            print(f"💥 Exception type: {type(e).__name__}")
            
            # Try to get more detailed error information
            if hasattr(e, 'body'):
                print(f"💥 Error body: {e.body}")
            if hasattr(e, 'headers'):
                print(f"💥 Error headers: {e.headers}")
            if hasattr(e, 'status_code'):
                print(f"💥 Error status code: {e.status_code}")
            
            # Print the mail object for debugging
            try:
                mail_json = mail.get()
                print(f"📧 Mail object being sent: {json.dumps(mail_json, indent=2)}")
            except Exception as mail_error:
                print(f"⚠️ Could not serialize mail object: {str(mail_error)}")
            
            import traceback
            print(f"💥 Full traceback: {traceback.format_exc()}")
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

    def send_coach_invitation_email(self, email: str, invite_url: str, invitation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send coach invitation email using shared template system
        This consolidates the email template logic that was duplicated in admin backend
        """
        try:
            subject = "Join the Coaching Team - Invitation"
            
            # Personal message section if provided
            invitation_content = ""
            if invitation.get('message'):
                invitation_content = f'''
                <!-- Personal Message -->
                <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px 0; color: #0c4a6e; font-size: 18px;">Personal Message</h3>
                    <p style="margin: 0; color: #0c4a6e; line-height: 1.5; font-style: italic;">
                        "{invitation['message']}"
                    </p>
            </div>
                '''
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{subject}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; line-height: 1.6;">
                
                <!-- Email Container -->
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #004aad 0%, #003888 100%); padding: 32px 24px; text-align: center;">
                        <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 20px; display: inline-block;">
                            <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Coach Portal Invitation</h2>
                        </div>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="padding: 40px 32px;">
                        
                        <!-- Greeting Section -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
                                Invited to Join the Team!
                            </h1>
                            <p style="margin: 0; color: #6b7280; font-size: 16px;">
                                Join the coaching family and help develop the next generation of athletes.
                            </p>
                        </div>
                        
                        {invitation_content}
                        
                        <!-- Action Button -->
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{invite_url}" 
                               style="display: inline-block; background-color: #004aad; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                Complete Application
                            </a>
                </div>
                
                        <!-- Fallback Link -->
                        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
                            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">
                                If the button doesn't work, copy and paste this link:
                            </p>
                            <p style="margin: 0 0 12px 0; word-break: break-all; color: #2563eb; font-size: 12px; font-family: monospace;">
                                {invite_url}
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                This invitation will expire in 7 days.
                            </p>
                </div>
                
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            This invitation was sent to <strong>{email}</strong>
                        </p>
            </div>
            
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
            Coach Portal Invitation
        
            Invited to Join the Team!
        
            Join the coaching family and help develop the next generation of athletes.
        
            {f'Personal message: "{invitation["message"]}"' if invitation.get('message') else ''}
        
            Complete coach application: {invite_url}
        
            If the button doesn't work, copy and paste this link:
            {invite_url}
            
            This invitation will expire in 7 days.
            
            This invitation was sent to {email}
            """
            
            return self.send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
            
    except Exception as e:
            logger.error(f"Error sending coach invitation email: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to send coach invitation email: {str(e)}'
            }


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
            print(f"Parent invitation email sent via SendGrid to {invitation['parent_email']}. Status: {result.get('status_code', 'unknown')}")
            return True
        else:
            print(f"Failed to send parent invitation email via SendGrid: {result['error']}")
            return False
            
    except Exception as e:
        print(f"Error sending parent invitation email via SendGrid: {str(e)}")
        return False


def send_magic_link_email(email: str, magic_link: str, user_exists: bool, user_role: str, invitation_token: str = None) -> bool:
    """Send role-specific magic link email with simplified clean design"""
    print(f"🎯 Starting magic link email process...")
    print(f"📧 Email: {email}")
    print(f"🔗 Magic Link: {magic_link}")
    print(f"👤 User Role: {user_role}")
    print(f"✅ User Exists: {user_exists}")
    print(f"🎫 Invitation Token: {invitation_token}")
    
    try:
        print("🔧 Initializing SendGrid service...")
        sendgrid_service = SendGridEmailService()
        
        print(f"📝 Preparing role-specific email content for {user_role} user...")
        
        # Role-specific configuration
        role_config = {
            'admin': {
                'subject': 'Access Admin Portal',
                'portal_name': 'Admin Portal',
                'greeting': 'Welcome back, Administrator!',
                'action_text': 'Access Admin Portal',
                'description': 'Manage coach invitations, oversee operations, and view analytics.',
                'icon_color': '#dc2626'  # Red for admin
            },
            'coach': {
                'subject': 'Access Coach Portal' if user_exists else 'Complete Coach Registration',
                'portal_name': 'Coach Portal',
                'greeting': 'Welcome back!' if user_exists else 'Welcome to the team!',
                'action_text': 'Access Coach Portal' if user_exists else 'Complete Registration',
                'description': 'Manage coaching profile, invite students, and track progress.',
                'icon_color': '#004aad'  # TSA Blue for coach
            },
            'parent': {
                'subject': 'Complete Child Enrollment' if invitation_token else 'Access Parent Portal',
                'portal_name': 'Parent Portal',
                'greeting': 'Welcome to the family!' if invitation_token else 'Welcome back!',
                'action_text': 'Continue Enrollment Process' if invitation_token else 'Access Parent Portal',
                'description': 'Track child progress, communicate with coaches, and manage enrollment.',
                'icon_color': '#059669'  # Green for parent
            }
        }
        
        config = role_config.get(user_role, role_config['coach'])
        
        print(f"📝 Email Subject: {config['subject']}")
        print(f"🏷️ Portal Name: {config['portal_name']}")
        
        # Special content for parent invitations
        invitation_content = ""
        if user_role == 'parent' and invitation_token:
            invitation_content = f"""
            <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; color: #0c4a6e; font-size: 18px;">Child has been invited to join!</h3>
                <p style="margin: 0; color: #0c4a6e; line-height: 1.5;">
                    A coach has personally invited the child to be part of the athletic program. 
                    Complete the enrollment process to secure the spot.
                </p>
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{config['subject']}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; line-height: 1.6;">
            
            <!-- Email Container -->
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #004aad 0%, #003888 100%); padding: 32px 24px; text-align: center;">
                    <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 20px; display: inline-block;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">{config['portal_name']}</h2>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 40px 32px;">
                    
                    <!-- Greeting Section -->
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
                            {config['greeting']}
                        </h1>
                        <p style="margin: 0; color: #6b7280; font-size: 16px;">
                            {config['description']}
                        </p>
                    </div>
                    
                    {invitation_content}
                    
                    <!-- Action Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{magic_link}" 
                           style="display: inline-block; background-color: {config['icon_color']}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            {config['action_text']}
                        </a>
                    </div>
                    
                    <!-- Fallback Link -->
                    <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
                        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">
                            If the button doesn't work, copy and paste this link:
                        </p>
                        <p style="margin: 0 0 12px 0; word-break: break-all; color: #2563eb; font-size: 12px; font-family: monospace;">
                            {magic_link}
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 12px;">
                            This link will expire in 15 minutes.
                        </p>
                    </div>
                    
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        This email was sent to <strong>{email}</strong>
                    </p>
            </div>
            
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        {config['portal_name']}
        
        {config['greeting']}
        
        {config['description']}
        
        {"Child has been invited to join the athletic program! Complete the enrollment process to secure the spot." if user_role == 'parent' and invitation_token else ""}
        
        Click this link to {config['action_text'].lower()}:
        {magic_link}
        
        If the button doesn't work, copy and paste this link:
        {magic_link}
        
        This link will expire in 15 minutes.
        
        This email was sent to {email}
        """
        
        print(f"📄 HTML content prepared ({len(html_content)} characters)")
        print(f"📄 Text content prepared ({len(text_content)} characters)")
        print("🚀 Sending email via SendGrid...")
        
        result = sendgrid_service.send_email(
            to_email=email,
            subject=config['subject'],
            html_content=html_content,
            text_content=text_content
        )
        
        print(f"📊 SendGrid result: {result}")
        
        if result['success']:
            print(f"✅ Magic link email sent successfully to {email} ({user_role}). Status: {result.get('status_code', 'unknown')}")
            return True
        else:
            print(f"❌ Failed to send magic link email: {result['error']}")
            return False
            
    except Exception as e:
        print(f"💥 Exception in send_magic_link_email: {str(e)}")
        import traceback
        print(f"💥 Full traceback: {traceback.format_exc()}")
        return False 