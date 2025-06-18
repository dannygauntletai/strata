"""
TSA Platform - Shared Configuration
Centralized configuration management for all environments and services
"""

import os
from typing import Dict, List, Optional, Any


class TSAConfig:
    """Centralized configuration management for TSA platform"""
    
    def __init__(self, stage: str = None):
        self.stage = stage or os.environ.get('STAGE', 'dev')
        self.region = os.environ.get('AWS_REGION', 'us-east-2')
    
    def get_table_name(self, table_key: str) -> str:
        """Get standardized table name with environment suffix"""
        # Normalize key
        key = table_key.lower().replace('_', '-')
        
        # Use consistent naming pattern: {name}-{stage}
        return f"{key}-{self.stage}"
    
    def get_all_table_names(self) -> Dict[str, str]:
        """Get all table names for the platform"""
        return {
            # ===== CORE USER TABLES =====
            'users': f'users-{self.stage}',
            'profiles': f'profiles-{self.stage}',
            'organizations': f'organizations-{self.stage}',
            
            # ===== INVITATION TABLES (Clear Separation by Type) =====
            'coach-invitations': f'coach-invitations-{self.stage}',  # Admin → Coach (join platform)
            'parent-invitations': f'parent-invitations-{self.stage}',  # Coach → Parent (join platform)
            'event-invitations': f'event-invitations-{self.stage}',  # Coach → Parent (attend events)
            
            # ===== ENROLLMENT TABLES =====
            'enrollments': f'enrollments-{self.stage}',
            
            # ===== EVENT TABLES =====
            'events': f'events-{self.stage}',
            'event-registrations': f'event-registrations-{self.stage}',
            'event-attendees': f'event-attendees-{self.stage}',
            'eventbrite-config': f'eventbrite-config-{self.stage}',
            
            # ===== DOCUMENT & COMPLIANCE TABLES =====
            'documents': f'documents-{self.stage}',
            'background-checks': f'background-checks-{self.stage}',
            'legal-requirements': f'legal-requirements-{self.stage}',
            
            # ===== COMMUNICATION TABLES =====
            'messages': f'messages-{self.stage}',
            'notifications': f'notifications-{self.stage}',
            
            # ===== PROGRESS & ANALYTICS TABLES =====
            'analytics-events': f'analytics-events-{self.stage}',
            'bootcamp-progress': f'bootcamp-progress-{self.stage}',
            'timeline-events': f'timeline-events-{self.stage}',
            
            # ===== ADMIN TABLES =====
            'audit-logs': f'audit-logs-{self.stage}',
            
            # ===== SYSTEM TABLES =====
            'sessions': f'sessions-{self.stage}',
            
            # ===== COACH-SPECIFIC TABLES =====
            'coach-onboarding-sessions': f'coach-onboarding-sessions-{self.stage}',
            
            # ===== PARENT-SPECIFIC TABLES =====
            'scheduling': f'scheduling-{self.stage}',
        }
        
    def get_core_table_names(self) -> List[str]:
        """Get list of core table names that should exist in all environments"""
        return [
            'profiles', 'events', 'coach-invitations', 'parent-invitations',
            'sessions', 'audit-logs',
        ]
    
    def get_lambda_names(self) -> Dict[str, str]:
        """Get Lambda function names for the platform"""
        return {
            # Auth service functions
            'auth_magic_link': f'tsa-magic-link-{self.stage}',
            'auth_verify_token': f'tsa-verify-token-{self.stage}',
            
            # Admin service functions
            'admin_coaches': f'tsa-admin-coaches-{self.stage}',
            'admin_invitations': f'tsa-admin-invitations-{self.stage}',
            'admin_audit': f'tsa-admin-audit-{self.stage}',
            
            # Coach service functions
            'coach_events': f'tsa-coach-events-{self.stage}',
            'coach_invitations': f'tsa-coach-invitations-{self.stage}',
            'coach_onboarding': f'tsa-coach-onboarding-{self.stage}',
            
            # Parent service functions
            'parent_enrollment': f'tsa-parent-enrollment-{self.stage}',
            'parent_events': f'tsa-parent-events-{self.stage}',
        }
    
    def get_api_names(self) -> Dict[str, str]:
        """Get API Gateway names for the platform"""
        return {
            'auth': f'tsa-auth-api-{self.stage}',
            'admin': f'tsa-admin-api-{self.stage}',
            'coach': f'tsa-coach-api-{self.stage}',
            'parent': f'tsa-parent-api-{self.stage}',
        }
    
    def get_log_group_names(self) -> Dict[str, str]:
        """Get CloudWatch log group names for the platform"""
        return {
            'auth_api': f'/aws/apigateway/tsa-auth-api-{self.stage}',
            'admin_api': f'/aws/apigateway/tsa-admin-api-{self.stage}',
            'coach_api': f'/aws/apigateway/tsa-coach-api-{self.stage}',
            'parent_api': f'/aws/apigateway/tsa-parent-api-{self.stage}',
        }
    
    def get_log_group_name(self, service: str) -> str:
        """Get log group name for a specific service"""
        return f'/aws/apigateway/tsa-{service}-api-{self.stage}'
    
    def get_env_vars(self, service: str) -> Dict[str, str]:
        """Get environment variables for a specific service"""
        base_env = {
            'STAGE': self.stage,
            'AWS_REGION': self.region,
            'PROFILES_TABLE': self.get_table_name('profiles'),
            'USERS_TABLE': self.get_table_name('users'),
            'ORGANIZATIONS_TABLE': self.get_table_name('organizations'),
            'EVENTS_TABLE': self.get_table_name('events'),
            'EVENT_REGISTRATIONS_TABLE': self.get_table_name('event-registrations'),
            'EVENT_ATTENDEES_TABLE': self.get_table_name('event-attendees'),
            'COACH_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),
            'PARENT_INVITATIONS_TABLE': self.get_table_name('parent-invitations'),
            'EVENT_INVITATIONS_TABLE': self.get_table_name('event-invitations'),
            'ENROLLMENTS_TABLE': self.get_table_name('enrollments'),
            'DOCUMENTS_TABLE': self.get_table_name('documents'),
            'BACKGROUND_CHECKS_TABLE': self.get_table_name('background-checks'),
            'LEGAL_REQUIREMENTS_TABLE': self.get_table_name('legal-requirements'),
            'MESSAGES_TABLE': self.get_table_name('messages'),
            'NOTIFICATIONS_TABLE': self.get_table_name('notifications'),
            'ANALYTICS_EVENTS_TABLE': self.get_table_name('analytics-events'),
            'BOOTCAMP_PROGRESS_TABLE': self.get_table_name('bootcamp-progress'),
            'TIMELINE_EVENTS_TABLE': self.get_table_name('timeline-events'),
            'AUDIT_LOGS_TABLE': self.get_table_name('audit-logs'),
            'SESSIONS_TABLE': self.get_table_name('sessions'),
            'COACH_ONBOARDING_SESSIONS_TABLE': self.get_table_name('coach-onboarding-sessions'),
            'SCHEDULING_TABLE': self.get_table_name('scheduling'),
            'EVENTBRITE_CONFIG_TABLE': self.get_table_name('eventbrite-config'),
        }
        
        # Service-specific configurations
        if service == 'auth':
            base_env.update({
                'USER_POOL_ID': os.environ.get('USER_POOL_ID', ''),
                'CLIENT_ID': os.environ.get('CLIENT_ID', ''),
                'JWT_SECRET_ARN': os.environ.get('JWT_SECRET_ARN', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
                'SENDGRID_FROM_EMAIL': os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@strata.school'),
                'SENDGRID_FROM_NAME': os.environ.get('SENDGRID_FROM_NAME', 'Texas Sports Academy'),
                'FRONTEND_URL': os.environ.get('FRONTEND_URL', 'http://localhost:3000'),
                'ADMIN_FRONTEND_URL': os.environ.get('ADMIN_FRONTEND_URL', 'http://localhost:3001'),
                'ADMIN_EMAILS': os.environ.get('ADMIN_EMAILS', 'admin@sportsacademy.tech'),
            })
        elif service == 'admin':
            base_env.update({
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'COACH_API_URL': os.environ.get('COACH_API_URL', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
            })
        elif service == 'coach':
            base_env.update({
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
                'EVENTBRITE_SECRET_ARN': os.environ.get('EVENTBRITE_SECRET_ARN', ''),
            })
        elif service == 'parent':
            base_env.update({
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'COACH_API_URL': os.environ.get('COACH_API_URL', ''),
            })
        
        return base_env
    
    def get_service_environment_variables(self, service: str) -> Dict[str, str]:
        """Alias for get_env_vars for backward compatibility"""
        return self.get_env_vars(service)


# Global configuration instance
_config_instance = None

def get_config(stage: str = None) -> TSAConfig:
    """Get global configuration instance"""
    global _config_instance
    if _config_instance is None or (stage and _config_instance.stage != stage):
        _config_instance = TSAConfig(stage)
    return _config_instance


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_table_name(table_key: str, stage: Optional[str] = None) -> str:
    """Quick function to get a table name"""
    return get_config(stage).get_table_name(table_key)

def get_lambda_name(service: str, function: str, stage: Optional[str] = None) -> str:
    """Quick function to get a Lambda name"""
    return get_config(stage).get_lambda_name(service, function)

def get_env_vars(service: str, stage: Optional[str] = None) -> Dict[str, str]:
    """Quick function to get environment variables"""
    return get_config(stage).get_env_vars(service)


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Example usage
    config = TSAConfig('dev')
    
    print("=== Table Names ===")
    for table_key, table_name in config.get_all_table_names().items():
        print(f"{table_key}: {table_name}")
    
    print("\n=== Lambda Names ===")
    for lambda_key, lambda_name in config.get_lambda_names().items():
        print(f"{lambda_key}: {lambda_name}")
    
    print("\n=== Auth Service Env Vars ===")
    for env_key, env_value in config.get_env_vars('auth').items():
        print(f"{env_key}: {env_value}") 