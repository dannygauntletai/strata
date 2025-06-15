"""
Analytics Service Stack
Centralized data analytics, reporting, and business intelligence
Ingests data from all other services for comprehensive insights
"""
from aws_cdk import (
    core,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_s3 as s3,
    aws_dynamodb as dynamodb,
    aws_events as events,
    aws_events_targets as targets,
    aws_logs as logs,
    aws_kinesis as kinesis,
    aws_kinesisfirehose as firehose,
    aws_glue as glue,
    aws_athena as athena,
    aws_quicksight as quicksight,
)
from typing import Dict, Any


class AnalyticsService(core.Construct):
    """Analytics Service for data ingestion, processing, and reporting"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        
        # Create analytics-specific resources
        self._create_data_ingestion()
        self._create_data_storage()
        self._create_data_processing()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_automation_rules()
        
    def _create_data_ingestion(self):
        """Create Kinesis streams for real-time data ingestion"""
        
        # Main event stream for all service events
        self.event_stream = kinesis.Stream(
            self, "EventStream",
            stream_name="tsa-analytics-events",
            shard_count=2,
            retention_period=core.Duration.days(7)
        )
        
        # Lead events stream
        self.lead_stream = kinesis.Stream(
            self, "LeadStream",
            stream_name="tsa-analytics-leads",
            shard_count=1,
            retention_period=core.Duration.days(7)
        )
        
        # User activity stream
        self.activity_stream = kinesis.Stream(
            self, "ActivityStream",
            stream_name="tsa-analytics-activity",
            shard_count=2,
            retention_period=core.Duration.days(7)
        )
        
    def _create_data_storage(self):
        """Create S3 buckets and data lake structure"""
        
        # Raw data lake bucket
        self.data_lake_bucket = s3.Bucket(
            self, "DataLake",
            bucket_name=f"tsa-analytics-datalake-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=core.RemovalPolicy.RETAIN,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="ArchiveOldData",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=core.Duration.days(30)
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=core.Duration.days(90)
                        )
                    ]
                )
            ]
        )
        
        # Processed data bucket
        self.processed_data_bucket = s3.Bucket(
            self, "ProcessedData",
            bucket_name=f"tsa-analytics-processed-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=core.RemovalPolicy.RETAIN
        )
        
        # Reports bucket
        self.reports_bucket = s3.Bucket(
            self, "Reports",
            bucket_name=f"tsa-analytics-reports-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=core.RemovalPolicy.RETAIN
        )
        
        # Create Kinesis Firehose delivery streams
        self._create_firehose_streams()
        
    def _create_firehose_streams(self):
        """Create Kinesis Firehose delivery streams to S3"""
        
        # Create IAM role for Firehose
        firehose_role = iam.Role(
            self, "FirehoseRole",
            assumed_by=iam.ServicePrincipal("firehose.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3FullAccess")
            ]
        )
        
        # Event stream delivery
        self.event_firehose = firehose.DeliveryStream(
            self, "EventFirehose",
            delivery_stream_name="tsa-analytics-events-delivery",
            source_stream=self.event_stream,
            destinations=[
                firehose.S3Destination(
                    bucket=self.data_lake_bucket,
                    prefix="events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
                    error_output_prefix="errors/events/",
                    buffering_interval=core.Duration.minutes(1),
                    buffering_size=core.Size.mebibytes(5),
                    compression_format=firehose.CompressionFormat.GZIP,
                    role=firehose_role
                )
            ]
        )
        
        # Lead stream delivery
        self.lead_firehose = firehose.DeliveryStream(
            self, "LeadFirehose",
            delivery_stream_name="tsa-analytics-leads-delivery",
            source_stream=self.lead_stream,
            destinations=[
                firehose.S3Destination(
                    bucket=self.data_lake_bucket,
                    prefix="leads/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
                    error_output_prefix="errors/leads/",
                    buffering_interval=core.Duration.minutes(5),
                    buffering_size=core.Size.mebibytes(5),
                    compression_format=firehose.CompressionFormat.GZIP,
                    role=firehose_role
                )
            ]
        )
        
        # Activity stream delivery
        self.activity_firehose = firehose.DeliveryStream(
            self, "ActivityFirehose",
            delivery_stream_name="tsa-analytics-activity-delivery",
            source_stream=self.activity_stream,
            destinations=[
                firehose.S3Destination(
                    bucket=self.data_lake_bucket,
                    prefix="activity/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
                    error_output_prefix="errors/activity/",
                    buffering_interval=core.Duration.minutes(1),
                    buffering_size=core.Size.mebibytes(5),
                    compression_format=firehose.CompressionFormat.GZIP,
                    role=firehose_role
                )
            ]
        )
        
    def _create_data_processing(self):
        """Create Glue catalog and Athena workspace for data processing"""
        
        # Glue database
        self.glue_database = glue.Database(
            self, "AnalyticsDatabase",
            database_name="tsa_analytics",
            description="TSA Coach analytics data catalog"
        )
        
        # Glue tables for partitioned data
        self._create_glue_tables()
        
        # Athena workgroup
        self.athena_workgroup = athena.WorkGroup(
            self, "AnalyticsWorkGroup",
            work_group_name="tsa-analytics",
            description="TSA Coach analytics queries",
            result_configuration_location=f"s3://{self.processed_data_bucket.bucket_name}/athena-results/"
        )
        
    def _create_glue_tables(self):
        """Create Glue tables for analytics data"""
        
        # Events table
        self.events_table = glue.Table(
            self, "EventsTable",
            database=self.glue_database,
            table_name="events",
            description="All service events",
            columns=[
                glue.Column(name="event_id", type=glue.Schema.STRING),
                glue.Column(name="event_type", type=glue.Schema.STRING),
                glue.Column(name="service", type=glue.Schema.STRING),
                glue.Column(name="user_id", type=glue.Schema.STRING),
                glue.Column(name="timestamp", type=glue.Schema.TIMESTAMP),
                glue.Column(name="properties", type=glue.Schema.STRING),
            ],
            partition_keys=[
                glue.Column(name="year", type=glue.Schema.STRING),
                glue.Column(name="month", type=glue.Schema.STRING),
                glue.Column(name="day", type=glue.Schema.STRING),
                glue.Column(name="hour", type=glue.Schema.STRING),
            ],
            data_format=glue.DataFormat.JSON,
            bucket=self.data_lake_bucket,
            s3_prefix="events/"
        )
        
        # Leads table
        self.leads_table = glue.Table(
            self, "LeadsTable",
            database=self.glue_database,
            table_name="leads",
            description="Lead tracking and attribution data",
            columns=[
                glue.Column(name="lead_id", type=glue.Schema.STRING),
                glue.Column(name="email", type=glue.Schema.STRING),
                glue.Column(name="lead_type", type=glue.Schema.STRING),
                glue.Column(name="status", type=glue.Schema.STRING),
                glue.Column(name="score", type=glue.Schema.INTEGER),
                glue.Column(name="source", type=glue.Schema.STRING),
                glue.Column(name="campaign", type=glue.Schema.STRING),
                glue.Column(name="created_at", type=glue.Schema.TIMESTAMP),
                glue.Column(name="converted_at", type=glue.Schema.TIMESTAMP),
                glue.Column(name="attribution", type=glue.Schema.STRING),
            ],
            partition_keys=[
                glue.Column(name="year", type=glue.Schema.STRING),
                glue.Column(name="month", type=glue.Schema.STRING),
                glue.Column(name="day", type=glue.Schema.STRING),
            ],
            data_format=glue.DataFormat.JSON,
            bucket=self.data_lake_bucket,
            s3_prefix="leads/"
        )
        
        # Activity table
        self.activity_table = glue.Table(
            self, "ActivityTable",
            database=self.glue_database,
            table_name="activity",
            description="User activity and engagement data",
            columns=[
                glue.Column(name="activity_id", type=glue.Schema.STRING),
                glue.Column(name="user_id", type=glue.Schema.STRING),
                glue.Column(name="activity_type", type=glue.Schema.STRING),
                glue.Column(name="page_url", type=glue.Schema.STRING),
                glue.Column(name="session_id", type=glue.Schema.STRING),
                glue.Column(name="timestamp", type=glue.Schema.TIMESTAMP),
                glue.Column(name="duration", type=glue.Schema.INTEGER),
                glue.Column(name="properties", type=glue.Schema.STRING),
            ],
            partition_keys=[
                glue.Column(name="year", type=glue.Schema.STRING),
                glue.Column(name="month", type=glue.Schema.STRING),
                glue.Column(name="day", type=glue.Schema.STRING),
            ],
            data_format=glue.DataFormat.JSON,
            bucket=self.data_lake_bucket,
            s3_prefix="activity/"
        )
        
    def _create_lambda_functions(self):
        """Create Lambda functions for analytics processing"""
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "environment": {
                "DATABASE_URL": self.shared_resources["database_url"],
                "DATA_LAKE_BUCKET": self.data_lake_bucket.bucket_name,
                "PROCESSED_DATA_BUCKET": self.processed_data_bucket.bucket_name,
                "REPORTS_BUCKET": self.reports_bucket.bucket_name,
                "EVENT_STREAM": self.event_stream.stream_name,
                "LEAD_STREAM": self.lead_stream.stream_name,
                "ACTIVITY_STREAM": self.activity_stream.stream_name,
                "GLUE_DATABASE": self.glue_database.database_name,
                "ATHENA_WORKGROUP": self.athena_workgroup.work_group_name,
                "LOG_LEVEL": "INFO"
            },
            "timeout": core.Duration.seconds(300),  # 5 minutes for data processing
            "memory_size": 1024
        }
        
        # Data ingestion function
        self.ingestion_function = lambda_.Function(
            self, "DataIngestionHandler",
            function_name="analytics-data-ingestion",
            code=lambda_.Code.from_asset("../tsa-analytics-backend/lambda_ingestion"),
            handler="ingestion_handler.lambda_handler",
            **lambda_config
        )
        
        # ETL processing function
        self.etl_function = lambda_.Function(
            self, "ETLHandler",
            function_name="analytics-etl-processor",
            code=lambda_.Code.from_asset("../tsa-analytics-backend/lambda_etl"),
            handler="etl_handler.lambda_handler",
            **lambda_config
        )
        
        # Report generation function
        self.reports_function = lambda_.Function(
            self, "ReportsHandler",
            function_name="analytics-reports-generator",
            code=lambda_.Code.from_asset("../tsa-analytics-backend/lambda_reports"),
            handler="reports_handler.lambda_handler",
            **lambda_config
        )
        
        # Real-time analytics function
        self.realtime_function = lambda_.Function(
            self, "RealtimeHandler",
            function_name="analytics-realtime-processor",
            code=lambda_.Code.from_asset("../tsa-analytics-backend/lambda_realtime"),
            handler="realtime_handler.lambda_handler",
            **lambda_config
        )
        
        # Dashboard API function
        self.dashboard_function = lambda_.Function(
            self, "DashboardHandler",
            function_name="analytics-dashboard-api",
            code=lambda_.Code.from_asset("../tsa-analytics-backend/lambda_dashboard"),
            handler="dashboard_handler.lambda_handler",
            **lambda_config
        )
        
        # Grant permissions to functions
        functions = [
            self.ingestion_function,
            self.etl_function,
            self.reports_function,
            self.realtime_function,
            self.dashboard_function
        ]
        
        for func in functions:
            # S3 permissions
            self.data_lake_bucket.grant_read_write(func)
            self.processed_data_bucket.grant_read_write(func)
            self.reports_bucket.grant_read_write(func)
            
            # Kinesis permissions
            self.event_stream.grant_read_write(func)
            self.lead_stream.grant_read_write(func)
            self.activity_stream.grant_read_write(func)
            
            # Glue and Athena permissions
            func.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "glue:GetTable",
                        "glue:GetTables",
                        "glue:GetPartitions",
                        "glue:BatchCreatePartition",
                        "athena:StartQueryExecution",
                        "athena:GetQueryExecution",
                        "athena:GetQueryResults",
                        "athena:GetWorkGroup"
                    ],
                    resources=["*"]
                )
            )
            
            # RDS permissions for data access
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
        
        # Configure Kinesis triggers for real-time processing
        self.realtime_function.add_event_source(
            lambda_.KinesisEventSource(
                self.event_stream,
                starting_position=lambda_.StartingPosition.LATEST,
                batch_size=100
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for analytics and dashboard APIs"""
        
        # Create log group for API Gateway
        log_group = logs.LogGroup(
            self, "AnalyticsAPILogs",
            log_group_name="/aws/apigateway/analytics",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "AnalyticsAPI",
            rest_api_name="Analytics API",
            description="API for TSA Analytics and Dashboards",
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
        dashboard_integration = apigateway.LambdaIntegration(self.dashboard_function)
        reports_integration = apigateway.LambdaIntegration(self.reports_function)
        ingestion_integration = apigateway.LambdaIntegration(self.ingestion_function)
        
        # Dashboard routes
        dashboard_resource = self.api.root.add_resource("dashboard")
        
        # Overall metrics
        metrics_resource = dashboard_resource.add_resource("metrics")
        metrics_resource.add_method("GET", dashboard_integration)
        
        # Service-specific metrics
        service_resource = dashboard_resource.add_resource("{service}")
        service_resource.add_method("GET", dashboard_integration)
        
        # Custom queries
        query_resource = dashboard_resource.add_resource("query")
        query_resource.add_method("POST", dashboard_integration)
        
        # Reports routes
        reports_resource = self.api.root.add_resource("reports")
        reports_resource.add_method("GET", reports_integration)
        reports_resource.add_method("POST", reports_integration)
        
        report_id_resource = reports_resource.add_resource("{report_id}")
        report_id_resource.add_method("GET", reports_integration)
        
        # Data ingestion routes (for external systems)
        ingest_resource = self.api.root.add_resource("ingest")
        
        events_resource = ingest_resource.add_resource("events")
        events_resource.add_method("POST", ingestion_integration)
        
        leads_resource = ingest_resource.add_resource("leads")
        leads_resource.add_method("POST", ingestion_integration)
        
        activity_resource = ingest_resource.add_resource("activity")
        activity_resource.add_method("POST", ingestion_integration)
        
        # Health check endpoint (no auth required)
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", dashboard_integration)
        
    def _create_automation_rules(self):
        """Create EventBridge rules for analytics automation"""
        
        # Daily ETL processing (4 AM daily)
        etl_rule = events.Rule(
            self, "DailyETL",
            rule_name="analytics-daily-etl",
            schedule=events.Schedule.cron(hour="4", minute="0"),
            description="Daily ETL processing and data transformation"
        )
        
        etl_rule.add_target(
            targets.LambdaFunction(self.etl_function)
        )
        
        # Weekly reports generation (Sunday 5 AM)
        reports_rule = events.Rule(
            self, "WeeklyReports",
            rule_name="analytics-weekly-reports",
            schedule=events.Schedule.cron(
                day_of_week="SUN",
                hour="5",
                minute="0"
            ),
            description="Generate weekly analytics reports"
        )
        
        reports_rule.add_target(
            targets.LambdaFunction(self.reports_function)
        )
        
        # Monthly comprehensive analysis (1st of month, 6 AM)
        monthly_rule = events.Rule(
            self, "MonthlyAnalysis",
            rule_name="analytics-monthly-analysis",
            schedule=events.Schedule.cron(
                day="1",
                hour="6",
                minute="0"
            ),
            description="Monthly comprehensive analytics analysis"
        )
        
        monthly_rule.add_target(
            targets.LambdaFunction(self.reports_function)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
        
    @property
    def stream_arns(self) -> Dict[str, str]:
        """Get Kinesis stream ARNs"""
        return {
            "events": self.event_stream.stream_arn,
            "leads": self.lead_stream.stream_arn,
            "activity": self.activity_stream.stream_arn
        }
        
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names"""
        return {
            "data_lake": self.data_lake_bucket.bucket_name,
            "processed_data": self.processed_data_bucket.bucket_name,
            "reports": self.reports_bucket.bucket_name
        } 