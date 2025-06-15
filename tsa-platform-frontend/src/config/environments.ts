/**
 * Environment Configuration for TSA Coach Portal
 * Uses environment variables populated at build time by scripts
 * Single source of truth - no browser SSM calls
 */

export type Environment = 'development' | 'staging' | 'production'

export interface ApiEndpoints {
  coach: string
  parent: string
  admin: string
  passwordlessAuth: string
}

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

/**
 * Get current environment from NEXT_PUBLIC_ENVIRONMENT
 */
function getCurrentEnvironment(): Environment {
  const envVar = process.env.NEXT_PUBLIC_ENVIRONMENT as Environment
  return (envVar === 'production' || envVar === 'staging') ? envVar : 'development'
}

/**
 * Get current stage
 */
function getStage(): string {
  const env = getCurrentEnvironment()
  if (env === 'production') return 'prod'
  if (env === 'staging') return 'staging'
  return 'dev'
}

/**
 * Validate that all required environment variables are set
 */
function validateEnvironmentVariables(): void {
  const missing: string[] = []
  
  // Only require passwordless auth - other APIs are optional for now
  if (!process.env.NEXT_PUBLIC_TSA_AUTH_API_URL && !process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL) {
    missing.push('NEXT_PUBLIC_TSA_AUTH_API_URL or NEXT_PUBLIC_PASSWORDLESS_AUTH_URL')
  }
  
  if (missing.length > 0) {
    const stage = getStage()
    throw new Error(
      `❌ Missing required environment variables:\n` +
      `   ${missing.join('\n   ')}\n\n` +
      `🔧 To fix this:\n` +
      `   1. Run: cd tsa-platform-frontend && ./scripts/get-endpoints.sh\n` +
      `   2. Copy the output to your .env.local file\n` +
      `   3. Or deploy infrastructure: cd tsa-infrastructure && cdk deploy --all\n\n` +
      `💡 Current stage: ${stage}\n` +
      `💡 Only passwordless auth is required - other APIs are optional for now`
    )
  }
}

/**
 * Get API endpoints from environment variables (no fallbacks - must be set)
 */
function getApiEndpoints(): ApiEndpoints {
  // Validate environment variables first
  validateEnvironmentVariables()

  const endpoints = {
    coach: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || 
           process.env.NEXT_PUBLIC_API_URL || '',
    
    parent: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || 
            process.env.NEXT_PUBLIC_PARENT_API_URL || '',
    
    admin: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || 
           process.env.NEXT_PUBLIC_ADMIN_API_URL || '',
    
    passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || 
                      process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || '',
  }

  // Validate URLs (only if they're set)
  Object.entries(endpoints).forEach(([key, url]) => {
    if (url) {
      try {
        new URL(url)
      } catch (error) {
        throw new Error(`❌ Invalid URL for ${key}: "${url}"\n🔧 Run: ./scripts/get-endpoints.sh`)
      }
    }
  })

  return endpoints
}

/**
 * Base environment configurations
 */
const baseEnvironments: Record<Environment, Omit<EnvironmentConfig, 'apiEndpoints'>> = {
  development: {
    stage: 'dev',
    environment: 'development',
    cognito: { region: 'us-east-2' },
    features: { debugMode: true, showPerformanceMetrics: true, enableAnalytics: false },
    app: { name: 'TSA Coach Portal (DEV)', version: '1.0.0-dev' },
  },
  staging: {
    stage: 'staging',
    environment: 'staging',
    cognito: { region: 'us-east-2' },
    features: { debugMode: false, showPerformanceMetrics: true, enableAnalytics: true },
    app: { name: 'TSA Coach Portal (STAGING)', version: '1.0.0-staging' },
  },
  production: {
    stage: 'prod',
    environment: 'production',
    cognito: { region: 'us-east-2' },
    features: { debugMode: false, showPerformanceMetrics: false, enableAnalytics: true },
    app: { name: 'TSA Coach Portal', version: '1.0.0' },
  },
}

/**
 * Get complete environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment()
  const baseConfig = baseEnvironments[currentEnv]
  const apiEndpoints = getApiEndpoints()
  
  return {
    ...baseConfig,
    environment: currentEnv,
    apiEndpoints,
    cognito: {
      ...baseConfig.cognito,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
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

// Synchronous config object for immediate use in components
export const config = getEnvironmentConfig()

// Export utilities
export const getCurrentEnv = getCurrentEnvironment
export const isProduction = () => getCurrentEnvironment() === 'production'
export const isDevelopment = () => getCurrentEnvironment() === 'development' 
export const isStaging = () => getCurrentEnvironment() === 'staging'

// Debug information (only in development)
if (typeof window !== 'undefined' && config.features.debugMode) {
  console.log('🛠️ TSA Coach Portal Configuration:', {
    environment: config.environment,
    stage: config.stage,
    endpoints: config.apiEndpoints,
    source: 'Environment Variables (No Fallbacks)'
  })
}
