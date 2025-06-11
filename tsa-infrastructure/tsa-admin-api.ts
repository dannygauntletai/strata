/**
 * TSA Coach Admin Portal - TypeScript API Client
 * Complete TypeScript integration with proper type definitions
 */

// API Response Interfaces
export interface Invitation {
  invitation_id: string;
  invitation_token: string;
  email: string;
  role: string;
  school_name: string;
  school_type?: string;
  sport?: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  message?: string;
  created_at: string; // ISO timestamp
  expires_at: number;  // Unix timestamp
  created_by: string;
  accepted_at?: string;
  cancelled_at?: string;
  last_sent_at?: string;
}

export interface InvitationsResponse {
  invitations: Invitation[];
  count: number;
}

export interface CreateInvitationRequest {
  email: string;
  role: string;
  school_name: string;
  school_type?: string;
  sport?: string;
  message?: string;
}

export interface CreateInvitationResponse {
  message: string;
  invitation_id: string;
  invite_url: string;
  expires_at: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: string[];
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    lambda: 'healthy' | 'unhealthy';
    dynamodb: 'healthy' | 'unhealthy';
    ses: 'healthy' | 'unhealthy';
  };
  timestamp: string;
}

export interface AnalyticsResponse {
  total_invitations: number;
  pending_invitations: number;
  completed_invitations: number;
  cancelled_invitations: number;
  total_coaches: number;
  active_coaches: number;
  onboarding_completion_rate: number;
  average_onboarding_time: string;
  recent_activity: ActivityLog[];
}

export interface ActivityLog {
  action: string;
  email: string;
  timestamp: string;
}

export interface AuditLog {
  log_id: string;
  admin_user_id: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
  ip_address: string;
}

export interface AuditLogsResponse {
  audit_logs: AuditLog[];
  count: number;
}

export interface CoachesResponse {
  coaches: any[]; // Define coach interface based on your needs
  count: number;
}

// API Configuration
export interface ApiConfig {
  baseURL: string;
  adminEmail: string;
  timeout?: number;
}

// API Error Class
export class TSAApiError extends Error {
  public status: number;
  public response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'TSAApiError';
    this.status = status;
    this.response = response;
  }
}

// Main API Client Class
export class TSAAdminAPI {
  private baseURL: string;
  private adminEmail: string;
  private timeout: number;

  constructor(config?: Partial<ApiConfig>) {
    this.baseURL = config?.baseURL || 'https://ekfw6ekr33.execute-api.us-east-1.amazonaws.com/prod';
    this.adminEmail = config?.adminEmail || 'danny.mota@superbuilders.school';
    this.timeout = config?.timeout || 30000;
  }

  /**
   * Generate authentication token
   */
  private getAuthToken(): string {
    return `Bearer ${btoa(this.adminEmail)}`;
  }

  /**
   * Get default headers with authentication
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': this.getAuthToken(),
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generic API request handler with error handling
   */
  private async apiRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
        signal: controller.signal,
        ...options
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new TSAApiError('Authentication failed. Please log in again.', 401);
      }

      if (response.status === 403) {
        throw new TSAApiError('Access denied. Admin privileges required.', 403);
      }

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new TSAApiError(
          errorData.message || errorData.error || `HTTP ${response.status}`, 
          response.status, 
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TSAApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TSAApiError('Request timeout', 408);
      }

      throw new TSAApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0
      );
    }
  }

  /**
   * Health check (no authentication required)
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  /**
   * List invitations with optional status filter
   */
  async getInvitations(statusFilter?: string): Promise<InvitationsResponse> {
    const endpoint = statusFilter 
      ? `/admin/invitations?status=${encodeURIComponent(statusFilter)}`
      : '/admin/invitations';
    return this.apiRequest<InvitationsResponse>(endpoint);
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    invitationData: CreateInvitationRequest
  ): Promise<CreateInvitationResponse> {
    return this.apiRequest<CreateInvitationResponse>('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify(invitationData)
    });
  }

  /**
   * Get a specific invitation by ID
   */
  async getInvitation(invitationId: string): Promise<Invitation> {
    return this.apiRequest<Invitation>(`/admin/invitations/${invitationId}`);
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    return this.apiRequest<{ message: string }>(`/admin/invitations/${invitationId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string): Promise<{ message: string }> {
    return this.apiRequest<{ message: string }>(`/admin/invitations/${invitationId}/resend`, {
      method: 'POST'
    });
  }

  /**
   * List all coaches
   */
  async getCoaches(): Promise<CoachesResponse> {
    return this.apiRequest<CoachesResponse>('/admin/coaches');
  }

  /**
   * Delete a coach
   */
  async deleteCoach(coachId: string): Promise<{ message: string }> {
    return this.apiRequest<{ message: string }>(`/admin/coaches/${coachId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<AnalyticsResponse> {
    return this.apiRequest<AnalyticsResponse>('/admin/analytics');
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(limit: number = 50): Promise<AuditLogsResponse> {
    return this.apiRequest<AuditLogsResponse>(`/admin/audit?limit=${limit}`);
  }
}

// React Hook Types (if using React)
export interface UseInvitationsResult {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  fetchInvitations: (statusFilter?: string) => Promise<void>;
  createInvitation: (data: CreateInvitationRequest) => Promise<CreateInvitationResponse>;
  cancelInvitation: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<void>;
  refreshInvitations: () => Promise<void>;
}

// Export default instance for convenience
export const tsaAdminAPI = new TSAAdminAPI();

// Utility functions
export const formatInvitationStatus = (status: Invitation['status']): string => {
  const statusMap: Record<Invitation['status'], string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    cancelled: 'Cancelled',
    expired: 'Expired'
  };
  return statusMap[status] || status;
};

export const isInvitationExpired = (invitation: Invitation): boolean => {
  return Date.now() > (invitation.expires_at * 1000);
};

export const getInvitationUrl = (invitation: Invitation, frontendUrl: string): string => {
  return `${frontendUrl}/onboarding?invite=${invitation.invitation_token}`;
};

export const validateInvitationData = (data: CreateInvitationRequest): string[] => {
  const errors: string[] = [];

  if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.role || data.role.trim().length === 0) {
    errors.push('Role is required');
  }

  if (!data.school_name || data.school_name.trim().length < 2) {
    errors.push('School name must be at least 2 characters');
  }

  if (data.email && data.email.length > 320) {
    errors.push('Email address is too long');
  }

  if (data.role && data.role.length > 50) {
    errors.push('Role is too long');
  }

  if (data.school_name && data.school_name.length > 200) {
    errors.push('School name is too long');
  }

  if (data.message && data.message.length > 1000) {
    errors.push('Message is too long (max 1000 characters)');
  }

  return errors;
};

// Constants
export const AVAILABLE_ROLES = [
  'coach',
  'instructor',
  'administrator',
  'school_owner',
  'director',
  'principal',
  'counselor'
] as const;

export const AVAILABLE_SCHOOL_TYPES = [
  'elementary',
  'middle',
  'high',
  'combined',
  'k-12'
] as const;

export const AVAILABLE_SPORTS = [
  'football',
  'basketball',
  'baseball',
  'soccer',
  'track',
  'tennis',
  'volleyball',
  'other'
] as const;

export type Role = typeof AVAILABLE_ROLES[number];
export type SchoolType = typeof AVAILABLE_SCHOOL_TYPES[number];
export type Sport = typeof AVAILABLE_SPORTS[number]; 