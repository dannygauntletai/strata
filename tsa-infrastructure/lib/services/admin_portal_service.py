"""
TSA Admin Service - Streamlined for Coach Invitations and Audit Health
Focused on core admin functionality: coach invitation management and system health monitoring
"""
from aws_cdk import (
    Duration,
    CfnOutput,
    BundlingOptions,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_dynamodb as dynamodb,
    aws_logs as logs,
    aws_ec2 as ec2,
    aws_ssm as ssm,
)
from constructs import Construct
from typing import Dict, Any
from ..shared.table_names import get_resource_config, get_table_iam_arns


class AdminPortalService(Construct):
    """Streamlined TSA Admin Service - Coach Invitations and Audit Health Only"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = stage
        self.env_config = shared_resources.get("environment_config", {})
        
        # Get centralized table configuration
        self.table_config = get_resource_config(stage)
        
        # Create streamlined resources
        self._create_lambda_layers()
        self._create_core_dynamodb_tables()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_outputs()
        
    def _create_lambda_layers(self):
        """Create shared Lambda layer for admin functionality"""
        
        # Admin layer (main functionality)
        self.admin_layer = lambda_.LayerVersion(
            self, "AdminSharedLayer",
            code=lambda_.Code.from_asset("../tsa-admin-backend/shared_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="Shared models and utilities for admin functionality"
        )
        
    def _create_core_dynamodb_tables(self):
        """Import core DynamoDB tables from data layer - Data layer is single source of truth"""
        
        # Reference shared table names from centralized configuration (single source of truth)
        self.shared_table_names = {
            "users": self.table_config.get_table_name("users"),
            "profiles": self.table_config.get_table_name("profiles"),
            "invitations": self.table_config.get_table_name("invitations"),
            "enrollments": self.table_config.get_table_name("enrollments"),
            "events": self.table_config.get_table_name("events"),
            "documents": self.table_config.get_table_name("documents")
        }
        
        # ========================================
        # ADMIN-SPECIFIC TABLES (Admin creates these)
        # ========================================
        
        # Get admin-specific table names from centralized config
        table_names = self.table_config.get_all_table_names()
        
        # Audit Logs Table - Admin-specific system audit trail
        self.audit_logs_table = dynamodb.Table(
            self, "AuditLogsTable",
            table_name=self.table_config.get_table_name("audit-logs"),
            partition_key=dynamodb.Attribute(
                name="log_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expires_at",  # Auto-expire old logs
            point_in_time_recovery=True
        )

        # Add GSI for user action lookups
        self.audit_logs_table.add_global_secondary_index(
            index_name="user-id-index",
            partition_key=dynamodb.Attribute(
                name="user_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            )
        )
        

        
    def _create_lambda_functions(self):
        """Create Lambda functions for core admin functionality"""
        
        # Get shared resources
        vpc = self.shared_resources.get("vpc")
        lambda_security_group = self.shared_resources.get("lambda_security_group")
        user_pool = self.shared_resources.get("user_pool")
        user_pool_client = self.shared_resources.get("user_pool_client")
        
        # Get environment-specific URLs
        frontend_urls = self.env_config.get("frontend_urls", {})
        admin_frontend_url = frontend_urls.get("admin", "http://localhost:3001")
        coach_frontend_url = frontend_urls.get("coach", "http://localhost:3000")
        
        # Common Lambda configuration
        base_lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.admin_layer],
            "timeout": Duration.seconds(30),
            "memory_size": 512,
            "vpc": vpc,
            "security_groups": [lambda_security_group] if lambda_security_group else None,
            "vpc_subnets": ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ) if vpc else None
        }
        
        # Common environment variables
        common_env = {
            **self.table_config.get_service_environment_variables("admin"),
            "DB_HOST": self.shared_resources.get("database_host", ""),
            "DB_NAME": self.shared_resources.get("database_name", ""),
            "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
            "DB_PORT": "5432",
            "USER_POOL_ID": user_pool.user_pool_id if user_pool else "",
            "CLIENT_ID": user_pool_client.user_pool_client_id if user_pool_client else "",
            "FROM_EMAIL": self.env_config.get("from_email", "no-reply@sportsacademy.tech"),
            "FRONTEND_URL": coach_frontend_url,
            "ADMIN_FRONTEND_URL": admin_frontend_url,
            "STAGE": self.stage,
            "SENDGRID_SECRET_ARN": self.shared_resources.get("sendgrid_secret_arn", ""),
            "SENDGRID_FROM_EMAIL": "no-reply@strata.school",
            "SENDGRID_FROM_NAME": "Texas Sports Academy",
            "LOG_LEVEL": "INFO",
            # Shared table environment variables from data infrastructure layer
            "TSA_USERS_TABLE": self.shared_table_names["users"],
            "TSA_PROFILES_TABLE": self.shared_table_names["profiles"],
            "TSA_INVITATIONS_TABLE": self.shared_table_names["invitations"],
            "TSA_ENROLLMENTS_TABLE": self.shared_table_names["enrollments"],
            "TSA_EVENTS_TABLE": self.shared_table_names["events"],
            "TSA_DOCUMENTS_TABLE": self.shared_table_names["documents"],
            # Admin-specific table
            "TSA_AUDIT_LOGS_TABLE": self.audit_logs_table.table_name,
        }
        
        # ========================================
        # CORE LAMBDA FUNCTIONS
        # ========================================
        
        # 1. Coach Invitation Management (with SendGrid bundling like auth backend)
        self.invitations_function = lambda_.Function(
            self, "InvitationsHandler",
            function_name=self.table_config.get_lambda_names()["admin_invitations"],
            code=lambda_.Code.from_asset(
                "../tsa-admin-backend",
                bundling=BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_9.bundling_image,
                    command=[
                        "bash", "-c",
                        "pip install -r shared_layer/requirements.txt -t /asset-output && cp -au lambda_invitations/* /asset-output/ && cp -au shared_layer/python/* /asset-output/"
                    ],
                )
            ),
            handler="handler.lambda_handler",
            environment=common_env,
            runtime=lambda_.Runtime.PYTHON_3_9,
            timeout=Duration.seconds(30),
            memory_size=512,
            vpc=vpc,
            security_groups=[lambda_security_group] if lambda_security_group else None,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ) if vpc else None
        )
        
        # 2. Audit & Health Monitoring
        self.audit_health_function = lambda_.Function(
            self, "AuditHealthHandler",
            function_name=self.table_config.get_lambda_names()["admin_audit_health"],
            code=lambda_.Code.from_asset("../tsa-admin-backend/lambda_audit_health"),
            handler="handler.lambda_handler",
            environment=common_env,
            **base_lambda_config
        )
        
        # 3. Coach Management
        self.coaches_function = lambda_.Function(
            self, "CoachesHandler",
            function_name=self.table_config.get_lambda_names()["admin_coaches"],
            code=lambda_.Code.from_asset("../tsa-admin-backend/lambda_coaches"),
            handler="handler.lambda_handler",
            environment=common_env,
            **base_lambda_config
        )
        
        # Grant permissions to functions
        functions = [
            self.invitations_function,
            self.audit_health_function,
            self.coaches_function
        ]
        
        for function in functions:
            self._grant_common_permissions(function)
        
    def _grant_common_permissions(self, function):
        """Grant common permissions to a Lambda function"""
        
        # Grant permissions to admin-specific tables (directly owned)
        self.audit_logs_table.grant_read_write_data(function)
        
        # Grant permissions to shared tables from centralized configuration
        shared_table_arns = []
        for table_key in ["users", "profiles", "invitations", "enrollments", "events", "documents"]:
            table_name = self.table_config.get_table_name(table_key)
            shared_table_arns.extend([
                f"arn:aws:dynamodb:*:*:table/{table_name}",
                f"arn:aws:dynamodb:*:*:table/{table_name}/index/*"
            ])
        
        function.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem"
                ],
                resources=shared_table_arns
            )
        )
        
        # SendGrid secret permissions
        sendgrid_secret_arn = self.shared_resources.get("sendgrid_secret_arn")
        if sendgrid_secret_arn:
            # Grant access to the specific secret and any version suffixes
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["secretsmanager:GetSecretValue"],
                    resources=[
                        sendgrid_secret_arn,
                        f"{sendgrid_secret_arn}*"  # Include version suffixes
                    ]
                )
            )
        else:
            # Fallback: grant access to the known SendGrid secret name pattern
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["secretsmanager:GetSecretValue"],
                    resources=[f"arn:aws:secretsmanager:*:*:secret:tsa-sendgrid-api-key-{self.stage}*"]
                )
            )
        
        # Cognito permissions for user management
        if self.shared_resources.get("user_pool"):
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "cognito-idp:AdminCreateUser",
                        "cognito-idp:AdminGetUser",
                        "cognito-idp:AdminSetUserPassword",
                        "cognito-idp:AdminUpdateUserAttributes",
                        "cognito-idp:ListUsers",
                        "cognito-idp:AdminListGroupsForUser"
                    ],
                    resources=[self.shared_resources["user_pool"].user_pool_arn]
                )
            )
        
        # CloudWatch Logs permissions
        function.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                resources=["arn:aws:logs:*:*:*"]
            )
        )
        
    def _create_api_gateway(self):
        """Create streamlined API Gateway for admin functionality"""
        
        # Create log group for API Gateway
        log_group = logs.LogGroup(
            self, "AdminPortalAPILogs",
            log_group_name=self.table_config.get_log_group_names()["admin_api"],
        )
        
        # Get environment-specific CORS origins
        cors_origins = self.env_config.get("cors_origins", {})
        admin_origins = cors_origins.get("admin", [
            "http://localhost:3001",
            "https://localhost:3001"
        ])
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "AdminPortalAPI",
            rest_api_name=self.table_config.get_api_names()["admin_api"],
            description=f"Streamlined API for TSA Admin Portal - Coach Invitations and Audit Health ({self.stage})",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=admin_origins,
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
                access_log_destination=apigateway.LogGroupLogDestination(log_group),
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
        
        # Create API integrations
        invitations_integration = apigateway.LambdaIntegration(
            self.invitations_function,
            allow_test_invoke=False
        )
        audit_health_integration = apigateway.LambdaIntegration(
            self.audit_health_function,
            allow_test_invoke=False
        )
        coaches_integration = apigateway.LambdaIntegration(
            self.coaches_function,
            allow_test_invoke=False
        )
        
        # Grant API Gateway invoke permissions
        self.invitations_function.add_permission(
            "InvitationsAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.audit_health_function.add_permission(
            "AuditHealthAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.coaches_function.add_permission(
            "CoachesAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        # Admin routes (require authentication)
        admin_resource = self.api.root.add_resource("admin")
        
        # ========================================
        # COACH INVITATION MANAGEMENT ROUTES
        # ========================================
        
        # Invitation management routes
        invitations_resource = admin_resource.add_resource("invitations")
        invitations_resource.add_method("GET", invitations_integration)  # List invitations
        invitations_resource.add_method("POST", invitations_integration)  # Create invitation
        
        # Single invitation management
        invitation_resource = invitations_resource.add_resource("{invitation_id}")
        invitation_resource.add_method("GET", invitations_integration)  # Get invitation details
        invitation_resource.add_method("PUT", invitations_integration)  # Update invitation
        invitation_resource.add_method("DELETE", invitations_integration)  # Cancel invitation
        
        # ========================================
        # COACH MANAGEMENT ROUTES
        # ========================================
        
        # Coach management routes
        coaches_resource = admin_resource.add_resource("coaches")
        coaches_resource.add_method("GET", coaches_integration)  # List coaches
        
        # Single coach management
        coach_resource = coaches_resource.add_resource("{coach_id}")
        coach_resource.add_method("GET", coaches_integration)  # Get coach details
        coach_resource.add_method("PUT", coaches_integration)  # Update coach
        coach_resource.add_method("DELETE", coaches_integration)  # Delete coach
        
        # ========================================
        # AUDIT & HEALTH MONITORING ROUTES
        # ========================================
        
        # Health check
        health_resource = admin_resource.add_resource("health")
        health_resource.add_method("GET", audit_health_integration)  # System health check
        
        # Audit logs
        audit_resource = admin_resource.add_resource("audit")
        audit_resource.add_method("GET", audit_health_integration)  # Get audit logs
        
        # System status
        status_resource = admin_resource.add_resource("status")
        status_resource.add_method("GET", audit_health_integration)  # Get system status
        
    def _create_outputs(self):
        """Create CloudFormation outputs"""
        
        # Admin API URL with predictable naming
        admin_api_output = CfnOutput(
            self, f"AdminAPIUrl{self.stage.title()}",
            value=self.api.url,
            description="Admin Portal API URL",
            export_name=f"{self.stage}-AdminAPIUrl"
        )
        # Override the logical ID to be predictable
        admin_api_output.override_logical_id(f"AdminAPIUrl{self.stage.title()}")
        
        # Export shared table names (imported from data layer) for legacy compatibility
        CfnOutput(
            self, "InvitationsTableName",
            value=self.shared_table_names["invitations"],
            description="Coach Invitations DynamoDB Table Name (from data layer)",
            export_name=f"{self.stage}-InvitationsTableName"
        )
        
        CfnOutput(
            self, "UsersTableName",
            value=self.shared_table_names["users"],
            description="Users DynamoDB Table Name (from data layer)",
            export_name=f"{self.stage}-UsersTableName"
        )
        
        CfnOutput(
            self, "EventsTableName",
            value=self.shared_table_names["events"],
            description="Events DynamoDB Table Name (from data layer)",
            export_name=f"{self.stage}-EventsTableName"
        )
        
        CfnOutput(
            self, "EnrollmentsTableName",
            value=self.shared_table_names["enrollments"],
            description="Enrollments DynamoDB Table Name (from data layer)",
            export_name=f"{self.stage}-EnrollmentsTableName"
        )
        
        CfnOutput(
            self, "DocumentsTableName",
            value=self.shared_table_names["documents"],
            description="Documents DynamoDB Table Name (from data layer)",
            export_name=f"{self.stage}-DocumentsTableName"
        )
        
        # Export admin-specific table
        CfnOutput(
            self, "AuditLogsTableName",
            value=self.audit_logs_table.table_name,
            description="Audit Logs DynamoDB Table Name (admin-specific)",
            export_name=f"{self.stage}-AuditLogsTableName"
        )
        
        # Export API URL to SSM Parameter Store for runtime discovery
        ssm.StringParameter(
            self, "AdminAPIUrlParameter",
            parameter_name=f"/tsa/{self.stage}/api-urls/admin",  # ✅ STANDARDIZED: Consistent prefix
            string_value=self.api.url,
            description=f"Auto-managed Admin API URL for {self.stage} environment"
        )
        
        # Export table names to SSM for other services to discover
        # Shared tables from data layer
        for table_name, table_name_str in self.shared_table_names.items():
            ssm.StringParameter(
                self, f"{table_name.title()}TableParameter",
                parameter_name=f"/tsa-shared/{self.stage}/table-names/{table_name}",
                string_value=table_name_str,
                description=f"Auto-managed {table_name.title()} table name for {self.stage} environment (from data layer)"
            )
    
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
        
    @property
    def table_names(self) -> Dict[str, str]:
        """Get table names for reference by other services"""
        return {
            # Shared tables from data infrastructure layer
            "users": self.shared_table_names["users"],
            "profiles": self.shared_table_names["profiles"],
            "invitations": self.shared_table_names["invitations"],
            "enrollments": self.shared_table_names["enrollments"],
            "events": self.shared_table_names["events"],
            "documents": self.shared_table_names["documents"],
            # Admin-specific tables
            "audit_logs": self.audit_logs_table.table_name
        } 