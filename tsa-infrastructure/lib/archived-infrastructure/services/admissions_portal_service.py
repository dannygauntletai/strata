"""
Admissions Portal Service Stack
Handles enrollment processes, registration workflows, and communications
Integrates with Lead Management Service for lead processing
"""
from aws_cdk import (
    core,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_s3 as s3,
    aws_events as events,
    aws_events_targets as targets,
    aws_logs as logs,
    aws_sns as sns,
    aws_sqs as sqs,
    aws_ses as ses,
)
from typing import Dict, Any


class AdmissionsPortalService(core.Construct):
    """Admissions Portal Service for enrollment processes and parent interactions"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        
        # Create admissions-specific resources
        self._create_lambda_layer()
        self._create_s3_buckets()
        self._create_notification_resources()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_automation_rules()
        
    def _create_lambda_layer(self):
        """Create shared Lambda layer for admissions functions"""
        self.shared_layer = lambda_.LayerVersion(
            self, "AdmissionsSharedLayer",
            code=lambda_.Code.from_asset("../tsa-coach-backend/shared_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="Shared models and utilities for admissions portal"
        )
        
    def _create_s3_buckets(self):
        """Create S3 buckets for admissions content and documents"""
        
        # Documents and forms bucket
        self.documents_bucket = s3.Bucket(
            self, "AdmissionsDocuments",
            bucket_name=f"tsa-admissions-documents-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=core.RemovalPolicy.RETAIN
        )
        
        # Marketing assets bucket
        self.marketing_bucket = s3.Bucket(
            self, "MarketingAssets",
            bucket_name=f"tsa-marketing-assets-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=True,
            removal_policy=core.RemovalPolicy.RETAIN
        )
        
        # Configure CORS for marketing assets
        self.marketing_bucket.add_cors_rule(
            allowed_methods=[s3.HttpMethods.GET],
            allowed_origins=["*"],
            allowed_headers=["*"],
            max_age=3600
        )
        
    def _create_notification_resources(self):
        """Create SNS topics and SQS queues for notifications"""
        
        # Email processing queue
        self.email_queue = sqs.Queue(
            self, "EmailQueue",
            queue_name="admissions-email-queue",
            visibility_timeout=core.Duration.seconds(300),
            retention_period=core.Duration.days(14)
        )
        
        # Dead letter queue for failed email processing
        self.email_dlq = sqs.Queue(
            self, "EmailDLQ",
            queue_name="admissions-email-dlq",
            retention_period=core.Duration.days(14)
        )
        
        self.email_queue.add_to_resource_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("ses.amazonaws.com")],
                actions=["sqs:SendMessage"],
                resources=[self.email_queue.queue_arn]
            )
        )
        
    def _create_lambda_functions(self):
        """Create Lambda functions for admissions portal"""
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.shared_layer],
            "environment": {
                "DATABASE_URL": self.shared_resources["database_url"],
                "DOCUMENTS_BUCKET": self.documents_bucket.bucket_name,
                "MARKETING_BUCKET": self.marketing_bucket.bucket_name,
                "EMAIL_QUEUE_URL": self.email_queue.queue_url,
                "LEAD_MANAGEMENT_API_URL": self.shared_resources.get("lead_management_api_url", ""),
                "ANALYTICS_API_URL": self.shared_resources.get("analytics_api_url", ""),
                "LOG_LEVEL": "INFO"
            },
            "timeout": core.Duration.seconds(30),
            "memory_size": 512
        }
        
        # Registration forms function
        self.registration_function = lambda_.Function(
            self, "RegistrationHandler",
            function_name="admissions-registration-handler",
            code=lambda_.Code.from_asset("../tsa-admissions-backend/lambda_registration"),
            handler="registration_handler.lambda_handler",
            **lambda_config
        )
        
        # Enrollment processing function
        self.enrollment_function = lambda_.Function(
            self, "EnrollmentHandler",
            function_name="admissions-enrollment-handler",
            code=lambda_.Code.from_asset("../tsa-admissions-backend/lambda_enrollment"),
            handler="enrollment_handler.lambda_handler",
            **lambda_config
        )
        
        # Communication function (emails, SMS)
        self.communication_function = lambda_.Function(
            self, "CommunicationHandler",
            function_name="admissions-communication-handler",
            code=lambda_.Code.from_asset("../tsa-admissions-backend/lambda_communication"),
            handler="communication_handler.lambda_handler",
            **lambda_config
        )
        
        # Document processing function
        self.documents_function = lambda_.Function(
            self, "DocumentsHandler",
            function_name="admissions-documents-handler",
            code=lambda_.Code.from_asset("../tsa-admissions-backend/lambda_documents"),
            handler="documents_handler.lambda_handler",
            **lambda_config
        )
        
        # Workflow management function
        self.workflow_function = lambda_.Function(
            self, "WorkflowHandler",
            function_name="admissions-workflow-handler",
            code=lambda_.Code.from_asset("../tsa-admissions-backend/lambda_workflow"),
            handler="workflow_handler.lambda_handler",
            **lambda_config
        )
        
        # Grant permissions to functions
        functions = [
            self.registration_function,
            self.enrollment_function,
            self.communication_function,
            self.documents_function,
            self.workflow_function
        ]
        
        for func in functions:
            # S3 permissions
            self.documents_bucket.grant_read_write(func)
            self.marketing_bucket.grant_read(func)
            
            # SQS permissions
            self.email_queue.grant_send_messages(func)
            self.email_queue.grant_consume_messages(func)
            
            # RDS permissions for enrollment data
            func.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "rds:DescribeDBInstances",
                        "rds:Connect"
                    ],
                    resources=["*"]
                )
            )
            
            # SES permissions for email sending
            func.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "ses:SendEmail",
                        "ses:SendRawEmail",
                        "ses:GetIdentityVerificationAttributes"
                    ],
                    resources=["*"]
                )
            )
        
    def _create_api_gateway(self):
        """Create API Gateway for admissions portal"""
        
        # Create log group for API Gateway
        log_group = logs.LogGroup(
            self, "AdmissionsAPILogs",
            log_group_name="/aws/apigateway/admissions-portal",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "AdmissionsPortalAPI",
            rest_api_name="Admissions Portal API",
            description="API for TSA Admissions Portal",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
            ),
            deploy_options=apigateway.StageOptions(
                stage_name="prod",
                access_log_destination=apigateway.LogGroupLogDestination(log_group),
                access_log_format=apigateway.AccessLogFormat.json_with_standard_fields()
            )
        )
        
        # Create API integrations
        registration_integration = apigateway.LambdaIntegration(self.registration_function)
        enrollment_integration = apigateway.LambdaIntegration(self.enrollment_function)
        communication_integration = apigateway.LambdaIntegration(self.communication_function)
        documents_integration = apigateway.LambdaIntegration(self.documents_function)
        workflow_integration = apigateway.LambdaIntegration(self.workflow_function)
        
        # Registration routes
        registrations_resource = self.api.root.add_resource("registrations")
        
        # Book call
        book_call_resource = registrations_resource.add_resource("book-call")
        book_call_resource.add_method("GET", registration_integration)
        book_call_resource.add_method("POST", registration_integration)
        
        # Book tour
        book_tour_resource = registrations_resource.add_resource("book-tour")
        book_tour_resource.add_method("GET", registration_integration)
        book_tour_resource.add_method("POST", registration_integration)
        
        # Shadow day
        shadow_day_resource = registrations_resource.add_resource("shadow-day")
        shadow_day_resource.add_method("GET", registration_integration)
        shadow_day_resource.add_method("POST", registration_integration)
        
        # Enrollment routes
        enrollment_resource = self.api.root.add_resource("enrollment")
        enrollment_resource.add_method("GET", enrollment_integration)
        enrollment_resource.add_method("POST", enrollment_integration)
        
        enrollment_id_resource = enrollment_resource.add_resource("{enrollment_id}")
        enrollment_id_resource.add_method("GET", enrollment_integration)
        enrollment_id_resource.add_method("PUT", enrollment_integration)
        
        # Enrollment status updates
        status_resource = enrollment_id_resource.add_resource("status")
        status_resource.add_method("PUT", enrollment_integration)
        
        # Communication routes
        communication_resource = self.api.root.add_resource("communication")
        
        emails_resource = communication_resource.add_resource("emails")
        emails_resource.add_method("POST", communication_integration)
        
        templates_resource = communication_resource.add_resource("templates")
        templates_resource.add_method("GET", communication_integration)
        
        # Documents routes
        documents_resource = self.api.root.add_resource("documents")
        documents_resource.add_method("GET", documents_integration)
        documents_resource.add_method("POST", documents_integration)
        
        upload_resource = documents_resource.add_resource("upload")
        upload_resource.add_method("POST", documents_integration)
        
        # Workflow routes
        workflow_resource = self.api.root.add_resource("workflow")
        workflow_resource.add_method("GET", workflow_integration)
        workflow_resource.add_method("POST", workflow_integration)
        
        # Health check endpoint (no auth required)
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", registration_integration)
        
    def _create_automation_rules(self):
        """Create EventBridge rules for admissions automation"""
        
        # Daily enrollment processing (7 AM daily)
        enrollment_rule = events.Rule(
            self, "DailyEnrollmentProcessing",
            rule_name="admissions-enrollment-processing",
            schedule=events.Schedule.cron(hour="7", minute="0"),
            description="Daily enrollment processing and status updates"
        )
        
        enrollment_rule.add_target(
            targets.LambdaFunction(self.enrollment_function)
        )
        
        # Weekly communication follow-up (Monday 9 AM)
        followup_rule = events.Rule(
            self, "WeeklyCommunicationFollowup",
            rule_name="admissions-communication-followup",
            schedule=events.Schedule.cron(
                day_of_week="MON",
                hour="9", 
                minute="0"
            ),
            description="Weekly enrollment follow-up automation"
        )
        
        followup_rule.add_target(
            targets.LambdaFunction(self.communication_function)
        )
        
        # Document cleanup (Sunday 1 AM)
        cleanup_rule = events.Rule(
            self, "DocumentCleanup",
            rule_name="admissions-document-cleanup",
            schedule=events.Schedule.cron(
                day_of_week="SUN",
                hour="1",
                minute="0"
            ),
            description="Clean up old documents and temporary files"
        )
        
        cleanup_rule.add_target(
            targets.LambdaFunction(self.documents_function)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
        
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names"""
        return {
            "documents": self.documents_bucket.bucket_name,
            "marketing": self.marketing_bucket.bucket_name
        }
        
    @property
    def notification_arns(self) -> Dict[str, str]:
        """Get notification resource ARNs"""
        return {
            "email_queue": self.email_queue.queue_arn
        } 