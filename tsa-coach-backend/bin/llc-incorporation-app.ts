#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LlcIncorporationStack } from '../lib/llc-incorporation-stack';

const app = new cdk.App();

// Get stage from context or environment variable
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

// Create LLC Incorporation stack
new LlcIncorporationStack(app, `TsaLlcIncorporation-${stage}`, {
  stage: stage,
  
  // Environment configuration
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
  },
  
  // Stack description
  description: `LLC Incorporation Docker Lambda Stack for ${stage} environment`,
  
  // Use existing role if available (optional)
  existingLambdaRoleArn: process.env.EXISTING_LAMBDA_ROLE_ARN,
});

// Add stack-level tags
cdk.Tags.of(app).add('Project', 'TexasSportsAcademy');
cdk.Tags.of(app).add('DeployedBy', 'CDK'); 