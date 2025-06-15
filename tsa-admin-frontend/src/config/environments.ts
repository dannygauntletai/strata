/**
 * Environment Configuration for TSA Admin Portal
 * Uses environment variables populated at build time by scripts
 * Single source of truth - no browser SSM calls
 */

export type Environment = 'development' | 'staging' | 'production'

export interface ApiEndpoints {
  adminApi: string
  coachApi: string
  passwordlessAuth: string
}

export interface EnvironmentConfig {
  stage: string
  environment: Environment
  apiEndpoints: ApiEndpoints
  features: {
    debugMode: boolean
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
      `   1. Run: cd tsa-admin-frontend && npm run fetch-config\n` +
      `   2. This will create/update .env.local with the correct URLs\n` +
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
    adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || 
              process.env.NEXT_PUBLIC_ADMIN_API_URL || '',
    
    coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || 
              process.env.NEXT_PUBLIC_COACH_API_URL || '',
    
    passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || 
                      process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || '',
  }

  // Validate URLs (only if they're set)
  Object.entries(endpoints).forEach(([key, url]) => {
    if (url) {
      try {
        new URL(url)
      } catch (error) {
        throw new Error(`❌ Invalid URL for ${key}: "${url}"\n🔧 Run: npm run fetch-config`)
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
    features: { debugMode: true },
    app: { name: 'TSA Admin Portal (DEV)', version: '1.0.0-dev' },
  },
  staging: {
    stage: 'staging',
    environment: 'staging',
    features: { debugMode: false },
    app: { name: 'TSA Admin Portal (STAGING)', version: '1.0.0-staging' },
  },
  production: {
    stage: 'prod',
    environment: 'production',
    features: { debugMode: false },
    app: { name: 'TSA Admin Portal', version: '1.0.0' },
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
  console.log('🛠️ TSA Admin Portal Configuration:', {
    environment: config.environment,
    stage: config.stage,
    endpoints: config.apiEndpoints,
    source: 'Environment Variables (No Fallbacks)'
  })
} 