"""
TSA Shared Configuration Utility
Single source of truth for all AWS resource naming across environments
Used by all backend services to ensure consistent naming without version numbers
"""
import os
from typing import Dict, Optional, List


class TSAConfig:
    """Central configuration for TSA platform resource naming"""
    
    def __init__(self, stage: Optional[str] = None):
        """Initialize with environment stage (dev, staging, prod)"""
        self.stage = stage or self._detect_stage()
        self.region = os.environ.get('AWS_REGION', 'us-east-2')
        
    def _detect_stage(self) -> str:
        """Auto-detect stage from environment variables"""
        # Try multiple environment variable patterns
        stage = (
            os.environ.get('STAGE') or 
            os.environ.get('ENVIRONMENT') or 
            os.environ.get('ENV') or
            'dev'  # Default fallback
        )
        return stage.lower()
    
    # =============================================================================
    # DYNAMODB TABLE NAMES
    # =============================================================================
    
    def get_table_name(self, table_key: str) -> str:
        """Get standardized DynamoDB table name for any table key"""
        table_mapping = {
            # Core shared tables
            'users': f'users-{self.stage}',
            'profiles': f'profiles-{self.stage}',
            'organizations': f'organizations-{self.stage}',
            'enrollments': f'enrollments-{self.stage}',
            'events': f'events-{self.stage}',
            'documents': f'documents-{self.stage}',
            
            # Invitation tables
            'coach-invitations': f'coach-invitations-{self.stage}',
            'parent-invitations': f'parent-invitations-{self.stage}',
            'event-invitations': f'event-invitations-{self.stage}',
            
            # Auth tables
            'magic-links': f'tsa-magic-links-{self.stage}',
            'sessions': f'sessions-{self.stage}',
            
            # Admin tables
            'audit-logs': f'audit-logs-{self.stage}',
            
            # Coach-specific tables
            'coach-onboarding-sessions': f'coach-onboarding-sessions-{self.stage}',
            'background-checks': f'background-checks-{self.stage}',
            'legal-requirements': f'legal-requirements-{self.stage}',
            'eventbrite-config': f'eventbrite-config-{self.stage}',
            'event-attendees': f'event-attendees-{self.stage}',
            
            # Parent-specific tables
            'scheduling': f'scheduling-{self.stage}',
            
            # Additional tables from auth backend
            'event-registrations': f'event-registrations-{self.stage}',
            'messages': f'messages-{self.stage}',
            'notifications': f'notifications-{self.stage}',
            'analytics-events': f'analytics-events-{self.stage}',
            'bootcamp-progress': f'bootcamp-progress-{self.stage}',
            'timeline-events': f'timeline-events-{self.stage}',
        }
        
        if table_key not in table_mapping:
            # Fallback pattern for any unmapped tables
            return f'{table_key}-{self.stage}'
            
        return table_mapping[table_key]
    
    def get_all_table_names(self) -> Dict[str, str]:
        """Get all table names as a dictionary"""
        return {key: self.get_table_name(key) for key in [
            'users', 'profiles', 'organizations', 'enrollments', 'events', 'documents',
            'coach-invitations', 'parent-invitations', 'event-invitations',
            'magic-links', 'sessions', 'audit-logs',
            'coach-onboarding-sessions', 'background-checks', 'legal-requirements',
            'eventbrite-config', 'event-attendees', 'scheduling',
            'event-registrations', 'messages', 'notifications', 'analytics-events',
            'bootcamp-progress', 'timeline-events'
        ]}
    
    def get_core_table_names(self) -> List[str]:
        """Get list of core table names that should exist in all environments"""
        return [
            'profiles', 'events', 'coach-invitations', 'parent-invitations',
            'sessions', 'audit-logs',
        ]
    
    # =============================================================================
    # LAMBDA FUNCTION NAMES
    # =============================================================================
    
    def get_lambda_name(self, service: str, function: str) -> str:
        """Get standardized Lambda function name"""
        return f'tsa-{service}-{function}-{self.stage}'
    
    def get_lambda_names(self) -> Dict[str, str]:
        """Get all common Lambda function names"""
        return {
            # Auth service
            'auth_magic_link': self.get_lambda_name('magic-link', 'handler'),
            'auth_verify_token': self.get_lambda_name('verify-token', 'handler'),
            
            # Admin service
            'admin_invitations': self.get_lambda_name('admin', 'invitations'),
            'admin_audit_health': self.get_lambda_name('admin', 'audit-health'),
            'admin_coaches': self.get_lambda_name('admin', 'coaches'),
            'admin_audit': self.get_lambda_name('admin', 'audit'),
            
            # Coach service
            'coach_onboard': self.get_lambda_name('coach', 'onboard'),
            'coach_profile': self.get_lambda_name('coach', 'profile'),
            'coach_events': self.get_lambda_name('coach', 'events'),
            'coach_background': self.get_lambda_name('coach', 'background'),
            'coach_invitations': self.get_lambda_name('coach', 'invitations'),
            'coach_eventbrite_oauth': self.get_lambda_name('coach', 'eventbrite-oauth'),
            'coach_onboarding': self.get_lambda_name('coach', 'onboarding'),
            
            # Parent service
            'parent_dashboard': self.get_lambda_name('parent', 'dashboard'),
            'parent_invitations': self.get_lambda_name('parent', 'invitations'),
            'parent_enrollment': self.get_lambda_name('parent', 'enrollment'),
            'parent_events': self.get_lambda_name('parent', 'events'),
        }
    
    # =============================================================================
    # CLOUDWATCH LOG GROUPS
    # =============================================================================
    
    def get_log_group_name(self, service: str, resource_type: str = 'lambda') -> str:
        """Get standardized CloudWatch log group name"""
        if resource_type == 'apigateway':
            return f'/aws/apigateway/tsa-{service}-{self.stage}'
        elif resource_type == 'lambda':
            return f'/aws/lambda/tsa-{service}-{self.stage}'
        else:
            return f'/aws/{resource_type}/tsa-{service}-{self.stage}'
    
    def get_log_group_names(self) -> Dict[str, str]:
        """Get all common log group names as a dictionary"""
        return {
            # API Gateway log groups
            'auth_api': self.get_log_group_name('auth', 'apigateway'),
            'admin_api': self.get_log_group_name('admin', 'apigateway'), 
            'coach_api': self.get_log_group_name('coach', 'apigateway'),
            'parent_api': self.get_log_group_name('parent', 'apigateway'),
            
            # Lambda log groups
            'auth_lambda': self.get_log_group_name('auth', 'lambda'),
            'admin_lambda': self.get_log_group_name('admin', 'lambda'),
            'coach_lambda': self.get_log_group_name('coach', 'lambda'),
            'parent_lambda': self.get_log_group_name('parent', 'lambda'),
            
            # Backward compatibility aliases
            'auth': self.get_log_group_name('auth', 'apigateway'),
            'admin': self.get_log_group_name('admin', 'apigateway'),
            'coach': self.get_log_group_name('coach', 'apigateway'),
            'parent': self.get_log_group_name('parent', 'apigateway'),
        }
    
    # =============================================================================
    # API GATEWAY NAMES
    # =============================================================================
    
    def get_api_name(self, service: str) -> str:
        """Get standardized API Gateway name"""
        return f'tsa-{service}-api-{self.stage}'
    
    def get_api_names(self) -> Dict[str, str]:
        """Get all common API Gateway names as a dictionary"""
        return {
            'auth_api': self.get_api_name('auth'),
            'admin_api': self.get_api_name('admin'), 
            'coach_api': self.get_api_name('coach'),
            'parent_api': self.get_api_name('parent'),
            
            # Backward compatibility aliases
            'auth': self.get_api_name('auth'),
            'admin': self.get_api_name('admin'),
            'coach': self.get_api_name('coach'),
            'parent': self.get_api_name('parent'),
        }
    
    # =============================================================================
    # S3 BUCKET NAMES
    # =============================================================================
    
    def get_bucket_name(self, bucket_type: str, account_id: str = '') -> str:
        """Get standardized S3 bucket name"""
        if account_id:
            return f'tsa-{bucket_type}-{self.stage}-{account_id}'
        else:
            return f'tsa-{bucket_type}-{self.stage}'
    
    # =============================================================================
    # ENVIRONMENT VARIABLES
    # =============================================================================
    
    def get_env_vars(self, service: str) -> Dict[str, str]:
        """Get standardized environment variables for a service"""
        base_vars = {
            'STAGE': self.stage,
            'LOG_LEVEL': 'INFO',
            
            # Core table names
            'USERS_TABLE': self.get_table_name('users'),
            'PROFILES_TABLE': self.get_table_name('profiles'),
            'ORGANIZATIONS_TABLE': self.get_table_name('organizations'),
            'ENROLLMENTS_TABLE': self.get_table_name('enrollments'),
            'EVENTS_TABLE': self.get_table_name('events'),
            'DOCUMENTS_TABLE': self.get_table_name('documents'),
            
            # Invitation tables
            'COACH_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),
            'PARENT_INVITATIONS_TABLE': self.get_table_name('parent-invitations'),
            'EVENT_INVITATIONS_TABLE': self.get_table_name('event-invitations'),
            
            # Additional comprehensive table names
            'EVENT_REGISTRATIONS_TABLE': self.get_table_name('event-registrations'),
            'EVENT_ATTENDEES_TABLE': self.get_table_name('event-attendees'),
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
        
        # Service-specific variables
        if service == 'auth':
            base_vars.update({
                'TSA_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),  # Legacy name
                'USER_POOL_ID': os.environ.get('USER_POOL_ID', ''),
                'CLIENT_ID': os.environ.get('CLIENT_ID', ''),
                'JWT_SECRET_ARN': os.environ.get('JWT_SECRET_ARN', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
                'SENDGRID_FROM_EMAIL': os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@strata.school'),
                'SENDGRID_FROM_NAME': os.environ.get('SENDGRID_FROM_NAME', 'Texas Sports Academy'),
                'FRONTEND_URL': os.environ.get('FRONTEND_URL', 'http://localhost:3000'),
                'ADMIN_FRONTEND_URL': os.environ.get('ADMIN_FRONTEND_URL', 'http://localhost:3001'),
                'ADMIN_EMAILS': os.environ.get('ADMIN_EMAILS', 'admin@sportsacademy.school'),
            })
        elif service == 'admin':
            base_vars.update({
                'TSA_AUDIT_LOGS_TABLE': self.get_table_name('audit-logs'),  # Legacy name
                'TSA_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),  # Legacy name
                'TSA_PROFILES_TABLE': self.get_table_name('profiles'),  # Legacy name
                'TSA_USERS_TABLE': self.get_table_name('users'),  # Legacy name
                'TSA_ENROLLMENTS_TABLE': self.get_table_name('enrollments'),  # Legacy name
                'TSA_EVENTS_TABLE': self.get_table_name('events'),  # Legacy name
                'TSA_DOCUMENTS_TABLE': self.get_table_name('documents'),  # Legacy name
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'COACH_API_URL': os.environ.get('COACH_API_URL', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
            })
        elif service == 'coach':
            base_vars.update({
                'ONBOARDING_SESSIONS_TABLE': self.get_table_name('coach-onboarding-sessions'),
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'SENDGRID_SECRET_ARN': os.environ.get('SENDGRID_SECRET_ARN', ''),
                'EVENTBRITE_SECRET_ARN': os.environ.get('EVENTBRITE_SECRET_ARN', ''),
            })
        elif service == 'parent':
            base_vars.update({
                'AUTH_API_URL': os.environ.get('AUTH_API_URL', ''),
                'COACH_API_URL': os.environ.get('COACH_API_URL', ''),
            })
        
        return base_vars
    
    def get_service_environment_variables(self, service: str) -> Dict[str, str]:
        """Alias for get_env_vars to match infrastructure expectations"""
        return self.get_env_vars(service)
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    def is_production(self) -> bool:
        """Check if current stage is production"""
        return self.stage.lower() == 'prod'
    
    def is_staging(self) -> bool:
        """Check if current stage is staging"""
        return self.stage.lower() == 'staging'
    
    def is_development(self) -> bool:
        """Check if current stage is development"""
        return self.stage.lower() == 'dev'


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_config(stage: Optional[str] = None) -> TSAConfig:
    """Get TSA configuration instance"""
    return TSAConfig(stage)

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