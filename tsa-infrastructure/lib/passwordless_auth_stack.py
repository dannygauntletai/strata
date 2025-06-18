"""
Passwordless Authentication Stack - Python Implementation
Uses core AWS services for magic link email authentication
JWT-based magic links - no DynamoDB storage required
"""
import os
import time
import random
from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_logs as logs,
    aws_ssm as ssm,
    aws_secretsmanager as secretsmanager,
    BundlingOptions,
    RemovalPolicy,
)
from constructs import Construct
from typing import Dict, Any
from .shared.table_names import get_resource_config


class PasswordlessAuthStack(Stack):
    """Python implementation of passwordless email authentication with JWT tokens"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 stage: str, domain_name: str = "sportsacademy.tech",
                 frontend_url: str = None, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.domain_name = domain_name
        self.frontend_url = frontend_url or f"https://coach.{domain_name}"
        
        # Get centralized table configuration
        self.table_config = get_resource_config(stage)
        
        # Create core authentication resources
        self._create_user_pool()
        self._create_jwt_secret()
        self._create_sendgrid_secret()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_outputs()
    
    def _create_user_pool(self):
        """Create Cognito User Pool for passwordless authentication"""
        
        # Create User Pool
        self.user_pool = cognito.UserPool(
            self, "TSAUserPool",
            user_pool_name=f"tsa-unified-{self.stage}",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True),
                given_name=cognito.StandardAttribute(required=False),
                family_name=cognito.StandardAttribute(required=False),
            ),
            custom_attributes={
                "coach_id": cognito.StringAttribute(min_len=1, max_len=256),
                "role_type": cognito.StringAttribute(min_len=1, max_len=100),
                "user_role": cognito.StringAttribute(min_len=1, max_len=100),
            },
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY
        )
        
        # Create User Pool Client
        self.user_pool_client = cognito.UserPoolClient(
            self, "TSAUserPoolClient",
            user_pool=self.user_pool,
            user_pool_client_name=f"tsa-unified-client-{self.stage}",
            auth_flows=cognito.AuthFlow(
                admin_user_password=True,
                custom=True,
                user_password=True,
                user_srp=True,
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO
            ],
            read_attributes=cognito.ClientAttributes()
            .with_standard_attributes(
                email=True,
                email_verified=True,
                given_name=True,
                family_name=True
            ),
            write_attributes=cognito.ClientAttributes()
            .with_standard_attributes(
                email=True,
                given_name=True,
                family_name=True
            ),
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1),
            refresh_token_validity=Duration.days(30),
            prevent_user_existence_errors=True,
        )
        
        # ✅ ARCHITECTURAL FIX: Let CloudFormation manage domain lifecycle properly
        # Use consistent naming and let CDK/CloudFormation handle "exists vs create" logic
        domain_prefix = f"tsa-unified-{self.stage}"
        
        self.user_pool_domain = cognito.UserPoolDomain(
            self, "TSAUserPoolDomain",
            user_pool=self.user_pool,
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix=domain_prefix
            )
        )
    
    def _create_jwt_secret(self):
        """Create or import JWT signing secret"""
        
        # Create or import JWT secret for signing magic link tokens
        secret_name = f"tsa-jwt-secret-{self.stage}"
        
        try:
            # Try to import existing secret
            self.jwt_secret = secretsmanager.Secret.from_secret_name_v2(
                self, "JWTSecret",
                secret_name=secret_name
            )
            print(f"✅ Imported existing JWT secret: {secret_name}")
        except Exception:
            # Create new secret if import fails
            self.jwt_secret = secretsmanager.Secret(
                self, "JWTSecret",
                secret_name=secret_name,
                description="JWT signing secret for TSA magic links",
                generate_secret_string=secretsmanager.SecretStringGenerator(
                    secret_string_template='{"jwt_secret": "PLACEHOLDER_REPLACE_WITH_SECURE_KEY"}',
                    generate_string_key="jwt_secret",
                    exclude_characters=" %+~`#$&*()|[]{}:;<>?!'/\"\\",
                    include_space=False,
                    password_length=64  # Strong JWT secret
                )
            )
            print(f"✅ Created new JWT secret: {secret_name}")
    
    def _create_sendgrid_secret(self):
        """Create or import the SendGrid API key secret"""
        
        # Try to import existing secret first, create if it doesn't exist
        secret_name = f"tsa-sendgrid-api-key-{self.stage}"
        
        try:
            # Try to import existing secret
            self.sendgrid_secret = secretsmanager.Secret.from_secret_name_v2(
                self, "SendGridAPIKeySecret",
                secret_name=secret_name
            )
            print(f"✅ Imported existing SendGrid secret: {secret_name}")
        except Exception:
            # Create new secret if import fails
            self.sendgrid_secret = secretsmanager.Secret(
                self, "SendGridAPIKeySecret",
                secret_name=secret_name,
                description="SendGrid API key for TSA email sending",
                generate_secret_string=secretsmanager.SecretStringGenerator(
                    secret_string_template='{"api_key": "PLACEHOLDER_REPLACE_WITH_REAL_KEY"}',
                    generate_string_key="api_key",
                    exclude_characters=" %+~`#$&*()|[]{}:;<>?!'/\"\\",
                    include_space=False,
                    password_length=32
                )
            )
            print(f"✅ Created new SendGrid secret: {secret_name}")
    
    def _create_lambda_functions(self):
        """Create Lambda functions for passwordless auth flow"""
        
        # Common Lambda configuration
        lambda_config = {
            "runtime": lambda_.Runtime.PYTHON_3_9,
            "timeout": Duration.seconds(30),
            "memory_size": 512,
            "environment": {
                "USER_POOL_ID": self.user_pool.user_pool_id,
                "CLIENT_ID": self.user_pool_client.user_pool_client_id,
                "TSA_INVITATIONS_TABLE": self.table_config.get_table_name("coach-invitations"),  # Coach invitations table
                "PARENT_INVITATIONS_TABLE": self.table_config.get_table_name("parent-invitations"),  # Parent invitations table
                "FRONTEND_URL": self.frontend_url,
                "ADMIN_FRONTEND_URL": f"https://admin.{self.domain_name}" if self.stage == 'prod' else "http://localhost:3001",
                "LOG_LEVEL": "INFO",
                # JWT configuration
                "JWT_SECRET_ARN": self.jwt_secret.secret_arn,
                # SendGrid configuration
                "SENDGRID_SECRET_ARN": self.sendgrid_secret.secret_arn,
                "SENDGRID_FROM_EMAIL": "no-reply@strata.school",  # Correct domain
                "SENDGRID_FROM_NAME": "Texas Sports Academy",
                # Admin configuration
                "ADMIN_EMAILS": "admin@sportsacademy.tech,danny.mota@superbuilders.school,malekai.mischke@superbuilders.school",
            }
        }
        
        # Magic Link Generator Function
        self.magic_link_function = lambda_.Function(
            self, "MagicLinkHandler",
            function_name=self.table_config.get_lambda_names()["auth_magic_link"],
            code=lambda_.Code.from_asset(
                "../tsa-auth-backend",
                bundling=BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_9.bundling_image,
                    command=[
                        "bash", "-c",
                        "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output"
                    ],
                )
            ),
            handler="magic_link_handler.lambda_handler",
            **lambda_config
        )
        
        # Token Verification Function
        self.verify_token_function = lambda_.Function(
            self, "VerifyTokenHandler", 
            function_name=self.table_config.get_lambda_names()["auth_verify_token"],
            code=lambda_.Code.from_asset(
                "../tsa-auth-backend",
                bundling=BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_9.bundling_image,
                    command=[
                        "bash", "-c",
                        "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output"
                    ],
                )
            ),
            handler="verify_token_handler.lambda_handler",
            **lambda_config
        )
        
        # Grant permissions
        self._grant_lambda_permissions()
    
    def _grant_lambda_permissions(self):
        """Grant necessary permissions to Lambda functions"""
        
        # DynamoDB permissions for invitations tables only
        dynamodb_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            resources=[
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('coach-invitations')}",  # Coach invitations table
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('coach-invitations')}/index/*",  # Coach invitations GSI
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('parent-invitations')}",  # Parent invitations table
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('parent-invitations')}/index/*",  # Parent invitations GSI
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('profiles')}",  # Profiles table
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.table_config.get_table_name('profiles')}/index/*"  # Profiles GSI
            ]
        )
        
        self.magic_link_function.add_to_role_policy(dynamodb_policy)
        self.verify_token_function.add_to_role_policy(dynamodb_policy)
        
        # Cognito permissions
        cognito_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminUpdateUserAttributes",
                "cognito-idp:AdminInitiateAuth",
                "cognito-idp:AdminRespondToAuthChallenge",
                "cognito-idp:DescribeUserPool",
            ],
            resources=[self.user_pool.user_pool_arn]
        )
        
        self.magic_link_function.add_to_role_policy(cognito_policy)
        self.verify_token_function.add_to_role_policy(cognito_policy)
        
        # JWT secret permissions
        self.jwt_secret.grant_read(self.magic_link_function)
        self.jwt_secret.grant_read(self.verify_token_function)
        
        # SendGrid secret permissions
        self.sendgrid_secret.grant_read(self.magic_link_function)
        self.sendgrid_secret.grant_read(self.verify_token_function)
        
        # SSM Parameter Store permissions for admin emails
        ssm_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            resources=[
                f"arn:aws:ssm:{self.region}:{self.account}:parameter/tsa/admin/authorized-emails"
            ]
        )
        
        self.magic_link_function.add_to_role_policy(ssm_policy)
        self.verify_token_function.add_to_role_policy(ssm_policy)
    
    def _create_api_gateway(self):
        """Create API Gateway for auth endpoints"""
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "PasswordlessAPI",
            rest_api_name=self.table_config.get_api_names()["auth"],
            description="TSA Authentication API with JWT-based magic links",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
            ),
            deploy_options=apigateway.StageOptions(
                stage_name=self.stage,
                throttling_rate_limit=100,
                throttling_burst_limit=200
            )
        )
        
        # Create auth resource
        auth_resource = self.api.root.add_resource("auth")
        
        # Magic link endpoint
        magic_link_resource = auth_resource.add_resource("magic-link")
        magic_link_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(self.magic_link_function),
            authorization_type=apigateway.AuthorizationType.NONE
        )
        
        # Token verification endpoint
        verify_resource = auth_resource.add_resource("verify")
        verify_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(self.verify_token_function),
            authorization_type=apigateway.AuthorizationType.NONE
        )
        
        # Health check endpoint
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method(
            "GET",
            apigateway.LambdaIntegration(self.magic_link_function),
            authorization_type=apigateway.AuthorizationType.NONE
        )
        
        # Grant API Gateway permissions to invoke Lambda functions
        self._grant_api_gateway_permissions()
        
        # SSM parameter /tsa/{stage}/api-urls/auth managed externally
        # See scripts/manage-ssm-parameters.sh for parameter management
        # This prevents CloudFormation "parameter already exists" conflicts
    
    def _grant_api_gateway_permissions(self):
        """Grant API Gateway permissions to invoke Lambda functions"""
        
        # Grant permissions for magic link handler
        self.magic_link_function.add_permission(
            "MagicLinkAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*"
        )
        
        # Grant permissions for verify token handler
        self.verify_token_function.add_permission(
            "VerifyTokenAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*"
        )
    
    def _create_outputs(self):
        """Create CloudFormation outputs"""
        
        # API Gateway URL
        CfnOutput(
            self, "PasswordlessApiUrl",
            value=self.api.url,
            description="TSA Passwordless Authentication API URL"
        )
        
        # Cognito User Pool outputs
        CfnOutput(
            self, "UserPoolId",
            value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID"
        )
        
        CfnOutput(
            self, "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID"
        )
        
        CfnOutput(
            self, "UserPoolArn",
            value=self.user_pool.user_pool_arn,
            description="Cognito User Pool ARN"
        )
        
        CfnOutput(
            self, "UserPoolDomainUrl",
            value=f"https://{self.user_pool_domain.domain_name}.auth.{self.region}.amazoncognito.com",
            description="Cognito User Pool Domain URL"
        )
        
        # Export values for other stacks
        CfnOutput(
            self, "PasswordlessAPIEndpoint",
            value=self.api.url,
            export_name=f"PasswordlessAPIEndpoint-{self.stage}"
        )
    
    def get_shared_resources(self) -> Dict[str, Any]:
        """Get shared resources for other stacks"""
        return {
            "user_pool": self.user_pool,
            "user_pool_client": self.user_pool_client,
            "api": self.api,
            "jwt_secret": self.jwt_secret,
            "sendgrid_secret": self.sendgrid_secret
        } 