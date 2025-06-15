/**
 * SSM Parameter Store Configuration Service
 * Automatically discovers API endpoints from AWS infrastructure
 * Frontend applications use fallback configuration for security
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
  private readonly cacheTTL = 0; // NO CACHING - LIVE READS ONLY

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
   * Get API endpoints with LIVE SSM reads only
   * NO FALLBACKS - Must have all SSM parameters or fails
   */
  async getApiEndpoints(): Promise<ApiEndpoints> {
    const stage = this.detectStage();

    // 1. PRIORITY: Environment variables (for local development)
    const envEndpoints: ApiEndpoints = {
      adminApi: process.env.NEXT_PUBLIC_TSA_ADMIN_API_URL || '',
      coachApi: process.env.NEXT_PUBLIC_TSA_COACH_API_URL || '',
      parentApi: process.env.NEXT_PUBLIC_TSA_PARENT_API_URL || '',
      passwordlessAuth: process.env.NEXT_PUBLIC_TSA_AUTH_API_URL || '',
    };

    // Check if we have all endpoints from environment
    const hasAllEnvEndpoints = envEndpoints.adminApi && envEndpoints.coachApi && 
                              envEndpoints.parentApi && envEndpoints.passwordlessAuth;

    if (hasAllEnvEndpoints) {
      console.log('✅ API endpoints loaded from environment variables');
      return envEndpoints;
    }

    // 2. REQUIRED: Must have SSM parameters or FAIL
    throw new Error(`❌ MISSING API ENDPOINTS: All SSM parameters required in ${this.region}:
    - /tsa-coach/${stage}/api-urls/adminApi
    - /tsa-coach/${stage}/api-urls/coachApi  
    - /tsa-coach/${stage}/api-urls/parentApi
    - /tsa-coach/${stage}/api-urls/passwordlessAuth
    
    Deploy infrastructure first: cd tsa-infrastructure && cdk deploy --all`);
  }

  /**
   * Clear cache (no-op since no caching)
   */
  clearCache(): void {
    // No caching in live mode
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