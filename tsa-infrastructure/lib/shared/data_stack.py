"""
Data Stack for TSA Unified Platform
Provides PostgreSQL database and essential storage for unified platform
"""
from aws_cdk import Stack, RemovalPolicy, CfnOutput, Duration
from aws_cdk import aws_rds as rds
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_kms as kms
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct
from .table_names import get_resource_config
from .table_utils import get_or_create_table, get_standard_table_props


class DataStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, stage: str, vpc: ec2.Vpc, 
                 security_group: ec2.SecurityGroup, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.vpc = vpc
        self.security_group = security_group
        
        # SINGLE SOURCE OF TRUTH: Get centralized table configuration
        self.table_config = get_resource_config(stage)
        
        # Create encryption key
        self._create_encryption_key()
        
        # Create database secret
        self._create_database_secret()
        
        # Create PostgreSQL database
        self._create_database()
        
        # Create S3 bucket for unified platform assets
        self._create_storage()
        
        # Create shared DynamoDB tables
        self._create_dynamodb_tables()
        
        # Create outputs
        self._create_outputs()
        
    def _create_encryption_key(self):
        """Create KMS key for encryption"""
        self.kms_key = kms.Key(
            self, "UnifiedPlatformKey", 
            enable_key_rotation=True,
            description=f"KMS key for TSA Unified Platform {self.stage} encryption"
        )
        
    def _create_database_secret(self):
        """Create database credentials secret"""
        self.database_secret = secretsmanager.Secret(
            self, "DatabaseSecret", 
            secret_name=f"tsa/database-{self.stage}",
            description="PostgreSQL database credentials for unified platform",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"username":"postgres"}',
                generate_string_key="password",
                exclude_characters='"/@ \\\'"',  # Exclude /, @, ", space, \, and ' 
                password_length=16
            )
        )
        
    def _create_database(self):
        """Create PostgreSQL database for unified platform"""
        
        # Database subnet group
        self.db_subnet_group = rds.SubnetGroup(
            self, "UnifiedPlatformDBSubnetGroup",
            description="Subnet group for unified platform PostgreSQL database",
            vpc=self.vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            ),
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # PostgreSQL database instance
        self.database = rds.DatabaseInstance(
            self, "UnifiedPlatformDatabase",
            database_name="unified_platform",
            instance_identifier=f"tsa-unified-platform-{self.stage}",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_14_13
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, 
                ec2.InstanceSize.MICRO if self.stage == "dev" else ec2.InstanceSize.SMALL
            ),
            credentials=rds.Credentials.from_secret(self.database_secret),
            vpc=self.vpc,
            subnet_group=self.db_subnet_group,
            security_groups=[self.security_group],
            storage_encrypted=True,
            storage_encryption_key=self.kms_key,
            backup_retention=Duration.days(7 if self.stage == "prod" else 1),
            delete_automated_backups=True,
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY,
            enable_performance_insights=self.stage == "prod",
            monitoring_interval=Duration.seconds(60) if self.stage == "prod" else None
        )
        
    def _create_storage(self):
        """Create S3 bucket for unified platform assets"""
        
        # S3 bucket for unified platform static assets and documents
        self.unified_platform_bucket = s3.Bucket(
            self, "UnifiedPlatformBucket",
            bucket_name=f"tsa-unified-platform-assets-{self.stage}-{self.account}",
            public_read_access=False,
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=self.kms_key,
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="unified-platform-lifecycle",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=Duration.days(30)
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=Duration.days(90)
                        )
                    ]
                )
            ]
        )
        
        # S3 bucket for events photos
        self.events_photos_bucket = s3.Bucket(
            self, "EventsPhotosBucket",
            bucket_name=f"tsa-events-photos-storage-{self.stage}-{self.account}",
            public_read_access=True,  # Events photos should be publicly accessible
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=self.kms_key,
            versioned=False,  # No need for versioning on photos
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.POST],
                    allowed_origins=["*"],  # Allow frontend to access images
                    allowed_headers=["*"],
                    max_age=3600
                )
            ],
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="events-photos-lifecycle",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=Duration.days(90)  # Keep recent photos accessible
                        ),
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=Duration.days(365)  # Archive old photos after 1 year
                        )
                    ]
                )
            ]
        )
        
    def _create_dynamodb_tables(self):
        """Create shared DynamoDB tables for all services"""
        
        # ========================================
        # CORE USER TABLES (OneRoster/EdFi standard)
        # ========================================
        
        # Users table - Core user profiles
        self.users_table = dynamodb.Table(
            self, "UsersTable",
            table_name=self.table_config.get_table_name("users"),
            partition_key=dynamodb.Attribute(
                name="user_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Profiles table - Extended profile information
        self.profiles_table = dynamodb.Table(
            self, "ProfilesTable",
            table_name=self.table_config.get_table_name("profiles"),
            partition_key=dynamodb.Attribute(
                name="profile_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Organizations table
        self.organizations_table = dynamodb.Table(
            self, "OrganizationsTable",
            table_name=self.table_config.get_table_name("organizations"),
            partition_key=dynamodb.Attribute(
                name="org_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # ========================================
        # INVITATION TABLES (Clear Separation by Type)
        # ========================================
        
        # Coach invitations table - Admin invites coaches to join platform
        self.coach_invitations_table = dynamodb.Table(
            self, "CoachInvitationsTable",
            table_name=self.table_config.get_table_name("coach-invitations"),
            partition_key=dynamodb.Attribute(
                name="invitation_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True if self.stage == "prod" else False,
            time_to_live_attribute="expires_at",
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for email lookups
        self.coach_invitations_table.add_global_secondary_index(
            index_name="email-index",
            partition_key=dynamodb.Attribute(
                name="email",
                type=dynamodb.AttributeType.STRING
            )
        )

        # Add GSI for status-based queries
        self.coach_invitations_table.add_global_secondary_index(
            index_name="status-index",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Parent invitations table - Coach invites parents to join platform
        self.parent_invitations_table = dynamodb.Table(
            self, "ParentInvitationsTable",
            table_name=self.table_config.get_table_name("parent-invitations"),
            partition_key=dynamodb.Attribute(
                name="invitation_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            time_to_live_attribute="expires_at",
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for parent email lookups
        self.parent_invitations_table.add_global_secondary_index(
            index_name="parent-email-index",
            partition_key=dynamodb.Attribute(
                name="parent_email",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Event invitations table - Coach invites parents to specific events
        self.event_invitations_table = dynamodb.Table(
            self, "EventInvitationsTable",
            table_name=self.table_config.get_table_name("event-invitations"),
            partition_key=dynamodb.Attribute(
                name="invitation_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            time_to_live_attribute="expires_at",
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for event-based lookups
        self.event_invitations_table.add_global_secondary_index(
            index_name="event-id-index",
            partition_key=dynamodb.Attribute(
                name="event_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # ========================================
        # ENROLLMENT TABLES
        # ========================================
        
        # Enrollments table - Parent enrollments
        self.enrollments_table = dynamodb.Table(
            self, "EnrollmentsTable",
            table_name=self.table_config.get_table_name("enrollments"),
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for parent email lookup
        self.enrollments_table.add_global_secondary_index(
            index_name="parent-email-index",
            partition_key=dynamodb.Attribute(
                name="parent_email",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # ========================================
        # EVENT AND ACTIVITY TABLES
        # ========================================
        
        # Events table
        self.events_table = dynamodb.Table(
            self, "EventsTable",
            table_name=self.table_config.get_table_name("events"),
            partition_key=dynamodb.Attribute(
                name="event_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for coach-based event queries
        self.events_table.add_global_secondary_index(
            index_name="coach-events-index",
            partition_key=dynamodb.Attribute(
                name="coach_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Event registrations table
        self.event_registrations_table = dynamodb.Table(
            self, "EventRegistrationsTable",
            table_name=self.table_config.get_table_name("event-registrations"),
            partition_key=dynamodb.Attribute(
                name="registration_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Event attendees table (synced from Eventbrite)
        self.event_attendees_table = dynamodb.Table(
            self, "EventAttendeesTable",
            table_name=self.table_config.get_table_name("event-attendees"),
            partition_key=dynamodb.Attribute(
                name="attendee_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for event-based attendee queries
        self.event_attendees_table.add_global_secondary_index(
            index_name="event-attendees-index",
            partition_key=dynamodb.Attribute(
                name="event_id",
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # Eventbrite configuration table (coach-specific)
        self.eventbrite_config_table = dynamodb.Table(
            self, "EventbriteConfigTable",
            table_name=self.table_config.get_table_name("eventbrite-config"),
            partition_key=dynamodb.Attribute(
                name="coach_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # ========================================
        # DOCUMENT AND COMPLIANCE TABLES
        # ========================================
        
        # Documents table
        self.documents_table = dynamodb.Table(
            self, "DocumentsTable",
            table_name=self.table_config.get_table_name("documents"),
            partition_key=dynamodb.Attribute(
                name="document_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )
        
        # Scheduling table - Consultation and shadow day scheduling for parent enrollments
        self.scheduling_table = dynamodb.Table(
            self, "SchedulingTable",
            table_name=self.table_config.get_table_name("scheduling"),
            partition_key=dynamodb.Attribute(
                name="schedule_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add GSI for enrollment lookup
        self.scheduling_table.add_global_secondary_index(
            index_name="enrollment-id-index",
            partition_key=dynamodb.Attribute(
                name="enrollment_id",
                type=dynamodb.AttributeType.STRING
            )
        )

        # Add GSI for coach lookup
        self.scheduling_table.add_global_secondary_index(
            index_name="coach-id-index",
            partition_key=dynamodb.Attribute(
                name="coach_id", 
                type=dynamodb.AttributeType.STRING
            )
        )
        
        # ========================================
        # ANALYTICS TABLES
        # ========================================
        
        # Analytics events table
        self.analytics_events_table = dynamodb.Table(
            self, "AnalyticsEventsTable",
            table_name=f"analytics-events-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="SK",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # Sessions table
        self.sessions_table = dynamodb.Table(
            self, "SessionsTable",
            table_name=f"sessions-{self.stage}",
            partition_key=dynamodb.Attribute(
                name="session_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            time_to_live_attribute="expires_at"
        )
        
    @property
    def database_connection_string(self) -> str:
        """Get database connection string for Lambda environment"""
        return f"postgresql://{self.database.secret.secret_value_from_json('username')}:{self.database.secret.secret_value_from_json('password')}@{self.database.instance_endpoint.hostname}:{self.database.instance_endpoint.port}/unified_platform"
        
    def _create_outputs(self):
        """Create CloudFormation outputs"""
        
        # Database outputs
        CfnOutput(
            self, "DatabaseEndpoint", 
            value=self.database.instance_endpoint.hostname,
            description="PostgreSQL database endpoint for unified platform",
            export_name=f"UnifiedPlatformDatabaseEndpoint-{self.stage}"
        )
        
        CfnOutput(
            self, "DatabaseSecretArn", 
            value=self.database.secret.secret_arn,
            description="Database credentials secret ARN",
            export_name=f"UnifiedPlatformDatabaseSecretArn-{self.stage}"
        )
        
        # S3 outputs
        CfnOutput(
            self, "UnifiedPlatformBucketName", 
            value=self.unified_platform_bucket.bucket_name,
            description="S3 bucket for unified platform assets",
            export_name=f"UnifiedPlatformBucketName-{self.stage}"
        )
        
        CfnOutput(
            self, "EventsPhotosBucketName", 
            value=self.events_photos_bucket.bucket_name,
            description="S3 bucket for events photos",
            export_name=f"EventsPhotosBucketName-{self.stage}"
        )
        
        # KMS output
        CfnOutput(
            self, "KMSKeyId", 
            value=self.kms_key.key_id,
            description="KMS key for unified platform encryption",
            export_name=f"UnifiedPlatformKMSKeyId-{self.stage}"
        )
        
        # DynamoDB table outputs
        CfnOutput(
            self, "UsersTableName",
            value=self.users_table.table_name,
            description="Users table name",
            export_name=f"UnifiedPlatformUsersTable-{self.stage}"
        )
        
        CfnOutput(
            self, "ProfilesTableName",
            value=self.profiles_table.table_name,
            description="Profiles table name", 
            export_name=f"UnifiedPlatformProfilesTable-{self.stage}"
        )
        
        CfnOutput(
            self, "CoachInvitationsTableName",
            value=self.coach_invitations_table.table_name,
            description="Coach invitations table name",
            export_name=f"UnifiedPlatformCoachInvitationsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "ParentInvitationsTableName",
            value=self.parent_invitations_table.table_name,
            description="Parent invitations table name",
            export_name=f"UnifiedPlatformParentInvitationsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "EventInvitationsTableName",
            value=self.event_invitations_table.table_name,
            description="Event invitations table name",
            export_name=f"UnifiedPlatformEventInvitationsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "EnrollmentsTableName",
            value=self.enrollments_table.table_name,
            description="Enrollments table name",
            export_name=f"UnifiedPlatformEnrollmentsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "EventsTableName",
            value=self.events_table.table_name,
            description="Events table name",
            export_name=f"UnifiedPlatformEventsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "DocumentsTableName",
            value=self.documents_table.table_name,
            description="Documents table name",
            export_name=f"UnifiedPlatformDocumentsTable-{self.stage}"
        )
        
        CfnOutput(
            self, "SchedulingTableName",
            value=self.scheduling_table.table_name,
            description="Scheduling table name",
            export_name=f"UnifiedPlatformSchedulingTable-{self.stage}"
        )
        
        CfnOutput(
            self, "EventAttendeesTableName",
            value=self.event_attendees_table.table_name,
            description="Event attendees table name",
            export_name=f"UnifiedPlatformEventAttendeesTable-{self.stage}"
        )
        
        CfnOutput(
            self, "EventbriteConfigTableName",
            value=self.eventbrite_config_table.table_name,
            description="Eventbrite config table name",
            export_name=f"UnifiedPlatformEventbriteConfigTable-{self.stage}"
        ) 