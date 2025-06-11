#!/usr/bin/env python3
"""
TSA Coach Portal - Main CDK Application
Restructured with proper separation between admins, coaches, and parents
"""
import aws_cdk as cdk
from lib.shared.networking_stack import NetworkingStack
from lib.shared.security_stack import SecurityStack
from lib.shared.data_stack import DataStack
from lib.passwordless_auth_stack import PasswordlessAuthStack
from lib.frontend_stack import FrontendStack
from lib.migration_stack import MigrationStack
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
            "from_email": "no-reply@sportsacademy.tech"
        },
        "prod": {
            "frontend_urls": {
                # Unified frontend per Rule 10
                "unified": "https://main.d1j0jhfwhtuida.amplifyapp.com",
                "admin": "https://admin.sportsacademy.tech"
            },
            "cors_origins": {
                # Unified CORS origins for parent/coach frontend
                "unified": [
                    "https://main.d1j0jhfwhtuida.amplifyapp.com"
                ],
                "admin": [
                    "https://admin.sportsacademy.tech"
                ]
            },
            "from_email": "no-reply@sportsacademy.tech"
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
        region=app.node.try_get_context('region') or 'us-east-1'
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
        description=f"Networking infrastructure for TSA Coach Portal ({stage})"
    )

    # 2. Security Stack - Creates Cognito, IAM roles, secrets
    security_stack = SecurityStack(
        app, f'tsa-infra-security-{stage}',
        stage=stage,
        vpc=networking_stack.vpc,
        env=env,
        description=f"Security and authentication for TSA Coach Portal ({stage})"
    )
    security_stack.add_dependency(networking_stack)

    # 3. Data Stack - Creates PostgreSQL database, S3 storage
    data_stack = DataStack(
        app, f'tsa-infra-data-{stage}',
        stage=stage,
        vpc=networking_stack.vpc,
        security_group=networking_stack.database_security_group,
        env=env,
        description=f"Data storage for TSA Coach Portal ({stage})"
    )
    data_stack.add_dependency(networking_stack)
    data_stack.add_dependency(security_stack)

    # 4. Passwordless Authentication Stack (infrastructure service)
    auth_stack = PasswordlessAuthStack(
        app, f'tsa-infra-auth-{stage}',
        stage=stage,
        domain_name='sportsacademy.tech',
        ses_from_address=env_config["from_email"],
        frontend_url=env_config["frontend_urls"]["unified"],  # Unified frontend per Rule 10
        env=env,
        description=f"Passwordless email authentication service ({stage})"
    )
    auth_stack.add_dependency(networking_stack)
    auth_stack.add_dependency(security_stack)

    # 5. Migration Stack - PostgreSQL schema and data migration
    migration_stack = MigrationStack(
        app, f'tsa-infra-migration-{stage}',
        stage=stage,
        shared_resources={
            "vpc": networking_stack.vpc,
            "database_security_group": networking_stack.database_security_group,
            "lambda_security_group": networking_stack.lambda_security_group,
            "database_host": data_stack.database.instance_endpoint.hostname,
            "database_name": "coach_portal",
            "database_secret_arn": data_stack.database.secret.secret_arn,
        },
        env=env,
        description=f"PostgreSQL migration for EdFi/OneRoster compliance ({stage})"
    )
    migration_stack.add_dependency(networking_stack)
    migration_stack.add_dependency(security_stack)
    migration_stack.add_dependency(data_stack)

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
        "database_name": "coach_portal",
        "database_secret_arn": data_stack.database.secret.secret_arn,
        "events_photos_bucket_name": data_stack.events_photos_bucket.bucket_name,
        "environment_config": env_config,
    }

    # 6. Coach Backend Stack (coach-only functionality)
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
            "coach_profiles_table_name": coach_service.table_names["profiles"]  # Access to coach data
        },
        stage=stage
    )
    
    parent_backend_stack.add_dependency(networking_stack)
    parent_backend_stack.add_dependency(security_stack)
    parent_backend_stack.add_dependency(data_stack)
    parent_backend_stack.add_dependency(coach_backend_stack)  # Parent depends on coach for shared data

    # 8. Admin Backend Stack (admin-only functionality)
    admin_backend_stack = cdk.Stack(
        app, f'tsa-admin-backend-{stage}',
        env=env,
        description=f"Admin portal backend services - admin-only functionality ({stage})"
    )
    
    admin_service = AdminPortalService(
        admin_backend_stack, "AdminPortalService",
        shared_resources={
            **shared_resources,
            "profiles_table_name": coach_service.table_names["profiles"],  # Access to coach profiles
            "parent_enrollments_table_name": parent_service.api_url  # Access to parent enrollment data
        },
        stage=stage
    )
    
    admin_backend_stack.add_dependency(networking_stack)
    admin_backend_stack.add_dependency(security_stack)
    admin_backend_stack.add_dependency(data_stack)
    admin_backend_stack.add_dependency(coach_backend_stack)  # Admin depends on coach for profiles
    admin_backend_stack.add_dependency(parent_backend_stack)  # Admin depends on parent for oversight

    # 9. Frontend Stack - Deploys React/Next.js frontends
    frontend_stack = FrontendStack(
        app, f'tsa-infra-frontend-{stage}',
        stage=stage,
        api_endpoints={
            "coach_portal": coach_service.api_url,
            "parent_portal": parent_service.api_url,
            "admin_portal": admin_service.api_url,
            "passwordless_auth": auth_stack.api.url
        },
        env=env,
        description=f"Frontend deployment for TSA Coach Portal - unified and admin frontends ({stage})"
    )
    frontend_stack.add_dependency(coach_backend_stack)
    frontend_stack.add_dependency(parent_backend_stack)
    frontend_stack.add_dependency(admin_backend_stack)
    frontend_stack.add_dependency(auth_stack)

    # Add comprehensive tags
    cdk.Tags.of(app).add("Project", "TSA-Coach-Portal")
    cdk.Tags.of(app).add("Environment", stage)
    cdk.Tags.of(app).add("ManagedBy", "CDK")
    cdk.Tags.of(app).add("Owner", "TSA-Engineering")
    cdk.Tags.of(app).add("CostCenter", "Engineering")

    # Add layer-specific tags
    cdk.Tags.of(networking_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(security_stack).add("Layer", "Infrastructure") 
    cdk.Tags.of(data_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(auth_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(migration_stack).add("Layer", "Infrastructure")
    cdk.Tags.of(frontend_stack).add("Layer", "Infrastructure")
    
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

