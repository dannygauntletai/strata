/**
 * Environment Configuration Service  
 * Gets API endpoints from environment variables only
 * Single source of truth for API URLs
 */

export interface ApiEndpoints {
  adminApi: string;
  coachApi: string;
  parentApi: string;
  passwordlessAuth: string;
}

class EnvironmentConfigService {
  /**
   * Detect current stage from environment
   */
  private detectStage(): string {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') return 'prod';
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') return 'staging';
    if (process.env.NODE_ENV === 'production') return 'prod';
    return 'dev';
  }

  /**
   * Get API endpoints from environment variables only
   * Throws error if any are missing with helpful instructions
   */
  getApiEndpoints(): ApiEndpoints {
    const stage = this.detectStage();

    const envEndpoints: ApiEndpoints = {
      adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || '',
      coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || '',
      parentApi: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || '',
      passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || '',
    };

    // Check if we have all endpoints from environment
    const missing = Object.entries(envEndpoints)
      .filter(([_, url]) => !url.trim())
      .map(([key, _]) => key);

    if (missing.length > 0) {
      const envVarNames = missing.map(key => {
        const envMap = {
          adminApi: 'NEXT_PUBLIC_TSA_ADMIN_API_URL',
          coachApi: 'NEXT_PUBLIC_TSA_COACH_API_URL', 
          parentApi: 'NEXT_PUBLIC_TSA_PARENT_API_URL',
          passwordlessAuth: 'NEXT_PUBLIC_TSA_AUTH_API_URL'
        };
        return envMap[key as keyof typeof envMap];
      });

      throw new Error(`❌ Missing required environment variables: ${envVarNames.join(', ')}\n\n` +
        `🔧 To fix this:\n` +
        `1. Create a .env.local file in your project root\n` +
        `2. Add the missing variables:\n\n` +
        envVarNames.map(varName => `${varName}=https://your-api-endpoint.amazonaws.com/`).join('\n') +
        `\n\n💡 Get current API URLs:\n` +
        `   cd tsa-infrastructure\n` +
        `   aws cloudformation describe-stacks --stack-name tsa-coach-backend-${stage} --query 'Stacks[0].Outputs[?contains(OutputKey,\`API\`)].OutputValue' --output text\n` +
        `   aws cloudformation describe-stacks --stack-name tsa-admin-backend-${stage} --query 'Stacks[0].Outputs[?contains(OutputKey,\`API\`)].OutputValue' --output text\n` +
        `   aws cloudformation describe-stacks --stack-name tsa-infra-auth-${stage} --query 'Stacks[0].Outputs[?contains(OutputKey,\`API\`)].OutputValue' --output text`
      );
    }

    console.log(`✅ API endpoints loaded from environment variables (${stage})`);
    return envEndpoints;
  }

  /**
   * Get specific API URL
   */
  getApiUrl(apiType: keyof ApiEndpoints): string {
    try {
      const endpoints = this.getApiEndpoints();
      return endpoints[apiType];
    } catch (error) {
      console.error(`Failed to get ${apiType} API URL:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const configService = new EnvironmentConfigService();

// Export convenience functions
export function getApiEndpoints(): ApiEndpoints {
  return configService.getApiEndpoints();
}

export function getCoachApiUrl(): string {
  return configService.getApiUrl('coachApi');
}

export function getParentApiUrl(): string {
  return configService.getApiUrl('parentApi');
}

export function getAdminApiUrl(): string {
  return configService.getApiUrl('adminApi');
}

export function getPasswordlessAuthUrl(): string {
  return configService.getApiUrl('passwordlessAuth');
} 