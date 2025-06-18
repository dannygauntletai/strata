import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface LlcIncorporationStackProps extends cdk.StackProps {
  stage: string;
  existingLambdaRoleArn?: string;
}

export class LlcIncorporationStack extends cdk.Stack {
  public readonly llcIncorporationFunction: lambda.Function;
  public readonly dockerImageAsset: ecr_assets.DockerImageAsset;

  constructor(scope: Construct, id: string, props: LlcIncorporationStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Build Docker image asset for LLC incorporation
    // CDK automatically handles ECR repository creation, image building, and pushing
    this.dockerImageAsset = new ecr_assets.DockerImageAsset(this, 'LlcIncorporationImage', {
      directory: path.join(__dirname, '../lambda_llc_incorporation'), // Path to Dockerfile
      platform: ecr_assets.Platform.LINUX_AMD64, // Required for Lambda
      buildArgs: {
        // Pass build arguments if needed
        STAGE: stage,
      },
    });

    // Create IAM role for Lambda function (if not provided)
    const lambdaRole = props.existingLambdaRoleArn 
      ? iam.Role.fromRoleArn(this, 'ExistingLambdaRole', props.existingLambdaRoleArn)
      : new iam.Role(this, 'LlcIncorporationLambdaRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
          ],
          inlinePolicies: {
            LlcIncorporationPolicy: new iam.PolicyDocument({
              statements: [
                // DynamoDB permissions for legal requirements
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: [
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:Query',
                    'dynamodb:Scan'
                  ],
                  resources: [
                    `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/legal-requirements-${stage}`,
                    `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/legal-requirements-${stage}/index/*`
                  ]
                }),
                // S3 permissions for screenshots
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: [
                    's3:PutObject',
                    's3:GetObject',
                    's3:ListBucket'
                  ],
                  resources: [
                    `arn:aws:s3:::tsa-coach-portal${stage}-*`,
                    `arn:aws:s3:::tsa-coach-portal${stage}-*/*`
                  ]
                }),
                // CloudWatch permissions for enhanced logging
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogStreams',
                    'logs:DescribeLogGroups',
                    'cloudwatch:PutMetricData'
                  ],
                  resources: ['*']
                })
              ]
            })
          }
        });

    // Create Lambda function using container image
    const llcFunction = new lambda.Function(this, 'LlcIncorporationFunction', {
      runtime: lambda.Runtime.FROM_IMAGE,
      code: lambda.Code.fromEcrImage(this.dockerImageAsset.repository, {
        tagOrDigest: this.dockerImageAsset.imageTag,
      }),
      handler: lambda.Handler.FROM_IMAGE,
      functionName: `tsa-llc-incorporation-${stage}`,
      description: 'LLC Incorporation automation using Docker + Playwright (CDK deployed)',
      timeout: cdk.Duration.minutes(15), // 15 minutes for browser automation
      memorySize: 3008, // Maximum memory for container images
      environment: {
        STAGE: stage,
        HOME: '/tmp',
        SCREENSHOTS_BUCKET: `tsa-coach-portal${stage}-${cdk.Stack.of(this).account}`,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        PLAYWRIGHT_BROWSERS_PATH: '/tmp/.playwright',
        // Browserbase configuration for remote browser automation
        BROWSERBASE_API_KEY: 'bb_live_uyYQaDlYFBtpWfdiZIkiFfUwLaY', // Updated Browserbase API key
        BROWSERBASE_PROJECT_ID: 'ebd8fa11-2dc8-4797-83c7-b1a3804c1f4b' // Updated Browserbase project ID
      },
      role: lambdaRole,
    });

    // Assign to class property for external access
    this.llcIncorporationFunction = llcFunction;

    // Create API Gateway integration (optional)
    const api = new apigateway.RestApi(this, 'LlcIncorporationApi', {
      restApiName: `LLC Incorporation API - ${stage}`,
      description: 'API for LLC incorporation automation',
      
      // CORS configuration
      defaultCorsPreflightOptions: {
        allowOrigins: stage === 'prod' 
          ? ['https://coach.texassportsacademy.com'] // Production origins only
          : ['http://localhost:3000', 'https://localhost:3000'], // Development origins
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
    });

    // Add LLC incorporation endpoint
    const incorporationResource = api.root.addResource('incorporation');
    incorporationResource.addMethod('POST', new apigateway.LambdaIntegration(llcFunction, {
      requestTemplates: {
        'application/json': `{
          "httpMethod": "$context.httpMethod",
          "body": $input.json('$'),
          "headers": {
            #foreach($header in $input.params().header.keySet())
            "$header": "$util.escapeJavaScript($input.params().header.get($header))"#if($foreach.hasNext),#end
            #end
          }
        }`
      },
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
        },
      }],
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }]
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: llcFunction.functionArn,
      description: 'ARN of the LLC Incorporation Lambda function',
    });

    new cdk.CfnOutput(this, 'DockerImageUri', {
      value: this.dockerImageAsset.imageUri,
      description: 'ECR URI of the Docker image used by Lambda',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint for LLC incorporation',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: llcFunction.functionName,
      description: 'Name of the LLC Incorporation Lambda function for testing',
    });

    // Tags for resource management
    cdk.Tags.of(this).add('Project', 'TexasSportsAcademy');
    cdk.Tags.of(this).add('Component', 'LLCIncorporation');
    cdk.Tags.of(this).add('Stage', stage);
    cdk.Tags.of(this).add('DeploymentMethod', 'CDK');
  }
} 