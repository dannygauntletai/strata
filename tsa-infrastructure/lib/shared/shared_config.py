"""
TSA Shared Configuration Utility
Single source of truth for all AWS resource naming across environments
Used by all backend services to ensure consistent naming without version numbers
"""
import os
from typing import Dict, Optional


class TSAConfig:
    """Central configuration for TSA platform resource naming"""
    
    def __init__(self, stage: Optional[str] = None):
        """Initialize with environment stage (dev, staging, prod)"""
        self.stage = stage or self._detect_stage()
        
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
            'eventbrite-config', 'event-attendees', 'scheduling'
        ]}
    
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
            
            # Coach service
            'coach_onboard': self.get_lambda_name('coach', 'onboard'),
            'coach_profile': self.get_lambda_name('coach', 'profile'),
            'coach_events': self.get_lambda_name('coach', 'events'),
            'coach_background': self.get_lambda_name('coach', 'background'),
            'coach_invitations': self.get_lambda_name('coach', 'invitations'),
            'coach_eventbrite_oauth': self.get_lambda_name('coach', 'eventbrite-oauth'),
            
            # Parent service
            'parent_dashboard': self.get_lambda_name('parent', 'dashboard'),
            'parent_invitations': self.get_lambda_name('parent', 'invitations'),
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
    
    # =============================================================================
    # API GATEWAY NAMES
    # =============================================================================
    
    def get_api_name(self, service: str) -> str:
        """Get standardized API Gateway name"""
        return f'tsa-{service}-api-{self.stage}'
    
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
            'ENROLLMENTS_TABLE': self.get_table_name('enrollments'),
            'EVENTS_TABLE': self.get_table_name('events'),
            'DOCUMENTS_TABLE': self.get_table_name('documents'),
            
            # Invitation tables
            'COACH_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),
            'PARENT_INVITATIONS_TABLE': self.get_table_name('parent-invitations'),
            'EVENT_INVITATIONS_TABLE': self.get_table_name('event-invitations'),
        }
        
        # Service-specific variables
        if service == 'auth':
            base_vars.update({
                'MAGIC_LINKS_TABLE': self.get_table_name('magic-links'),
                'TSA_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),  # Legacy name
            })
        elif service == 'admin':
            base_vars.update({
                'AUDIT_LOGS_TABLE': self.get_table_name('audit-logs'),
                'TSA_AUDIT_LOGS_TABLE': self.get_table_name('audit-logs'),  # Legacy name
                'TSA_INVITATIONS_TABLE': self.get_table_name('coach-invitations'),  # Legacy name
                'TSA_PROFILES_TABLE': self.get_table_name('profiles'),  # Legacy name
                'TSA_USERS_TABLE': self.get_table_name('users'),  # Legacy name
                'TSA_ENROLLMENTS_TABLE': self.get_table_name('enrollments'),  # Legacy name
                'TSA_EVENTS_TABLE': self.get_table_name('events'),  # Legacy name
                'TSA_DOCUMENTS_TABLE': self.get_table_name('documents'),  # Legacy name
            })
        elif service == 'coach':
            base_vars.update({
                'ONBOARDING_SESSIONS_TABLE': self.get_table_name('coach-onboarding-sessions'),
                'BACKGROUND_CHECKS_TABLE': self.get_table_name('background-checks'),
                'LEGAL_REQUIREMENTS_TABLE': self.get_table_name('legal-requirements'),
                'EVENTBRITE_CONFIG_TABLE': self.get_table_name('eventbrite-config'),
                'EVENT_ATTENDEES_TABLE': self.get_table_name('event-attendees'),
            })
        elif service == 'parent':
            base_vars.update({
                'SCHEDULING_TABLE': self.get_table_name('scheduling'),
            })
        
        return base_vars
    
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