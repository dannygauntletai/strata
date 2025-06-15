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
)
from constructs import Construct
from typing import Dict, Any
from ..shared.table_names import get_resource_config, get_table_iam_arns


class ParentPortalService(Construct):
    """Parent Portal Service for enrollment management and communication"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = stage
        self.env_config = shared_resources.get("environment_config", {})
        
        # Get centralized resource configuration
        self.resource_config = get_resource_config(stage)
        
        # Create parent-specific resources
        self._create_lambda_layer()
        self._create_dynamodb_tables()
        self._create_lambda_functions()
        self._create_api_gateway()
        
    def _create_lambda_layer(self):
        """Create shared Lambda layer for parent functions"""
        self.parent_layer = lambda_.LayerVersion(
            self, "ParentSharedLayer",
            code=lambda_.Code.from_asset("../tsa-parent-backend/shared_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="Shared models and utilities for parent portal functionality"
        )
        
    def _create_dynamodb_tables(self):
        """Create parent-specific DynamoDB tables"""
        
        # Parent Enrollments table - Core enrollment tracking and workflow
        self.enrollments_table = dynamodb.Table(
            self, "ParentEnrollmentsTable",
            table_name=self.resource_config.get_table_name("enrollments"),
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for parent email lookup
        self.enrollments_table.add_global_secondary_index(
            index_name="parent-email-index",
            partition_key=dynamodb.Attribute(
                name="parent_email",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for invitation token lookup
        self.enrollments_table.add_global_secondary_index(
            index_name="invitation-token-index",
            partition_key=dynamodb.Attribute(
                name="invitation_token",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Parent Documents table - Document upload and verification
        self.documents_table = dynamodb.Table(
            self, "ParentDocumentsTable",
            table_name=self.resource_config.get_table_name("documents"),
            partition_key=dynamodb.Attribute(
                name="document_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for enrollment lookup
        self.documents_table.add_global_secondary_index(
            index_name="enrollment-id-index",
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Parent Scheduling table - Consultation and shadow day scheduling
        self.scheduling_table = dynamodb.Table(
            self, "ParentSchedulingTable",
            table_name=self.resource_config.get_table_name("scheduling"),
            partition_key=dynamodb.Attribute(
                name="schedule_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for enrollment lookup
        self.scheduling_table.add_global_secondary_index(
            index_name="enrollment-id-index",
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
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
            "layers": [self.parent_layer],
            "environment": {
                # Use shared environment variables (EdFi/OneRoster standard tables)
                **self.resource_config.get_service_environment_variables("parent"),
                
                # PostgreSQL Database
                "DB_HOST": self.shared_resources.get("database_host", ""),
                "DB_NAME": self.shared_resources.get("database_name", ""),
                "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
                "DB_PORT": "5432",
                
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
        
        # Parent enrollment function - handles invitation validation and enrollment process
        self.enrollment_function = lambda_.Function(
            self, "ParentEnrollmentHandler",
            function_name=self.resource_config.get_lambda_names()["parent_enrollment"],
            code=lambda_.Code.from_asset("../tsa-parent-backend/lambda_enrollment"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
        # Parent dashboard function - handles dashboard data and role-based routing
        self.dashboard_function = lambda_.Function(
            self, "ParentDashboardHandler", 
            function_name=self.resource_config.get_lambda_names()["parent_dashboard"],
            code=lambda_.Code.from_asset("../tsa-parent-backend/lambda_dashboard"),
            handler="handler.lambda_handler",
            **lambda_config
        )
        
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
        functions = [self.enrollment_function, self.dashboard_function, self.admissions_function]
        
        for function in functions:
            # Grant permissions to parent-specific tables
            self.enrollments_table.grant_read_write_data(function)
            self.documents_table.grant_read_write_data(function)
            self.scheduling_table.grant_read_write_data(function)
        
            # Grant access to shared tables using standardized ARNs
            shared_table_arns = get_table_iam_arns(self.stage)
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", 
                            "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"],
                    resources=shared_table_arns
                )
            )
                
    def _create_api_gateway(self):
        """Create API Gateway for parent functionality"""
        
        # Create log group for API Gateway
        log_group = logs.LogGroup(
            self, "ParentPortalAPILogs",
            log_group_name=self.resource_config.get_log_group_names()["parent_api"],
        )
        
        # Get environment-specific CORS origins
        cors_origins = self.env_config.get("cors_origins", {})
        parent_origins = cors_origins.get("unified", [
            "http://localhost:3000",
            "https://localhost:3000"
        ])
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "ParentPortalAPI",
            rest_api_name=self.resource_config.get_api_names()["parent_api"],
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
                stage_name="prod",
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
        dashboard_integration = apigateway.LambdaIntegration(self.dashboard_function)
        admissions_integration = apigateway.LambdaIntegration(self.admissions_function)
        
        # Dashboard endpoint
        dashboard_resource = self.api.root.add_resource("dashboard")
        dashboard_resource.add_method("GET", dashboard_integration)
        
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
        
        # Export API URL
        CfnOutput(
            self, "ParentPortalAPIUrl",
            value=self.api.url,
            description=f"Parent Portal API Gateway URL ({self.stage})"
        )
        
        # Export API URL to SSM Parameter Store
        ssm.StringParameter(
            self, "ParentApiUrlParameter",
            parameter_name=f"/tsa/{self.stage}/api-urls/parent-api",
            string_value=self.api.url,
            description=f"Auto-managed Parent API URL for {self.stage} environment"
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url 