/**
 * Environment Configuration for TSA Admin Portal
 * Uses build-time generated configuration from SSM Parameter Store
 */

export type Environment = 'development' | 'staging' | 'production'

export interface ApiEndpoints {
  adminApi: string;
  coachApi: string;
  passwordlessAuth: string;
}

export interface EnvironmentConfig {
  stage: string
  environment: Environment
  apiEndpoints: ApiEndpoints
  admin: {
    email: string
  }
  features: {
    debugMode: boolean
    showPerformanceMetrics: boolean
    enableAnalytics: boolean
  }
  app: {
    name: string
    version: string
  }
}

// Load generated configuration (created by build-time script)
function loadGeneratedConfig(): ApiEndpoints {
  try {
    // Try to import the generated config file
    const generatedConfig = require('./generated-config.json');
    console.log('✅ Using build-time generated configuration from SSM');
    return generatedConfig.endpoints;
  } catch (error) {
    console.warn('⚠️  Generated config not found, using fallback configuration');
    
    // Fallback configuration with correct endpoints
    const fallbackEndpoints: ApiEndpoints = {
      // UPDATED: Use correct Admin API endpoint from deployment
      adminApi: 'https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod',
      coachApi: 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod',
      passwordlessAuth: 'https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1',
    };
    
    return fallbackEndpoints;
  }
}

// Environment-specific configurations
const baseEnvironments: Record<Environment, Omit<EnvironmentConfig, 'apiEndpoints'>> = {
  development: {
    stage: 'dev',
    environment: 'development',
    admin: {
      email: 'danny.mota@superbuilders.school',
    },
    features: {
      debugMode: true,
      showPerformanceMetrics: true,
      enableAnalytics: false,
    },
    app: {
      name: 'TSA Admin Portal (DEV)',
      version: '1.0.0-dev',
    },
  },
  staging: {
    stage: 'staging', 
    environment: 'staging',
    admin: {
      email: 'admin@sportsacademy.tech',
    },
    features: {
      debugMode: false,
      showPerformanceMetrics: true,
      enableAnalytics: true,
    },
    app: {
      name: 'TSA Admin Portal (STAGING)',
      version: '1.0.0-staging',
    },
  },
  production: {
    stage: 'prod',
    environment: 'production',
    admin: {
      email: 'admin@sportsacademy.tech',
    },
    features: {
      debugMode: false,
      showPerformanceMetrics: false,
      enableAnalytics: true,
    },
    app: {
      name: 'TSA Admin Portal',
      version: '1.0.0',
    },
  },
}

/**
 * Get current environment from environment variables
 */
function getCurrentEnvironment(): Environment {
  const envVar = process.env.NEXT_PUBLIC_ENVIRONMENT as Environment;
  if (envVar && baseEnvironments[envVar]) {
    return envVar;
  }
  
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  
  return 'development';
}

/**
 * Get complete environment configuration
 */
function getEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment();
  const baseConfig = baseEnvironments[currentEnv];
  
  // Load API endpoints from generated config or fallback
  let apiEndpoints = loadGeneratedConfig();
  
  // Runtime configuration using environment variables
  const config: EnvironmentConfig = {
    environment: currentEnv,
    apiEndpoints: {
      adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || apiEndpoints.adminApi,
      coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_COACH_API_URL || apiEndpoints.coachApi,
      passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || apiEndpoints.passwordlessAuth,
    },
    admin: {
      email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || baseConfig.admin.email,
    },
    features: {
      debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || baseConfig.features.debugMode,
    },
    app: {
      name: process.env.NEXT_PUBLIC_APP_NAME || baseConfig.app.name,
    }
  };
  
  return config;
}

// Export current configuration
export const config = getEnvironmentConfig();

// Export utilities
export const isProduction = () => config.environment === 'production';
export const isDevelopment = () => config.environment === 'development';
export const isStaging = () => config.environment === 'staging';

// Debug information
if (config.features.debugMode && typeof window !== 'undefined') {
  console.log('🛠️ TSA Admin Portal Configuration:', {
    environment: config.environment,
    stage: config.stage,
    endpoints: config.apiEndpoints,
    generatedConfigUsed: (() => {
      try {
        require('./generated-config.json');
        return true;
      } catch {
        return false;
      }
    })(),
  });
} 