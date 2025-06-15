import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
export interface LlcIncorporationStackProps extends cdk.StackProps {
    stage: string;
    existingLambdaRoleArn?: string;
}
export declare class LlcIncorporationStack extends cdk.Stack {
    readonly llcIncorporationFunction: lambda.Function;
    readonly dockerImageAsset: ecr_assets.DockerImageAsset;
    constructor(scope: Construct, id: string, props: LlcIncorporationStackProps);
}
