#!/usr/bin/env node

/**
 * Update Centralized API Configuration
 * Updates shared-config/api-endpoints.json with current CDK deployment outputs
 * Run this after CDK deployments to keep all frontends in sync
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'shared-config', 'api-endpoints.json');

/**
 * Get CloudFormation stack output
 */
function getStackOutput(stackName, outputKey) {
  try {
    const command = `aws cloudformation describe-stacks --stack-name "${stackName}" --query "Stacks[0].Outputs[?OutputKey=='${outputKey}'].OutputValue | [0]" --output text`;
    const result = execSync(command, { encoding: 'utf8' }).trim();
    return result === 'None' ? null : result;
  } catch (error) {
    console.warn(`⚠️  Could not get output ${outputKey} from stack ${stackName}`);
    return null;
  }
}

/**
 * Get current API URLs from CDK deployments
 */
function getCurrentApiUrls(stage = 'dev') {
  console.log(`📡 Getting API URLs for stage: ${stage}`);
  
  // Try multiple possible output keys for each API
  const adminApiUrl = 
    getStackOutput(`tsa-admin-backend-${stage}`, 'AdminPortalServiceAdminPortalAPIUrlE0F04142') ||
    getStackOutput(`tsa-admin-backend-${stage}`, 'AdminPortalServiceAdminPortalAPIEndpointCD77C31D') ||
    getStackOutput(`tsa-admin-backend-${stage}`, 'AdminPortalAPIUrl');
  
  const coachApiUrl = 
    getStackOutput(`tsa-coach-backend-${stage}`, 'CoachPortalServiceOnboardingAPIUrl50B0915F') ||
    getStackOutput(`tsa-coach-backend-${stage}`, 'CoachPortalServiceCoachOnboardingAPIEndpoint2ED358FF') ||
    getStackOutput(`tsa-coach-backend-${stage}`, 'OnboardingAPIUrl');
  
  // Passwordless auth URL is stable
  const passwordlessAuthUrl = 'https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1';
  
  return {
    adminApi: adminApiUrl,
    coachApi: coachApiUrl,
    passwordlessAuth: passwordlessAuthUrl
  };
}

/**
 * Update the centralized configuration file
 */
function updateConfigFile(stage, apiUrls) {
  console.log(`📝 Updating configuration file for stage: ${stage}`);
  
  // Read current configuration
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    console.log('📄 Creating new configuration file...');
    config = {
      environments: {},
      metadata: {
        version: '1.0.0',
        description: 'Centralized API endpoint configuration for TSA Coach Portal project'
      }
    };
  }
  
  // Update the specific stage
  config.environments[stage] = apiUrls;
  
  // Update metadata
  config.metadata.lastUpdated = new Date().toISOString();
  config.metadata.updatedBy = 'update-api-config.js';
  
  // Write updated configuration
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  console.log(`✅ Updated ${CONFIG_FILE}`);
  console.log(`   Admin API: ${apiUrls.adminApi}`);
  console.log(`   Coach API: ${apiUrls.coachApi}`);
  console.log(`   Auth API:  ${apiUrls.passwordlessAuth}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const stage = args[0] || 'dev';
  
  console.log('🔄 Updating centralized API configuration...');
  console.log('=' * 50);
  
  // Get current API URLs from CDK
  const apiUrls = getCurrentApiUrls(stage);
  
  // Validate that we got the URLs
  if (!apiUrls.adminApi || !apiUrls.coachApi) {
    console.error('❌ Could not retrieve all required API URLs from CDK outputs');
    console.error('   Make sure the CDK stacks are deployed and accessible');
    process.exit(1);
  }
  
  // Update configuration file
  updateConfigFile(stage, apiUrls);
  
  console.log('\n🎉 Configuration updated successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Restart your frontend development servers');
  console.log('   2. The new URLs will be automatically loaded from the centralized config');
  console.log('\n🔍 Frontends will now use:');
  console.log(`   Admin Portal: http://localhost:3001`);
  console.log(`   Coach Portal: http://localhost:3000`);
}

if (require.main === module) {
  main();
} 