"""
Shared Lambda Layer for TSA Platform
Provides common utilities for all Lambda functions across all services

Key Features:
- CORS-free API responses (API Gateway handles CORS)
- Centralized ID mapping (email ↔ profile_id)
- Standardized error handling and validation
- Consistent data models across all services
- Security-first input validation
"""
from aws_cdk import aws_lambda as lambda_
from constructs import Construct


class SharedLambdaLayer(Construct):
    """Shared Lambda layer containing common utilities for all TSA services"""
    
    def __init__(self, scope: Construct, construct_id: str, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.stage = stage
        
        # Create the shared utilities layer
        self.utilities_layer = lambda_.LayerVersion(
            self, "TSASharedUtilitiesLayer",
            layer_version_name=f"tsa-shared-utilities-{stage}",
            code=lambda_.Code.from_asset("layers/tsa-shared-utilities"),
            compatible_runtimes=[
                lambda_.Runtime.PYTHON_3_9,
                lambda_.Runtime.PYTHON_3_10,
                lambda_.Runtime.PYTHON_3_11
            ],
            description=f"TSA shared utilities layer - CORS-free API responses, centralized models, ID mapping - {stage}",
            removal_policy=lambda_.RemovalPolicy.RETAIN if stage == 'prod' else lambda_.RemovalPolicy.DESTROY
        )
        
        # Export the layer ARN for use by other stacks
        from aws_cdk import CfnOutput
        CfnOutput(
            self, "SharedUtilitiesLayerArn",
            value=self.utilities_layer.layer_version_arn,
            description=f"ARN of the TSA shared utilities layer ({stage})",
            export_name=f"TSASharedUtilitiesLayer-{stage}"
        )
    
    @property
    def layer(self) -> lambda_.LayerVersion:
        """Get the shared utilities layer"""
        return self.utilities_layer
    
    @property
    def layer_arn(self) -> str:
        """Get the shared utilities layer ARN"""
        return self.utilities_layer.layer_version_arn 