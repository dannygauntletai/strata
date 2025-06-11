#!/usr/bin/env node

/**
 * Build-time SSM Configuration Fetcher
 * Fetches API endpoints from AWS SSM Parameter Store and generates static config
 * Run this during build process to get the latest infrastructure URLs
 */

const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = 'us-east-1';
const OUTPUT_FILE = path.join(__dirname, '../src/config/generated-config.json');

// Detect environment
function getEnvironment() {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV;
  if (env === 'production') return 'prod';
  if (env === 'staging') return 'staging';
  return 'dev';
}

// Fallback configuration (updated with correct endpoints)
const FALLBACK_CONFIG = {
  dev: {
    // UPDATED: Use correct Admin API endpoint from deployment
    adminApi: 'https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod',
    coachApi: 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod',
    passwordlessAuth: 'https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1',
  },
  staging: {
    adminApi: 'https://admin-api-staging.sportsacademy.tech/prod',
    coachApi: 'https://coach-api-staging.sportsacademy.tech/prod',
    passwordlessAuth: 'https://auth-staging.sportsacademy.tech/v1',
  },
  prod: {
    adminApi: 'https://admin-api.sportsacademy.tech/prod',
    coachApi: 'https://coach-api.sportsacademy.tech/prod',
    passwordlessAuth: 'https://auth.sportsacademy.tech/v1',
  },
};

async function fetchSSMParameters(stage) {
  console.log(`🔍 Fetching SSM parameters for stage: ${stage}`);
  
  const ssmClient = new SSMClient({ region: REGION });
  
  const parameterNames = [
    `/tsa-admin/${stage}/api-urls/adminApi`,
    `/tsa-coach/${stage}/api-urls/coachApi`, 
    `/tsa-auth/${stage}/api-urls/passwordlessAuth`,
  ];

  try {
    const command = new GetParametersCommand({
      Names: parameterNames,
      WithDecryption: false,
    });

    const response = await ssmClient.send(command);
    
    const config = {};
    const found = [];
    const missing = [];

    response.Parameters?.forEach((param) => {
      const pathParts = param.Name.split('/');
      const key = pathParts[pathParts.length - 1]; // Get last part (adminApi, coachApi, etc.)
      config[key] = param.Value;
      found.push(param.Name);
    });

    // Check for missing parameters
    parameterNames.forEach(name => {
      if (!response.Parameters?.find(p => p.Name === name)) {
        missing.push(name);
      }
    });

    if (missing.length > 0) {
      console.warn(`⚠️  Missing SSM parameters: ${missing.join(', ')}`);
    }

    console.log(`✅ Found ${found.length}/${parameterNames.length} SSM parameters`);
    
    return {
      success: true,
      config,
      found,
      missing,
    };

  } catch (error) {
    console.error('❌ Failed to fetch SSM parameters:', error.message);
    return {
      success: false,
      error: error.message,
      config: {},
      found: [],
      missing: parameterNames,
    };
  }
}

async function generateConfig() {
  const stage = getEnvironment();
  console.log(`🚀 Generating configuration for environment: ${stage}`);

  // Try to fetch from SSM first
  const ssmResult = await fetchSSMParameters(stage);
  
  // Start with fallback configuration
  let finalConfig = { ...FALLBACK_CONFIG[stage] };
  
  // Override with SSM values if available
  if (ssmResult.success && Object.keys(ssmResult.config).length > 0) {
    finalConfig = { ...finalConfig, ...ssmResult.config };
    console.log('✅ Using SSM configuration with fallback for missing values');
  } else {
    console.log('⚠️  Using fallback configuration (SSM unavailable)');
  }

  // Override with environment variables (highest priority)
  if (process.env.NEXT_PUBLIC_ADMIN_API_URL) {
    finalConfig.adminApi = process.env.NEXT_PUBLIC_ADMIN_API_URL;
    console.log('🔧 Admin API URL overridden by environment variable');
  }
  
  if (process.env.NEXT_PUBLIC_COACH_API_URL) {
    finalConfig.coachApi = process.env.NEXT_PUBLIC_COACH_API_URL;
    console.log('🔧 Coach API URL overridden by environment variable');
  }
  
  if (process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL) {
    finalConfig.passwordlessAuth = process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL;
    console.log('🔧 Passwordless Auth URL overridden by environment variable');
  }

  // Generate configuration file
  const outputConfig = {
    generated_at: new Date().toISOString(),
    environment: stage,
    source: {
      ssm_success: ssmResult.success,
      ssm_parameters_found: ssmResult.found,
      ssm_parameters_missing: ssmResult.missing,
      fallback_used: !ssmResult.success || Object.keys(ssmResult.config).length === 0,
      env_vars_used: !!(process.env.NEXT_PUBLIC_ADMIN_API_URL || process.env.NEXT_PUBLIC_COACH_API_URL || process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL),
    },
    endpoints: finalConfig,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write configuration file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputConfig, null, 2), 'utf8');
  
  console.log(`✅ Configuration written to: ${OUTPUT_FILE}`);
  console.log('📋 Final configuration:');
  console.log(JSON.stringify(outputConfig.endpoints, null, 2));
  
  return outputConfig;
}

// Validation function
function validateConfig(config) {
  const required = ['adminApi', 'coachApi', 'passwordlessAuth'];
  const missing = required.filter(key => !config.endpoints[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required configuration: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Validate URL format
  for (const [key, url] of Object.entries(config.endpoints)) {
    try {
      new URL(url);
    } catch (error) {
      console.error(`❌ Invalid URL for ${key}: ${url}`);
      process.exit(1);
    }
  }
  
  console.log('✅ Configuration validation passed');
}

// Main execution
async function main() {
  try {
    const config = await generateConfig();
    validateConfig(config);
    
    console.log('\n🎉 Configuration generation completed successfully!');
    console.log('💡 This config will be used by the frontend application');
    
    // Display next steps
    console.log('\n📋 Next steps:');
    console.log('1. Build the frontend: npm run build');
    console.log('2. Start the application: npm start');
    console.log('3. The app will use the generated configuration');
    
  } catch (error) {
    console.error('❌ Configuration generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateConfig, validateConfig, FALLBACK_CONFIG }; 