"""
Networking Stack for TSA Unified Platform
Provides VPC, subnets, and security groups for unified platform infrastructure
"""
import aws_cdk as cdk
from aws_cdk import aws_ec2 as ec2
from constructs import Construct


class NetworkingStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, stage: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        
        # Create VPC for unified platform
        self.vpc = ec2.Vpc(
            self, "TsaUnifiedPlatformVPC",
            max_azs=2,  # Cost-effective for MVP
            nat_gateways=1,  # Single NAT gateway for cost optimization
            restrict_default_security_group=False,  # Skip default SG restrictions to avoid permission issues
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Database",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ]
        )
        
        # Security Group for Lambda functions
        self.lambda_security_group = ec2.SecurityGroup(
            self, "UnifiedPlatformLambdaSG",
            vpc=self.vpc,
            description="Security group for unified platform Lambda functions",
            allow_all_outbound=True
        )
        
        # Security Group for RDS database
        self.database_security_group = ec2.SecurityGroup(
            self, "UnifiedPlatformDatabaseSG", 
            vpc=self.vpc,
            description="Security group for unified platform database",
            allow_all_outbound=False
        )
        
        # Allow Lambda functions to connect to database
        self.database_security_group.add_ingress_rule(
            peer=self.lambda_security_group,
            connection=ec2.Port.tcp(5432),
            description="Allow Lambda functions to connect to PostgreSQL"
        )
        
        # Subnets for easy access
        self.private_subnets = self.vpc.private_subnets
        self.public_subnets = self.vpc.public_subnets  
        self.database_subnets = self.vpc.isolated_subnets
        
        # Outputs
        cdk.CfnOutput(
            self, "VpcId", 
            value=self.vpc.vpc_id,
            description="VPC ID for unified platform infrastructure"
        )
        
        cdk.CfnOutput(
            self, "LambdaSecurityGroupId", 
            value=self.lambda_security_group.security_group_id,
            description="Security Group ID for Lambda functions"
        )
        
        cdk.CfnOutput(
            self, "DatabaseSecurityGroupId",
            value=self.database_security_group.security_group_id, 
            description="Security Group ID for RDS database"
        ) 