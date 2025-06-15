"""
Communication Service Stack
Handles all messaging and communication needs for the TSA platform

Features:
- SMS/Text messaging (Twilio, AWS SNS)
- Email automation and templates
- Push notifications for mobile apps
- WhatsApp Business API integration
- Calendar integration (Google/Outlook)
- Document sharing and notifications
"""

from aws_cdk import (
    core, aws_lambda as lambda_, aws_apigateway as apigw,
    aws_sns as sns, aws_sqs as sqs, aws_ses as ses,
    aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks,
    aws_dynamodb as dynamodb, aws_s3 as s3,
    aws_events as events, aws_events_targets as targets,
    aws_secretsmanager as secrets, aws_iam as iam
)
from typing import Dict, Any


class CommunicationService(core.Construct):
    """Communication Service for messaging, notifications, and integrations"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = shared_resources["stage"]
        
        # Create communication infrastructure
        self._create_messaging_tables()
        self._create_notification_infrastructure()
        self._create_email_automation()
        self._create_sms_service()
        self._create_communication_workflows()
        self._create_api_gateway()
        self._create_integration_handlers()
        
    def _create_messaging_tables(self):
        """Create DynamoDB tables for communication tracking"""
        
        # Message templates table
        self.message_templates = dynamodb.Table(
            self, "MessageTemplates",
            table_name=f"tsa-communication-templates-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="template_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Message history table
        self.message_history = dynamodb.Table(
            self, "MessageHistory", 
            table_name=f"tsa-communication-history-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="message_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for recipient lookup
        self.message_history.add_global_secondary_index(
            index_name="RecipientIndex",
            partition_key=dynamodb.Attribute(
                name="recipient_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="sent_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Communication preferences table
        self.preferences = dynamodb.Table(
            self, "CommunicationPreferences",
            table_name=f"tsa-communication-preferences-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="user_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
    def _create_notification_infrastructure(self):
        """Create SNS topics and SQS queues for notifications"""
        
        # Main notification topic
        self.notification_topic = sns.Topic(
            self, "NotificationTopic",
            topic_name=f"tsa-notifications-{self.stage}",
            display_name="TSA Coach Notifications"
        )
        
        # SMS queue
        self.sms_queue = sqs.Queue(
            self, "SMSQueue",
            queue_name=f"tsa-sms-queue-{self.stage}",
            visibility_timeout=core.Duration.minutes(5),
            retention_period=core.Duration.days(14)
        )
        
        # Email queue
        self.email_queue = sqs.Queue(
            self, "EmailQueue",
            queue_name=f"tsa-email-queue-{self.stage}",
            visibility_timeout=core.Duration.minutes(10),
            retention_period=core.Duration.days(14)
        )
        
        # Push notification queue
        self.push_queue = sqs.Queue(
            self, "PushQueue",
            queue_name=f"tsa-push-queue-{self.stage}",
            visibility_timeout=core.Duration.minutes(2),
            retention_period=core.Duration.days(7)
        )
        
        # DLQ for failed messages
        self.dlq = sqs.Queue(
            self, "CommunicationDLQ",
            queue_name=f"tsa-communication-dlq-{self.stage}",
            retention_period=core.Duration.days(14)
        )
        
    def _create_email_automation(self):
        """Create email automation infrastructure"""
        
        # Email templates S3 bucket
        self.email_templates_bucket = s3.Bucket(
            self, "EmailTemplates",
            bucket_name=f"tsa-email-templates-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False
        )
        
        # Email automation Lambda
        self.email_handler = lambda_.Function(
            self, "EmailHandler",
            function_name=f"tsa-communication-email-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="email_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-communication-backend/lambda_email"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "MESSAGE_HISTORY_TABLE": self.message_history.table_name,
                "TEMPLATES_TABLE": self.message_templates.table_name,
                "TEMPLATES_BUCKET": self.email_templates_bucket.bucket_name,
                "NOTIFICATION_TOPIC_ARN": self.notification_topic.topic_arn
            }
        )
        
        # Grant permissions
        self.message_history.grant_read_write_data(self.email_handler)
        self.message_templates.grant_read_data(self.email_handler)
        self.email_templates_bucket.grant_read(self.email_handler)
        self.notification_topic.grant_publish(self.email_handler)
        
        # SES permissions
        self.email_handler.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "ses:SendEmail",
                    "ses:SendRawEmail",
                    "ses:SendTemplatedEmail"
                ],
                resources=["*"]
            )
        )
        
    def _create_sms_service(self):
        """Create SMS/text messaging service"""
        
        # Store Twilio credentials in Secrets Manager
        self.twilio_secret = secrets.Secret(
            self, "TwilioCredentials",
            secret_name=f"tsa/communication/twilio/{self.stage}",
            description="Twilio API credentials for SMS",
            generate_secret_string=secrets.SecretStringGenerator(
                secret_string_template='{"account_sid": "placeholder"}',
                generate_string_key="auth_token",
                exclude_characters='"@/\\'
            )
        )
        
        # SMS handler Lambda
        self.sms_handler = lambda_.Function(
            self, "SMSHandler",
            function_name=f"tsa-communication-sms-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="sms_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-communication-backend/lambda_sms"),
            timeout=core.Duration.minutes(3),
            environment={
                "STAGE": self.stage,
                "MESSAGE_HISTORY_TABLE": self.message_history.table_name,
                "TEMPLATES_TABLE": self.message_templates.table_name,
                "TWILIO_SECRET_ARN": self.twilio_secret.secret_arn,
                "NOTIFICATION_TOPIC_ARN": self.notification_topic.topic_arn
            }
        )
        
        # Grant permissions
        self.message_history.grant_read_write_data(self.sms_handler)
        self.message_templates.grant_read_data(self.sms_handler)
        self.twilio_secret.grant_read(self.sms_handler)
        self.notification_topic.grant_publish(self.sms_handler)
        
    def _create_communication_workflows(self):
        """Create Step Functions for complex communication workflows"""
        
        # Enrollment sequence workflow
        enrollment_sequence = sfn.StateMachine(
            self, "EnrollmentSequence",
            state_machine_name=f"tsa-enrollment-sequence-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "SendWelcomeEmail",
                    lambda_function=self.email_handler,
                    payload=sfn.TaskInput.from_object({
                        "template": "welcome_email",
                        "trigger": "enrollment_started"
                    })
                )
                .next(sfn.Wait(
                    self, "WaitOneDay",
                    time=sfn.WaitTime.duration(core.Duration.days(1))
                ))
                .next(tasks.LambdaInvoke(
                    self, "SendFollowUpEmail",
                    lambda_function=self.email_handler,
                    payload=sfn.TaskInput.from_object({
                        "template": "enrollment_followup",
                        "trigger": "day_1_followup"
                    })
                ))
            )
        )
        
        # Reminder sequence workflow
        reminder_sequence = sfn.StateMachine(
            self, "ReminderSequence",
            state_machine_name=f"tsa-reminder-sequence-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "CheckEventReminder",
                    lambda_function=self.email_handler,
                    payload=sfn.TaskInput.from_object({
                        "template": "event_reminder",
                        "trigger": "event_reminder_check"
                    })
                )
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for communication service"""
        
        self.api = apigw.RestApi(
            self, "CommunicationAPI",
            rest_api_name=f"tsa-communication-api-{self.stage}",
            description="TSA Communication Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create Lambda integrations
        email_integration = apigw.LambdaIntegration(self.email_handler)
        sms_integration = apigw.LambdaIntegration(self.sms_handler)
        
        # Email endpoints
        email_resource = self.api.root.add_resource("email")
        email_resource.add_method("POST", email_integration)
        
        templates_resource = email_resource.add_resource("templates")
        templates_resource.add_method("GET", email_integration)
        templates_resource.add_method("POST", email_integration)
        
        # SMS endpoints
        sms_resource = self.api.root.add_resource("sms")
        sms_resource.add_method("POST", sms_integration)
        
        # Bulk messaging endpoints
        bulk_resource = self.api.root.add_resource("bulk")
        bulk_resource.add_method("POST", email_integration)
        
        # Message history endpoints
        history_resource = self.api.root.add_resource("history")
        history_resource.add_method("GET", email_integration)
        
        user_history = history_resource.add_resource("{user_id}")
        user_history.add_method("GET", email_integration)
        
    def _create_integration_handlers(self):
        """Create handlers for third-party integrations"""
        
        # Calendar integration handler
        self.calendar_handler = lambda_.Function(
            self, "CalendarHandler",
            function_name=f"tsa-communication-calendar-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="calendar_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-communication-backend/lambda_calendar"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "MESSAGE_HISTORY_TABLE": self.message_history.table_name
            }
        )
        
        # WhatsApp Business API handler
        self.whatsapp_handler = lambda_.Function(
            self, "WhatsAppHandler", 
            function_name=f"tsa-communication-whatsapp-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="whatsapp_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-communication-backend/lambda_whatsapp"),
            timeout=core.Duration.minutes(3),
            environment={
                "STAGE": self.stage,
                "MESSAGE_HISTORY_TABLE": self.message_history.table_name
            }
        )
        
        # Push notification handler  
        self.push_handler = lambda_.Function(
            self, "PushHandler",
            function_name=f"tsa-communication-push-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="push_handler.lambda_handler", 
            code=lambda_.Code.from_asset("../tsa-communication-backend/lambda_push"),
            timeout=core.Duration.minutes(2),
            environment={
                "STAGE": self.stage,
                "MESSAGE_HISTORY_TABLE": self.message_history.table_name
            }
        )
        
        # Grant table permissions
        for handler in [self.calendar_handler, self.whatsapp_handler, self.push_handler]:
            self.message_history.grant_read_write_data(handler)
            
        # Add integration endpoints to API
        integrations_resource = self.api.root.add_resource("integrations")
        
        calendar_resource = integrations_resource.add_resource("calendar")
        calendar_resource.add_method("POST", apigw.LambdaIntegration(self.calendar_handler))
        
        whatsapp_resource = integrations_resource.add_resource("whatsapp") 
        whatsapp_resource.add_method("POST", apigw.LambdaIntegration(self.whatsapp_handler))
        
        push_resource = integrations_resource.add_resource("push")
        push_resource.add_method("POST", apigw.LambdaIntegration(self.push_handler))
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
    
    @property
    def topic_arns(self) -> Dict[str, str]:
        """Get SNS topic ARNs for cross-service publishing"""
        return {
            "notifications": self.notification_topic.topic_arn
        }
    
    @property
    def queue_urls(self) -> Dict[str, str]:
        """Get SQS queue URLs for message processing"""
        return {
            "sms": self.sms_queue.queue_url,
            "email": self.email_queue.queue_url,
            "push": self.push_queue.queue_url,
            "dlq": self.dlq.queue_url
        } 