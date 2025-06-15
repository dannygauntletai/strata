"""
Passwordless Authentication Stack - Python Implementation
Uses core AWS services for magic link email authentication
"""
import os
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
)
from constructs import Construct
from typing import Dict, Any


class PasswordlessAuthStack(Stack):
    """Python implementation of passwordless email authentication"""
    
    def __init__(self, scope: Construct, construct_id: str, 
                 stage: str, domain_name: str = "sportsacademy.tech",
                 frontend_url: str = None, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.domain_name = domain_name
        self.frontend_url = frontend_url or f"https://coach.{domain_name}"
        
        # Create core authentication resources
        self._create_user_pool()
        self._create_magic_link_storage()
        self._create_sendgrid_secret()
        self._create_lambda_functions()
        self._create_api_gateway()
        self._create_outputs()
    
    def _create_user_pool(self):
        """Create Cognito User Pool for passwordless authentication"""
        
        # Create User Pool
        self.user_pool = cognito.UserPool(
            self, "TSAUserPool",
            user_pool_name=f"tsa-unified-v1-{self.stage}",
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
            user_pool_client_name=f"tsa-unified-client-v1-{self.stage}",
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
        
        # Add custom domain
        self.user_pool_domain = cognito.UserPoolDomain(
            self, "TSAUserPoolDomain",
            user_pool=self.user_pool,
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix=f"tsa-unified-v1-{self.stage}"
            )
        )
    
    def _create_magic_link_storage(self):
        """Create or import DynamoDB table for magic link tokens"""
        
        table_name = f"tsa-magic-links-v1-{self.stage}"
        
        try:
            # Try to import existing table
            self.magic_links_table = dynamodb.Table.from_table_name(
                self, "MagicLinksTable",
                table_name=table_name
            )
            print(f"✅ Imported existing DynamoDB table: {table_name}")
        except Exception:
            # Create new table if import fails
            self.magic_links_table = dynamodb.Table(
                self, "MagicLinksTable",
                table_name=table_name,
                partition_key=dynamodb.Attribute(
                    name="token_id",
                    type=dynamodb.AttributeType.STRING
                ),
                billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
                time_to_live_attribute="expires_at",  # Auto-cleanup expired tokens
                point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                    point_in_time_recovery_enabled=True
                ),
            )
            
            # Add GSI for email lookups (only for new tables)
            self.magic_links_table.add_global_secondary_index(
                index_name="email-index",
                partition_key=dynamodb.Attribute(
                    name="email",
                    type=dynamodb.AttributeType.STRING
                )
            )
            print(f"✅ Created new DynamoDB table: {table_name}")
    
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
                "MAGIC_LINKS_TABLE": self.magic_links_table.table_name,
                "TSA_INVITATIONS_TABLE": f"invitations-v1-{self.stage}",  # Coach invitations table
                "PARENT_INVITATIONS_TABLE": f"coach-parent-invitations-v1-{self.stage}",  # Parent invitations table
                "FRONTEND_URL": self.frontend_url,
                "ADMIN_FRONTEND_URL": f"https://admin.{self.domain_name}" if self.stage == 'prod' else "http://localhost:3001",
                "LOG_LEVEL": "INFO",
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
            function_name=f"tsa-magic-link-v1-{self.stage}",
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
            function_name=f"tsa-verify-token-v1-{self.stage}",
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
        
        # DynamoDB permissions - base table access
        self.magic_links_table.grant_read_write_data(self.magic_link_function)
        self.magic_links_table.grant_read_write_data(self.verify_token_function)
        
        # Additional DynamoDB permissions for GSI queries
        dynamodb_gsi_policy = iam.PolicyStatement(
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
                self.magic_links_table.table_arn,
                f"{self.magic_links_table.table_arn}/index/*",  # GSI permissions
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/invitations-v1-{self.stage}",  # Coach invitations table
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/invitations-v1-{self.stage}/index/*",  # Coach invitations GSI
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/coach-parent-invitations-v1-{self.stage}",  # Parent invitations table
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/coach-parent-invitations-v1-{self.stage}/index/*"  # Parent invitations GSI
            ]
        )
        
        self.magic_link_function.add_to_role_policy(dynamodb_gsi_policy)
        self.verify_token_function.add_to_role_policy(dynamodb_gsi_policy)
        
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
        
        # Note: SES permissions removed - migrated to SendGrid
        # SendGrid uses API key authentication, no AWS IAM permissions needed
    
    def _create_api_gateway(self):
        """Create API Gateway for passwordless authentication"""
        
        # Create or import log group
        log_group_name = f"/aws/apigateway/tsa-passwordless-v1-{self.stage}"
        
        try:
            # Try to import existing log group
            log_group = logs.LogGroup.from_log_group_name(
                self, "PasswordlessAPILogs",
                log_group_name=log_group_name
            )
            print(f"✅ Imported existing log group: {log_group_name}")
        except Exception:
            # Create new log group if import fails
            log_group = logs.LogGroup(
                self, "PasswordlessAPILogs",
                log_group_name=log_group_name,
            )
            print(f"✅ Created new log group: {log_group_name}")
        
        # Create API Gateway
        self.api = apigateway.RestApi(
            self, "PasswordlessAPI",
            rest_api_name=f"TSA Unified Passwordless Auth API - {self.stage}",
            description="Unified passwordless email authentication for all TSA user types (coach, parent, admin)",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=[
                    f"https://coach.{self.domain_name}",
                    f"https://app.{self.domain_name}",
                    "http://localhost:3000",
                    "http://localhost:3001",  # Admin frontend
                    "http://localhost:5173",
                    "http://localhost:8080",
                ],
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "X-Amz-Date", 
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token"
                ]
            ),
            deploy_options=apigateway.StageOptions(
                stage_name="v1",
                access_log_destination=apigateway.LogGroupLogDestination(log_group),
                access_log_format=apigateway.AccessLogFormat.json_with_standard_fields(
                    caller=True,
                    http_method=True,
                    ip=True,
                    protocol=True,
                    request_time=True,
                    resource_path=True,
                    response_length=True,
                    status=True,
                    user=True
                )
            )
        )
        
        # Create integrations
        magic_link_integration = apigateway.LambdaIntegration(self.magic_link_function)
        verify_token_integration = apigateway.LambdaIntegration(self.verify_token_function)
        
        # Auth endpoints
        auth_resource = self.api.root.add_resource("auth")
        
        # Send magic link
        magic_link_resource = auth_resource.add_resource("magic-link")
        magic_link_resource.add_method("POST", magic_link_integration)
        
        # Verify token  
        verify_resource = auth_resource.add_resource("verify")
        verify_resource.add_method("POST", verify_token_integration)
        
        # Health check
        health_resource = self.api.root.add_resource("health")
        health_resource.add_method("GET", magic_link_integration)
        
        # Grant API Gateway permissions after API is created
        self._grant_api_gateway_permissions()
    
    def _grant_api_gateway_permissions(self):
        """Grant necessary permissions to API Gateway"""
        
        # Grant API Gateway invoke permissions
        self.magic_link_function.add_permission(
            "MagicLinkAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
        
        self.verify_token_function.add_permission(
            "VerifyTokenAPIGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"{self.api.arn_for_execute_api()}/*/*/*"
        )
    
    def _create_outputs(self):
        """Create CloudFormation outputs"""
        
        CfnOutput(
            self, "UserPoolId",
            value=self.user_pool.user_pool_id,
            description="Unified Cognito User Pool ID for all TSA user types (coach, parent, admin)",
            export_name=f"{self.stage}-TSAUserPoolId"
        )
        
        CfnOutput(
            self, "UserPoolClientId", 
            value=self.user_pool_client.user_pool_client_id,
            description="Unified Cognito User Pool Client ID for passwordless auth",
            export_name=f"{self.stage}-TSAUserPoolClientId"
        )
        
        CfnOutput(
            self, "UserPoolArn",
            value=self.user_pool.user_pool_arn,
            description="Unified Cognito User Pool ARN",
            export_name=f"{self.stage}-TSAUserPoolArn"
        )
        
        CfnOutput(
            self, "PasswordlessApiUrl",
            value=self.api.url,
            description="Unified Passwordless API URL for magic links (all user types)",
            export_name=f"{self.stage}-TSAPasswordlessApiUrl"
        )
        
        CfnOutput(
            self, "UserPoolDomainUrl",
            value=f"https://{self.user_pool_domain.domain_name}.auth.{self.region}.amazoncognito.com",
            description="Unified Cognito User Pool Domain URL",
            export_name=f"{self.stage}-TSAUserPoolDomainUrl"
        )
        
        # Export API URL to SSM Parameter Store for runtime discovery
        ssm.StringParameter(
            self, "PasswordlessAuthApiUrlParameter",
            parameter_name=f"/tsa-coach/{self.stage}/api-urls/passwordlessAuth",
            string_value=self.api.url,
            description=f"Auto-managed Passwordless Auth API URL for {self.stage} environment"
        )
    
    def get_shared_resources(self) -> Dict[str, Any]:
        """Get shared resources for use in other stacks"""
        return {
            "user_pool": self.user_pool,
            "user_pool_client": self.user_pool_client,
            "user_pool_id": self.user_pool.user_pool_id,
            "user_pool_arn": self.user_pool.user_pool_arn,
            "passwordless_api_url": self.api.url,
            "magic_links_table": self.magic_links_table,
            "sendgrid_secret": self.sendgrid_secret,
            "sendgrid_secret_arn": self.sendgrid_secret.secret_arn,
        } 