"""
Frontend Stack for TSA Coach Portal MVP
Handles deployment of the coach portal frontend only
"""
import aws_cdk as cdk
import aws_cdk.aws_amplify_alpha as amplify
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_certificatemanager as acm
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct
from typing import Dict


class FrontendStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, 
                 stage: str, api_endpoints: Dict[str, str], **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        self.api_endpoints = api_endpoints
        
        # Create GitHub token secret for Amplify
        self._create_github_secret()
        
        # Deploy Coach Portal Frontend (Next.js) - MVP Only
        self._create_coach_portal_frontend()
        
    def _create_github_secret(self):
        """Reference existing GitHub token secret for Amplify deployment"""
        self.github_token_secret = secretsmanager.Secret.from_secret_name_v2(
            self, "GitHubTokenSecret",
            secret_name="github-token"
        )
        
    def _create_coach_portal_frontend(self):
        """Create Coach Portal Amplify App"""
        self.coach_portal_app = amplify.App(
            self, "CoachPortalAmplifyApp",
            app_name=f"tsa-platform-frontend-{self.stage}",
            source_code_provider=amplify.GitHubSourceCodeProvider(
                owner="dannygauntletai",
                repository="tsa-platform-frontend",
                oauth_token=self.github_token_secret.secret_value
            ),
            environment_variables={
                # API Endpoints from deployment outputs
                "NEXT_PUBLIC_API_URL": self.api_endpoints["coach_portal"],
                "NEXT_PUBLIC_PASSWORDLESS_AUTH_URL": self.api_endpoints["passwordless_auth"], 
                "NEXT_PUBLIC_ADMIN_API_URL": self.api_endpoints["admin_portal"],
                "NEXT_PUBLIC_STAGE": self.stage,
                "NEXT_PUBLIC_ENVIRONMENT": self.stage,
                "_LIVE_UPDATES": "[]",  # Required for Next.js apps
                
                # Additional environment-specific configs
                "NEXT_PUBLIC_COGNITO_REGION": "us-east-1",
                "NEXT_PUBLIC_APP_NAME": f"TSA Coach Portal ({self.stage.upper()})",
                "NEXT_PUBLIC_SENTRY_ENVIRONMENT": self.stage,
            }
            # Note: Amplify auto-detects Next.js apps and uses appropriate build settings
        )
        
        # Add main branch
        self.coach_branch = self.coach_portal_app.add_branch(
            "main",
            branch_name="main",
            stage="DEVELOPMENT" if self.stage == "dev" else "PRODUCTION"
        )
        
    @property
    def coach_portal_url(self) -> str:
        """Get coach portal URL"""
        return f"https://main.{self.coach_portal_app.app_id}.amplifyapp.com" 