"""
Document Management Service Stack
Handles document storage, e-signatures, compliance tracking, and audit trails

Features:
- Document upload/storage with versioning
- DocuSign/HelloSign integration for e-signatures
- Document templating and generation
- Compliance document tracking (FERPA, enrollment contracts)
- Parent/student document portals
- Complete audit trail for legal documents
- Document workflow automation
"""

from aws_cdk import (
    core, aws_lambda as lambda_, aws_apigateway as apigw,
    aws_dynamodb as dynamodb, aws_s3 as s3, aws_sns as sns,
    aws_sqs as sqs, aws_events as events, aws_events_targets as targets,
    aws_secretsmanager as secrets, aws_iam as iam,
    aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks
)
from typing import Dict, Any


class DocumentManagementService(core.Construct):
    """Document Management Service for legal documents, e-signatures, and compliance"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = shared_resources["stage"]
        
        # Create document management infrastructure
        self._create_document_tables()
        self._create_document_storage()
        self._create_notification_infrastructure()
        self._create_document_handlers()
        self._create_signature_workflows()
        self._create_api_gateway()
        self._create_compliance_automation()
        
    def _create_document_tables(self):
        """Create DynamoDB tables for document tracking and compliance"""
        
        # Document metadata table
        self.documents = dynamodb.Table(
            self, "Documents",
            table_name=f"tsa-document-metadata-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="document_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Add GSI for user document lookup
        self.documents.add_global_secondary_index(
            index_name="UserIndex",
            partition_key=dynamodb.Attribute(
                name="user_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for document type and status
        self.documents.add_global_secondary_index(
            index_name="TypeStatusIndex",
            partition_key=dynamodb.Attribute(
                name="document_type",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # E-signature tracking table
        self.signatures = dynamodb.Table(
            self, "Signatures",
            table_name=f"tsa-document-signatures-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="signature_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for document signatures
        self.signatures.add_global_secondary_index(
            index_name="DocumentIndex",
            partition_key=dynamodb.Attribute(
                name="document_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="signed_at",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Document templates table
        self.templates = dynamodb.Table(
            self, "DocumentTemplates",
            table_name=f"tsa-document-templates-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="template_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
        # Compliance tracking table
        self.compliance = dynamodb.Table(
            self, "ComplianceTracking",
            table_name=f"tsa-compliance-tracking-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="compliance_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for student compliance
        self.compliance.add_global_secondary_index(
            index_name="StudentIndex",
            partition_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="requirement_type",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Audit trail table
        self.audit_trail = dynamodb.Table(
            self, "AuditTrail",
            table_name=f"tsa-document-audit-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="audit_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
    def _create_document_storage(self):
        """Create S3 buckets for document storage with security and compliance"""
        
        # Documents bucket with encryption and lifecycle
        self.documents_bucket = s3.Bucket(
            self, "DocumentsBucket",
            bucket_name=f"tsa-documents-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.KMS_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="ComplianceArchival",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=core.Duration.days(180)
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=core.Duration.days(2555)  # 7 years for FERPA
                        )
                    ]
                )
            ]
        )
        
        # Templates bucket
        self.templates_bucket = s3.Bucket(
            self, "TemplatesBucket",
            bucket_name=f"tsa-document-templates-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False
        )
        
        # Processed documents bucket (PDFs, signed docs)
        self.processed_bucket = s3.Bucket(
            self, "ProcessedDocuments",
            bucket_name=f"tsa-processed-docs-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.KMS_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )
        
    def _create_notification_infrastructure(self):
        """Create SNS topics and SQS queues for document notifications"""
        
        # Document notifications topic
        self.document_topic = sns.Topic(
            self, "DocumentNotifications",
            topic_name=f"tsa-document-notifications-{self.stage}",
            display_name="TSA Document Notifications"
        )
        
        # Document processing queue
        self.processing_queue = sqs.Queue(
            self, "DocumentProcessingQueue",
            queue_name=f"tsa-document-processing-{self.stage}",
            visibility_timeout=core.Duration.minutes(15),
            retention_period=core.Duration.days(14)
        )
        
        # Signature reminder queue
        self.signature_reminders_queue = sqs.Queue(
            self, "SignatureRemindersQueue",
            queue_name=f"tsa-signature-reminders-{self.stage}",
            visibility_timeout=core.Duration.minutes(5),
            retention_period=core.Duration.days(14)
        )
        
        # Compliance alerts queue
        self.compliance_queue = sqs.Queue(
            self, "ComplianceAlertsQueue",
            queue_name=f"tsa-compliance-alerts-{self.stage}",
            visibility_timeout=core.Duration.minutes(10),
            retention_period=core.Duration.days(14)
        )
        
    def _create_document_handlers(self):
        """Create Lambda functions for document management"""
        
        # DocuSign/HelloSign credentials
        self.docusign_secret = secrets.Secret(
            self, "DocuSignCredentials",
            secret_name=f"tsa/documents/docusign/{self.stage}",
            description="DocuSign API credentials for e-signatures",
            generate_secret_string=secrets.SecretStringGenerator(
                secret_string_template='{"integration_key": "placeholder"}',
                generate_string_key="secret_key",
                exclude_characters='"@/\\'
            )
        )
        
        # Document upload and processing handler
        self.document_handler = lambda_.Function(
            self, "DocumentHandler",
            function_name=f"tsa-document-processor-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="document_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-document-backend/lambda_document"),
            timeout=core.Duration.minutes(10),
            memory_size=1024,  # For PDF processing
            environment={
                "STAGE": self.stage,
                "DOCUMENTS_TABLE": self.documents.table_name,
                "AUDIT_TABLE": self.audit_trail.table_name,
                "DOCUMENTS_BUCKET": self.documents_bucket.bucket_name,
                "PROCESSED_BUCKET": self.processed_bucket.bucket_name,
                "NOTIFICATION_TOPIC_ARN": self.document_topic.topic_arn
            }
        )
        
        # E-signature handler (DocuSign integration)
        self.signature_handler = lambda_.Function(
            self, "SignatureHandler",
            function_name=f"tsa-signature-processor-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="signature_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-document-backend/lambda_signature"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "SIGNATURES_TABLE": self.signatures.table_name,
                "DOCUMENTS_TABLE": self.documents.table_name,
                "DOCUSIGN_SECRET_ARN": self.docusign_secret.secret_arn,
                "NOTIFICATION_TOPIC_ARN": self.document_topic.topic_arn
            }
        )
        
        # Template generation handler
        self.template_handler = lambda_.Function(
            self, "TemplateHandler",
            function_name=f"tsa-template-generator-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="template_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-document-backend/lambda_template"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "TEMPLATES_TABLE": self.templates.table_name,
                "TEMPLATES_BUCKET": self.templates_bucket.bucket_name,
                "DOCUMENTS_BUCKET": self.documents_bucket.bucket_name
            }
        )
        
        # Compliance tracking handler
        self.compliance_handler = lambda_.Function(
            self, "ComplianceHandler",
            function_name=f"tsa-compliance-tracker-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="compliance_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-document-backend/lambda_compliance"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "COMPLIANCE_TABLE": self.compliance.table_name,
                "DOCUMENTS_TABLE": self.documents.table_name,
                "AUDIT_TABLE": self.audit_trail.table_name,
                "NOTIFICATION_TOPIC_ARN": self.document_topic.topic_arn
            }
        )
        
        # Grant permissions
        handlers = [
            self.document_handler, self.signature_handler,
            self.template_handler, self.compliance_handler
        ]
        
        for handler in handlers:
            self.document_topic.grant_publish(handler)
            
        # Table permissions
        self.documents.grant_read_write_data(self.document_handler)
        self.documents.grant_read_write_data(self.signature_handler)
        self.documents.grant_read_data(self.compliance_handler)
        
        self.signatures.grant_read_write_data(self.signature_handler)
        self.templates.grant_read_write_data(self.template_handler)
        self.compliance.grant_read_write_data(self.compliance_handler)
        self.audit_trail.grant_read_write_data(self.document_handler)
        self.audit_trail.grant_read_write_data(self.compliance_handler)
        
        # S3 permissions
        self.documents_bucket.grant_read_write(self.document_handler)
        self.processed_bucket.grant_read_write(self.document_handler)
        self.templates_bucket.grant_read_write(self.template_handler)
        self.documents_bucket.grant_read_write(self.template_handler)
        
        # DocuSign secret permissions
        self.docusign_secret.grant_read(self.signature_handler)
        
    def _create_signature_workflows(self):
        """Create Step Functions for document signature workflows"""
        
        # Enrollment document workflow
        enrollment_workflow = sfn.StateMachine(
            self, "EnrollmentDocumentWorkflow",
            state_machine_name=f"tsa-enrollment-documents-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "GenerateEnrollmentContract",
                    lambda_function=self.template_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_enrollment_contract"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "SendForSignature",
                    lambda_function=self.signature_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "send_for_signature"
                    })
                ))
                .next(sfn.Wait(
                    self, "WaitForSignature",
                    time=sfn.WaitTime.duration(core.Duration.hours(1))
                ))
                .next(tasks.LambdaInvoke(
                    self, "CheckSignatureStatus",
                    lambda_function=self.signature_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "check_signature_status"
                    })
                ))
            )
        )
        
        # Compliance document workflow
        compliance_workflow = sfn.StateMachine(
            self, "ComplianceDocumentWorkflow",
            state_machine_name=f"tsa-compliance-documents-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "CheckComplianceRequirements",
                    lambda_function=self.compliance_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "check_requirements"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "GenerateComplianceDocuments",
                    lambda_function=self.template_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_compliance_docs"
                    })
                ))
                .next(tasks.LambdaInvoke(
                    self, "TrackCompliance",
                    lambda_function=self.compliance_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "track_compliance"
                    })
                ))
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for document management service"""
        
        self.api = apigw.RestApi(
            self, "DocumentAPI",
            rest_api_name=f"tsa-document-api-{self.stage}",
            description="TSA Document Management Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create Lambda integrations
        document_integration = apigw.LambdaIntegration(self.document_handler)
        signature_integration = apigw.LambdaIntegration(self.signature_handler)
        template_integration = apigw.LambdaIntegration(self.template_handler)
        compliance_integration = apigw.LambdaIntegration(self.compliance_handler)
        
        # Document endpoints
        documents_resource = self.api.root.add_resource("documents")
        documents_resource.add_method("POST", document_integration)  # Upload
        documents_resource.add_method("GET", document_integration)   # List
        
        document_id_resource = documents_resource.add_resource("{document_id}")
        document_id_resource.add_method("GET", document_integration)    # Download
        document_id_resource.add_method("PUT", document_integration)    # Update
        document_id_resource.add_method("DELETE", document_integration) # Delete
        
        # E-signature endpoints
        signatures_resource = self.api.root.add_resource("signatures")
        signatures_resource.add_method("POST", signature_integration)  # Request signature
        signatures_resource.add_method("GET", signature_integration)   # Check status
        
        signature_id_resource = signatures_resource.add_resource("{signature_id}")
        signature_id_resource.add_method("GET", signature_integration)
        signature_id_resource.add_method("PUT", signature_integration)  # Update status
        
        # Template endpoints
        templates_resource = self.api.root.add_resource("templates")
        templates_resource.add_method("GET", template_integration)
        templates_resource.add_method("POST", template_integration)
        
        template_id_resource = templates_resource.add_resource("{template_id}")
        template_id_resource.add_method("GET", template_integration)
        template_id_resource.add_method("PUT", template_integration)
        
        generate_resource = template_id_resource.add_resource("generate")
        generate_resource.add_method("POST", template_integration)
        
        # Compliance endpoints
        compliance_resource = self.api.root.add_resource("compliance")
        compliance_resource.add_method("GET", compliance_integration)
        compliance_resource.add_method("POST", compliance_integration)
        
        student_compliance = compliance_resource.add_resource("student").add_resource("{student_id}")
        student_compliance.add_method("GET", compliance_integration)
        
        # Audit endpoints
        audit_resource = self.api.root.add_resource("audit")
        audit_resource.add_method("GET", document_integration)
        
        document_audit = audit_resource.add_resource("document").add_resource("{document_id}")
        document_audit.add_method("GET", document_integration)
        
    def _create_compliance_automation(self):
        """Create EventBridge rules for compliance automation"""
        
        # Daily compliance check
        compliance_check_rule = events.Rule(
            self, "ComplianceCheckRule",
            rule_name=f"tsa-compliance-check-{self.stage}",
            schedule=events.Schedule.cron(hour="9", minute="0"),  # Daily at 9 AM
            description="Daily compliance requirements check"
        )
        
        compliance_check_rule.add_target(
            targets.LambdaFunction(self.compliance_handler)
        )
        
        # Document expiration alerts
        expiration_rule = events.Rule(
            self, "DocumentExpirationRule",
            rule_name=f"tsa-document-expiration-{self.stage}",
            schedule=events.Schedule.cron(hour="8", minute="0"),  # Daily at 8 AM
            description="Check for expiring documents"
        )
        
        expiration_rule.add_target(
            targets.LambdaFunction(self.document_handler)
        )
        
        # Signature reminder rule
        signature_reminder_rule = events.Rule(
            self, "SignatureReminderRule",
            rule_name=f"tsa-signature-reminders-{self.stage}",
            schedule=events.Schedule.cron(hour="10", minute="0"),  # Daily at 10 AM
            description="Send signature reminders"
        )
        
        signature_reminder_rule.add_target(
            targets.LambdaFunction(self.signature_handler)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
    
    @property
    def topic_arns(self) -> Dict[str, str]:
        """Get SNS topic ARNs for document notifications"""
        return {
            "documents": self.document_topic.topic_arn
        }
    
    @property
    def queue_urls(self) -> Dict[str, str]:
        """Get SQS queue URLs for document processing"""
        return {
            "processing": self.processing_queue.queue_url,
            "signature_reminders": self.signature_reminders_queue.queue_url,
            "compliance": self.compliance_queue.queue_url
        }
    
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names for document storage"""
        return {
            "documents": self.documents_bucket.bucket_name,
            "templates": self.templates_bucket.bucket_name,
            "processed": self.processed_bucket.bucket_name
        } 