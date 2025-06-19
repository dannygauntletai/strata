"""
Parent Portal Service Stack
Handles parent enrollment, document uploads, and communication with coaches
Separate from coach functionality for better organization
"""
from aws_cdk import (
    Duration,
    CfnOutput,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_dynamodb as dynamodb,
    aws_logs as logs,
    aws_ec2 as ec2,
    aws_ssm as ssm,
    Stack,
)
from constructs import Construct
from typing import Dict, Any
from ..shared.table_names import get_resource_config, get_table_iam_arns


class ParentPortalService(Construct):
    """Parent Portal Service for enrollment management and communication"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], 
                 shared_layer: lambda_.ILayerVersion,
                 stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = stage
        self.env_config = shared_resources.get("environment_config", {})
        self.shared_layer = shared_layer
        
        # Get centralized resource configuration
        self.resource_config = get_resource_config(stage)
        
        # Create parent-specific resources
        self._create_dynamodb_tables()
        self._create_lambda_functions()
        self._create_api_gateway()
        
    def _create_dynamodb_tables(self):
        """Reference shared DynamoDB tables instead of creating duplicates"""
        
        # ✅ ARCHITECTURAL FIX: Use existing shared tables (dependency injection pattern)
        # All tables are created in shared data stack, not here
        
        # Reference shared tables by name (these already exist in data stack)
        self.enrollments_table_name = self.resource_config.get_table_name("enrollments")
        self.documents_table_name = self.resource_config.get_table_name("documents")
        self.scheduling_table_name = self.resource_config.get_table_name("scheduling")
        
        # ✅ NO table creation - all tables managed by shared data stack (single source of truth)
        
    def _create_lambda_functions(self):
        """Create Lambda functions for parent functionality"""
        
        # Get shared resources
        vpc = self.shared_resources.get("vpc")
        lambda_security_group = self.shared_resources.get("lambda_security_group")
        
        # Get environment-specific URLs
        frontend_urls = self.env_config.get("frontend_urls", {})
        frontend_url = frontend_urls.get("unified", "http://localhost:3000")
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.shared_layer],
            "environment": {
                # Use shared environment variables (EdFi/OneRoster standard tables)
                **self.resource_config.get_service_environment_variables("parent"),
                
                # ✅ ARCHITECTURAL FIX: Add shared table names (dependency injection)
                "ENROLLMENTS_TABLE": self.enrollments_table_name,
                "DOCUMENTS_TABLE": self.documents_table_name, 
                "SCHEDULING_TABLE": self.scheduling_table_name,
                
                # PostgreSQL Database
                "DB_HOST": self.shared_resources.get("database_host", ""),
                "DB_NAME": self.shared_resources.get("database_name", ""),
                "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
                "DB_PORT": "5432",
                
                # Frontend URL
                "FRONTEND_URL": frontend_url,
                "STAGE": self.stage,
                
                # Other
                "FROM_EMAIL": self.env_config.get("from_email", "no-reply@sportsacademy.school"),
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
        
        # Parent enrollment function - handles invitation validation and enrollment process
        self.enrollment_function = lambda_.Function(
            self, "ParentEnrollmentHandler",
            function_name=self.resource_config.get_lambda_names()["parent_enrollment"],
            code=lambda_.Code.from_asset("../tsa-parent-backend/lambda_enrollment"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Note: Dashboard function removed - needs proper logic implementation
        
        # Admissions validation function - handles invitation validation
        self.admissions_function = lambda_.Function(
            self, "AdmissionsValidateHandler",
            function_name=self.resource_config.get_lambda_names()["admissions_validate"],
            code=lambda_.Code.from_asset("../tsa-parent-backend/lambda_admissions_validate"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Grant DynamoDB permissions
        self._grant_table_permissions()
                
    def _grant_table_permissions(self):
        """Grant DynamoDB permissions to Lambda functions using shared table ARNs"""
        functions = [self.enrollment_function, self.admissions_function]
        
        for function in functions:
            # ✅ ARCHITECTURAL FIX: Grant access to shared tables using IAM ARNs (dependency injection)
            shared_table_arns = get_table_iam_arns(self.stage)
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", 
                            "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"],
                    resources=shared_table_arns
                )
            )
            
            # Grant specific permissions to shared enrollments, documents, and scheduling tables
            enrollments_table_arn = f"arn:aws:dynamodb:{Stack.of(self).region}:{Stack.of(self).account}:table/{self.enrollments_table_name}"
            documents_table_arn = f"arn:aws:dynamodb:{Stack.of(self).region}:{Stack.of(self).account}:table/{self.documents_table_name}"
            scheduling_table_arn = f"arn:aws:dynamodb:{Stack.of(self).region}:{Stack.of(self).account}:table/{self.scheduling_table_name}"
            
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", 
                            "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"],
                    resources=[
                        enrollments_table_arn,
                        f"{enrollments_table_arn}/index/*",  # GSI access
                        documents_table_arn,
                        f"{documents_table_arn}/index/*",    # GSI access
                        scheduling_table_arn,
                        f"{scheduling_table_arn}/index/*"    # GSI access
                    ]
                )
            )
                
    def _create_api_gateway(self):
        """Create API Gateway for parent functionality"""
        
        # Create log group for API Gateway (import existing if present)
        log_group_name = f"/aws/apigateway/tsa-parent-api-{self.stage}"
        try:
            log_group = logs.LogGroup.from_log_group_name(
                self, "ParentPortalAPILogs",
                log_group_name=log_group_name
            )
            print(f"✅ Imported existing parent log group: {log_group_name}")
        except Exception:
            log_group = logs.LogGroup(
                self, "ParentPortalAPILogs",
                log_group_name=log_group_name,
                retention=logs.RetentionDays.ONE_MONTH
            )
            print(f"🆕 Created new parent log group: {log_group_name}")
        
        # Get environment-specific CORS origins
        cors_origins = self.env_config.get("cors_origins", {})
        parent_origins = cors_origins.get("unified", [
            "http://localhost:3000",
            "https://localhost:3000"
        ])
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "ParentPortalAPI",
            rest_api_name=self.resource_config.get_api_names()["parent"],
            description=f"API for TSA Parent Portal and Student Enrollment ({self.stage})",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=parent_origins,
                allow_methods=[
                    "GET", "POST", "PUT", "DELETE", "OPTIONS"
                ],
                allow_headers=[
                    "Content-Type", 
                    "X-Amz-Date", 
                    "Authorization", 
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                    "X-Requested-With",
                    "Accept"
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
        enrollment_integration = apigateway.LambdaIntegration(self.enrollment_function)
        admissions_integration = apigateway.LambdaIntegration(self.admissions_function)
        
        # Note: Dashboard endpoint removed - needs proper logic implementation
        
        # Admissions routes
        admissions_resource = self.api.root.add_resource("admissions")
        
        # Invitation validation
        validate_resource = admissions_resource.add_resource("validate-invitation")
        validate_resource.add_method("POST", admissions_integration)
        
        # Invitation details
        invitation_resource = admissions_resource.add_resource("invitation")
        invitation_token_resource = invitation_resource.add_resource("{token}")
        invitation_token_resource.add_method("GET", admissions_integration)
        
        # Enrollment management
        enrollments_resource = admissions_resource.add_resource("enrollments")
        enrollments_resource.add_method("POST", enrollment_integration)
        
        # Single enrollment management
        enrollment_resource = enrollments_resource.add_resource("{enrollment_id}")
        enrollment_resource.add_method("GET", enrollment_integration)
        enrollment_resource.add_method("PUT", enrollment_integration)
        
        # Document upload endpoints
        documents_resource = enrollment_resource.add_resource("documents")
        documents_resource.add_method("GET", enrollment_integration)
        documents_resource.add_method("POST", enrollment_integration)
        
        # Single document management
        document_resource = documents_resource.add_resource("{document_id}")
        document_resource.add_method("GET", enrollment_integration)
        document_resource.add_method("DELETE", enrollment_integration)
        
        # Health check endpoint
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", enrollment_integration)
        
        # Export API URL with predictable naming (consistent with coach/admin pattern)
        parent_api_output = CfnOutput(
            self, f"ParentAPIUrl{self.stage.title()}",
            value=self.api.url,
            description=f"Parent Portal API Gateway URL ({self.stage})",
            export_name=f"tsa-parent-backend-{self.stage}:ParentPortalAPIUrl"
        )
        # Override the logical ID to be predictable
        parent_api_output.override_logical_id(f"ParentAPIUrl{self.stage.title()}")
        
        # Store API URL in SSM Parameter Store for frontend configuration
        # ✅ ARCHITECTURAL FIX: Remove CloudFormation-managed parameter and use manual approach
        # This avoids CloudFormation resource type conflicts by not managing the parameter in CF
        
        # DON'T create SSM parameter via CloudFormation - it conflicts with existing resources
        # Instead, the parameter will be created/updated via deployment scripts or manual process
        # This follows the architectural principle: "Don't fight CloudFormation, work with it"
        
        # The parameter /tsa/dev/api-urls/parent exists and will be updated outside of this stack
        # Frontend sync scripts can read from the existing parameter path
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url 