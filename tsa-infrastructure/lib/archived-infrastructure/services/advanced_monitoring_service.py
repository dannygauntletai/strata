"""
Advanced Monitoring Service Stack
Handles business intelligence, custom metrics, and intelligent alerting

Features:
- Custom business metrics and KPIs
- Intelligent alerting with ML-powered anomaly detection
- Real-time dashboards and visualization
- Performance monitoring across all services
- Business intelligence and analytics
- SLA monitoring and reporting
- Cost optimization monitoring
"""

from aws_cdk import (
    core, aws_lambda as lambda_, aws_apigateway as apigw,
    aws_dynamodb as dynamodb, aws_s3 as s3, aws_sns as sns,
    aws_sqs as sqs, aws_events as events, aws_events_targets as targets,
    aws_secretsmanager as secrets, aws_iam as iam,
    aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks,
    aws_cloudwatch as cloudwatch, aws_logs as logs
)
from typing import Dict, Any


class AdvancedMonitoringService(core.Construct):
    """Advanced Monitoring Service for business intelligence and custom metrics"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = shared_resources["stage"]
        
        # Create monitoring infrastructure
        self._create_monitoring_tables()
        self._create_dashboard_storage()
        self._create_notification_infrastructure()
        self._create_monitoring_handlers()
        self._create_alerting_workflows()
        self._create_api_gateway()
        self._create_monitoring_automation()
        
    def _create_monitoring_tables(self):
        """Create DynamoDB tables for monitoring and metrics"""
        
        # Custom metrics table
        self.custom_metrics = dynamodb.Table(
            self, "CustomMetrics",
            table_name=f"tsa-monitoring-metrics-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="metric_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            time_to_live_attribute="ttl"  # Auto-expire old metrics
        )
        
        # Add GSI for metric type queries
        self.custom_metrics.add_global_secondary_index(
            index_name="MetricTypeIndex",
            partition_key=dynamodb.Attribute(
                name="metric_type",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for service-specific metrics
        self.custom_metrics.add_global_secondary_index(
            index_name="ServiceMetricsIndex",
            partition_key=dynamodb.Attribute(
                name="service_name",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Alerts and incidents table
        self.alerts = dynamodb.Table(
            self, "AlertsAndIncidents",
            table_name=f"tsa-monitoring-alerts-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="alert_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for alert status
        self.alerts.add_global_secondary_index(
            index_name="AlertStatusIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for severity-based queries
        self.alerts.add_global_secondary_index(
            index_name="SeverityIndex",
            partition_key=dynamodb.Attribute(
                name="severity",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # SLA monitoring table
        self.sla_tracking = dynamodb.Table(
            self, "SLATracking",
            table_name=f"tsa-monitoring-sla-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="sla_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="period",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Business KPI tracking table
        self.business_kpis = dynamodb.Table(
            self, "BusinessKPIs",
            table_name=f"tsa-monitoring-kpis-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="kpi_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="date",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Performance benchmarks table
        self.performance_benchmarks = dynamodb.Table(
            self, "PerformanceBenchmarks",
            table_name=f"tsa-monitoring-benchmarks-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="benchmark_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
        # Dashboard configurations table
        self.dashboard_configs = dynamodb.Table(
            self, "DashboardConfigs",
            table_name=f"tsa-monitoring-dashboards-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="dashboard_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
    def _create_dashboard_storage(self):
        """Create S3 buckets for dashboard assets and reports"""
        
        # Dashboard assets bucket
        self.dashboard_assets_bucket = s3.Bucket(
            self, "DashboardAssets",
            bucket_name=f"tsa-monitoring-dashboards-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.HEAD],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                    max_age=3000
                )
            ]
        )
        
        # Monitoring reports bucket
        self.reports_bucket = s3.Bucket(
            self, "MonitoringReports",
            bucket_name=f"tsa-monitoring-reports-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="ReportsArchival",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=core.Duration.days(90)
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=core.Duration.days(365)
                        )
                    ]
                )
            ]
        )
        
        # Cost optimization data bucket
        self.cost_data_bucket = s3.Bucket(
            self, "CostOptimizationData",
            bucket_name=f"tsa-cost-optimization-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False
        )
        
    def _create_notification_infrastructure(self):
        """Create SNS topics and SQS queues for monitoring notifications"""
        
        # Critical alerts topic
        self.critical_alerts_topic = sns.Topic(
            self, "CriticalAlerts",
            topic_name=f"tsa-critical-alerts-{self.stage}",
            display_name="TSA Critical Alerts"
        )
        
        # Business metrics topic
        self.business_metrics_topic = sns.Topic(
            self, "BusinessMetrics",
            topic_name=f"tsa-business-metrics-{self.stage}",
            display_name="TSA Business Metrics"
        )
        
        # Metrics processing queue
        self.metrics_processing_queue = sqs.Queue(
            self, "MetricsProcessingQueue",
            queue_name=f"tsa-metrics-processing-{self.stage}",
            visibility_timeout=core.Duration.minutes(10),
            retention_period=core.Duration.days(14)
        )
        
        # Anomaly detection queue
        self.anomaly_detection_queue = sqs.Queue(
            self, "AnomalyDetectionQueue",
            queue_name=f"tsa-anomaly-detection-{self.stage}",
            visibility_timeout=core.Duration.minutes(5),
            retention_period=core.Duration.days(14)
        )
        
        # Report generation queue
        self.report_generation_queue = sqs.Queue(
            self, "ReportGenerationQueue",
            queue_name=f"tsa-report-generation-{self.stage}",
            visibility_timeout=core.Duration.minutes(20),
            retention_period=core.Duration.days(14)
        )
        
    def _create_monitoring_handlers(self):
        """Create Lambda functions for monitoring and alerting"""
        
        # Third-party monitoring credentials (DataDog, New Relic, etc.)
        self.monitoring_integrations_secret = secrets.Secret(
            self, "MonitoringIntegrations",
            secret_name=f"tsa/monitoring/integrations/{self.stage}",
            description="Third-party monitoring service API credentials",
            generate_secret_string=secrets.SecretStringGenerator(
                secret_string_template='{"datadog_api_key": "placeholder"}',
                generate_string_key="new_relic_key",
                exclude_characters='"@/\\'
            )
        )
        
        # Custom metrics collector
        self.metrics_collector = lambda_.Function(
            self, "MetricsCollector",
            function_name=f"tsa-metrics-collector-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="metrics_collector.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_metrics"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "METRICS_TABLE": self.custom_metrics.table_name,
                "KPI_TABLE": self.business_kpis.table_name,
                "BUSINESS_METRICS_TOPIC_ARN": self.business_metrics_topic.topic_arn,
                "INTEGRATIONS_SECRET_ARN": self.monitoring_integrations_secret.secret_arn
            }
        )
        
        # Intelligent alerting handler
        self.alerting_handler = lambda_.Function(
            self, "AlertingHandler",
            function_name=f"tsa-intelligent-alerting-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="alerting_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_alerting"),
            timeout=core.Duration.minutes(10),
            memory_size=1024,  # For ML anomaly detection
            environment={
                "STAGE": self.stage,
                "ALERTS_TABLE": self.alerts.table_name,
                "METRICS_TABLE": self.custom_metrics.table_name,
                "CRITICAL_ALERTS_TOPIC_ARN": self.critical_alerts_topic.topic_arn,
                "INTEGRATIONS_SECRET_ARN": self.monitoring_integrations_secret.secret_arn
            }
        )
        
        # Business intelligence handler
        self.business_intelligence_handler = lambda_.Function(
            self, "BusinessIntelligenceHandler",
            function_name=f"tsa-business-intelligence-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="business_intelligence.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_bi"),
            timeout=core.Duration.minutes(15),
            memory_size=1024,
            environment={
                "STAGE": self.stage,
                "KPI_TABLE": self.business_kpis.table_name,
                "METRICS_TABLE": self.custom_metrics.table_name,
                "REPORTS_BUCKET": self.reports_bucket.bucket_name,
                "DASHBOARDS_BUCKET": self.dashboard_assets_bucket.bucket_name
            }
        )
        
        # SLA monitoring handler
        self.sla_monitor = lambda_.Function(
            self, "SLAMonitor",
            function_name=f"tsa-sla-monitor-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="sla_monitor.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_sla"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "SLA_TABLE": self.sla_tracking.table_name,
                "METRICS_TABLE": self.custom_metrics.table_name,
                "ALERTS_TABLE": self.alerts.table_name,
                "CRITICAL_ALERTS_TOPIC_ARN": self.critical_alerts_topic.topic_arn
            }
        )
        
        # Cost optimization handler
        self.cost_optimizer = lambda_.Function(
            self, "CostOptimizer",
            function_name=f"tsa-cost-optimizer-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="cost_optimizer.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_cost"),
            timeout=core.Duration.minutes(10),
            environment={
                "STAGE": self.stage,
                "COST_DATA_BUCKET": self.cost_data_bucket.bucket_name,
                "ALERTS_TABLE": self.alerts.table_name,
                "BUSINESS_METRICS_TOPIC_ARN": self.business_metrics_topic.topic_arn
            }
        )
        
        # Dashboard generator
        self.dashboard_generator = lambda_.Function(
            self, "DashboardGenerator",
            function_name=f"tsa-dashboard-generator-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="dashboard_generator.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-monitoring-backend/lambda_dashboard"),
            timeout=core.Duration.minutes(10),
            memory_size=1024,  # For chart generation
            environment={
                "STAGE": self.stage,
                "DASHBOARD_CONFIGS_TABLE": self.dashboard_configs.table_name,
                "METRICS_TABLE": self.custom_metrics.table_name,
                "KPI_TABLE": self.business_kpis.table_name,
                "DASHBOARDS_BUCKET": self.dashboard_assets_bucket.bucket_name
            }
        )
        
        # Grant permissions
        handlers = [
            self.metrics_collector, self.alerting_handler, self.business_intelligence_handler,
            self.sla_monitor, self.cost_optimizer, self.dashboard_generator
        ]
        
        for handler in handlers:
            self.business_metrics_topic.grant_publish(handler)
            self.monitoring_integrations_secret.grant_read(handler)
            
        # Critical alerts permissions
        self.critical_alerts_topic.grant_publish(self.alerting_handler)
        self.critical_alerts_topic.grant_publish(self.sla_monitor)
        
        # Table permissions
        self.custom_metrics.grant_read_write_data(self.metrics_collector)
        self.custom_metrics.grant_read_data(self.alerting_handler)
        self.custom_metrics.grant_read_data(self.business_intelligence_handler)
        self.custom_metrics.grant_read_data(self.sla_monitor)
        self.custom_metrics.grant_read_data(self.dashboard_generator)
        
        self.business_kpis.grant_read_write_data(self.metrics_collector)
        self.business_kpis.grant_read_data(self.business_intelligence_handler)
        self.business_kpis.grant_read_data(self.dashboard_generator)
        
        self.alerts.grant_read_write_data(self.alerting_handler)
        self.alerts.grant_read_write_data(self.sla_monitor)
        self.alerts.grant_read_write_data(self.cost_optimizer)
        
        self.sla_tracking.grant_read_write_data(self.sla_monitor)
        self.dashboard_configs.grant_read_write_data(self.dashboard_generator)
        
        # S3 permissions
        self.reports_bucket.grant_read_write(self.business_intelligence_handler)
        self.dashboard_assets_bucket.grant_read_write(self.business_intelligence_handler)
        self.dashboard_assets_bucket.grant_read_write(self.dashboard_generator)
        self.cost_data_bucket.grant_read_write(self.cost_optimizer)
        
        # CloudWatch permissions for cost optimizer
        self.cost_optimizer.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "ce:GetCostAndUsage",
                    "ce:GetDimensionValues",
                    "ce:GetReservationCoverage",
                    "ce:GetReservationPurchaseRecommendation",
                    "ce:GetReservationUtilization",
                    "ce:GetSavingsPlansUtilization",
                    "ce:ListCostCategoryDefinitions"
                ],
                resources=["*"]
            )
        )
        
    def _create_alerting_workflows(self):
        """Create Step Functions for complex alerting workflows"""
        
        # Incident response workflow
        incident_response_workflow = sfn.StateMachine(
            self, "IncidentResponseWorkflow",
            state_machine_name=f"tsa-incident-response-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "DetectIncident",
                    lambda_function=self.alerting_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "detect_incident"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "EscalateAlert",
                    lambda_function=self.alerting_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "escalate_alert"
                    })
                ))
                .next(sfn.Wait(
                    self, "WaitForResponse",
                    time=sfn.WaitTime.duration(core.Duration.minutes(15))
                ))
                .next(tasks.LambdaInvoke(
                    self, "CheckResolution",
                    lambda_function=self.alerting_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "check_resolution"
                    })
                ))
            )
        )
        
        # Business metrics analysis workflow
        metrics_analysis_workflow = sfn.StateMachine(
            self, "MetricsAnalysisWorkflow",
            state_machine_name=f"tsa-metrics-analysis-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "CollectBusinessMetrics",
                    lambda_function=self.metrics_collector,
                    payload=sfn.TaskInput.from_object({
                        "action": "collect_business_metrics"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "AnalyzeTrends",
                    lambda_function=self.business_intelligence_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "analyze_trends"
                    })
                ))
                .next(tasks.LambdaInvoke(
                    self, "GenerateInsights",
                    lambda_function=self.business_intelligence_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_insights"
                    })
                ))
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for monitoring service"""
        
        self.api = apigw.RestApi(
            self, "MonitoringAPI",
            rest_api_name=f"tsa-monitoring-api-{self.stage}",
            description="TSA Advanced Monitoring Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create Lambda integrations
        metrics_integration = apigw.LambdaIntegration(self.metrics_collector)
        alerting_integration = apigw.LambdaIntegration(self.alerting_handler)
        bi_integration = apigw.LambdaIntegration(self.business_intelligence_handler)
        sla_integration = apigw.LambdaIntegration(self.sla_monitor)
        dashboard_integration = apigw.LambdaIntegration(self.dashboard_generator)
        
        # Metrics endpoints
        metrics_resource = self.api.root.add_resource("metrics")
        metrics_resource.add_method("POST", metrics_integration)  # Submit custom metric
        metrics_resource.add_method("GET", metrics_integration)   # Query metrics
        
        custom_metrics = metrics_resource.add_resource("custom")
        custom_metrics.add_method("GET", metrics_integration)
        
        business_metrics = metrics_resource.add_resource("business")
        business_metrics.add_method("GET", metrics_integration)
        
        # Alerts endpoints
        alerts_resource = self.api.root.add_resource("alerts")
        alerts_resource.add_method("GET", alerting_integration)
        alerts_resource.add_method("POST", alerting_integration)  # Create alert rule
        
        alert_id_resource = alerts_resource.add_resource("{alert_id}")
        alert_id_resource.add_method("GET", alerting_integration)
        alert_id_resource.add_method("PUT", alerting_integration)  # Update alert
        alert_id_resource.add_method("DELETE", alerting_integration)
        
        # SLA endpoints
        sla_resource = self.api.root.add_resource("sla")
        sla_resource.add_method("GET", sla_integration)
        sla_resource.add_method("POST", sla_integration)  # Define SLA
        
        sla_id_resource = sla_resource.add_resource("{sla_id}")
        sla_id_resource.add_method("GET", sla_integration)
        
        # Dashboard endpoints
        dashboards_resource = self.api.root.add_resource("dashboards")
        dashboards_resource.add_method("GET", dashboard_integration)
        dashboards_resource.add_method("POST", dashboard_integration)  # Create dashboard
        
        dashboard_id_resource = dashboards_resource.add_resource("{dashboard_id}")
        dashboard_id_resource.add_method("GET", dashboard_integration)
        dashboard_id_resource.add_method("PUT", dashboard_integration)
        
        # Business intelligence endpoints
        intelligence_resource = self.api.root.add_resource("intelligence")
        intelligence_resource.add_method("GET", bi_integration)
        
        insights_resource = intelligence_resource.add_resource("insights")
        insights_resource.add_method("GET", bi_integration)
        
        trends_resource = intelligence_resource.add_resource("trends")
        trends_resource.add_method("GET", bi_integration)
        
        reports_resource = intelligence_resource.add_resource("reports")
        reports_resource.add_method("GET", bi_integration)
        reports_resource.add_method("POST", bi_integration)  # Generate report
        
    def _create_monitoring_automation(self):
        """Create EventBridge rules for monitoring automation"""
        
        # Metrics collection rule (every 5 minutes)
        metrics_collection_rule = events.Rule(
            self, "MetricsCollectionRule",
            rule_name=f"tsa-metrics-collection-{self.stage}",
            schedule=events.Schedule.rate(core.Duration.minutes(5)),
            description="Collect custom business metrics"
        )
        
        metrics_collection_rule.add_target(
            targets.LambdaFunction(self.metrics_collector)
        )
        
        # Anomaly detection rule (hourly)
        anomaly_detection_rule = events.Rule(
            self, "AnomalyDetectionRule",
            rule_name=f"tsa-anomaly-detection-{self.stage}",
            schedule=events.Schedule.rate(core.Duration.hours(1)),
            description="Run anomaly detection on metrics"
        )
        
        anomaly_detection_rule.add_target(
            targets.LambdaFunction(self.alerting_handler)
        )
        
        # SLA monitoring rule (every 15 minutes)
        sla_monitoring_rule = events.Rule(
            self, "SLAMonitoringRule",
            rule_name=f"tsa-sla-monitoring-{self.stage}",
            schedule=events.Schedule.rate(core.Duration.minutes(15)),
            description="Monitor SLA compliance"
        )
        
        sla_monitoring_rule.add_target(
            targets.LambdaFunction(self.sla_monitor)
        )
        
        # Daily business intelligence
        bi_daily_rule = events.Rule(
            self, "BusinessIntelligenceRule",
            rule_name=f"tsa-business-intelligence-{self.stage}",
            schedule=events.Schedule.cron(hour="7", minute="0"),  # Daily at 7 AM
            description="Generate daily business intelligence insights"
        )
        
        bi_daily_rule.add_target(
            targets.LambdaFunction(self.business_intelligence_handler)
        )
        
        # Weekly cost optimization
        cost_optimization_rule = events.Rule(
            self, "CostOptimizationRule",
            rule_name=f"tsa-cost-optimization-{self.stage}",
            schedule=events.Schedule.cron(day_of_week="MON", hour="6", minute="0"),  # Monday 6 AM
            description="Weekly cost optimization analysis"
        )
        
        cost_optimization_rule.add_target(
            targets.LambdaFunction(self.cost_optimizer)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
    
    @property
    def topic_arns(self) -> Dict[str, str]:
        """Get SNS topic ARNs for monitoring notifications"""
        return {
            "critical_alerts": self.critical_alerts_topic.topic_arn,
            "business_metrics": self.business_metrics_topic.topic_arn
        }
    
    @property
    def queue_urls(self) -> Dict[str, str]:
        """Get SQS queue URLs for monitoring processing"""
        return {
            "metrics_processing": self.metrics_processing_queue.queue_url,
            "anomaly_detection": self.anomaly_detection_queue.queue_url,
            "report_generation": self.report_generation_queue.queue_url
        }
    
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names for monitoring storage"""
        return {
            "dashboard_assets": self.dashboard_assets_bucket.bucket_name,
            "reports": self.reports_bucket.bucket_name,
            "cost_data": self.cost_data_bucket.bucket_name
        } 