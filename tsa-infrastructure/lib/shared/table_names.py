"""
TSA Platform - Single Source of Truth for Table Names
Centralized table naming and configuration for all services
"""

from typing import Dict, List, Any
import os


class TableNameConfig:
    """Centralized table naming configuration - SINGLE SOURCE OF TRUTH"""
    
    def __init__(self, stage: str = None):
        self.stage = stage or os.environ.get('STAGE', 'dev')
    
    def get_table_name(self, table_key: str) -> str:
        """
        Get standardized table name - SINGLE SOURCE OF TRUTH
        
        Args:
            table_key: Logical table name (e.g., 'users', 'events')
            
        Returns:
            Standardized table name with environment suffix
        """
        # Normalize key
        key = table_key.lower().replace('_', '-')
        
        # Use consistent naming pattern: {name}-{stage}
        return f"{key}-{self.stage}"
    
    def get_all_table_names(self) -> Dict[str, str]:
        """Get all table names for the platform"""
        return {
            # ===== CORE USER TABLES =====
            "users": self.get_table_name("users"),
            "profiles": self.get_table_name("profiles"), 
            "organizations": self.get_table_name("organizations"),
            
            # ===== INVITATION & ENROLLMENT TABLES =====
            "invitations": self.get_table_name("invitations"),
            "enrollments": self.get_table_name("enrollments"),
            "parent-invitations": self.get_table_name("parent-invitations"),
            
            # ===== EVENT TABLES =====
            "events": self.get_table_name("events"),
            "event-registrations": self.get_table_name("event-registrations"),
            "event-attendees": self.get_table_name("event-attendees"),
            "eventbrite-config": self.get_table_name("eventbrite-config"),
            
            # ===== DOCUMENT & COMPLIANCE TABLES =====
            "documents": self.get_table_name("documents"),
            "background-checks": self.get_table_name("background-checks"),
            "legal-requirements": self.get_table_name("legal-requirements"),
            
            # ===== COMMUNICATION TABLES =====
            "messages": self.get_table_name("messages"),
            "notifications": self.get_table_name("notifications"),
            
            # ===== PROGRESS & ANALYTICS TABLES =====
            "analytics-events": self.get_table_name("analytics-events"),
            "bootcamp-progress": self.get_table_name("bootcamp-progress"),
            "timeline-events": self.get_table_name("timeline-events"),
            
            # ===== ADMIN TABLES =====
            "audit-logs": self.get_table_name("audit-logs"),
            
            # ===== SYSTEM TABLES =====
            "sessions": self.get_table_name("sessions"),
            "magic-links": self.get_table_name("tsa-magic-links"),  # Keep existing naming for this
            
            # ===== COACH-SPECIFIC TABLES =====
            "coach-onboarding-sessions": self.get_table_name("coach-onboarding-sessions"),
            
            # ===== PARENT-SPECIFIC TABLES =====
            "scheduling": self.get_table_name("scheduling"),
        }
    
    def get_dynamodb_table_configs(self) -> Dict[str, Dict]:
        """
        SINGLE SOURCE OF TRUTH for DynamoDB table configurations
        Replaces all duplicate DYNAMODB_TABLE_CONFIGS
        """
        return {
            "users": {
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "email", "AttributeType": "S"},
                    {"AttributeName": "role", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "email-index",
                        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}]
                    },
                    {
                        "IndexName": "role-index", 
                        "KeySchema": [{"AttributeName": "role", "KeyType": "HASH"}]
                    }
                ]
            },
            
            "profiles": {
                "KeySchema": [
                    {"AttributeName": "profile_id", "KeyType": "HASH"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "profile_id", "AttributeType": "S"},
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "school_id", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "user-index",
                        "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}]
                    },
                    {
                        "IndexName": "school-index",
                        "KeySchema": [{"AttributeName": "school_id", "KeyType": "HASH"}]
                    }
                ]
            },
            
            "events": {
                "KeySchema": [
                    {"AttributeName": "event_id", "KeyType": "HASH"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "event_id", "AttributeType": "S"},
                    {"AttributeName": "coach_id", "AttributeType": "S"},
                    {"AttributeName": "start_date", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "coach-events-index",
                        "KeySchema": [
                            {"AttributeName": "coach_id", "KeyType": "HASH"},
                            {"AttributeName": "start_date", "KeyType": "RANGE"}
                        ]
                    },
                    {
                        "IndexName": "status-date-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"},
                            {"AttributeName": "start_date", "KeyType": "RANGE"}
                        ]
                    }
                ]
            },
            
            "invitations": {
                "KeySchema": [
                    {"AttributeName": "invitation_id", "KeyType": "HASH"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "invitation_id", "AttributeType": "S"},
                    {"AttributeName": "email", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "role", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "email-index",
                        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}]
                    },
                    {
                        "IndexName": "status-role-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"},
                            {"AttributeName": "role", "KeyType": "RANGE"}
                        ]
                    }
                ]
            },
            
            "documents": {
                "KeySchema": [
                    {"AttributeName": "document_id", "KeyType": "HASH"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "document_id", "AttributeType": "S"},
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "document_type", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "user-type-index",
                        "KeySchema": [
                            {"AttributeName": "user_id", "KeyType": "HASH"},
                            {"AttributeName": "document_type", "KeyType": "RANGE"}
                        ]
                    }
                ]
            },
            
            "audit-logs": {
                "KeySchema": [
                    {"AttributeName": "log_id", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "log_id", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "action", "AttributeType": "S"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "user-action-index",
                        "KeySchema": [
                            {"AttributeName": "user_id", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ]
                    },
                    {
                        "IndexName": "action-timestamp-index",
                        "KeySchema": [
                            {"AttributeName": "action", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ]
                    }
                ]
            }
        }
    
    def get_service_environment_variables(self, service: str) -> Dict[str, str]:
        """Get environment variables for a specific service"""
        base_vars = {
            "STAGE": self.stage,
            "LOG_LEVEL": "INFO",
        }
        
        # Add table environment variables
        table_vars = {
            "USERS_TABLE": self.get_table_name("users"),
            "PROFILES_TABLE": self.get_table_name("profiles"),
            "ORGANIZATIONS_TABLE": self.get_table_name("organizations"),
            "INVITATIONS_TABLE": self.get_table_name("invitations"),
            "ENROLLMENTS_TABLE": self.get_table_name("enrollments"),
            "EVENTS_TABLE": self.get_table_name("events"),
            "DOCUMENTS_TABLE": self.get_table_name("documents"),
            "AUDIT_LOGS_TABLE": self.get_table_name("audit-logs"),
        }
        
        # Service-specific variables
        service_vars = {}
        if service == "admin":
            service_vars.update({
                "TSA_USERS_TABLE": self.get_table_name("users"),
                "TSA_PROFILES_TABLE": self.get_table_name("profiles"),
                "TSA_INVITATIONS_TABLE": self.get_table_name("invitations"),
                "TSA_ENROLLMENTS_TABLE": self.get_table_name("enrollments"),
                "TSA_EVENTS_TABLE": self.get_table_name("events"),
                "TSA_DOCUMENTS_TABLE": self.get_table_name("documents"),
                "TSA_AUDIT_LOGS_TABLE": self.get_table_name("audit-logs"),
            })
        elif service == "coach":
            service_vars.update({
                "ONBOARDING_SESSIONS_TABLE": self.get_table_name("coach-onboarding-sessions"),
                "BACKGROUND_CHECKS_TABLE": self.get_table_name("background-checks"),
                "LEGAL_REQUIREMENTS_TABLE": self.get_table_name("legal-requirements"),
                "EVENTBRITE_CONFIG_TABLE": self.get_table_name("eventbrite-config"),
                "EVENT_ATTENDEES_TABLE": self.get_table_name("event-attendees"),
            })
        elif service == "parent":
            service_vars.update({
                "PARENT_INVITATIONS_TABLE": self.get_table_name("parent-invitations"),
                "SCHEDULING_TABLE": self.get_table_name("scheduling"),
            })
        
        return {**base_vars, **table_vars, **service_vars}
    
    def get_lambda_names(self) -> Dict[str, str]:
        """Get standardized Lambda function names"""
        return {
            # Admin service functions
            "admin_main": f"tsa-admin-portal-{self.stage}",
            "admin_invitations": f"tsa-admin-portal-{self.stage}-invitations",
            "admin_audit_health": f"tsa-admin-portal-{self.stage}-audit-health",
            "admin_coaches": f"tsa-admin-portal-{self.stage}-coaches",
            
            # Coach service functions
            "coach_onboard": f"tsa-coach-onboard-{self.stage}",
            "coach_profile": f"tsa-coach-profile-{self.stage}",
            "coach_events": f"tsa-coach-events-{self.stage}",
            "coach_background": f"tsa-coach-background-{self.stage}",
            "coach_eventbrite_oauth": f"tsa-coach-eventbrite-oauth-{self.stage}",
            "coach_invitations": f"tsa-coach-invitations-{self.stage}",
            
            # Parent service functions
            "parent_enrollment": f"tsa-parent-enrollment-{self.stage}",
            "parent_dashboard": f"tsa-parent-dashboard-{self.stage}",
            "admissions_validate": f"tsa-admissions-validate-{self.stage}",
            
            # Auth service functions
            "auth_magic_link": f"tsa-magic-link-{self.stage}",
            "auth_verify_token": f"tsa-verify-token-{self.stage}",
        }
    
    def get_api_names(self) -> Dict[str, str]:
        """Get standardized API Gateway names"""
        return {
            "admin_api": f"TSA Admin API - {self.stage}",
            "coach_api": f"TSA Coach API - {self.stage}",
            "parent_api": f"TSA Parent API - {self.stage}",
            "auth_api": f"TSA Unified Passwordless Auth API - {self.stage}",
        }
    
    def get_log_group_names(self) -> Dict[str, str]:
        """Get standardized CloudWatch log group names"""
        return {
            "admin_api": f"/aws/apigateway/tsa-admin-api-{self.stage}",
            "coach_api": f"/aws/apigateway/tsa-coach-api-{self.stage}",
            "parent_api": f"/aws/apigateway/tsa-parent-api-{self.stage}",
            "auth_api": f"/aws/apigateway/tsa-passwordless-{self.stage}",
        }


# Global instance for easy import
def get_resource_config(stage: str = None) -> TableNameConfig:
    """Get table configuration instance - SINGLE SOURCE OF TRUTH"""
    return TableNameConfig(stage)


# Legacy compatibility functions (to be removed after migration)
def get_table_name(table_key: str, stage: str = None) -> str:
    """Legacy compatibility - use get_resource_config().get_table_name() instead"""
    return get_resource_config(stage).get_table_name(table_key)


def get_all_table_names(stage: str = None) -> Dict[str, str]:
    """Legacy compatibility - use get_resource_config().get_all_table_names() instead"""
    return get_resource_config(stage).get_all_table_names()


def get_table_env_vars(stage: str) -> Dict[str, str]:
    """Backward compatibility - get shared environment variables"""
    config = get_resource_config(stage)
    return {
        # OneRoster v1.2 Standard Tables
        "USERS_TABLE": config.get_table_name("users"),
        "ORGANIZATIONS_TABLE": config.get_table_name("organizations"),
        "ENROLLMENTS_TABLE": config.get_table_name("enrollments"),
        
        # EdFi v5.2 Standard Tables
        "STUDENTS_TABLE": config.get_table_name("students"),
        "STUDENT_SCHOOL_ASSOCIATIONS_TABLE": config.get_table_name("student-school-associations"),
        
        # TSA Business Tables
        "INVITATIONS_TABLE": config.get_table_name("invitations"),
        "DOCUMENTS_TABLE": config.get_table_name("documents"),
        "EVENTS_TABLE": config.get_table_name("events"),
        "AUDIT_LOGS_TABLE": config.get_table_name("audit-logs"),
        
        # Standards Compliance
        "EDFI_VERSION": "5.2",
        "ONEROSTER_VERSION": "1.2",
        "DATA_STANDARD": "EdFi-OneRoster",
    }


def get_table_iam_arns(stage: str, region: str = "us-east-2", account: str = "*") -> List[str]:
    """Get IAM ARNs for all tables for permission policies"""
    config = get_resource_config(stage)
    all_tables = config.get_all_table_names()
    
    arns = []
    for table_name in all_tables.values():
        # Add table ARN and GSI ARN patterns
        arns.extend([
            f"arn:aws:dynamodb:{region}:{account}:table/{table_name}",
            f"arn:aws:dynamodb:{region}:{account}:table/{table_name}/index/*"
        ])
    
    return arns


def get_table_config(stage: str) -> TableNameConfig:
    """Backward compatibility alias"""
    return get_resource_config(stage)


# Documentation and validation
RESOURCE_LOGICAL_NAMES = {
    # Tables - Updated for better separation
    "profiles": "Coach profiles and user data (coach-specific operational table)",
    "onboarding_sessions": "Temporary coach onboarding session data with TTL",
    "invitations": "Coach invitations sent by admin portal",
    "parent_invitations": "Parent invitations sent by coaches for student enrollment",
    "enrollments": "Student enrollment records and progress tracking (parent-specific)",
    "documents": "Uploaded documents for enrollment verification (parent-specific)",
    "scheduling": "Consultation and shadow day scheduling (parent-specific)",
    "audit_logs": "Admin action audit trail",
    "organizations": "Future: School/organization data",
    "students": "Future: Student enrollment data",
    
    # Lambda Functions - Updated for better separation
    "coach_backend": "Coach portal backend Lambda function (coach-only functionality)",
    "parent_enrollment": "Parent enrollment Lambda function (parent-specific enrollment process)",
    "parent_communication": "Parent communication Lambda function (parent-coach messaging)",
    "admin_backend": "Admin portal backend Lambda function (admin-only functionality)",
    "admissions_validation": "Legacy admissions validation function (to be phased out)",
    
    # Log Groups - Updated for better separation
    "coach_api": "Coach API Gateway logs (coach-specific endpoints)",
    "parent_api": "Parent API Gateway logs (parent-specific endpoints)",
    "admin_api": "Admin API Gateway logs (admin-specific endpoints)",
}


def validate_resource_names(stage: str) -> Dict[str, Any]:
    """Validate resource naming configuration"""
    config = get_resource_config(stage)
    table_names = config.get_all_table_names()
    
    validation_results = {
        "valid": True,
        "table_count": len(table_names),
        "naming_convention_check": True,
        "issues": []
    }
    
    # Validate table naming conventions
    for logical_name, actual_name in table_names.items():
        if not actual_name.endswith(f"-{stage}"):
            validation_results["naming_convention_check"] = False
            validation_results["issues"].append(f"Table '{logical_name}' doesn't follow stage suffix convention")
    
    if validation_results["issues"]:
        validation_results["valid"] = False
    
    return validation_results


if __name__ == "__main__":
    # CLI usage for debugging
    import sys
    
    if len(sys.argv) > 1:
        stage = sys.argv[1]
        config = get_resource_config(stage)
        
        print(f"🗃️  Table Names for stage '{stage}':")
        print("=" * 50)
        for logical, actual in config.get_all_table_names().items():
            description = RESOURCE_LOGICAL_NAMES.get(logical, "No description")
            print(f"  {logical:<20} → {actual}")
            print(f"  {' ' * 20}   {description}")
            print()
        
        print("\n✅ Validation:")
        validation = validate_resource_names(stage)
        print(f"  Valid: {validation['valid']}")
        if validation['issues']:
            for issue in validation['issues']:
                print(f"  ⚠️  {issue}")
    else:
        print("Usage: python table_names.py <stage>")
        print("Example: python table_names.py dev") 