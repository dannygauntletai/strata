"""
Security Stack for TSA Unified Platform
Provides authentication, authorization, and IAM resources for unified platform
"""
from aws_cdk import Stack, CfnOutput, Duration
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_secretsmanager as secretsmanager
from aws_cdk import aws_iam as iam
from aws_cdk import aws_ec2 as ec2
from constructs import Construct


class SecurityStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, stage: str, vpc: ec2.Vpc, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.vpc = vpc
        
        # Create Cognito User Pool for unified platform authentication
        self._create_user_pool()
        
        # Create secrets for external services
        self._create_secrets()
        
        # Create IAM roles for Lambda functions
        self._create_iam_roles()
        
        # Security groups are created in NetworkingStack, not here
        # Remove _create_security_groups() to avoid conflicts
        
        # Create CloudFormation outputs
        self._create_outputs()
        
    def _create_user_pool(self):
        """Create Cognito User Pool for unified platform authentication"""
        self.user_pool = cognito.UserPool(
            self, "UnifiedPlatformUserPool",
            user_pool_name=f"tsa-unified-platform-{self.stage}",
            self_sign_up_enabled=False,  # Users must be invited
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=False),
                given_name=cognito.StandardAttribute(required=True, mutable=True),
                family_name=cognito.StandardAttribute(required=True, mutable=True)
            ),
            custom_attributes={
                "user_role": cognito.StringAttribute(mutable=True),  # "coach", "parent", "admin"
                "coach_level": cognito.StringAttribute(mutable=True),  # "junior", "senior", "lead" (for coaches)
                "specialization": cognito.StringAttribute(mutable=True)  # sport specializations (for coaches)
            },
            password_policy=cognito.PasswordPolicy(
                min_length=8, 
                require_lowercase=True, 
                require_uppercase=True,
                require_digits=True,
                require_symbols=True
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY
        )
        
        # App Client for unified platform frontend
        self.user_pool_client = self.user_pool.add_client(
            "UnifiedPlatformClient",
            user_pool_client_name=f"tsa-unified-platform-client-{self.stage}",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
                admin_user_password=True
            ),
            generate_secret=False,  # For frontend applications
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1), 
            refresh_token_validity=Duration.days(30)
        )
        
    def _create_secrets(self):
        """Create secrets for external service integration"""
        
        # Note: Checkr API secret will be created manually via scripts/setup-checkr-secret.sh
        # Note: GitHub token secret is created in the frontend stack where it's needed
        
    def _create_iam_roles(self):
        """Create IAM roles for Lambda functions"""
        
        # Lambda execution role
        self.lambda_role = iam.Role(
            self, "UnifiedPlatformLambdaRole",
            role_name=f"tsa-unified-platform-lambda-role-{self.stage}",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                )
            ]
        )
        
        # Allow Lambda to access DynamoDB
        self.lambda_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:GetItem",
                    "dynamodb:PutItem", 
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan"
                ],
                resources=["arn:aws:dynamodb:*:*:table/tsa-*"]
            )
        )
        
        # Allow Lambda to access Secrets Manager
        self.lambda_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "secretsmanager:GetSecretValue"
                ],
                resources=[
                    # Secrets will be granted access individually by services that need them
                    "arn:aws:secretsmanager:*:*:secret:tsa/*"
                ]
            )
        )
        
        # Allow Lambda to send emails via SES (for platform notifications)
        self.lambda_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "ses:SendEmail",
                    "ses:SendRawEmail"
                ],
                resources=["*"]
            )
        )
        

        
    def _create_outputs(self):
        """Create CloudFormation outputs"""
        
        CfnOutput(
            self, "UserPoolId", 
            value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID for unified platform authentication",
            export_name=f"UnifiedPlatformUserPoolId-{self.stage}"
        )
        
        CfnOutput(
            self, "UserPoolClientId", 
            value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID for frontend",
            export_name=f"UnifiedPlatformUserPoolClientId-{self.stage}"
        )
        
        CfnOutput(
            self, "LambdaRoleArn", 
            value=self.lambda_role.role_arn,
            description="Lambda execution role ARN",
            export_name=f"UnifiedPlatformLambdaRoleArn-{self.stage}"
        ) 