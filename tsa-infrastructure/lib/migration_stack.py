"""
Migration Stack - PostgreSQL Schema Setup and Data Migration
Deploys Lambda functions to create PostgreSQL schema and migrate DynamoDB data
"""
from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_logs as logs,
)
from constructs import Construct
from typing import Dict, Any


class MigrationStack(Stack):
    """Migration stack for PostgreSQL schema and data migration"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 stage: str,
                 shared_resources: Dict[str, Any], 
                 **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.shared_resources = shared_resources
        
        # Create migration Lambda functions
        self._create_migration_functions()
        
    def _create_migration_functions(self):
        """Create Lambda functions for migration tasks"""
        
        # Get shared resources
        vpc = self.shared_resources.get("vpc")
        lambda_security_group = self.shared_resources.get("lambda_security_group")
        
        # Create migration layer with PostgreSQL dependencies (built for x86_64)
        self.migration_layer = lambda_.LayerVersion(
            self, "MigrationSharedLayer",
            code=lambda_.Code.from_asset("lambda_migrations/migration_layer"),  # Use migration-specific layer
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
            description="PostgreSQL dependencies for migration functions (asyncpg, psycopg2, boto3) - x86_64"
        )
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "layers": [self.migration_layer],  # Add the layer with PostgreSQL dependencies
            "timeout": Duration.minutes(15),  # Longer timeout for migration
            "memory_size": 1024,  # More memory for data processing
            "vpc": vpc,
            "security_groups": [lambda_security_group] if lambda_security_group else None,
            "vpc_subnets": ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ) if vpc else None,
            "environment": {
                # Database connection
                "DB_HOST": self.shared_resources.get("database_host", ""),
                "DB_NAME": self.shared_resources.get("database_name", ""),
                "DB_SECRET_ARN": self.shared_resources.get("database_secret_arn", ""),
                "DB_PORT": "5432",
                
                # DynamoDB tables
                "PROFILES_TABLE": "profiles",
                
                # Migration settings
                "STAGE": self.stage,
                "LOG_LEVEL": "INFO"
            }
        }
        
        # 1. Schema Creation Lambda
        self.schema_migration_function = lambda_.Function(
            self, "SchemaMigrationFunction",
            function_name=f"tsa-schema-migration-v2-{self.stage}",
            code=lambda_.Code.from_asset("lambda_migrations/schema_creator"),
            handler="handler.lambda_handler",
            description="Creates PostgreSQL schema for EdFi and OneRoster compliance",
            **lambda_config
        )
        
        # 2. Data Migration Lambda
        self.data_migration_function = lambda_.Function(
            self, "DataMigrationFunction", 
            function_name=f"tsa-data-migration-v2-{self.stage}",
            code=lambda_.Code.from_asset("lambda_migrations/data_migrator"),
            handler="handler.lambda_handler",
            description="Migrates DynamoDB profiles to PostgreSQL users table",
            **lambda_config
        )
        
        # Grant permissions for both functions
        for function in [self.schema_migration_function, self.data_migration_function]:
            
            # RDS permissions
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "rds:DescribeDBInstances",
                        "rds:Connect"
                    ],
                    resources=["*"]
                )
            )
            
            # Secrets Manager permissions
            if self.shared_resources.get("database_secret_arn"):
                function.add_to_role_policy(
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=[
                            "secretsmanager:GetSecretValue"
                        ],
                        resources=[self.shared_resources.get("database_secret_arn")]
                    )
                )
            
            # DynamoDB permissions (for data migration)
            function.add_to_role_policy(
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "dynamodb:Scan",
                        "dynamodb:Query",
                        "dynamodb:GetItem"
                    ],
                    resources=[
                        "arn:aws:dynamodb:*:*:table/profiles",
                        "arn:aws:dynamodb:*:*:table/profiles/index/*"
                    ]
                )
            )
        
        # Create log groups
        logs.LogGroup(
            self, "SchemaMigrationLogs",
            log_group_name=f"/aws/lambda/tsa-schema-migration-v2-{self.stage}",
            retention=logs.RetentionDays.ONE_WEEK
        )
        
        logs.LogGroup(
            self, "DataMigrationLogs", 
            log_group_name=f"/aws/lambda/tsa-data-migration-v2-{self.stage}",
            retention=logs.RetentionDays.ONE_WEEK
        )
        
        # Output function ARNs
        CfnOutput(
            self, "SchemaMigrationFunctionArn",
            value=self.schema_migration_function.function_arn,
            description="Schema Migration Lambda Function ARN"
        )
        
        CfnOutput(
            self, "DataMigrationFunctionArn", 
            value=self.data_migration_function.function_arn,
            description="Data Migration Lambda Function ARN"
        ) 