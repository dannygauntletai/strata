#!/usr/bin/env python3
"""
TSA Unified Platform - Main CDK Application
Unified platform serving coaches, parents, and admins with role-based access
"""
import aws_cdk as cdk
from lib.shared.networking_stack import NetworkingStack
from lib.shared.security_stack import SecurityStack
from lib.shared.data_stack import DataStack
from lib.passwordless_auth_stack import PasswordlessAuthStack
# from lib.frontend_stack import FrontendStack  # Removed: Amplify deployment removed
# from lib.migration_stack import MigrationStack  # Removed - handled by data stack
from lib.services.coach_portal_service import CoachPortalService
from lib.services.parent_portal_service import ParentPortalService
from lib.services.admin_portal_service import AdminPortalService
from aws_cdk import App, Environment, Tags
from lib.shared.table_names import get_resource_config


def get_environment_config(stage: str) -> dict:
    """Get environment-specific configuration"""
    configs = {
        "dev": {
            "frontend_urls": {
                # Unified frontend per Rule 10 - parent and coach use same app with role-based routing
                "unified": "http://localhost:3000",
                "admin": "http://localhost:3001"
            },
            "cors_origins": {
                # Unified CORS origins for parent/coach frontend
                "unified": [
                    "http://localhost:3000",
                    "https://localhost:3000"
                ],
                "admin": [
                    "http://localhost:3001", 
                    "https://localhost:3001"
                ]
            },
            "domains": {
                "api_base": "execute-api.us-east-2.amazonaws.com",
                "custom_domain": None  # No custom domain in dev
            }
        },
        "staging": {
            "frontend_urls": {
                # Staging frontend URLs
                "unified": "https://staging.sportsacademy.tech",
                "admin": "https://admin-staging.sportsacademy.tech"
            },
            "cors_origins": {
                # Staging CORS origins
                "unified": [
                    "https://staging.sportsacademy.tech",
                    # Add localhost support for local development
                    "http://localhost:3000",
                    "https://localhost:3000"
                ],
                "admin": [
                    "https://admin-staging.sportsacademy.tech",
                    # Add localhost support for local development
                    "http://localhost:3001",
                    "https://localhost:3001"
                ]
            },
            "domains": {
                "api_base": "api-staging.sportsacademy.tech",
                "custom_domain": "sportsacademy.tech"
            }
        },
        "prod": {
            "frontend_urls": {
                # Production frontend URLs
                "unified": "https://app.sportsacademy.tech",
                "admin": "https://admin.sportsacademy.tech"
            },
            "cors_origins": {
                # Production CORS origins
                "unified": [
                    "https://app.sportsacademy.tech"
                ],
                "admin": [
                    "https://admin.sportsacademy.tech"
                ]
            },
            "domains": {
                "api_base": "api.sportsacademy.tech",
                "custom_domain": "sportsacademy.tech"
            }
        }
    }
    return configs.get(stage, configs["dev"])


def main():
    app = cdk.App()

    # Get stage from context or default to 'dev'
    stage = app.node.try_get_context("stage") or "dev"

    # Environment configuration
    env = cdk.Environment(
        account=app.node.try_get_context('account'),
        region=app.node.try_get_context('region') or 'us-east-2'
    )

    # Get environment-specific configuration
    env_config = get_environment_config(stage)

    # ========================================
    # INFRASTRUCTURE LAYER (shared by all portals)
    # ========================================

    # 1. Networking Stack - Creates VPC, subnets, security groups
    networking_stack = NetworkingStack(
        app, f'tsa-infra-networking-{stage}',
        stage=stage,
        env=env,
        description=f"Networking infrastructure for TSA Unified Platform ({stage})"
    )

    # 2. Security Stack - Creates Cognito, IAM roles, secrets
    security_stack = SecurityStack(
        app, f'tsa-infra-security-{stage}',
        stage=stage,
        vpc=networking_stack.vpc,
        env=env,
        description=f"Security and authentication for TSA Unified Platform ({stage})"
    )
    security_stack.add_dependency(networking_stack)

    # 3. Data Stack - Creates PostgreSQL database, S3 storage
    data_stack = DataStack(
        app, f'tsa-infra-data-{stage}',
        stage=stage,
        vpc=networking_stack.vpc,
        security_group=networking_stack.database_security_group,
        env=env,
        description=f"Data storage for TSA Unified Platform ({stage})"
    )
    data_stack.add_dependency(networking_stack)
    data_stack.add_dependency(security_stack)

    # 4. Passwordless Authentication Stack (infrastructure service)
    auth_stack = PasswordlessAuthStack(
        app, f'tsa-infra-auth-{stage}',
        stage=stage,
        domain_name='sportsacademy.tech',
        frontend_url=env_config["frontend_urls"]["unified"],  # Unified frontend per Rule 10
        env=env,
        description=f"Passwordless email authentication service ({stage})"
    )
    auth_stack.add_dependency(networking_stack)
    auth_stack.add_dependency(security_stack)

    # Migration handled by data stack initialization - no separate stack needed

    # ========================================
    # APPLICATION LAYER (portal-specific backends)
    # ========================================

    # Shared resources for application stacks
    shared_resources = {
        "vpc": networking_stack.vpc,
        "database_security_group": networking_stack.database_security_group,
        "lambda_security_group": networking_stack.lambda_security_group,
        "user_pool": security_stack.user_pool,
        "user_pool_client": security_stack.user_pool_client,
        "database_host": data_stack.database.instance_endpoint.hostname,
        "database_name": "unified_platform",
        "database_secret_arn": data_stack.database.secret.secret_arn,
        "events_photos_bucket_name": data_stack.events_photos_bucket.bucket_name,
        "sendgrid_secret_arn": auth_stack.sendgrid_secret.secret_arn,  # SendGrid secret for email sending
        "environment_config": env_config,
    }

    # 5. Admin Backend Stack (admin-only functionality) - DEPLOYED FIRST to create shared tables
    admin_backend_stack = cdk.Stack(
        app, f'tsa-admin-backend-{stage}',
        env=env,
        description=f"Admin portal backend services - admin-only functionality and shared table owner ({stage})"
    )
    
    admin_service = AdminPortalService(
        admin_backend_stack, "AdminPortalService",
        shared_resources=shared_resources,  # Only needs basic shared resources
        stage=stage
    )
    
    admin_backend_stack.add_dependency(networking_stack)
    admin_backend_stack.add_dependency(security_stack)
    admin_backend_stack.add_dependency(data_stack)
    admin_backend_stack.add_dependency(auth_stack)  # Only depends on auth for SendGrid secret

    # 6. Coach Backend Stack (coach-only functionality) - References admin-owned tables
    coach_backend_stack = cdk.Stack(
        app, f'tsa-coach-backend-{stage}',
        env=env,
        description=f"Coach portal backend services - coach-only functionality ({stage})"
    )
    
    coach_service = CoachPortalService(
        coach_backend_stack, "CoachPortalService",
        shared_resources=shared_resources,
        stage=stage
    )
    
    coach_backend_stack.add_dependency(networking_stack)
    coach_backend_stack.add_dependency(security_stack)
    coach_backend_stack.add_dependency(data_stack)
    coach_backend_stack.add_dependency(admin_backend_stack)  # Coach depends on admin for shared tables

    # 7. Parent Backend Stack (parent-only functionality)
    parent_backend_stack = cdk.Stack(
        app, f'tsa-parent-backend-{stage}',
        env=env,
        description=f"Parent portal backend services - parent-only functionality ({stage})"
    )
    
    parent_service = ParentPortalService(
        parent_backend_stack, "ParentPortalService",
        shared_resources={
            **shared_resources,
            "coach_profiles_table_name": coach_service.table_names["users"]  # Access to coach data
        },
        stage=stage
    )
    
    parent_backend_stack.add_dependency(networking_stack)
    parent_backend_stack.add_dependency(security_stack)
    parent_backend_stack.add_dependency(data_stack)
    parent_backend_stack.add_dependency(admin_backend_stack)  # Parent depends on admin for shared tables
    parent_backend_stack.add_dependency(coach_backend_stack)  # Parent depends on coach for coach-specific data

    # 8. Frontend Stack - REMOVED: Amplify deployment removed
    # Frontend will be deployed separately outside of CDK
    # frontend_stack = FrontendStack(
    #     app, f'tsa-infra-frontend-{stage}',
    #     stage=stage,
    #     api_endpoints={
    #         "coach_portal": coach_service.api_url,
    #         "parent_portal": parent_service.api_url,
    #         "admin_portal": admin_service.api_url,
    #         "passwordless_auth": auth_stack.api.url
    #     },
    #     env=env,
    #     description=f"Frontend deployment for TSA Unified Platform - unified and admin frontends ({stage})"
    # )
    # frontend_stack.add_dependency(coach_backend_stack)
    # frontend_stack.add_dependency(parent_backend_stack)
    # frontend_stack.add_dependency(admin_backend_stack)
    # frontend_stack.add_dependency(auth_stack)

    # Add comprehensive tags
    cdk.Tags.of(app).add("Project", "TSA-Unified-Platform")
    cdk.Tags.of(app).add("Environment", stage)
    cdk.Tags.of(app).add("ManagedBy", "CDK")
    cdk.Tags.of(app).add("Owner", "TSA-Engineering")
    cdk.Tags.of(app).add("CostCenter", "Engineering")

    # Add layer-specific tags
    cdk.Tags.of(networking_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(security_stack).add("Layer", "Infrastructure") 
    cdk.Tags.of(data_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(auth_stack).add("Layer", "Infrastructure")
    # Migration stack removed - functionality moved to data stack
    # Frontend stack removed - Amplify deployment removed
    # cdk.Tags.of(frontend_stack).add("Layer", "Infrastructure")
    
    # Add portal-specific tags for better organization
    cdk.Tags.of(coach_backend_stack).add("Layer", "Application")
    cdk.Tags.of(coach_backend_stack).add("Portal", "Coach")
    cdk.Tags.of(coach_backend_stack).add("UserType", "Coach")
    
    cdk.Tags.of(parent_backend_stack).add("Layer", "Application")
    cdk.Tags.of(parent_backend_stack).add("Portal", "Parent")
    cdk.Tags.of(parent_backend_stack).add("UserType", "Parent")
    
    cdk.Tags.of(admin_backend_stack).add("Layer", "Application")
    cdk.Tags.of(admin_backend_stack).add("Portal", "Admin")
    cdk.Tags.of(admin_backend_stack).add("UserType", "Admin")

    app.synth()

if __name__ == "__main__":
    main()

