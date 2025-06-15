"""
Lead Management Service Stack
Dedicated service for lead collection, attribution, scoring, and analytics
Reusable across admissions, coach recruitment, partnerships, and marketing
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
)
from typing import Dict, Any


class LeadManagementService(core.Construct):
    """Lead Management Service for lead collection, attribution, and analytics"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        
        # Create lead management resources
        self._create_lambda_layer()
        self._create_notification_resources()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_automation_rules()
        
    def _create_lambda_layer(self):
        """Create shared Lambda layer for lead management functions"""
        self.shared_layer = lambda_.LayerVersion(
            self, "LeadManagementSharedLayer",
            code=lambda_.Code.from_asset("../tsa-coach-backend/shared_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="Shared models and utilities for lead management"
        )
        
    def _create_notification_resources(self):
        """Create SNS topics and SQS queues for lead notifications"""
        
        # Lead notifications topic
        self.lead_notifications_topic = sns.Topic(
            self, "LeadNotifications",
            topic_name="lead-management-notifications",
            display_name="Lead Management Notifications"
        )
        
        # Lead scoring queue
        self.scoring_queue = sqs.Queue(
            self, "ScoringQueue",
            queue_name="lead-scoring-queue",
            visibility_timeout=core.Duration.seconds(300),
            retention_period=core.Duration.days(14)
        )
        
        # Attribution processing queue
        self.attribution_queue = sqs.Queue(
            self, "AttributionQueue",
            queue_name="lead-attribution-queue",
            visibility_timeout=core.Duration.seconds(300),
            retention_period=core.Duration.days(14)
        )
        
    def _create_lambda_functions(self):
        """Create Lambda functions for lead management"""
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.shared_layer],
            "environment": {
                "DATABASE_URL": self.shared_resources["database_url"],
                "LEAD_NOTIFICATIONS_TOPIC": self.lead_notifications_topic.topic_arn,
                "SCORING_QUEUE_URL": self.scoring_queue.queue_url,
                "ATTRIBUTION_QUEUE_URL": self.attribution_queue.queue_url,
                "LOG_LEVEL": "INFO"
            },
            "timeout": core.Duration.seconds(30),
            "memory_size": 512
        }
        
        # Lead collection and management function
        self.leads_function = lambda_.Function(
            self, "LeadsHandler",
            function_name="lead-management-leads-handler",
            code=lambda_.Code.from_asset("../tsa-lead-backend/lambda_leads"),
            handler="leads_handler.lambda_handler",
            **lambda_config
        )
        
        # Lead attribution function
        self.attribution_function = lambda_.Function(
            self, "AttributionHandler",
            function_name="lead-management-attribution-handler",
            code=lambda_.Code.from_asset("../tsa-lead-backend/lambda_attribution"),
            handler="attribution_handler.lambda_handler",
            **lambda_config
        )
        
        # Lead scoring function
        self.scoring_function = lambda_.Function(
            self, "ScoringHandler",
            function_name="lead-management-scoring-handler",
            code=lambda_.Code.from_asset("../tsa-lead-backend/lambda_scoring"),
            handler="scoring_handler.lambda_handler",
            **lambda_config
        )
        
        # Lead analytics function
        self.analytics_function = lambda_.Function(
            self, "AnalyticsHandler",
            function_name="lead-management-analytics-handler",
            code=lambda_.Code.from_asset("../tsa-lead-backend/lambda_analytics"),
            handler="analytics_handler.lambda_handler",
            **lambda_config
        )
        
        # Integration function (for other services)
        self.integration_function = lambda_.Function(
            self, "IntegrationHandler",
            function_name="lead-management-integration-handler",
            code=lambda_.Code.from_asset("../tsa-lead-backend/lambda_integration"),
            handler="integration_handler.lambda_handler",
            **lambda_config
        )
        
        # Grant permissions to functions
        functions = [
            self.leads_function,
            self.attribution_function,
            self.scoring_function,
            self.analytics_function,
            self.integration_function
        ]
        
        for func in functions:
            # SNS permissions
            self.lead_notifications_topic.grant_publish(func)
            
            # SQS permissions
            self.scoring_queue.grant_send_messages(func)
            self.scoring_queue.grant_consume_messages(func)
            self.attribution_queue.grant_send_messages(func)
            self.attribution_queue.grant_consume_messages(func)
            
            # RDS permissions for lead data
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
        
    def _create_api_gateway(self):
        """Create API Gateway for lead management"""
        
        # Create log group for API Gateway
        log_group = logs.LogGroup(
            self, "LeadManagementAPILogs",
            log_group_name="/aws/apigateway/lead-management",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "LeadManagementAPI",
            rest_api_name="Lead Management API",
            description="API for TSA Lead Management Service",
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
        leads_integration = apigateway.LambdaIntegration(self.leads_function)
        attribution_integration = apigateway.LambdaIntegration(self.attribution_function)
        scoring_integration = apigateway.LambdaIntegration(self.scoring_function)
        analytics_integration = apigateway.LambdaIntegration(self.analytics_function)
        integration_integration = apigateway.LambdaIntegration(self.integration_function)
        
        # Leads routes
        leads_resource = self.api.root.add_resource("leads")
        leads_resource.add_method("GET", leads_integration)
        leads_resource.add_method("POST", leads_integration)
        
        lead_id_resource = leads_resource.add_resource("{lead_id}")
        lead_id_resource.add_method("GET", leads_integration)
        lead_id_resource.add_method("PUT", leads_integration)
        lead_id_resource.add_method("DELETE", leads_integration)
        
        # Lead conversion endpoints
        convert_resource = lead_id_resource.add_resource("convert")
        convert_resource.add_method("POST", leads_integration)
        
        # Attribution routes
        attribution_resource = self.api.root.add_resource("attribution")
        attribution_resource.add_method("GET", attribution_integration)
        attribution_resource.add_method("POST", attribution_integration)
        
        # Scoring routes
        scoring_resource = self.api.root.add_resource("scoring")
        scoring_resource.add_method("GET", scoring_integration)
        
        score_resource = lead_id_resource.add_resource("score")
        score_resource.add_method("PUT", scoring_integration)
        
        # Analytics routes
        analytics_resource = self.api.root.add_resource("analytics")
        
        metrics_resource = analytics_resource.add_resource("metrics")
        metrics_resource.add_method("GET", analytics_integration)
        
        funnel_resource = analytics_resource.add_resource("funnel")
        funnel_type_resource = funnel_resource.add_resource("{funnel_type}")
        funnel_type_resource.add_method("GET", analytics_integration)
        
        sources_resource = analytics_resource.add_resource("sources")
        sources_resource.add_method("GET", analytics_integration)
        
        # Integration routes (for other services)
        integration_resource = self.api.root.add_resource("integration")
        
        # Webhook for external lead sources
        webhook_resource = integration_resource.add_resource("webhook")
        webhook_resource.add_method("POST", integration_integration)
        
        # Batch operations
        batch_resource = integration_resource.add_resource("batch")
        batch_resource.add_method("POST", integration_integration)
        
        # Health check endpoint (no auth required)
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", leads_integration)
        
    def _create_automation_rules(self):
        """Create EventBridge rules for lead management automation"""
        
        # Lead scoring automation (every 2 hours)
        scoring_rule = events.Rule(
            self, "LeadScoringAutomation",
            rule_name="lead-management-scoring",
            schedule=events.Schedule.cron(hour="*/2", minute="0"),
            description="Automated lead scoring and re-scoring"
        )
        
        scoring_rule.add_target(
            targets.LambdaFunction(self.scoring_function)
        )
        
        # Attribution processing (every hour)
        attribution_rule = events.Rule(
            self, "AttributionProcessing",
            rule_name="lead-management-attribution",
            schedule=events.Schedule.cron(hour="*", minute="0"),
            description="Process lead attribution data"
        )
        
        attribution_rule.add_target(
            targets.LambdaFunction(self.attribution_function)
        )
        
        # Daily analytics (5 AM daily)
        analytics_rule = events.Rule(
            self, "DailyLeadAnalytics",
            rule_name="lead-management-daily-analytics",
            schedule=events.Schedule.cron(hour="5", minute="0"),
            description="Generate daily lead analytics"
        )
        
        analytics_rule.add_target(
            targets.LambdaFunction(self.analytics_function)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
        
    @property
    def notification_arns(self) -> Dict[str, str]:
        """Get notification resource ARNs"""
        return {
            "lead_notifications_topic": self.lead_notifications_topic.topic_arn,
            "scoring_queue": self.scoring_queue.queue_arn,
            "attribution_queue": self.attribution_queue.queue_arn
        } 