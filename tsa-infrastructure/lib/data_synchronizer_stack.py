"""
Data Synchronizer Stack
Deploys the central Lambda function responsible for synchronizing data
from DynamoDB streams to the PostgreSQL database in real-time.
"""
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_lambda_event_sources as event_sources,
)
from constructs import Construct
from typing import Dict, Any

class DataSynchronizerStack(Stack):
    """
    This stack creates the centralized Data Synchronizer Lambda function
    and connects it to the DynamoDB streams of all core tables.
    """
    def __init__(self, scope: Construct, construct_id: str,
                 stage: str,
                 shared_resources: Dict[str, Any],
                 data_stack: Stack,
                 **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.stage = stage
        self.shared_resources = shared_resources
        self.data_stack = data_stack

        # Create the single, powerful data synchronizer Lambda
        synchronizer_lambda = self._create_synchronizer_lambda()

        # Connect the Lambda to all the necessary DynamoDB table streams
        self._connect_streams_to_lambda(synchronizer_lambda)

    def _create_synchronizer_lambda(self) -> lambda_.Function:
        """
        Creates the core Lambda function for data synchronization.
        """
        vpc = self.shared_resources.get("vpc")
        lambda_security_group = self.shared_resources.get("lambda_security_group")

        # Create a shared layer with necessary dependencies
        sync_layer = lambda_.LayerVersion(
            self, "DataSyncSharedLayer",
            code=lambda_.Code.from_asset("lambda_migrations/migration_layer"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="Shared dependencies for the Data Synchronizer"
        )

        # Define the Lambda function
        synchronizer_lambda = lambda_.Function(
            self, "DataSynchronizerFunction",
            function_name=f"tsa-data-synchronizer-{self.stage}",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("lambda_data_synchronizer"), # New lambda code directory
            timeout=Duration.minutes(5),
            memory_size=512,
            layers=[sync_layer],
            vpc=vpc,
            security_groups=[lambda_security_group] if lambda_security_group else None,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ) if vpc else None,
            environment={
                "DB_HOST": self.shared_resources.get("database_host", ""),
                "DB_NAME": self.shared_resources.get("database_name", ""),
                "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
                "DB_PORT": "5432",
                "STAGE": self.stage,
                "LOG_LEVEL": "INFO"
            }
        )

        # Grant permissions to access the database secret
        if self.shared_resources.get("database_secret_arn"):
            synchronizer_lambda.add_to_role_policy(
                iam.PolicyStatement(
                    actions=["secretsmanager:GetSecretValue"],
                    resources=[self.shared_resources.get("database_secret_arn")]
                )
            )

        return synchronizer_lambda

    def _connect_streams_to_lambda(self, synchronizer_lambda: lambda_.Function):
        """
        Connects the Lambda to the DynamoDB streams of all core tables.
        """
        # List of all tables from the DataStack that need syncing
        tables_to_sync = [
            self.data_stack.users_table,
            self.data_stack.profiles_table,
            self.data_stack.organizations_table,
            self.data_stack.coach_invitations_table,
            self.data_stack.parent_invitations_table,
            self.data_stack.enrollments_table,
            self.data_stack.events_table,
            self.data_stack.documents_table,
            self.data_stack.scheduling_table,
            self.data_stack.event_registrations_table
        ]

        for table in tables_to_sync:
            synchronizer_lambda.add_event_source(
                event_sources.DynamoEventSource(
                    table,
                    starting_position=lambda_.StartingPosition.LATEST,
                    batch_size=10,
                    retry_attempts=3
                )
            )
        
        print(f"Connected Data Synchronizer to {len(tables_to_sync)} table streams.") 