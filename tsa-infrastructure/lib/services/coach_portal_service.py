"""
TSA Coach Portal Service - Standardized Naming and Architecture
References shared tables owned by Admin Backend, follows EdFi/OneRoster standards
"""
from aws_cdk import (
    Duration,
    CfnOutput,
    Fn,
    Stack,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_dynamodb as dynamodb,
    aws_logs as logs,
    aws_ec2 as ec2,
    aws_ssm as ssm,
    aws_secretsmanager as secrets,
)
from constructs import Construct
from typing import Dict, Any
from ..shared.table_names import get_resource_config, get_table_iam_arns
import logging

logger = logging.getLogger(__name__)


class CoachPortalService(Construct):
    """TSA Coach Portal Service - Standardized naming and shared table references"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = stage
        self.env_config = shared_resources.get("environment_config", {})
        
        # Get centralized resource configuration
        self.resource_config = get_resource_config(stage)
        
        # Import shared table names from data infrastructure layer (single source of truth)
        self.shared_table_names = {
            "users": Fn.import_value(f"UnifiedPlatformUsersTable-{stage}"),
            "profiles": Fn.import_value(f"UnifiedPlatformProfilesTable-{stage}"),
            "invitations": Fn.import_value(f"UnifiedPlatformInvitationsTable-{stage}"),
            "enrollments": Fn.import_value(f"UnifiedPlatformEnrollmentsTable-{stage}"),
            "events": Fn.import_value(f"UnifiedPlatformEventsTable-{stage}"),
            "documents": Fn.import_value(f"UnifiedPlatformDocumentsTable-{stage}")
        }
        
        # Create coach-specific resources
        self._create_lambda_layer()
        self._create_coach_specific_tables()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_outputs()
        
    def _create_lambda_layer(self):
        """Create shared Lambda layer for coach functions"""
        self.coach_layer = lambda_.LayerVersion(
            self, "CoachSharedLayer",
            code=lambda_.Code.from_asset("../tsa-coach-backend/shared_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description=f"Shared models and utilities for coach portal functionality - {self.stage}"
        )
        
    def _create_coach_specific_tables(self):
        """Create coach-specific tables only (shared tables owned by admin backend)"""
        
        # Coach onboarding sessions table (temporary data)
        self.onboarding_table = dynamodb.Table(
            self, "CoachOnboardingSessions",
            table_name=self.resource_config.get_table_name("coach-onboarding-sessions"),
            partition_key=dynamodb.Attribute(
                name="session_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expires_at",
            point_in_time_recovery=True
        )
        
        # Background checks table
        self.background_checks_table = dynamodb.Table(
            self, "BackgroundChecksTable",
            table_name=self.resource_config.get_table_name("background-checks"),
            partition_key=dynamodb.Attribute(
                name="check_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for coach lookups
        self.background_checks_table.add_global_secondary_index(
            index_name="coach-id-index",
            partition_key=dynamodb.Attribute(
                name="coach_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Legal requirements table
        self.legal_requirements_table = dynamodb.Table(
            self, "LegalRequirementsTable",
            table_name=self.resource_config.get_table_name("legal-requirements"),
            partition_key=dynamodb.Attribute(
                name="coach_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="requirement_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # All shared tables are imported from data infrastructure layer above
        
        # All shared tables imported from data infrastructure layer above
        
        # Eventbrite configuration table (coach-specific)
        self.eventbrite_config_table = dynamodb.Table(
            self, "EventbriteConfigTable",
            table_name=self.resource_config.get_table_name("eventbrite-config"),
            partition_key=dynamodb.Attribute(
                name="coach_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Event attendees table (synced from Eventbrite)
        self.event_attendees_table = dynamodb.Table(
            self, "EventAttendeesTable",
            table_name=self.resource_config.get_table_name("event-attendees"),
            partition_key=dynamodb.Attribute(
                name="attendee_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for event-based attendee queries
        self.event_attendees_table.add_global_secondary_index(
            index_name="event-attendees-index",
            partition_key=dynamodb.Attribute(
                name="event_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
    def _create_lambda_functions(self):
        """Create Lambda functions for coach functionality with standardized naming"""
        
        # Get shared resources
        vpc = self.shared_resources.get("vpc")
        lambda_security_group = self.shared_resources.get("lambda_security_group")
        user_pool = self.shared_resources.get("user_pool")
        user_pool_client = self.shared_resources.get("user_pool_client")
        
        # Get environment-specific URLs
        frontend_urls = self.env_config.get("frontend_urls", {})
        frontend_url = frontend_urls.get("unified", "http://localhost:3000")
        
        # Import auth service user pool ID for user registration
        auth_user_pool_id = None
        try:
            auth_user_pool_id = Fn.import_value(f"{self.stage}-TSAUserPoolId")
        except Exception:
            logger.warning(f"Could not import auth service user pool ID for {self.stage}")
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.coach_layer],
            "environment": {
                **self.resource_config.get_service_environment_variables("coach"),
                
                # Shared table names from data infrastructure layer (single source of truth)
                "USERS_TABLE": self.shared_table_names["users"],
                "PROFILES_TABLE": self.shared_table_names["profiles"],
                "INVITATIONS_TABLE": self.shared_table_names["invitations"],
                "EVENT_INVITATIONS_TABLE": self.shared_table_names["invitations"],  # Alias for invitations handler
                "ENROLLMENTS_TABLE": self.shared_table_names["enrollments"],
                "EVENTS_TABLE": self.shared_table_names["events"],
                "DOCUMENTS_TABLE": self.shared_table_names["documents"],
                
                # Coach-specific table names
                "ONBOARDING_SESSIONS_TABLE": self.onboarding_table.table_name,
                "BACKGROUND_CHECKS_TABLE": self.background_checks_table.table_name,
                "LEGAL_REQUIREMENTS_TABLE": self.legal_requirements_table.table_name,
                "EVENTBRITE_CONFIG_TABLE": self.eventbrite_config_table.table_name,
                "EVENT_ATTENDEES_TABLE": self.event_attendees_table.table_name,
                
                # Eventbrite integration - using AWS Secrets Manager
                "EVENTBRITE_SECRET_ARN": "arn:aws:secretsmanager:us-east-2:164722634547:secret:eventbrite-api-credentials-aDZtV9",
                
                # PostgreSQL Database
                "DB_HOST": self.shared_resources.get("database_host", ""),
                "DB_NAME": self.shared_resources.get("database_name", ""),
                "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
                "DB_PORT": "5432",
                
                # Authentication
                "USER_POOL_ID": user_pool.user_pool_id if user_pool else "",
                "CLIENT_ID": user_pool_client.user_pool_client_id if user_pool_client else "",
                
                # Auth service integration (for user registration)
                "AUTH_USER_POOL_ID": auth_user_pool_id if auth_user_pool_id else "",
                
                # Frontend URL
                "FRONTEND_URL": frontend_url,
                "STAGE": self.stage,
                
                # Other
                "FROM_EMAIL": self.env_config.get("from_email", "no-reply@sportsacademy.tech"),
                "LOG_LEVEL": "INFO"
            },
            "timeout": Duration.seconds(30),
            "memory_size": 512,
            "vpc": vpc,
            "security_groups": [lambda_security_group] if lambda_security_group else None,
            "vpc_subnets": ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ) if vpc else None
        }
        
        # Coach onboarding function
        self.onboarding_function = lambda_.Function(
            self, "OnboardingHandler",
            function_name=self.resource_config.get_lambda_names()["coach_onboard"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_onboard"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Coach profile function
        self.profile_function = lambda_.Function(
            self, "ProfileHandler", 
            function_name=self.resource_config.get_lambda_names()["coach_profile"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_profile"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Coach events function
        self.events_function = lambda_.Function(
            self, "EventsHandler",
            function_name=self.resource_config.get_lambda_names()["coach_events"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_events"),
            handler="events_handler.lambda_handler",
            **lambda_config
        )
        
        # Background check function
        self.background_function = lambda_.Function(
            self, "BackgroundHandler",
            function_name=self.resource_config.get_lambda_names()["coach_background"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_background_check"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Eventbrite OAuth function
        self.eventbrite_oauth_function = lambda_.Function(
            self, "EventbriteOAuthHandler",
            function_name=self.resource_config.get_lambda_names()["coach_eventbrite_oauth"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_eventbrite_oauth"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Invitations function - handles parent invitations from coaches
        self.invitations_function = lambda_.Function(
            self, "InvitationsHandler",
            function_name=self.resource_config.get_lambda_names()["coach_invitations"],
            code=lambda_.Code.from_asset("../tsa-coach-backend/lambda_invitations"),
            handler="invitations_handler.lambda_handler",  # RESTORED: Use full handler with Lambda layer
            **lambda_config
        )
        
        # Grant necessary permissions
        self._grant_table_permissions()
        self._grant_secrets_permissions()
        
        # Grant auth service permissions if available
        auth_user_pool_id = lambda_config["environment"].get("AUTH_USER_POOL_ID")
        if auth_user_pool_id and auth_user_pool_id != "":
            self._grant_auth_service_permissions(auth_user_pool_id)
        
    def _grant_table_permissions(self):
        """Grant DynamoDB permissions to Lambda functions"""
        
        # Functions that need permissions
        functions = [
            self.onboarding_function,
            self.profile_function,
            self.events_function,
            self.background_function,
            self.eventbrite_oauth_function,
            self.invitations_function
        ]
        
        for function in functions:
            # Grant permissions to coach-specific tables
            self.onboarding_table.grant_read_write_data(function)
            self.background_checks_table.grant_read_write_data(function)
            self.legal_requirements_table.grant_read_write_data(function)
            
            # Grant permissions to coach-specific event management tables
            # Note: Events table is owned by admin service, permissions granted via shared_table_arns below
            self.eventbrite_config_table.grant_read_write_data(function)
            self.event_attendees_table.grant_read_write_data(function)
            
            # Grant permissions to shared tables from centralized configuration
            shared_table_arns = []
            for table_key in ["users", "profiles", "invitations", "enrollments", "events", "documents"]:
                table_name = self.resource_config.get_table_name(table_key)
                shared_table_arns.extend([
                    f"arn:aws:dynamodb:*:*:table/{table_name}",
                    f"arn:aws:dynamodb:*:*:table/{table_name}/index/*"
                ])
            
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "dynamodb:DescribeTable",  # Required for table metadata operations
                        "dynamodb:GetItem",
                        "dynamodb:PutItem", 
                        "dynamodb:UpdateItem",
                        "dynamodb:DeleteItem",
                        "dynamodb:Query",
                        "dynamodb:Scan",
                        "dynamodb:BatchGetItem",
                        "dynamodb:BatchWriteItem"
                    ],
                    resources=shared_table_arns
                )
            )
    
    def _grant_secrets_permissions(self):
        """Grant AWS Secrets Manager permissions to Lambda functions"""
        
        # Get Stack context for region and account
        stack = Stack.of(self)
        
        # Construct secret ARNs
        eventbrite_secret_arn = "arn:aws:secretsmanager:us-east-2:164722634547:secret:eventbrite-api-credentials-aDZtV9"
        database_secret_arn = self.shared_resources.get("database_secret_arn", "arn:aws:secretsmanager:us-east-2:164722634547:secret:tsa/database-dev-bqRyem")
        
        # Functions that need Eventbrite credentials
        eventbrite_functions = [
            self.events_function,
            self.eventbrite_oauth_function
        ]
        
        # Functions that need database credentials  
        database_functions = [
            self.onboarding_function,
            self.profile_function,
            self.events_function,
            self.background_function,
            self.eventbrite_oauth_function,  # Also needs database access for shared utilities
            self.invitations_function  # Needs database access for invitation management
        ]
        
        # Grant Eventbrite secret access
        for function in eventbrite_functions:
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret"
                    ],
                    resources=[eventbrite_secret_arn]
                )
            )
        
        # Grant database secret access
        for function in database_functions:
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret"
                    ],
                    resources=[database_secret_arn]
                )
            )
        
    def _grant_auth_service_permissions(self, auth_user_pool_id):
        """Grant auth service permissions to Lambda functions"""
        
        # Grant auth service permissions
        if auth_user_pool_id:
            # Get Stack context for region and account
            stack = Stack.of(self)
            
            # Construct proper ARN for auth service user pool using Stack properties
            auth_user_pool_arn = f"arn:aws:cognito-idp:{stack.region}:{stack.account}:userpool/{auth_user_pool_id}"
            
            for function in [self.onboarding_function, self.profile_function, self.events_function, self.background_function]:
                function.add_to_role_policy(
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=[
                            "cognito-idp:AdminAddUserToGroup",
                            "cognito-idp:AdminCreateUser",
                            "cognito-idp:AdminDeleteUser",
                            "cognito-idp:AdminGetUser",
                            "cognito-idp:AdminInitiateAuth",
                            "cognito-idp:AdminSetUserPassword",
                            "cognito-idp:AdminUpdateUserAttributes",
                            "cognito-idp:AdminUpdateUserGroups",
                            "cognito-idp:AdminUserGlobalSignOut"
                        ],
                        resources=[auth_user_pool_arn]
                )
            )
        
    def _create_api_gateway(self):
        """Create API Gateway with standardized naming"""
        
        # Create CloudWatch log group for API Gateway
        self.api_log_group = logs.LogGroup(
            self, "CoachAPILogGroup",
            log_group_name=self.resource_config.get_log_group_names()["coach_api"],
            retention=logs.RetentionDays.ONE_MONTH
        )
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "CoachPortalAPI",
            rest_api_name=self.resource_config.get_api_names()["coach_api"],
            description=f"TSA Coach Portal API - {self.stage}",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=self.env_config.get("cors_origins", {}).get("unified", [
                    "http://localhost:3000",
                    "https://localhost:3000"
                ]),
                allow_methods=[
                    "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
                ],
                allow_headers=[
                    # Standard headers
                    "Content-Type", 
                    "X-Amz-Date", 
                    "Authorization", 
                    "X-Api-Key", 
                    "X-Amz-Security-Token",
                    "X-Requested-With",
                    "Accept",
                    "Accept-Language",
                    "Cache-Control",
                    # Custom application headers that frontends commonly use
                    "x-user-email",
                    "x-user-id", 
                    "x-user-role",
                    "x-session-id",
                    "x-auth-token",
                    "x-api-version",
                    "x-client-version",
                    "x-request-id",
                    "x-correlation-id"
                ],
                allow_credentials=True,
                max_age=Duration.minutes(10)
            ),
            deploy_options=apigateway.StageOptions(
                stage_name=self.stage,
                logging_level=apigateway.MethodLoggingLevel.INFO,
                access_log_destination=apigateway.LogGroupLogDestination(self.api_log_group),
                access_log_format=apigateway.AccessLogFormat.json_with_standard_fields(
                    caller=True,
                    http_method=True,
                    ip=True,
                    protocol=True,
                    request_time=True,
                    resource_path=True,
                    response_length=True,
                    status=True,
                    user=True
                )
            )
        )
        
        # Health check endpoint at root
        health_integration = apigateway.LambdaIntegration(
            self.onboarding_function,
            request_templates={"application/json": '{"httpMethod": "$context.httpMethod", "path": "$context.path"}'}
        )
        
        self.api.root.add_method("GET", health_integration)
        
        # Dedicated health endpoint at /health (what frontend expects)
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", health_integration)
        
        # Profile endpoints
        profile_resource = self.api.root.add_resource("profile")
        profile_integration = apigateway.LambdaIntegration(self.profile_function)
        
        profile_resource.add_method("GET", profile_integration)
        profile_resource.add_method("PATCH", profile_integration)
        
        # Profile preferences endpoint
        preferences_resource = profile_resource.add_resource("preferences")
        preferences_resource.add_method("PATCH", profile_integration)
        
        # Onboarding endpoints
        onboarding_resource = self.api.root.add_resource("onboarding")
        onboarding_integration = apigateway.LambdaIntegration(self.onboarding_function)
        
        # General onboarding endpoints
        onboarding_resource.add_method("GET", onboarding_integration)
        onboarding_resource.add_method("POST", onboarding_integration)
        onboarding_resource.add_method("PUT", onboarding_integration)
        
        # Specific onboarding sub-endpoints
        validate_invitation_resource = onboarding_resource.add_resource("validate-invitation")
        validate_invitation_resource.add_method("POST", onboarding_integration)
        
        progress_resource = onboarding_resource.add_resource("progress")
        progress_resource.add_method("GET", onboarding_integration)
        progress_resource.add_method("POST", onboarding_integration)
        progress_resource.add_method("PUT", onboarding_integration)
        
        complete_resource = onboarding_resource.add_resource("complete")
        complete_resource.add_method("POST", onboarding_integration)
        
        # Events endpoints
        events_resource = self.api.root.add_resource("events")
        events_integration = apigateway.LambdaIntegration(self.events_function)
        
        events_resource.add_method("GET", events_integration)
        events_resource.add_method("POST", events_integration)
        events_resource.add_method("PUT", events_integration)
        events_resource.add_method("DELETE", events_integration)
        
        # Individual event endpoints
        event_id_resource = events_resource.add_resource("{id}")
        event_id_resource.add_method("GET", events_integration)
        event_id_resource.add_method("PUT", events_integration)
        event_id_resource.add_method("DELETE", events_integration)
        
        # Event management endpoints
        event_publish_resource = event_id_resource.add_resource("publish")
        event_publish_resource.add_method("POST", events_integration)
        
        event_attendees_resource = event_id_resource.add_resource("attendees")
        event_attendees_resource.add_method("GET", events_integration)
        
        event_sync_resource = event_id_resource.add_resource("sync")
        event_sync_resource.add_method("GET", events_integration)
        event_sync_resource.add_method("POST", events_integration)
        
        # Eventbrite OAuth endpoints
        eventbrite_resource = self.api.root.add_resource("eventbrite")
        eventbrite_oauth_integration = apigateway.LambdaIntegration(self.eventbrite_oauth_function)
        
        oauth_resource = eventbrite_resource.add_resource("oauth")
        
        # OAuth authorization endpoint
        authorize_resource = oauth_resource.add_resource("authorize")
        authorize_resource.add_method("GET", eventbrite_oauth_integration)
        
        # OAuth callback endpoint
        callback_resource = oauth_resource.add_resource("callback")
        callback_resource.add_method("GET", eventbrite_oauth_integration)
        
        # OAuth status endpoint
        status_resource = oauth_resource.add_resource("status")
        status_resource.add_method("GET", eventbrite_oauth_integration)
        
        # OAuth disconnect endpoint
        disconnect_resource = oauth_resource.add_resource("disconnect")
        disconnect_resource.add_method("POST", eventbrite_oauth_integration)
        
        # OAuth refresh endpoint
        refresh_resource = oauth_resource.add_resource("refresh")
        refresh_resource.add_method("POST", eventbrite_oauth_integration)
        
        # Background check endpoints
        background_resource = self.api.root.add_resource("background-check")
        background_integration = apigateway.LambdaIntegration(self.background_function)
        
        background_resource.add_method("GET", background_integration)
        background_resource.add_method("POST", background_integration)
        
        # Parent invitations endpoints - ARCHITECTURAL FIX: Add missing API Gateway routes
        parent_invitations_resource = self.api.root.add_resource("parent-invitations")
        invitations_integration = apigateway.LambdaIntegration(self.invitations_function)
        
        # Main parent invitations endpoints
        parent_invitations_resource.add_method("GET", invitations_integration)
        parent_invitations_resource.add_method("POST", invitations_integration)
        
        # Individual invitation management
        parent_invitation_id_resource = parent_invitations_resource.add_resource("{invitation_id}")
        parent_invitation_id_resource.add_method("GET", invitations_integration)
        parent_invitation_id_resource.add_method("PUT", invitations_integration)
        parent_invitation_id_resource.add_method("DELETE", invitations_integration)
        
        # Bulk operations
        parent_invitations_bulk_resource = parent_invitations_resource.add_resource("bulk")
        parent_invitations_bulk_resource.add_method("POST", invitations_integration)
        
        # Send operations
        parent_invitations_send_resource = parent_invitations_resource.add_resource("send")
        parent_invitations_send_resource.add_method("POST", invitations_integration)
        
        # Grant API Gateway invoke permissions to Lambda functions
        # These are ESSENTIAL - without them, API Gateway gets 403 errors when calling Lambda
        self.onboarding_function.add_permission(
            "OnboardingAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.profile_function.add_permission(
            "ProfileAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.events_function.add_permission(
            "EventsAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.background_function.add_permission(
            "BackgroundAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.eventbrite_oauth_function.add_permission(
            "EventbriteOAuthAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.invitations_function.add_permission(
            "InvitationsAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
    def _create_outputs(self):
        """Create CloudFormation outputs with standardized naming"""
        
        # API Gateway URL with predictable naming
        coach_api_output = CfnOutput(
            self, f"CoachAPIUrl{self.stage.title()}",
            value=self.api.url,
            description=f"Coach Portal API Gateway URL ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:CoachPortalAPIUrl"
        )
        # Override the logical ID to be predictable
        coach_api_output.override_logical_id(f"CoachAPIUrl{self.stage.title()}")
        
        # API Gateway ID
        CfnOutput(
            self, "CoachPortalAPIId",
            value=self.api.rest_api_id,
            description=f"Coach Portal API Gateway ID ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:CoachPortalAPIId"
        )
        
        # Coach-specific table names for other services
        CfnOutput(
            self, "OnboardingSessionsTableOutput",
            value=self.onboarding_table.table_name,
            description=f"Coach Onboarding Sessions Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:OnboardingSessionsTable"
        )
        
        CfnOutput(
            self, "BackgroundChecksTableOutput",
            value=self.background_checks_table.table_name,
            description=f"Background Checks Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:BackgroundChecksTable"
        )
        
        CfnOutput(
            self, "LegalRequirementsTableOutput",
            value=self.legal_requirements_table.table_name,
            description=f"Legal Requirements Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:LegalRequirementsTable"
        )
        
        CfnOutput(
            self, "ProfilesTableOutput",
            value=self.shared_table_names["profiles"],
            description=f"Coach Profiles Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:ProfilesTable"
        )
        
        CfnOutput(
            self, "EventsTableOutput",
            value=self.shared_table_names["events"],
            description=f"Events Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:EventsTable"
        )
        
        CfnOutput(
            self, "EventbriteConfigTableOutput",
            value=self.eventbrite_config_table.table_name,
            description=f"Eventbrite Config Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:EventbriteConfigTable"
        )
        
        CfnOutput(
            self, "EventAttendeesTableOutput",
            value=self.event_attendees_table.table_name,
            description=f"Event Attendees Table ({self.stage})",
            export_name=f"tsa-coach-backend-{self.stage}:EventAttendeesTable"
        )
        
        # Store coach API URL for frontend sync scripts
        ssm.StringParameter(
            self, "CoachAPIEndpointParameter",
            parameter_name=f"/tsa/{self.stage}/api-urls/coach",
            string_value=self.api.url,
            description=f"Coach Portal API endpoint for {self.stage} environment"
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
        
    @property
    def table_names(self) -> Dict[str, str]:
        """Get all table names (shared + coach-specific)"""
        return {
            # Coach-specific tables
            "onboarding_sessions": self.onboarding_table.table_name,
            "background_checks": self.background_checks_table.table_name,
            "legal_requirements": self.legal_requirements_table.table_name,
            "eventbrite_config": self.eventbrite_config_table.table_name,
            "event_attendees": self.event_attendees_table.table_name,
            
            # Shared tables from data infrastructure layer
            "users": self.shared_table_names["users"],
            "profiles": self.shared_table_names["profiles"],
            "invitations": self.shared_table_names["invitations"],
            "enrollments": self.shared_table_names["enrollments"],
            "events": self.shared_table_names["events"],
            "documents": self.shared_table_names["documents"]
        }
    
    @property
    def region(self) -> str:
        """Get the AWS region"""
        return self.shared_resources.get("region", "us-east-2")
    
    @property 
    def account(self) -> str:
        """Get the AWS account ID"""
        return self.shared_resources.get("account", "") 