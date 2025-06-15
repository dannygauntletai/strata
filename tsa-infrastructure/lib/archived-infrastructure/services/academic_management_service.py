"""
Academic Management Service Stack
Handles all academic operations for the microschool platform

Features:
- Student Information System (SIS) integration
- Gradebook management and integration
- Attendance tracking and reporting
- Academic progress monitoring
- Transcript generation
- Learning Management System (LMS) integration
- Academic analytics and reporting
"""

from aws_cdk import (
    core, aws_lambda as lambda_, aws_apigateway as apigw,
    aws_dynamodb as dynamodb, aws_s3 as s3, aws_sns as sns,
    aws_sqs as sqs, aws_events as events, aws_events_targets as targets,
    aws_secretsmanager as secrets, aws_iam as iam,
    aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks
)
from typing import Dict, Any


class AcademicManagementService(core.Construct):
    """Academic Management Service for student information, grades, and attendance"""
    
    def __init__(self, scope: core.Construct, construct_id: str, 
                 shared_resources: Dict[str, Any], **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.shared_resources = shared_resources
        self.stage = shared_resources["stage"]
        
        # Create academic management infrastructure
        self._create_academic_tables()
        self._create_document_storage()
        self._create_notification_infrastructure()
        self._create_academic_handlers()
        self._create_academic_workflows()
        self._create_api_gateway()
        self._create_academic_automation()
        
    def _create_academic_tables(self):
        """Create DynamoDB tables for academic management"""
        
        # Student enrollment table
        self.enrollments = dynamodb.Table(
            self, "StudentEnrollments",
            table_name=f"tsa-academic-enrollments-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Add GSI for student lookup
        self.enrollments.add_global_secondary_index(
            index_name="StudentIndex",
            partition_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="enrollment_date",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for class lookup
        self.enrollments.add_global_secondary_index(
            index_name="ClassIndex",
            partition_key=dynamodb.Attribute(
                name="class_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Grades and assignments table
        self.grades = dynamodb.Table(
            self, "Grades",
            table_name=f"tsa-academic-grades-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="grade_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for student grades
        self.grades.add_global_secondary_index(
            index_name="StudentGradesIndex",
            partition_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="assignment_date",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for class grades
        self.grades.add_global_secondary_index(
            index_name="ClassGradesIndex",
            partition_key=dynamodb.Attribute(
                name="class_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="assignment_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Attendance tracking table
        self.attendance = dynamodb.Table(
            self, "Attendance",
            table_name=f"tsa-academic-attendance-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="attendance_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for student attendance
        self.attendance.add_global_secondary_index(
            index_name="StudentAttendanceIndex",
            partition_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="date",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Add GSI for class attendance
        self.attendance.add_global_secondary_index(
            index_name="ClassAttendanceIndex",
            partition_key=dynamodb.Attribute(
                name="class_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="date",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Academic progress tracking table
        self.progress = dynamodb.Table(
            self, "AcademicProgress",
            table_name=f"tsa-academic-progress-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="progress_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True
        )
        
        # Add GSI for student progress
        self.progress.add_global_secondary_index(
            index_name="StudentProgressIndex",
            partition_key=dynamodb.Attribute(
                name="student_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="reporting_period",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Curriculum and standards table
        self.curriculum = dynamodb.Table(
            self, "Curriculum",
            table_name=f"tsa-academic-curriculum-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="curriculum_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
        # Academic calendar table
        self.academic_calendar = dynamodb.Table(
            self, "AcademicCalendar",
            table_name=f"tsa-academic-calendar-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="calendar_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST
        )
        
    def _create_document_storage(self):
        """Create S3 buckets for academic documents and reports"""
        
        # Academic documents bucket
        self.academic_docs_bucket = s3.Bucket(
            self, "AcademicDocuments",
            bucket_name=f"tsa-academic-docs-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.KMS_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="AcademicRecordsArchival",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=core.Duration.days(365)  # After 1 year
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=core.Duration.days(2555)  # 7 years for records retention
                        )
                    ]
                )
            ]
        )
        
        # Transcripts and reports bucket
        self.transcripts_bucket = s3.Bucket(
            self, "TranscriptsBucket",
            bucket_name=f"tsa-academic-transcripts-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.KMS_MANAGED,
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )
        
        # Curriculum resources bucket
        self.curriculum_bucket = s3.Bucket(
            self, "CurriculumBucket",
            bucket_name=f"tsa-curriculum-resources-{self.stage}-{core.Aws.ACCOUNT_ID}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            public_read_access=False
        )
        
    def _create_notification_infrastructure(self):
        """Create SNS topics and SQS queues for academic notifications"""
        
        # Academic notifications topic
        self.academic_topic = sns.Topic(
            self, "AcademicNotifications",
            topic_name=f"tsa-academic-notifications-{self.stage}",
            display_name="TSA Academic Notifications"
        )
        
        # Grade processing queue
        self.grade_processing_queue = sqs.Queue(
            self, "GradeProcessingQueue",
            queue_name=f"tsa-grade-processing-{self.stage}",
            visibility_timeout=core.Duration.minutes(10),
            retention_period=core.Duration.days(14)
        )
        
        # Attendance alerts queue
        self.attendance_alerts_queue = sqs.Queue(
            self, "AttendanceAlertsQueue",
            queue_name=f"tsa-attendance-alerts-{self.stage}",
            visibility_timeout=core.Duration.minutes(5),
            retention_period=core.Duration.days(14)
        )
        
        # Progress reports queue
        self.progress_reports_queue = sqs.Queue(
            self, "ProgressReportsQueue",
            queue_name=f"tsa-progress-reports-{self.stage}",
            visibility_timeout=core.Duration.minutes(15),
            retention_period=core.Duration.days(14)
        )
        
    def _create_academic_handlers(self):
        """Create Lambda functions for academic management"""
        
        # LMS integration credentials (Google Classroom, Canvas, etc.)
        self.lms_secret = secrets.Secret(
            self, "LMSCredentials",
            secret_name=f"tsa/academic/lms/{self.stage}",
            description="LMS API credentials for integration",
            generate_secret_string=secrets.SecretStringGenerator(
                secret_string_template='{"google_classroom_key": "placeholder"}',
                generate_string_key="api_secret",
                exclude_characters='"@/\\'
            )
        )
        
        # SIS integration handler
        self.sis_handler = lambda_.Function(
            self, "SISHandler",
            function_name=f"tsa-sis-integration-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="sis_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-academic-backend/lambda_sis"),
            timeout=core.Duration.minutes(10),
            environment={
                "STAGE": self.stage,
                "ENROLLMENTS_TABLE": self.enrollments.table_name,
                "PROGRESS_TABLE": self.progress.table_name,
                "LMS_SECRET_ARN": self.lms_secret.secret_arn,
                "NOTIFICATION_TOPIC_ARN": self.academic_topic.topic_arn
            }
        )
        
        # Gradebook management handler
        self.gradebook_handler = lambda_.Function(
            self, "GradebookHandler",
            function_name=f"tsa-gradebook-manager-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="gradebook_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-academic-backend/lambda_gradebook"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "GRADES_TABLE": self.grades.table_name,
                "ENROLLMENTS_TABLE": self.enrollments.table_name,
                "PROGRESS_TABLE": self.progress.table_name,
                "NOTIFICATION_TOPIC_ARN": self.academic_topic.topic_arn
            }
        )
        
        # Attendance tracking handler
        self.attendance_handler = lambda_.Function(
            self, "AttendanceHandler",
            function_name=f"tsa-attendance-tracker-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="attendance_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-academic-backend/lambda_attendance"),
            timeout=core.Duration.minutes(5),
            environment={
                "STAGE": self.stage,
                "ATTENDANCE_TABLE": self.attendance.table_name,
                "ENROLLMENTS_TABLE": self.enrollments.table_name,
                "CALENDAR_TABLE": self.academic_calendar.table_name,
                "NOTIFICATION_TOPIC_ARN": self.academic_topic.topic_arn
            }
        )
        
        # Progress reporting handler
        self.progress_handler = lambda_.Function(
            self, "ProgressHandler",
            function_name=f"tsa-progress-reporter-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="progress_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-academic-backend/lambda_progress"),
            timeout=core.Duration.minutes(10),
            environment={
                "STAGE": self.stage,
                "PROGRESS_TABLE": self.progress.table_name,
                "GRADES_TABLE": self.grades.table_name,
                "ATTENDANCE_TABLE": self.attendance.table_name,
                "TRANSCRIPTS_BUCKET": self.transcripts_bucket.bucket_name,
                "NOTIFICATION_TOPIC_ARN": self.academic_topic.topic_arn
            }
        )
        
        # Transcript generation handler
        self.transcript_handler = lambda_.Function(
            self, "TranscriptHandler",
            function_name=f"tsa-transcript-generator-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="transcript_handler.lambda_handler",
            code=lambda_.Code.from_asset("../tsa-academic-backend/lambda_transcript"),
            timeout=core.Duration.minutes(15),
            memory_size=1024,  # For PDF generation
            environment={
                "STAGE": self.stage,
                "GRADES_TABLE": self.grades.table_name,
                "ENROLLMENTS_TABLE": self.enrollments.table_name,
                "CURRICULUM_TABLE": self.curriculum.table_name,
                "TRANSCRIPTS_BUCKET": self.transcripts_bucket.bucket_name
            }
        )
        
        # Grant permissions
        handlers = [
            self.sis_handler, self.gradebook_handler, self.attendance_handler,
            self.progress_handler, self.transcript_handler
        ]
        
        for handler in handlers:
            self.academic_topic.grant_publish(handler)
            
        # Table permissions
        self.enrollments.grant_read_write_data(self.sis_handler)
        self.enrollments.grant_read_data(self.gradebook_handler)
        self.enrollments.grant_read_data(self.attendance_handler)
        self.enrollments.grant_read_data(self.transcript_handler)
        
        self.grades.grant_read_write_data(self.gradebook_handler)
        self.grades.grant_read_data(self.progress_handler)
        self.grades.grant_read_data(self.transcript_handler)
        
        self.attendance.grant_read_write_data(self.attendance_handler)
        self.attendance.grant_read_data(self.progress_handler)
        
        self.progress.grant_read_write_data(self.sis_handler)
        self.progress.grant_read_write_data(self.gradebook_handler)
        self.progress.grant_read_write_data(self.progress_handler)
        
        self.curriculum.grant_read_data(self.transcript_handler)
        self.academic_calendar.grant_read_data(self.attendance_handler)
        
        # S3 permissions
        self.transcripts_bucket.grant_read_write(self.progress_handler)
        self.transcripts_bucket.grant_read_write(self.transcript_handler)
        self.curriculum_bucket.grant_read(self.transcript_handler)
        
        # LMS secret permissions
        self.lms_secret.grant_read(self.sis_handler)
        
    def _create_academic_workflows(self):
        """Create Step Functions for academic workflows"""
        
        # End-of-term grading workflow
        grading_workflow = sfn.StateMachine(
            self, "EndOfTermGradingWorkflow",
            state_machine_name=f"tsa-end-of-term-grading-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "CalculateFinalGrades",
                    lambda_function=self.gradebook_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "calculate_final_grades"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "GenerateProgressReports",
                    lambda_function=self.progress_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "generate_progress_reports"
                    })
                ))
                .next(tasks.LambdaInvoke(
                    self, "UpdateTranscripts",
                    lambda_function=self.transcript_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "update_transcripts"
                    })
                ))
            )
        )
        
        # Attendance monitoring workflow
        attendance_workflow = sfn.StateMachine(
            self, "AttendanceMonitoringWorkflow",
            state_machine_name=f"tsa-attendance-monitoring-{self.stage}",
            definition=sfn.Chain.start(
                tasks.LambdaInvoke(
                    self, "CheckDailyAttendance",
                    lambda_function=self.attendance_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "check_daily_attendance"
                    })
                )
                .next(tasks.LambdaInvoke(
                    self, "IdentifyAbsences",
                    lambda_function=self.attendance_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "identify_absences"
                    })
                ))
                .next(tasks.LambdaInvoke(
                    self, "SendAttendanceAlerts",
                    lambda_function=self.attendance_handler,
                    payload=sfn.TaskInput.from_object({
                        "action": "send_attendance_alerts"
                    })
                ))
            )
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for academic management service"""
        
        self.api = apigw.RestApi(
            self, "AcademicAPI",
            rest_api_name=f"tsa-academic-api-{self.stage}",
            description="TSA Academic Management Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create Lambda integrations
        sis_integration = apigw.LambdaIntegration(self.sis_handler)
        gradebook_integration = apigw.LambdaIntegration(self.gradebook_handler)
        attendance_integration = apigw.LambdaIntegration(self.attendance_handler)
        progress_integration = apigw.LambdaIntegration(self.progress_handler)
        transcript_integration = apigw.LambdaIntegration(self.transcript_handler)
        
        # Student endpoints
        students_resource = self.api.root.add_resource("students")
        students_resource.add_method("GET", sis_integration)
        students_resource.add_method("POST", sis_integration)
        
        student_id_resource = students_resource.add_resource("{student_id}")
        student_id_resource.add_method("GET", sis_integration)
        student_id_resource.add_method("PUT", sis_integration)
        
        # Enrollment endpoints
        enrollments_resource = student_id_resource.add_resource("enrollments")
        enrollments_resource.add_method("GET", sis_integration)
        enrollments_resource.add_method("POST", sis_integration)
        
        # Grades endpoints
        grades_resource = student_id_resource.add_resource("grades")
        grades_resource.add_method("GET", gradebook_integration)
        grades_resource.add_method("POST", gradebook_integration)
        
        grade_id_resource = grades_resource.add_resource("{grade_id}")
        grade_id_resource.add_method("GET", gradebook_integration)
        grade_id_resource.add_method("PUT", gradebook_integration)
        
        # Attendance endpoints
        attendance_resource = student_id_resource.add_resource("attendance")
        attendance_resource.add_method("GET", attendance_integration)
        attendance_resource.add_method("POST", attendance_integration)
        
        # Progress endpoints
        progress_resource = student_id_resource.add_resource("progress")
        progress_resource.add_method("GET", progress_integration)
        
        # Transcript endpoints
        transcript_resource = student_id_resource.add_resource("transcript")
        transcript_resource.add_method("GET", transcript_integration)
        transcript_resource.add_method("POST", transcript_integration)  # Generate
        
        # Class-level endpoints
        classes_resource = self.api.root.add_resource("classes")
        classes_resource.add_method("GET", sis_integration)
        
        class_id_resource = classes_resource.add_resource("{class_id}")
        class_id_resource.add_method("GET", sis_integration)
        
        class_roster = class_id_resource.add_resource("roster")
        class_roster.add_method("GET", sis_integration)
        
        class_grades = class_id_resource.add_resource("grades")
        class_grades.add_method("GET", gradebook_integration)
        
        class_attendance = class_id_resource.add_resource("attendance")
        class_attendance.add_method("GET", attendance_integration)
        class_attendance.add_method("POST", attendance_integration)  # Take attendance
        
        # Reporting endpoints
        reports_resource = self.api.root.add_resource("reports")
        reports_resource.add_method("GET", progress_integration)
        
        progress_reports = reports_resource.add_resource("progress")
        progress_reports.add_method("GET", progress_integration)
        progress_reports.add_method("POST", progress_integration)  # Generate
        
        attendance_reports = reports_resource.add_resource("attendance")
        attendance_reports.add_method("GET", attendance_integration)
        
    def _create_academic_automation(self):
        """Create EventBridge rules for academic automation"""
        
        # Daily attendance check
        attendance_check_rule = events.Rule(
            self, "AttendanceCheckRule",
            rule_name=f"tsa-attendance-check-{self.stage}",
            schedule=events.Schedule.cron(hour="9", minute="30"),  # Daily at 9:30 AM
            description="Daily attendance monitoring"
        )
        
        attendance_check_rule.add_target(
            targets.LambdaFunction(self.attendance_handler)
        )
        
        # Weekly progress calculation
        progress_calculation_rule = events.Rule(
            self, "ProgressCalculationRule",
            rule_name=f"tsa-progress-calculation-{self.stage}",
            schedule=events.Schedule.cron(day_of_week="SUN", hour="20", minute="0"),  # Sunday 8 PM
            description="Weekly progress calculation"
        )
        
        progress_calculation_rule.add_target(
            targets.LambdaFunction(self.progress_handler)
        )
        
        # Monthly grade sync
        grade_sync_rule = events.Rule(
            self, "GradeSyncRule",
            rule_name=f"tsa-grade-sync-{self.stage}",
            schedule=events.Schedule.cron(day="1", hour="6", minute="0"),  # 1st of month, 6 AM
            description="Monthly grade synchronization with LMS"
        )
        
        grade_sync_rule.add_target(
            targets.LambdaFunction(self.gradebook_handler)
        )
        
    @property
    def api_url(self) -> str:
        """Get the API Gateway URL"""
        return self.api.url
    
    @property
    def topic_arns(self) -> Dict[str, str]:
        """Get SNS topic ARNs for academic notifications"""
        return {
            "academic": self.academic_topic.topic_arn
        }
    
    @property
    def queue_urls(self) -> Dict[str, str]:
        """Get SQS queue URLs for academic processing"""
        return {
            "grade_processing": self.grade_processing_queue.queue_url,
            "attendance_alerts": self.attendance_alerts_queue.queue_url,
            "progress_reports": self.progress_reports_queue.queue_url
        }
    
    @property
    def bucket_names(self) -> Dict[str, str]:
        """Get S3 bucket names for academic storage"""
        return {
            "academic_docs": self.academic_docs_bucket.bucket_name,
            "transcripts": self.transcripts_bucket.bucket_name,
            "curriculum": self.curriculum_bucket.bucket_name
        } 