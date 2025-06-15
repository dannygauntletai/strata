"""
Payment Service Stack
Handles all payment processing, billing, and financial management for TSA platform

Features:
- Stripe integration for payment processing
- Subscription and recurring billing management
- Invoice generation and management
- Payment plan handling
- Financial reporting and analytics
- Compliance and audit trails
"""

from aws_cdk import (
    core, aws_lambda as lambda_, aws_apigateway as apigw,
    aws_dynamodb as dynamodb, aws_s3 as s3, aws_sns as sns,
    aws_sqs as sqs, aws_events as events, aws_events_targets as targets,
    aws_secretsmanager as secrets, aws_iam as iam,
    aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks
)
from typing import Dict, Any


class PaymentService(core.Construct):
    """Payment Service for billing, subscriptions, and financial management"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = shared_resources["stage"]
        
        # Create payment infrastructure
        self._create_payment_tables()
        self._create_notification_infrastructure()
        self._create_document_storage()
        self._create_payment_handlers()
        self._create_billing_workflows()
        self._create_api_gateway()
        self._create_webhook_handlers()
        
    def _create_payment_tables(self):
        """Create DynamoDB tables for payment and billing data"""
        
        # Payment transactions table
        self.transactions = dynamodb.Table(
            self, "PaymentTransactions",
            table_name=f"tsa-payment-transactions-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="transaction_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Add GSI for customer lookup
        self.transactions.add_global_secondary_index(
            index_name="CustomerIndex",
            partition_key=dynamodb.Attribute(
                name="customer_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for date range queries
        self.transactions.add_global_secondary_index(
            index_name="DateIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Subscriptions table
        self.subscriptions = dynamodb.Table(
            self, "Subscriptions",
            table_name=f"tsa-payment-subscriptions-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="subscription_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for customer subscriptions
        self.subscriptions.add_global_secondary_index(
            index_name="CustomerIndex",
            partition_key=dynamodb.Attribute(
                name="customer_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Payment plans table
        self.payment_plans = dynamodb.Table(
            self, "PaymentPlans",
            table_name=f"tsa-payment-plans-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="plan_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
        # Invoices table
        self.invoices = dynamodb.Table(
            self, "Invoices",
            table_name=f"tsa-payment-invoices-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="invoice_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for customer invoices
        self.invoices.add_global_secondary_index(
            index_name="CustomerIndex",
            partition_key=dynamodb.Attribute(
                name="customer_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="due_date",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Financial analytics table
        self.financial_analytics = dynamodb.Table(
            self, "FinancialAnalytics",
            table_name=f"tsa-payment-analytics-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="analytics_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
    def _create_notification_infrastructure(self):
        """Create SNS topics and SQS queues for payment notifications"""
        
        # Payment notifications topic
        self.payment_topic = sns.Topic(
            self, "PaymentNotifications",
            topic_name=f"tsa-payment-notifications-{self.stage}",
            display_name="TSA Payment Notifications"
        )
        
        # Payment processing queue
        self.payment_queue = sqs.Queue(
            self, "PaymentQueue",
            queue_name=f"tsa-payment-processing-{self.stage}",
            visibility_timeout=core.Duration.minutes(10),
            retention_period=core.Duration.days(14)
        )
        
        # Failed payment queue
        self.failed_payment_queue = sqs.Queue(
            self, "FailedPaymentQueue",
            queue_name=f"tsa-failed-payments-{self.stage}",
            visibility_timeout=core.Duration.minutes(15),
            retention_period=core.Duration.days(14)
        )
        
        # Billing reminders queue
        self.billing_queue = sqs.Queue(
            self, "BillingQueue",
            queue_name=f"tsa-billing-reminders-{self.stage}",
            visibility_timeout=core.Duration.minutes(5),
            retention_period=core.Duration.days(7)
        )
        
    def _create_document_storage(self):
        """Create S3 buckets for financial documents"""
        
        # Invoices and receipts bucket
        self.invoices_bucket = s3.Bucket(
            self, "InvoicesBucket",
            bucket_name=f"tsa-payment-invoices-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="ArchiveOldInvoices",
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
        
        # Financial reports bucket
        self.reports_bucket = s3.Bucket(
            self, "ReportsBucket",
            bucket_name=f"tsa-payment-reports-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False
        )
        
    def _create_payment_handlers(self):
        """Create Lambda functions for payment processing"""
        
        # Store Stripe credentials in Secrets Manager
        self.stripe_secret = secrets.Secret(
            self, "StripeCredentials",
            secret_name=f"tsa/payment/stripe/{self.stage}",
            description="Stripe API credentials for payment processing",
            generate_secret_string=secrets.SecretStringGenerator(
                secret_string_template='{"publishable_key": "pk_test_placeholder"}',
                generate_string_key="secret_key",
                exclude_characters='"@/\\'
            )
        )
        
        # Payment processing handler
        self.payment_handler = lambda_.Function(
            self, "PaymentHandler",
            function_name=f"tsa-payment-processor-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="payment_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-payment-backend/lambda_payment"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "TRANSACTIONS_TABLE": self.transactions.table_name,
                "SUBSCRIPTIONS_TABLE": self.subscriptions.table_name,
                "STRIPE_SECRET_ARN": self.stripe_secret.secret_arn,
                "PAYMENT_TOPIC_ARN": self.payment_topic.topic_arn
            }
        )
        
        # Subscription management handler
        self.subscription_handler = lambda_.Function(
            self, "SubscriptionHandler",
            function_name=f"tsa-subscription-manager-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="subscription_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-payment-backend/lambda_subscription"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "SUBSCRIPTIONS_TABLE": self.subscriptions.table_name,
                "PAYMENT_PLANS_TABLE": self.payment_plans.table_name,
                "STRIPE_SECRET_ARN": self.stripe_secret.secret_arn
            }
        )
        
        # Invoice generation handler
        self.invoice_handler = lambda_.Function(
            self, "InvoiceHandler",
            function_name=f"tsa-invoice-generator-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="invoice_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-payment-backend/lambda_invoice"),
            timeout=core.Duration.minutes(10),
            environment={
                "STAGE": self.stage,
                "INVOICES_TABLE": self.invoices.table_name,
                "TRANSACTIONS_TABLE": self.transactions.table_name,
                "INVOICES_BUCKET": self.invoices_bucket.bucket_name
            }
        )
        
        # Financial reporting handler
        self.reporting_handler = lambda_.Function(
            self, "ReportingHandler",
            function_name=f"tsa-financial-reporting-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="reporting_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-payment-backend/lambda_reporting"),
            timeout=core.Duration.minutes(15),
            environment={
                "STAGE": self.stage,
                "TRANSACTIONS_TABLE": self.transactions.table_name,
                "ANALYTICS_TABLE": self.financial_analytics.table_name,
                "REPORTS_BUCKET": self.reports_bucket.bucket_name
            }
        )
        
        # Grant permissions
        handlers = [
            self.payment_handler, self.subscription_handler, 
            self.invoice_handler, self.reporting_handler
        ]
        
        for handler in handlers:
            self.stripe_secret.grant_read(handler)
            self.payment_topic.grant_publish(handler)
            
        # Table permissions
        self.transactions.grant_read_write_data(self.payment_handler)
        self.transactions.grant_read_write_data(self.invoice_handler)
        self.transactions.grant_read_data(self.reporting_handler)
        
        self.subscriptions.grant_read_write_data(self.payment_handler)
        self.subscriptions.grant_read_write_data(self.subscription_handler)
        
        self.payment_plans.grant_read_data(self.subscription_handler)
        self.invoices.grant_read_write_data(self.invoice_handler)
        self.financial_analytics.grant_read_write_data(self.reporting_handler)
        
        # S3 permissions
        self.invoices_bucket.grant_read_write(self.invoice_handler)
        self.reports_bucket.grant_read_write(self.reporting_handler)
        
    def _create_billing_workflows(self):
        """Create Step Functions for complex billing workflows"""
        
        # Failed payment retry workflow
        failed_payment_workflow = sfn.StateMachine(
            self, "FailedPaymentWorkflow",
            state_machine_name=f"tsa-failed-payment-retry-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "NotifyFailedPayment",
                    lambda_function=self.payment_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "notify_failed_payment"
                    })
                )
                .next(sfn.Wait(
                    self, "WaitBeforeRetry",
                    time=sfn.WaitTime.duration(core.Duration.days(3))
                ))
                .next(tasks.LambdaInvoke(
                    self, "RetryPayment",
                    lambda_function=self.payment_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "retry_payment"
                    })
                ))
            )
        )
        
        # Monthly billing workflow
        monthly_billing_workflow = sfn.StateMachine(
            self, "MonthlyBillingWorkflow",
            state_machine_name=f"tsa-monthly-billing-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "GenerateMonthlyInvoices",
                    lambda_function=self.invoice_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_monthly_invoices"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "ProcessSubscriptionBilling",
                    lambda_function=self.subscription_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "process_monthly_billing"
                    })
                ))
                .next(tasks.LambdaInvoke(
                    self, "GenerateFinancialReport",
                    lambda_function=self.reporting_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_monthly_report"
                    })
                ))
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for payment service"""
        
        self.api = apigw.RestApi(
            self, "PaymentAPI",
            rest_api_name=f"tsa-payment-api-{self.stage}",
            description="TSA Payment Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create Lambda integrations
        payment_integration = apigw.LambdaIntegration(self.payment_handler)
        subscription_integration = apigw.LambdaIntegration(self.subscription_handler)
        invoice_integration = apigw.LambdaIntegration(self.invoice_handler)
        reporting_integration = apigw.LambdaIntegration(self.reporting_handler)
        
        # Payment endpoints
        payments_resource = self.api.root.add_resource("payments")
        payments_resource.add_method("POST", payment_integration)
        payments_resource.add_method("GET", payment_integration)
        
        payment_id_resource = payments_resource.add_resource("{payment_id}")
        payment_id_resource.add_method("GET", payment_integration)
        payment_id_resource.add_method("PUT", payment_integration)
        
        # Subscription endpoints
        subscriptions_resource = self.api.root.add_resource("subscriptions")
        subscriptions_resource.add_method("POST", subscription_integration)
        subscriptions_resource.add_method("GET", subscription_integration)
        
        subscription_id_resource = subscriptions_resource.add_resource("{subscription_id}")
        subscription_id_resource.add_method("GET", subscription_integration)
        subscription_id_resource.add_method("PUT", subscription_integration)
        subscription_id_resource.add_method("DELETE", subscription_integration)
        
        # Invoice endpoints
        invoices_resource = self.api.root.add_resource("invoices")
        invoices_resource.add_method("POST", invoice_integration)
        invoices_resource.add_method("GET", invoice_integration)
        
        invoice_id_resource = invoices_resource.add_resource("{invoice_id}")
        invoice_id_resource.add_method("GET", invoice_integration)
        
        # Reporting endpoints
        reports_resource = self.api.root.add_resource("reports")
        reports_resource.add_method("GET", reporting_integration)
        
        financial_resource = reports_resource.add_resource("financial")
        financial_resource.add_method("GET", reporting_integration)
        
        # Customer endpoints
        customers_resource = self.api.root.add_resource("customers")
        customer_payments = customers_resource.add_resource("{customer_id}").add_resource("payments")
        customer_payments.add_method("GET", payment_integration)
        
        customer_subscriptions = customers_resource.add_resource("{customer_id}").add_resource("subscriptions")
        customer_subscriptions.add_method("GET", subscription_integration)
        
    def _create_webhook_handlers(self):
        """Create webhook handlers for Stripe and other payment providers"""
        
        # Stripe webhook handler
        self.stripe_webhook_handler = lambda_.Function(
            self, "StripeWebhookHandler",
            function_name=f"tsa-stripe-webhook-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="stripe_webhook_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-payment-backend/lambda_webhook"),
            timeout=core.Duration.minutes(3),
            environment={
                "STAGE": self.stage,
                "TRANSACTIONS_TABLE": self.transactions.table_name,
                "SUBSCRIPTIONS_TABLE": self.subscriptions.table_name,
                "STRIPE_SECRET_ARN": self.stripe_secret.secret_arn,
                "PAYMENT_TOPIC_ARN": self.payment_topic.topic_arn
            }
        )
        
        # Grant permissions
        self.transactions.grant_read_write_data(self.stripe_webhook_handler)
        self.subscriptions.grant_read_write_data(self.stripe_webhook_handler)
        self.stripe_secret.grant_read(self.stripe_webhook_handler)
        self.payment_topic.grant_publish(self.stripe_webhook_handler)
        
        # Add webhook endpoint to API
        webhooks_resource = self.api.root.add_resource("webhooks")
        stripe_resource = webhooks_resource.add_resource("stripe")
        stripe_resource.add_method("POST", apigw.LambdaIntegration(self.stripe_webhook_handler))
        
        # Add EventBridge rules for automated billing
        monthly_billing_rule = events.Rule(
            self, "MonthlyBillingRule",
            rule_name=f"tsa-monthly-billing-{self.stage}",
            schedule=events.Schedule.cron(day="1", hour="9", minute="0"),  # 1st of month, 9 AM
            description="Trigger monthly billing process"
        )
        
        monthly_billing_rule.add_target(
            targets.LambdaFunction(self.subscription_handler)
        )
        
        # Daily payment retry rule
        retry_rule = events.Rule(
            self, "PaymentRetryRule", 
            rule_name=f"tsa-payment-retry-{self.stage}",
            schedule=events.Schedule.cron(hour="10", minute="0"),  # Daily at 10 AM
            description="Check for failed payments to retry"
        )
        
        retry_rule.add_target(
            targets.LambdaFunction(self.payment_handler)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
    
    @property
    def topic_arns(self) -> Dict[str, str]:
        """Get SNS topic ARNs for payment notifications"""
        return {
            "payments": self.payment_topic.topic_arn
        }
    
    @property
    def queue_urls(self) -> Dict[str, str]:
        """Get SQS queue URLs for payment processing"""
        return {
            "payments": self.payment_queue.queue_url,
            "failed_payments": self.failed_payment_queue.queue_url,
            "billing": self.billing_queue.queue_url
        }
    
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names for financial documents"""
        return {
            "invoices": self.invoices_bucket.bucket_name,
            "reports": self.reports_bucket.bucket_name
        } 