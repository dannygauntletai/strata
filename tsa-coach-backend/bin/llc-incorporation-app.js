#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const llc_incorporation_stack_1 = require("../lib/llc-incorporation-stack");
const app = new cdk.App();
// Get stage from context or environment variable
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
// Create LLC Incorporation stack
new llc_incorporation_stack_1.LlcIncorporationStack(app, `TsaLlcIncorporation-${stage}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGxjLWluY29ycG9yYXRpb24tYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGxjLWluY29ycG9yYXRpb24tYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyw0RUFBdUU7QUFFdkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsaURBQWlEO0FBQ2pELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztBQUU1RSxpQ0FBaUM7QUFDakMsSUFBSSwrQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsdUJBQXVCLEtBQUssRUFBRSxFQUFFO0lBQzdELEtBQUssRUFBRSxLQUFLO0lBRVosNEJBQTRCO0lBQzVCLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0tBQ3REO0lBRUQsb0JBQW9CO0lBQ3BCLFdBQVcsRUFBRSw2Q0FBNkMsS0FBSyxjQUFjO0lBRTdFLDRDQUE0QztJQUM1QyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtDQUM1RCxDQUFDLENBQUM7QUFFSCx1QkFBdUI7QUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3RELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgTGxjSW5jb3Jwb3JhdGlvblN0YWNrIH0gZnJvbSAnLi4vbGliL2xsYy1pbmNvcnBvcmF0aW9uLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gR2V0IHN0YWdlIGZyb20gY29udGV4dCBvciBlbnZpcm9ubWVudCB2YXJpYWJsZVxuY29uc3Qgc3RhZ2UgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdzdGFnZScpIHx8IHByb2Nlc3MuZW52LlNUQUdFIHx8ICdkZXYnO1xuXG4vLyBDcmVhdGUgTExDIEluY29ycG9yYXRpb24gc3RhY2tcbm5ldyBMbGNJbmNvcnBvcmF0aW9uU3RhY2soYXBwLCBgVHNhTGxjSW5jb3Jwb3JhdGlvbi0ke3N0YWdlfWAsIHtcbiAgc3RhZ2U6IHN0YWdlLFxuICBcbiAgLy8gRW52aXJvbm1lbnQgY29uZmlndXJhdGlvblxuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxuICB9LFxuICBcbiAgLy8gU3RhY2sgZGVzY3JpcHRpb25cbiAgZGVzY3JpcHRpb246IGBMTEMgSW5jb3Jwb3JhdGlvbiBEb2NrZXIgTGFtYmRhIFN0YWNrIGZvciAke3N0YWdlfSBlbnZpcm9ubWVudGAsXG4gIFxuICAvLyBVc2UgZXhpc3Rpbmcgcm9sZSBpZiBhdmFpbGFibGUgKG9wdGlvbmFsKVxuICBleGlzdGluZ0xhbWJkYVJvbGVBcm46IHByb2Nlc3MuZW52LkVYSVNUSU5HX0xBTUJEQV9ST0xFX0FSTixcbn0pO1xuXG4vLyBBZGQgc3RhY2stbGV2ZWwgdGFnc1xuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ1Byb2plY3QnLCAnVGV4YXNTcG9ydHNBY2FkZW15Jyk7XG5jZGsuVGFncy5vZihhcHApLmFkZCgnRGVwbG95ZWRCeScsICdDREsnKTsgIl19