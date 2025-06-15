/**
 * SSM Parameter Store Configuration Service
 * NO FALLBACKS - Gets API endpoints from AWS infrastructure or environment variables
 * Single source of truth for API URLs
 */

import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

export interface ApiEndpoints {
  adminApi: string;
  coachApi: string;
  parentApi: string;
  passwordlessAuth: string;
}

class SSMConfigService {
  private readonly region = 'us-east-2'; // TSA infrastructure region (user confirmed)
  private cache: ApiEndpoints | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect current stage from environment
   */
  private detectStage(): string {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') return 'prod';
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') return 'staging';
    return 'dev';
  }

  /**
   * Get API endpoints from environment variables ONLY
   * NO FALLBACKS - either all variables are set or none are used
   */
  private getEnvironmentEndpoints(): ApiEndpoints | null {
    const endpoints = {
      adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || '',
      coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || '',
      parentApi: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || '',
      passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || '',
    };

    // Check if ALL endpoints are set
    const hasAllEndpoints = Object.values(endpoints).every(url => url.trim() !== '');

    if (hasAllEndpoints) {
      console.log('✅ Using API endpoints from environment variables');
      return endpoints;
    }

    // If ANY are missing, don't use environment variables
    const missing = Object.entries(endpoints)
      .filter(([_, url]) => !url)
      .map(([key, _]) => key);

    if (missing.length > 0) {
      console.log(`⚠️  Missing environment variables: ${missing.join(', ')}`);
      console.log('🔄 Will fetch from SSM Parameter Store instead');
    }

    return null;
  }

  /**
   * Fetch API endpoints from SSM Parameter Store
   */
  private async fetchFromSSM(): Promise<ApiEndpoints> {
    const stage = this.detectStage();
    const ssmClient = new SSMClient({ region: this.region });

    // Define SSM parameter names
    const parameterNames = [
      `/tsa/${stage}/api-urls/admin-api`,
      `/tsa/${stage}/api-urls/coach-api`,
      `/tsa/${stage}/api-urls/parent-api`,
      `/tsa/${stage}/api-urls/passwordless-auth`,
    ];

    try {
      console.log(`🔍 Fetching API URLs from SSM Parameter Store (${this.region}, ${stage})`);
      
      const command = new GetParametersCommand({
        Names: parameterNames,
        WithDecryption: false,
      });

      const response = await ssmClient.send(command);
      const parameters = response.Parameters || [];

      // Check if we got all required parameters
      if (parameters.length !== parameterNames.length) {
        const foundParams = parameters.map(p => p.Name);
        const missingParams = parameterNames.filter(name => !foundParams.includes(name));
        
        throw new Error(`❌ Missing SSM parameters: ${missingParams.join(', ')}\n` +
          `📋 Found: ${foundParams.join(', ')}\n` +
          `💡 Deploy infrastructure: cd tsa-infrastructure && cdk deploy --all`);
      }

      // Map parameters to endpoints
      const endpoints: ApiEndpoints = {
        adminApi: '',
        coachApi: '',
        parentApi: '',
        passwordlessAuth: '',
      };

      parameters.forEach(param => {
        if (!param.Name || !param.Value) return;
        
        if (param.Name.includes('admin-api')) {
          endpoints.adminApi = param.Value;
        } else if (param.Name.includes('coach-api')) {
          endpoints.coachApi = param.Value;
        } else if (param.Name.includes('parent-api')) {
          endpoints.parentApi = param.Value;
        } else if (param.Name.includes('passwordless-auth')) {
          endpoints.passwordlessAuth = param.Value;
        }
      });

      // Validate all endpoints are set
      const missing = Object.entries(endpoints)
        .filter(([_, url]) => !url)
        .map(([key, _]) => key);

      if (missing.length > 0) {
        throw new Error(`❌ SSM parameters returned empty values: ${missing.join(', ')}`);
      }

      console.log('✅ API endpoints loaded from SSM Parameter Store');
      return endpoints;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`❌ Failed to fetch from SSM Parameter Store: ${error.message}\n` +
          `🔧 Troubleshooting:\n` +
          `   1. Check AWS credentials\n` +
          `   2. Verify region: ${this.region}\n` +
          `   3. Deploy infrastructure: cd tsa-infrastructure && cdk deploy --all`);
      }
      throw error;
    }
  }

  /**
   * Get API endpoints - Environment variables first, then SSM, no fallbacks
   */
  async getApiEndpoints(): Promise<ApiEndpoints> {
    // 1. Try environment variables first (for local development)
    const envEndpoints = this.getEnvironmentEndpoints();
    if (envEndpoints) {
      return envEndpoints;
    }

    // 2. Check cache for SSM data
    if (this.cache && Date.now() < this.cacheExpiry) {
      console.log('✅ Using cached SSM endpoints');
      return this.cache;
    }

    // 3. Fetch from SSM Parameter Store
    try {
      const ssmEndpoints = await this.fetchFromSSM();
      
      // Cache the result
      this.cache = ssmEndpoints;
      this.cacheExpiry = Date.now() + this.cacheTTL;
      
      return ssmEndpoints;
    } catch (error) {
      // Clear cache on error
      this.cache = null;
      this.cacheExpiry = 0;
      throw error;
    }
  }

  /**
   * Clear cache (force fresh SSM read)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
    console.log('🔄 SSM cache cleared');
  }
}

// Export singleton instance
export const ssmConfigService = new SSMConfigService();

// Export convenience functions
export async function getApiEndpoints(): Promise<ApiEndpoints> {
  return await ssmConfigService.getApiEndpoints();
}

export async function getCoachApiUrl(): Promise<string> {
  const endpoints = await getApiEndpoints();
  return endpoints.coachApi;
}

export async function getParentApiUrl(): Promise<string> {
  const endpoints = await getApiEndpoints();
  return endpoints.parentApi;
}

export async function getAdminApiUrl(): Promise<string> {
  const endpoints = await getApiEndpoints();
  return endpoints.adminApi;
}

export async function getPasswordlessAuthUrl(): Promise<string> {
  const endpoints = await getApiEndpoints();
  return endpoints.passwordlessAuth;
} 