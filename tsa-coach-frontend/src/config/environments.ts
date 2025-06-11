/**
 * Environment Configuration for TSA Coach Portal
 * Centralized management of API endpoints and environment-specific settings
 * Now uses Infrastructure-as-Code SSM parameter discovery
 */

import { getApiEndpoints, type ApiEndpoints } from '../lib/ssm-config'

export type Environment = 'development' | 'staging' | 'production'

export interface EnvironmentConfig {
  stage: string
  environment: Environment
  apiEndpoints: ApiEndpoints
  cognito: {
    region: string
    userPoolId?: string
    clientId?: string
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

// Environment-specific configurations (without API endpoints)
const baseEnvironments: Record<Environment, Omit<EnvironmentConfig, 'apiEndpoints'>> = {
  development: {
    stage: 'dev',
    environment: 'development',
    cognito: {
      region: 'us-east-1',
    },
    features: {
      debugMode: true,
      showPerformanceMetrics: true,
      enableAnalytics: false,
    },
    app: {
      name: 'TSA Coach Portal (DEV)',
      version: '1.0.0-dev',
    },
  },
  staging: {
    stage: 'staging',
    environment: 'staging',
    cognito: {
      region: 'us-east-1',
    },
    features: {
      debugMode: false,
      showPerformanceMetrics: true,
      enableAnalytics: true,
    },
    app: {
      name: 'TSA Coach Portal (STAGING)',
      version: '1.0.0-staging',
    },
  },
  production: {
    stage: 'prod',
    environment: 'production',
    cognito: {
      region: 'us-east-1',
    },
    features: {
      debugMode: false,
      showPerformanceMetrics: false,
      enableAnalytics: true,
    },
    app: {
      name: 'TSA Coach Portal',
      version: '1.0.0',
    },
  },
}

/**
 * Get current environment from various sources
 * Priority: NEXT_PUBLIC_ENVIRONMENT > NODE_ENV > 'development'
 */
function getCurrentEnvironment(): Environment {
  // Check explicit environment variable first
  const envVar = process.env.NEXT_PUBLIC_ENVIRONMENT as Environment
  if (envVar && baseEnvironments[envVar]) {
    return envVar
  }
  
  // Check NODE_ENV - only production is meaningful for Next.js
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'production') return 'production'
  
  // Default to development
  return 'development'
}

/**
 * Get environment configuration with SSM-discovered API endpoints
 */
export async function getEnvironmentConfig(): Promise<EnvironmentConfig> {
  const currentEnv = getCurrentEnvironment()
  const baseConfig = baseEnvironments[currentEnv]
  
  // Get API endpoints from SSM Parameter Store (with fallback)
  const apiEndpoints = await getApiEndpoints()
  
  // Override with environment variables if available
  return {
    ...baseConfig,
    apiEndpoints: {
      coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_API_URL || apiEndpoints.coachApi,
      parentApi: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || process.env.NEXT_PUBLIC_PARENT_API_URL || apiEndpoints.parentApi,
      adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || apiEndpoints.adminApi,
      passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || apiEndpoints.passwordlessAuth,
    },
    cognito: {
      ...baseConfig.cognito,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || baseConfig.cognito.userPoolId,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || baseConfig.cognito.clientId,
    },
    features: {
      ...baseConfig.features,
      debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || baseConfig.features.debugMode,
    },
    app: {
      ...baseConfig.app,
      name: process.env.NEXT_PUBLIC_APP_NAME || baseConfig.app.name,
    },
  }
}

// Synchronous configuration for immediate use (uses fallback until SSM loads)
let cachedConfig: EnvironmentConfig | null = null

/**
 * Get synchronous configuration (for immediate use)
 * This will use fallback values until SSM configuration is loaded
 */
export function getSyncEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment()
  const baseConfig = baseEnvironments[currentEnv]
  
  // Use cached config if available
  if (cachedConfig && cachedConfig.environment === currentEnv) {
    return cachedConfig
  }
  
  // Fallback API endpoints for immediate use
  const fallbackEndpoints: ApiEndpoints = {
    coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod',
    parentApi: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || process.env.NEXT_PUBLIC_PARENT_API_URL || 'https://4ojhuzmaie.execute-api.us-east-1.amazonaws.com/prod',  // Parent portal service
    adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || 'https://gt87xbmjcj.execute-api.us-east-1.amazonaws.com/prod',
    passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || 'https://wlcmxb3pc8.execute-api.us-east-1.amazonaws.com/v1',
  }
  
  const config: EnvironmentConfig = {
    ...baseConfig,
    apiEndpoints: fallbackEndpoints,
    cognito: {
      ...baseConfig.cognito,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || baseConfig.cognito.userPoolId,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || baseConfig.cognito.clientId,
    },
    features: {
      ...baseConfig.features,
      debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || baseConfig.features.debugMode,
    },
    app: {
      ...baseConfig.app,
      name: process.env.NEXT_PUBLIC_APP_NAME || baseConfig.app.name,
    },
  }
  
  // Cache the config
  cachedConfig = config
  return config
}

// Initialize async config loading and update cache
if (typeof window !== 'undefined') {
  getEnvironmentConfig().then(config => {
    cachedConfig = config
    console.log('✅ Environment configuration loaded from SSM Parameter Store')
  }).catch(error => {
    console.warn('⚠️  Failed to load SSM configuration, using fallback:', error)
  })
}

// Export current configuration (sync version for immediate use)
export const config = getSyncEnvironmentConfig()

// Export utilities
export const isProduction = () => config.environment === 'production'
export const isDevelopment = () => config.environment === 'development' 
export const isStaging = () => config.environment === 'staging'

// Debug helper
if (config.features.debugMode && typeof window !== 'undefined') {
  console.log('🚀 TSA Coach Portal Environment Config:', config)
  console.log('📡 SSM Parameter Store discovery enabled')
} 