"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlcIncorporationStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const ecr_assets = __importStar(require("aws-cdk-lib/aws-ecr-assets"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const path = __importStar(require("path"));
class LlcIncorporationStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // Build Docker image asset for LLC incorporation
        // CDK automatically handles ECR repository creation, image building, and pushing
        this.dockerImageAsset = new ecr_assets.DockerImageAsset(this, 'LlcIncorporationImage', {
            directory: path.join(__dirname, '../lambda_llc_incorporation'),
            platform: ecr_assets.Platform.LINUX_AMD64,
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
                                    `arn:aws:s3:::tsa-coach-portal-v2-${stage}-*`,
                                    `arn:aws:s3:::tsa-coach-portal-v2-${stage}-*/*`
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
            timeout: cdk.Duration.minutes(15),
            memorySize: 3008,
            environment: {
                STAGE: stage,
                HOME: '/tmp',
                SCREENSHOTS_BUCKET: `tsa-coach-portal-v2-${stage}-${cdk.Stack.of(this).account}`,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                PLAYWRIGHT_BROWSERS_PATH: '/tmp/.playwright',
                // Browserbase configuration for remote browser automation
                BROWSERBASE_API_KEY: 'bb_live_7pKTZT6HJVHqFKMDCW3bZa41nqoAmqFACE4GGqJU8Ky5QJWz6Pz1dCJt5n5qKOsquwJxzJrG3L',
                BROWSERBASE_PROJECT_ID: 'ab6e2b4a-1ec3-4e0a-9327-1e3e3a4a77b8' // Browserbase project ID
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
                    : ['http://localhost:3000', 'https://localhost:3000'],
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
exports.LlcIncorporationStack = LlcIncorporationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGxjLWluY29ycG9yYXRpb24tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsbGMtaW5jb3Jwb3JhdGlvbi1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQywrREFBaUQ7QUFDakQsdUVBQXlEO0FBQ3pELHlEQUEyQztBQUMzQyx1RUFBeUQ7QUFFekQsMkNBQTZCO0FBTzdCLE1BQWEscUJBQXNCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQztRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXhCLGlEQUFpRDtRQUNqRCxpRkFBaUY7UUFDakYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNyRixTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNkJBQTZCLENBQUM7WUFDOUQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVztZQUN6QyxTQUFTLEVBQUU7Z0JBQ1QsaUNBQWlDO2dCQUNqQyxLQUFLLEVBQUUsS0FBSzthQUNiO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsd0RBQXdEO1FBQ3hELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxxQkFBcUI7WUFDNUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLENBQUMscUJBQXFCLENBQUM7WUFDL0UsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7Z0JBQy9DLFNBQVMsRUFBRSxJQUFJLEdB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LENBQUMsQ0FBQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBL0tELHNEQStLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGVjcl9hc3NldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjci1hc3NldHMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGxjSW5jb3Jwb3JhdGlvblN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIGV4aXN0aW5nTGFtYmRhUm9sZUFybj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIExsY0luY29ycG9yYXRpb25TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBsbGNJbmNvcnBvcmF0aW9uRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGRvY2tlckltYWdlQXNzZXQ6IGVjcl9hc3NldHMuRG9ja2VySW1hZ2VBc3NldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGxjSW5jb3Jwb3JhdGlvblN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgc3RhZ2UgfSA9IHByb3BzO1xuXG4gICAgLy8gQnVpbGQgRG9ja2VyIGltYWdlIGFzc2V0IGZvciBMTEMgaW5jb3Jwb3JhdGlvblxuICAgIC8vIENESyBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgRUNSIHJlcG9zaXRvcnkgY3JlYXRpb24sIGltYWdlIGJ1aWxkaW5nLCBhbmQgcHVzaGluZ1xuICAgIHRoaXMuZG9ja2VySW1hZ2VBc3NldCA9IG5ldyBlY3JfYXNzZXRzLkRvY2tlckltYWdlQXNzZXQodGhpcywgJ0xsY0luY29ycG9yYXRpb25JbWFnZScsIHtcbiAgICAgIGRpcmVjdG9yeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYV9sbGNfaW5jb3Jwb3JhdGlvbicpLCAvLyBQYXRoIHRvIERvY2tlcmZpbGVcbiAgICAgIHBsYXRmb3JtOiBlY3JfYXNzZXRzLlBsYXRmb3JtLkxJTlVYX0FNRDY0LCAvLyBSZXF1aXJlZCBmb3IgTGFtYmRhXG4gICAgICBidWlsZEFyZ3M6IHtcbiAgICAgICAgLy8gUGFzcyBidWlsZCBhcmd1bWVudHMgaWYgbmVlZGVkXG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIExhbWJkYSBmdW5jdGlvbiAoaWYgbm90IHByb3ZpZGVkKVxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBwcm9wcy5leGlzdGluZ0xhbWJkYVJvbGVBcm4gXG4gICAgICA/IGlhbS5Sb2xlLmZyb21Sb2xlQXJuKHRoaXMsICdFeGlzdGluZ0xhbWJkYVJvbGUnLCBwcm9wcy5leGlzdGluZ0xhbWJkYVJvbGVBcm4pXG4gICAgICA6IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGxjSW5jb3Jwb3JhdGlvbkxhbWJkYVJvbGUnLCB7XG4gICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICAgICBMbGNJbmNvcnBvcmF0aW9uUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgIC8vIER5bmFtb0RCIHBlcm1pc3Npb25zIGZvciBsZWdhbCByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJ1xuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259OiR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9OnRhYmxlL2xlZ2FsLXJlcXVpcmVtZW50cy0ke3N0YWdlfWAsXG4gICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06dGFibGUvbGVnYWwtcmVxdWlyZW1lbnRzLSR7c3RhZ2V9L2luZGV4LypgXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgLy8gUzMgcGVybWlzc2lvbnMgZm9yIHNjcmVlbnNob3RzXG4gICAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICdzMzpMaXN0QnVja2V0J1xuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICBgYXJuOmF3czpzMzo6OnRzYS1jb2FjaC1wb3J0YWwtdjItJHtzdGFnZX0tKmAsXG4gICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOnMzOjo6dHNhLWNvYWNoLXBvcnRhbC12Mi0ke3N0YWdlfS0qLypgXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgLy8gQ2xvdWRXYXRjaCBwZXJtaXNzaW9ucyBmb3IgZW5oYW5jZWQgbG9nZ2luZ1xuICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXG4gICAgICAgICAgICAgICAgICAgICdjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBMYW1iZGEgZnVuY3Rpb24gdXNpbmcgY29udGFpbmVyIGltYWdlXG4gICAgY29uc3QgbGxjRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMbGNJbmNvcnBvcmF0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5GUk9NX0lNQUdFLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUVjckltYWdlKHRoaXMuZG9ja2VySW1hZ2VBc3NldC5yZXBvc2l0b3J5LCB7XG4gICAgICAgIHRhZ09yRGlnZXN0OiB0aGlzLmRvY2tlckltYWdlQXNzZXQuaW1hZ2VUYWcsXG4gICAgICB9KSxcbiAgICAgIGhhbmRsZXI6IGxhbWJkYS5IYW5kbGVyLkZST01fSU1BR0UsXG4gICAgICBmdW5jdGlvbk5hbWU6IGB0c2EtbGxjLWluY29ycG9yYXRpb24tJHtzdGFnZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdMTEMgSW5jb3Jwb3JhdGlvbiBhdXRvbWF0aW9uIHVzaW5nIERvY2tlciArIFBsYXl3cmlnaHQgKENESyBkZXBsb3llZCknLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyAxNSBtaW51dGVzIGZvciBicm93c2VyIGF1dG9tYXRpb25cbiAgICAgIG1lbW9yeVNpemU6IDMwMDgsIC8vIE1heGltdW0gbWVtb3J5IGZvciBjb250YWluZXIgaW1hZ2VzXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIEhPTUU6ICcvdG1wJyxcbiAgICAgICAgU0NSRUVOU0hPVFNfQlVDS0VUOiBgdHNhLWNvYWNoLXBvcnRhbC12Mi0ke3N0YWdlfS0ke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fWAsXG4gICAgICAgIEFXU19OT0RFSlNfQ09OTkVDVElPTl9SRVVTRV9FTkFCTEVEOiAnMScsXG4gICAgICAgIFBMQVlXUklHSFRfQlJPV1NFUlNfUEFUSDogJy90bXAvLnBsYXl3cmlnaHQnLFxuICAgICAgICAvLyBCcm93c2VyYmFzZSBjb25maWd1cmF0aW9uIGZvciByZW1vdGUgYnJvd3NlciBhdXRvbWF0aW9uXG4gICAgICAgIEJST1dTRVJCQVNFX0FQSV9LRVk6ICdiYl9saXZlXzdwS1RaVDZISlZIcUZLTURDVzNiWmE0MW5xb0FtcUZBQ0U0R0dxSlU4S3k1UUpXejZQejFkQ0p0NW41cUtPc3F1d0p4ekpyRzNMJywgLy8gQnJvd3NlcmJhc2UgQVBJIGtleVxuICAgICAgICBCUk9XU0VSQkFTRV9QUk9KRUNUX0lEOiAnYWI2ZTJiNGEtMWVjMy00ZTBhLTkzMjctMWUzZTNhNGE3N2I4JyAvLyBCcm93c2VyYmFzZSBwcm9qZWN0IElEXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICB9KTtcblxuICAgIC8vIEFzc2lnbiB0byBjbGFzcyBwcm9wZXJ0eSBmb3IgZXh0ZXJuYWwgYWNjZXNzXG4gICAgdGhpcy5sbGNJbmNvcnBvcmF0aW9uRnVuY3Rpb24gPSBsbGNGdW5jdGlvbjtcblxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheSBpbnRlZ3JhdGlvbiAob3B0aW9uYWwpXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnTGxjSW5jb3Jwb3JhdGlvbkFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgTExDIEluY29ycG9yYXRpb24gQVBJIC0gJHtzdGFnZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIExMQyBpbmNvcnBvcmF0aW9uIGF1dG9tYXRpb24nLFxuICAgICAgXG4gICAgICAvLyBDT1JTIGNvbmZpZ3VyYXRpb25cbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgXG4gICAgICAgICAgPyBbJ2h0dHBzOi8vY29hY2gudGV4YXNzcG9ydHNhY2FkZW15LmNvbSddIC8vIFByb2R1Y3Rpb24gb3JpZ2lucyBvbmx5XG4gICAgICAgICAgOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsICdodHRwczovL2xvY2FsaG9zdDozMDAwJ10sIC8vIERldmVsb3BtZW50IG9yaWdpbnNcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ09QVElPTlMnXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtUmVxdWVzdGVkLVdpdGgnXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgTExDIGluY29ycG9yYXRpb24gZW5kcG9pbnRcbiAgICBjb25zdCBpbmNvcnBvcmF0aW9uUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5jb3Jwb3JhdGlvbicpO1xuICAgIGluY29ycG9yYXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihsbGNGdW5jdGlvbiwge1xuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGB7XG4gICAgICAgICAgXCJodHRwTWV0aG9kXCI6IFwiJGNvbnRleHQuaHR0cE1ldGhvZFwiLFxuICAgICAgICAgIFwiYm9keVwiOiAkaW5wdXQuanNvbignJCcpLFxuICAgICAgICAgIFwiaGVhZGVyc1wiOiB7XG4gICAgICAgICAgICAjZm9yZWFjaCgkaGVhZGVyIGluICRpbnB1dC5wYXJhbXMoKS5oZWFkZXIua2V5U2V0KCkpXG4gICAgICAgICAgICBcIiRoZWFkZXJcIjogXCIkdXRpbC5lc2NhcGVKYXZhU2NyaXB0KCRpbnB1dC5wYXJhbXMoKS5oZWFkZXIuZ2V0KCRoZWFkZXIpKVwiI2lmKCRmb3JlYWNoLmhhc05leHQpLCNlbmRcbiAgICAgICAgICAgICNlbmRcbiAgICAgICAgICB9XG4gICAgICAgIH1gXG4gICAgICB9LFxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICB9LFxuICAgICAgfV0sXG4gICAgfSksIHtcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRGb3JtYXRpb24gb3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFGdW5jdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiBsbGNGdW5jdGlvbi5mdW5jdGlvbkFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBMTEMgSW5jb3Jwb3JhdGlvbiBMYW1iZGEgZnVuY3Rpb24nLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RvY2tlckltYWdlVXJpJywge1xuICAgICAgdmFsdWU6IHRoaXMuZG9ja2VySW1hZ2VBc3NldC5pbWFnZVVyaSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNSIFVSSSBvZiB0aGUgRG9ja2VyIGltYWdlIHVzZWQgYnkgTGFtYmRhJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBlbmRwb2ludCBmb3IgTExDIGluY29ycG9yYXRpb24nLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xhbWJkYUZ1bmN0aW9uTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsbGNGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIExMQyBJbmNvcnBvcmF0aW9uIExhbWJkYSBmdW5jdGlvbiBmb3IgdGVzdGluZycsXG4gICAgfSk7XG5cbiAgICAvLyBUYWdzIGZvciByZXNvdXJjZSBtYW5hZ2VtZW50XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ1RleGFzU3BvcnRzQWNhZGVteScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQ29tcG9uZW50JywgJ0xMQ0luY29ycG9yYXRpb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1N0YWdlJywgc3RhZ2UpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRGVwbG95bWVudE1ldGhvZCcsICdDREsnKTtcbiAgfVxufSAiXX0=