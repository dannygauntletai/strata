"""
Professional Jinja2 Template Service for TSA Admin Backend
Handles email templates with proper separation of concerns
Following Jinja2 3.1.6+ best practices with correct file extensions
"""
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape, StrictUndefined
    from jinja2.exceptions import TemplateNotFound, TemplateSyntaxError, UndefinedError
except ImportError:
    raise ImportError("Jinja2 is required. Install with: pip install 'Jinja2>=3.1.6'")

logger = logging.getLogger(__name__)


class TemplateService:
    """Professional template rendering service using Jinja2 with proper file extensions"""
    
    def __init__(self):
        """Initialize Jinja2 environment with production-ready configuration"""
        
        # Get template directory path
        self.template_dir = Path(__file__).parent / 'templates'
        
        # Ensure template directory exists
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure Jinja2 environment following official best practices
        self.env = Environment(
            loader=FileSystemLoader(
                str(self.template_dir),
                encoding='utf-8',
                followlinks=False  # Security: don't follow symlinks
            ),
            autoescape=select_autoescape(['html', 'xml', 'htm']),  # XSS prevention
            trim_blocks=True,              # Remove first newline after block
            lstrip_blocks=True,            # Strip leading whitespace from blocks
            keep_trailing_newline=True,    # Preserve trailing newlines
            undefined=StrictUndefined,     # Fail on undefined variables (security)
            cache_size=100,                # Template caching for performance
            auto_reload=False,             # Disable auto-reload in production
            optimized=True,                # Enable optimizations
            finalize=lambda x: x if x is not None else ''  # Handle None values gracefully
        )
        
        # Add custom filters and tests
        self._register_custom_filters()
        self._register_custom_tests()
        
        logger.info(f"✅ Jinja2 template service initialized - Directory: {self.template_dir}")
    
    def _register_custom_filters(self):
        """Register custom Jinja2 filters with proper error handling"""
        
        @self.env.filter
        def format_date(date_value, format='%Y-%m-%d %H:%M:%S'):
            """Format datetime objects with fallback handling"""
            try:
                if isinstance(date_value, str):
                    # Handle ISO format with timezone
                    date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                elif isinstance(date_value, (int, float)):
                    # Handle Unix timestamps
                    date_value = datetime.fromtimestamp(date_value)
                
                return date_value.strftime(format) if date_value else ''
            except (ValueError, TypeError, AttributeError):
                return str(date_value) if date_value else ''
        
        @self.env.filter
        def title_case(text):
            """Convert text to title case and replace underscores"""
            try:
                return str(text).replace('_', ' ').replace('-', ' ').title()
            except (AttributeError, TypeError):
                return str(text) if text else ''
        
        @self.env.filter
        def days_from_now(timestamp):
            """Calculate days from current time with error handling"""
            try:
                if isinstance(timestamp, (int, float)):
                    target_date = datetime.fromtimestamp(timestamp)
                    return max(0, (target_date - datetime.now()).days)
                elif isinstance(timestamp, str):
                    target_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    return max(0, (target_date - datetime.now()).days)
                return 7  # Default fallback
            except (ValueError, TypeError, AttributeError):
                return 7
        
        @self.env.filter  
        def truncate_smart(text, length=50, suffix='...'):
            """Smart truncation that preserves words"""
            try:
                text = str(text)
                if len(text) <= length:
                    return text
                
                # Find last space before the limit
                truncated = text[:length]
                last_space = truncated.rfind(' ')
                
                if last_space > length * 0.8:  # If space is reasonably close to limit
                    return truncated[:last_space] + suffix
                else:
                    return truncated + suffix
            except (AttributeError, TypeError):
                return str(text) if text else ''
    
    def _register_custom_tests(self):
        """Register custom Jinja2 tests"""
        
        @self.env.test
        def expired(timestamp):
            """Test if a timestamp is in the past"""
            try:
                if isinstance(timestamp, (int, float)):
                    return datetime.fromtimestamp(timestamp) < datetime.now()
                return False
            except (ValueError, TypeError):
                return False
    
    def render_email(self, template_name: str, context: Dict[str, Any], format: str = 'html') -> str:
        """
        Render email template with comprehensive error handling using proper .jinja extensions
        
        Args:
            template_name: Name of the template (without extension)
            context: Variables to pass to template
            format: 'html' or 'txt'
            
        Returns:
            Rendered template content
            
        Raises:
            TemplateNotFound: If template doesn't exist
            TemplateSyntaxError: If template has syntax errors
            UndefinedError: If required variables are missing
        """
        # Build proper template path with .jinja extension
        template_path = f"email/{template_name}.{format}.jinja"
        
        try:
            # Load template
            template = self.env.get_template(template_path)
            
            # Add global context variables
            context.setdefault('current_year', datetime.now().year)
            context.setdefault('timestamp', datetime.now().isoformat())
            
            # Render template
            rendered = template.render(**context)
            
            logger.info(f"✅ Successfully rendered template: {template_path}")
            return rendered
            
        except Exception as e:
            logger.error(f"❌ Template rendering failed: {template_path} - {str(e)}")
            raise
    
    def render_coach_invitation(
        self, 
        email: str, 
        invite_url: str, 
        invitation: Dict[str, Any], 
        format: str = 'html'
    ) -> str:
        """
        Render coach invitation email with comprehensive context
        """
        context = {
            'email': email,
            'invite_url': invite_url,
            'invitation': invitation,
            'subject': 'Join the Coaching Team - Texas Sports Academy Invitation',
            'expiry_days': self._calculate_expiry_days(invitation.get('expires_at')),
            'company_name': 'Texas Sports Academy',
            'support_email': 'support@texassportsacademy.com'
        }
        
        return self.render_email('coach_invitation', context, format)
    
    def render_admin_notification(
        self,
        notification_type: str,
        details: Dict[str, Any],
        format: str = 'html'
    ) -> str:
        """
        Render admin notification email with proper context
        """
        # Template configuration following the builder pattern
        template_configs = {
            'security_alert': {
                'subject': '🚨 TSA Admin Portal - Security Alert',
                'color': '#dc2626',
                'icon': '🚨',
                'priority': 'high'
            },
            'system_event': {
                'subject': '🔔 TSA Admin Portal - System Event',
                'color': '#2563eb',
                'icon': '🔔',
                'priority': 'medium'
            },
            'audit_summary': {
                'subject': '📊 TSA Admin Portal - Daily Audit Summary',
                'color': '#059669',
                'icon': '📊',
                'priority': 'low'
            }
        }
        
        template_config = template_configs.get(notification_type, template_configs['system_event'])
        
        context = {
            'notification_type': notification_type,
            'details': details,
            'template': template_config,
            'subject': template_config['subject'],
            'company_name': 'Texas Sports Academy',
            'admin_portal_url': 'https://admin.texassportsacademy.com'
        }
        
        return self.render_email('admin_notification', context, format)
    
    def _calculate_expiry_days(self, expires_at) -> int:
        """Calculate days until expiration with proper error handling"""
        try:
            if isinstance(expires_at, (int, float)):
                expiry_date = datetime.fromtimestamp(expires_at)
                days_left = (expiry_date - datetime.now()).days
                return max(0, days_left)
            elif isinstance(expires_at, str):
                expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                days_left = (expiry_date - datetime.now()).days
                return max(0, days_left)
        except (ValueError, TypeError, AttributeError):
            logger.warning(f"Could not parse expiry date: {expires_at}")
        
        return 7  # Default fallback
    
    def validate_templates(self) -> Dict[str, Any]:
        """
        Comprehensive template validation following Jinja2 best practices with correct extensions
        """
        required_templates = [
            'email/coach_invitation.html.jinja',
            'email/coach_invitation.txt.jinja', 
            'email/admin_notification.html.jinja',
            'email/admin_notification.txt.jinja'
        ]
        
        validation_results = {
            'valid': True,
            'missing_templates': [],
            'syntax_errors': [],
            'runtime_errors': [],
            'available_templates': self.get_available_templates()
        }
        
        for template_path in required_templates:
            try:
                # Check if template exists and loads
                template = self.env.get_template(template_path)
                
                # Test rendering with minimal safe context
                test_context = {
                    'email': 'test@example.com',
                    'invite_url': 'https://example.com/test',
                    'invitation': {'message': 'Test message'},
                    'subject': 'Test Subject',
                    'notification_type': 'test',
                    'details': {'test': 'value'},
                    'template': {'color': '#000000', 'icon': '✅'}
                }
                
                rendered = template.render(**test_context)
                
                # Basic content validation
                if not rendered.strip():
                    validation_results['runtime_errors'].append({
                        'template': template_path,
                        'error': 'Template renders to empty content'
                    })
                    validation_results['valid'] = False
                
            except TemplateNotFound:
                validation_results['missing_templates'].append(template_path)
                validation_results['valid'] = False
                
            except TemplateSyntaxError as e:
                validation_results['syntax_errors'].append({
                    'template': template_path,
                    'error': str(e),
                    'line': getattr(e, 'lineno', None)
                })
                validation_results['valid'] = False
                
            except Exception as e:
                validation_results['runtime_errors'].append({
                    'template': template_path,
                    'error': str(e)
                })
                validation_results['valid'] = False
        
        return validation_results
    
    def get_available_templates(self) -> Dict[str, list]:
        """Get organized list of available templates with proper .jinja extensions"""
        templates = {'email': [], 'other': []}
        
        try:
            for template_file in self.template_dir.rglob('*.jinja'):
                relative_path = template_file.relative_to(self.template_dir)
                category = 'email' if 'email' in relative_path.parts else 'other'
                template_name = relative_path.with_suffix('').as_posix()
                templates[category].append(template_name)
        except Exception as e:
            logger.warning(f"Error scanning templates: {e}")
        
        return templates


# Global template service instance (singleton pattern)
template_service = TemplateService()


def render_coach_invitation_email(email: str, invite_url: str, invitation: Dict[str, Any]) -> Dict[str, str]:
    """
    Convenience function to render both HTML and text versions of coach invitation
    Using proper .jinja file extensions
    """
    try:
        return {
            'html': template_service.render_coach_invitation(email, invite_url, invitation, 'html'),
            'text': template_service.render_coach_invitation(email, invite_url, invitation, 'txt'),
            'subject': 'Join the Coaching Team - Texas Sports Academy Invitation'
        }
    except Exception as e:
        logger.error(f"Failed to render coach invitation templates: {str(e)}")
        raise RuntimeError(f"Template rendering failed: {str(e)}")


def render_admin_notification_email(notification_type: str, details: Dict[str, Any]) -> Dict[str, str]:
    """
    Convenience function to render both HTML and text versions of admin notification
    Using proper .jinja file extensions
    """
    try:
        html_content = template_service.render_admin_notification(notification_type, details, 'html')
        text_content = template_service.render_admin_notification(notification_type, details, 'txt')
        
        # Template configuration lookup
        subjects = {
            'security_alert': '🚨 TSA Admin Portal - Security Alert',
            'system_event': '🔔 TSA Admin Portal - System Event',
            'audit_summary': '📊 TSA Admin Portal - Daily Audit Summary'
        }
        
        return {
            'html': html_content,
            'text': text_content,
            'subject': subjects.get(notification_type, subjects['system_event'])
        }
    except Exception as e:
        logger.error(f"Failed to render admin notification templates: {str(e)}")
        raise RuntimeError(f"Template rendering failed: {str(e)}") 