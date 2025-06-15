/**
 * TSA Admin Portal Authentication & API Client
 * Integrates with real backend endpoints using centralized configuration
 */

import { config } from '@/config/environments'

// Admin configuration
const AUTHORIZED_ADMIN_EMAILS = [
  'danny.mota@superbuilders.school',
  'malekai.mischke@superbuilders.school'
];

export const isAuthorizedAdmin = (email: string): boolean => {
  return AUTHORIZED_ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

// Use centralized configuration
const authConfig = {
  features: config.features,
  apiEndpoints: config.apiEndpoints
};

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  token: string | null;
}

export interface InvitationData {
  email: string;
  message?: string;
}

export interface ApiEndpoints {
  adminApi: string;
  coachApi: string;
  passwordlessAuth: string;
}

// Auth event emitter for component updates
class AuthEventEmitter {
  private listeners: ((authState: AuthState) => void)[] = [];

  subscribe(callback: (authState: AuthState) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit(authState: AuthState) {
    this.listeners.forEach(listener => listener(authState));
  }
}

export const authEventEmitter = new AuthEventEmitter();

export class AdminAuth {
  private static instance: AdminAuth;
  private authState: AuthState = {
    isAuthenticated: false,
    email: null,
    token: null
  };
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'tsa-admin-auth';
  // Enhanced token settings for admin users
  private readonly MAX_TOKEN_DURATION = 24 * 60 * 60 * 1000; // 24 hours max
  private readonly REFRESH_BUFFER = 15 * 60 * 1000; // Refresh 15 minutes before expiry
  private readonly MIN_REFRESH_INTERVAL = 30 * 60 * 1000; // Minimum 30 minutes between refreshes
  private readonly STORAGE_VERSION = '2.0'; // Increment to invalidate old storage
  private apiEndpoints: ApiEndpoints | null = null;
  private lastRefreshAttempt: number = 0;

  private constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.loadAuthFromStorage();
      this.setupPeriodicValidation();
      // Use centralized configuration
      this.apiEndpoints = authConfig.apiEndpoints;
    }
  }

  private getApiEndpoints(): ApiEndpoints {
    return this.apiEndpoints || authConfig.apiEndpoints;
  }

  private loadAuthFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      
      // Check storage version - invalidate if outdated
      if (parsed.version !== this.STORAGE_VERSION) {
        console.log('🔄 Storage version mismatch, clearing old auth data');
        this.clearStorage();
        return;
      }
      
      // Validate stored data structure
      if (!parsed.tokens || !parsed.email || !parsed.expiresAt) {
        console.warn('🔒 Invalid stored auth data structure');
        this.clearStorage();
        return;
      }

      // Check if tokens have expired
      const now = Date.now();
      if (now > parsed.expiresAt) {
        console.log('🔒 Stored tokens have expired');
        this.clearStorage();
        return;
      }

      // Check if tokens are too old (beyond max duration)
      const tokenAge = now - (parsed.createdAt || 0);
      if (tokenAge > this.MAX_TOKEN_DURATION) {
        console.log('🔒 Tokens exceed maximum duration (24 hours), clearing');
        this.clearStorage();
        return;
      }

      // Validate admin email
      if (!isAuthorizedAdmin(parsed.email)) {
        console.warn('🔒 Email no longer authorized for admin access');
        this.clearStorage();
        return;
      }

      // Restore auth state
      this.authState = {
        isAuthenticated: true,
        email: parsed.email,
        token: parsed.tokens.access_token
      };

      // Calculate time until refresh needed
      const timeUntilExpiry = parsed.expiresAt - now;
      const timeUntilRefresh = Math.max(0, timeUntilExpiry - this.REFRESH_BUFFER);
      
      console.log(`🔐 Auth restored: ${parsed.email}, expires in ${Math.round(timeUntilExpiry / 60000)} minutes`);
      
      // Setup refresh timer if needed
      if (timeUntilRefresh > 0 && timeUntilRefresh < this.MAX_TOKEN_DURATION) {
        this.scheduleTokenRefresh(timeUntilRefresh);
      } else if (timeUntilExpiry < this.REFRESH_BUFFER) {
        // Token expires soon, refresh immediately
        this.refreshTokens();
      }

    } catch (error) {
      console.error('🔒 Error loading auth from storage:', error);
      this.clearStorage();
    }
  }

  private scheduleTokenRefresh(delay: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Don't schedule if delay is too short or too long
    if (delay < 60000 || delay > this.MAX_TOKEN_DURATION) { // Min 1 minute
      return;
    }

    console.log(`⏰ Scheduling token refresh in ${Math.round(delay / 60000)} minutes`);
    
    this.refreshTimer = setTimeout(async () => {
      console.log('⏰ Automatic token refresh triggered');
      await this.refreshTokens();
    }, delay);
  }

  private setupPeriodicValidation(): void {
    // Validate tokens every 10 minutes to catch any issues early
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.authState.isAuthenticated) {
          this.validateStoredToken().catch(error => {
            console.warn('🔒 Periodic token validation failed:', error);
          });
        }
      }, 10 * 60 * 1000); // Every 10 minutes
    }
  }

  private async refreshTokens(): Promise<void> {
    const now = Date.now();
    
    // Prevent too frequent refresh attempts
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
      console.log('🔄 Skipping refresh - too recent attempt');
      return;
    }
    
    this.lastRefreshAttempt = now;
    
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        console.warn('🔄 No stored auth data for refresh');
        return;
      }

      const parsed = JSON.parse(saved);
      if (!parsed.tokens?.refresh_token) {
        console.warn('🔄 No refresh token available');
        // Try to get new tokens via re-authentication if user is still authorized
        if (this.authState.email && isAuthorizedAdmin(this.authState.email)) {
          console.log('🔄 Attempting to get fresh tokens...');
          // Keep user logged in but they might need to re-authenticate soon
          return;
        } else {
          this.logout();
          return;
        }
      }

      console.log('🔄 Attempting token refresh...');

      // Use refresh token to get new access token
      const response = await fetch(`${authConfig.apiEndpoints.passwordlessAuth}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: parsed.tokens.refresh_token
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout for refresh
      });

      if (response.ok) {
        const data = await response.json();
        const tokens = data.tokens || {};
        
        if (tokens.access_token) {
          // Calculate new expiration (respect max duration)
          const tokenDuration = Math.min((data.expires_in || 3600) * 1000, this.MAX_TOKEN_DURATION);
          const expiresAt = now + tokenDuration;
          
          // Update stored tokens with version and creation time
          const updatedAuth = {
            ...parsed,
            version: this.STORAGE_VERSION,
            tokens: {
              access_token: tokens.access_token,
              id_token: tokens.id_token || parsed.tokens.id_token,
              refresh_token: tokens.refresh_token || parsed.tokens.refresh_token
            },
            expiresAt,
            lastRefresh: now,
            createdAt: parsed.createdAt || now // Preserve original creation time
          };

          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAuth));
          
          // Update auth state
          this.authState.token = tokens.access_token;
          
          // Schedule next refresh
          const timeUntilNextRefresh = tokenDuration - this.REFRESH_BUFFER;
          this.scheduleTokenRefresh(timeUntilNextRefresh);
          
          console.log(`✅ Token refresh successful, next refresh in ${Math.round(timeUntilNextRefresh / 60000)} minutes`);
          
          // Emit auth state change to update components
          authEventEmitter.emit(this.authState);
        } else {
          console.warn('🔄 Token refresh response missing access_token');
          this.logout();
        }
      } else {
        console.warn(`🔄 Token refresh failed: ${response.status} ${response.statusText}`);
        
        // Handle specific error codes
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 Refresh token expired or invalid, logging out');
        this.logout();
        } else {
          // Temporary error, keep user logged in but schedule retry
          console.log('🔄 Temporary refresh error, will retry later');
          this.scheduleTokenRefresh(5 * 60 * 1000); // Retry in 5 minutes
        }
      }
    } catch (error) {
      console.error('🔄 Token refresh error:', error);
      
      // Handle different types of errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('🔄 Token refresh timeout, will retry later');
        this.scheduleTokenRefresh(5 * 60 * 1000); // Retry in 5 minutes
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('🔄 Network error during refresh, will retry later');
        this.scheduleTokenRefresh(10 * 60 * 1000); // Retry in 10 minutes
      } else {
        // Other errors might indicate invalid state
        console.log('🔄 Unexpected refresh error, logging out for safety');
      this.logout();
      }
    }
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      // Clear all possible auth storage keys
      const keysToRemove = [
        this.STORAGE_KEY,
        'auth_token',
        'id_token', 
        'refresh_token',
        'tsa-admin-auth' // Legacy key
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    }
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.lastRefreshAttempt = 0;
  }

  static getInstance(): AdminAuth {
    if (!AdminAuth.instance) {
      AdminAuth.instance = new AdminAuth();
    }
    return AdminAuth.instance;
  }

  /**
   * Logout admin user
   */
  logout(): void {
    console.log('🔒 Logging out admin user');
    
    this.authState = {
      isAuthenticated: false,
      email: null,
      token: null
    };

    // Clear all stored data
    this.clearStorage();

    // Emit auth state change
    authEventEmitter.emit(this.authState);
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): string | null {
    if (!this.authState.isAuthenticated || !this.authState.token) {
      return null;
    }
    return `Bearer ${this.authState.token}`;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current user email
   */
  getCurrentUser(): string | null {
    return this.authState.email;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return 0;
      
      const parsed = JSON.parse(saved);
      if (!parsed.expiresAt) return 0;
      
      return Math.max(0, parsed.expiresAt - Date.now());
    } catch {
      return 0;
    }
  }

  /**
   * Get readable time until expiry
   */
  getExpiryInfo(): { 
    expiresIn: string; 
    isExpiringSoon: boolean; 
    canRefresh: boolean;
  } {
    const timeLeft = this.getTimeUntilExpiry();
    
    if (timeLeft === 0) {
      return { 
        expiresIn: 'Expired', 
        isExpiringSoon: true, 
        canRefresh: false 
      };
    }
    
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    
    let expiresIn: string;
    if (hours > 0) {
      expiresIn = `${hours}h ${minutes}m`;
    } else {
      expiresIn = `${minutes}m`;
    }
    
    return {
      expiresIn,
      isExpiringSoon: timeLeft < (30 * 60 * 1000), // Less than 30 minutes
      canRefresh: timeLeft > (5 * 60 * 1000) // More than 5 minutes left
    };
  }

  /**
   * Manually refresh tokens (for user-initiated refresh)
   */
  async manualRefresh(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Manual token refresh requested');
      
      // Reset the last refresh attempt to allow immediate refresh
      this.lastRefreshAttempt = 0;
      
      await this.refreshTokens();
      
      // Check if refresh was successful by verifying auth state
      if (this.authState.isAuthenticated) {
        console.log('✅ Manual refresh successful');
        return { success: true };
      } else {
        console.warn('❌ Manual refresh failed - user logged out');
        return { 
          success: false, 
          error: 'Refresh failed. Please log in again.' 
        };
      }
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refresh failed' 
      };
    }
  }

  /**
   * Get detailed auth session info for debugging/monitoring
   */
  getSessionInfo(): {
    isAuthenticated: boolean;
    email: string | null;
    expiresIn: string;
    isExpiringSoon: boolean;
    canRefresh: boolean;
    sessionAge: string;
    lastRefresh: string;
    storageVersion: string;
  } {
    const expiryInfo = this.getExpiryInfo();
    
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        return {
          isAuthenticated: false,
          email: null,
          expiresIn: 'No session',
          isExpiringSoon: false,
          canRefresh: false,
          sessionAge: 'No session',
          lastRefresh: 'Never',
          storageVersion: 'None'
        };
      }
      
      const parsed = JSON.parse(saved);
      const now = Date.now();
      
      // Calculate session age
      const sessionAge = parsed.createdAt ? now - parsed.createdAt : 0;
      const sessionHours = Math.floor(sessionAge / (60 * 60 * 1000));
      const sessionMinutes = Math.floor((sessionAge % (60 * 60 * 1000)) / (60 * 1000));
      
      // Calculate time since last refresh
      const lastRefreshTime = parsed.lastRefresh ? now - parsed.lastRefresh : 0;
      const refreshHours = Math.floor(lastRefreshTime / (60 * 60 * 1000));
      const refreshMinutes = Math.floor((lastRefreshTime % (60 * 60 * 1000)) / (60 * 1000));
      
      return {
        isAuthenticated: this.authState.isAuthenticated,
        email: this.authState.email,
        expiresIn: expiryInfo.expiresIn,
        isExpiringSoon: expiryInfo.isExpiringSoon,
        canRefresh: expiryInfo.canRefresh,
        sessionAge: sessionHours > 0 ? `${sessionHours}h ${sessionMinutes}m` : `${sessionMinutes}m`,
        lastRefresh: parsed.lastRefresh ? 
          (refreshHours > 0 ? `${refreshHours}h ${refreshMinutes}m ago` : `${refreshMinutes}m ago`) : 
          'Never',
        storageVersion: parsed.version || 'Legacy'
      };
    } catch {
      return {
        isAuthenticated: this.authState.isAuthenticated,
        email: this.authState.email,
        expiresIn: expiryInfo.expiresIn,
        isExpiringSoon: expiryInfo.isExpiringSoon,
        canRefresh: expiryInfo.canRefresh,
        sessionAge: 'Unknown',
        lastRefresh: 'Unknown',
        storageVersion: 'Unknown'
      };
    }
  }

  /**
   * Check if session is healthy and tokens are valid
   */
  isSessionHealthy(): boolean {
    if (!this.authState.isAuthenticated) {
      return false;
    }
    
    const timeLeft = this.getTimeUntilExpiry();
    
    // Session is healthy if:
    // 1. User is authenticated
    // 2. Token has more than 5 minutes remaining
    // 3. Email is still authorized
    return timeLeft > (5 * 60 * 1000) && 
           this.authState.email !== null && 
           isAuthorizedAdmin(this.authState.email);
  }

  /**
   * Send magic link to admin email using unified auth system
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate admin email first
      if (!isAuthorizedAdmin(email)) {
        return {
          success: false,
          error: 'Email not authorized. Only designated administrators can access this portal.'
        };
      }

      console.log('🔐 Sending magic link to:', email);
      
      // Get passwordless auth URL from centralized config
      const endpoints = this.getApiEndpoints();
      const authEndpoint = endpoints.passwordlessAuth;
      console.log('🌐 Auth endpoint:', authEndpoint);

      // Fix URL construction to avoid double slashes
      const baseUrl = authEndpoint.replace(/\/+$/, ''); // Remove trailing slashes
      const authUrl = `${baseUrl}/auth/magic-link`;
      console.log('📍 Full auth URL:', authUrl);

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          user_role: 'admin'  // Specify admin role for unified auth system
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Log the error response body for debugging
        const errorText = await response.text();
        console.log('📡 Error response body:', errorText);
        
        return {
          success: false,
          error: `Auth service error (${response.status}). The centralized auth service is currently unavailable. Please try again or contact support.`
        };
      }

      const data = await response.json();
      console.log('📡 Response data:', data);

      return { success: true };
    } catch (error) {
      console.error('Magic link error:', error);
      return {
        success: false,
        error: 'Auth service unavailable. The centralized authentication system is not responding. Please try again or contact support.'
      };
    }
  }

  /**
   * Verify magic link token and authenticate admin using unified auth system
   */
  async verifyToken(token: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate admin email
      if (!isAuthorizedAdmin(email)) {
        return {
          success: false,
          error: 'Email not authorized for admin access.'
        };
      }

      console.log('🔐 Verifying token for:', email);
      
      // Get passwordless auth URL from centralized config
      const endpoints = this.getApiEndpoints();
      const authEndpoint = endpoints.passwordlessAuth;
      console.log('🌐 Auth endpoint:', authEndpoint);

      // Fix URL construction to avoid double slashes
      const baseUrl = authEndpoint.replace(/\/+$/, ''); // Remove trailing slashes
      const verifyUrl = `${baseUrl}/auth/verify`;
      console.log('📍 Full verify URL:', verifyUrl);

      const requestBody = {
        token: token,
        email: email.toLowerCase().trim()
      };

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log('📡 Verify response status:', response.status);
      console.log('📡 Verify response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📡 Verify response data:', data);

      if (response.ok && data.tokens?.access_token) {
        const now = Date.now();
        
        // Calculate token expiration with enhanced duration (up to 24 hours)
        let expiresIn = data.expires_in || 3600; // Default 1 hour in seconds
        
        // For admin users, extend token duration significantly but cap at 24 hours
        const requestedDuration = Math.min(expiresIn * 1000, this.MAX_TOKEN_DURATION);
        const expiresAt = now + requestedDuration;

        // Store tokens securely with enhanced format
        const authData = {
          version: this.STORAGE_VERSION,
          email: email.toLowerCase().trim(),
          tokens: {
            access_token: data.tokens.access_token,
            id_token: data.tokens.id_token || data.tokens.access_token,
            refresh_token: data.tokens.refresh_token || data.tokens.access_token
          },
          expiresAt,
          createdAt: now,
          lastRefresh: now,
          // Store additional metadata for enhanced management
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          loginTime: new Date().toISOString()
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
          
          // Keep legacy storage for compatibility (but prefer the main storage)
          localStorage.setItem('auth_token', data.tokens.access_token);
          localStorage.setItem('id_token', data.tokens.id_token || data.tokens.access_token);
          if (data.tokens.refresh_token) {
            localStorage.setItem('refresh_token', data.tokens.refresh_token);
          }
        }

        // Update auth state
        this.authState = {
          isAuthenticated: true,
          email: email,
          token: data.tokens.access_token
        };

        // Schedule automatic token refresh 
        const timeUntilRefresh = requestedDuration - this.REFRESH_BUFFER;
        if (timeUntilRefresh > 0) {
          this.scheduleTokenRefresh(timeUntilRefresh);
        }

        // Emit auth state change
        authEventEmitter.emit(this.authState);

        const durationHours = Math.round(requestedDuration / (60 * 60 * 1000));
        console.log(`✅ Token verification successful, valid for ${durationHours} hours`);
        
        return { success: true };
      } else {
        const errorMessage = data.error || data.message || 'Token verification failed. Please try again.';
        console.error('❌ Token verification failed:', errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('💥 Token verification error:', error);
      
      // Handle timeout errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please try again.'
        };
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error. Please check your connection and try again.'
      };
    }
  }

  // Handle API 401 responses
  handle401(): void {
    this.logout();
    // Redirect will be handled by the apiRequest method
  }

  /**
   * Validate stored token with the server
   */
  async validateStoredToken(): Promise<boolean> {
    if (!this.authState.isAuthenticated || !this.authState.token) {
      return false;
    }

    try {
      // Get admin API URL from centralized config
      const endpoints = this.getApiEndpoints();
      const adminApiUrl = endpoints.adminApi;
      
      // Make a simple API call to validate the token
      const response = await fetch(`${adminApiUrl}/admin/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authState.token}`,
        },
      });

      if (response.ok) {
        return true;
      } else if (response.status === 401 || response.status === 403) {
        // Token is invalid, clear everything and logout
        this.logout();
        return false;
      } else {
        // Other error, assume token is still valid but API has issues
        return true;
      }
    } catch (error) {
      // Network error or timeout - assume token is still valid for now
      console.error('Error validating stored token:', error);
      
      // Check if this is a network connectivity issue vs. a server rejection
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // This could be a genuine network issue or invalid API endpoint
        console.warn('🔒 Token validation failed due to network error - keeping user logged in temporarily');
        // Return true to keep user logged in until we can properly validate
        return true;
      } else {
        console.warn('🔒 Token validation failed - keeping user logged in temporarily');
        // Return true to keep user logged in until we can properly validate
      return true;
      }
    }
  }
}

export const adminAuth = AdminAuth.getInstance();

/**
 * TSA Admin API Client
 */
export class TSAAdminAPI {
  private apiEndpoints: ApiEndpoints | null = null;

  constructor() {
    // Load API endpoints asynchronously - don't block initialization
    this.loadApiEndpoints().catch(error => {
      console.warn('API Client initial endpoint loading failed, will use fallbacks:', error);
    });
  }

  private async loadApiEndpoints(): Promise<void> {
    try {
      // Use the config endpoints directly
      this.apiEndpoints = config.apiEndpoints;
      if (config.features.debugMode) {
        console.log('🔗 API Client Endpoints loaded from config:', this.apiEndpoints);
      }
    } catch (error) {
      if (config.features.debugMode) {
        console.warn('API Client configuration not available, using fallback endpoints:', error);
      }
      // Use fallback endpoints for reliable operation
      this.apiEndpoints = {
        adminApi: 'https://api-placeholder.tsa.dev/admin',
        coachApi: 'https://api-placeholder.tsa.dev/coach',
        passwordlessAuth: 'https://hcp1htntxf.execute-api.us-east-2.amazonaws.com/api'
      };
    }
  }

  private async ensureApiEndpoints(): Promise<ApiEndpoints> {
    if (!this.apiEndpoints) {
      await this.loadApiEndpoints();
    }
    return this.apiEndpoints!;
  }

  public getBaseUrl(endpoint: 'admin' | 'coach' | 'auth'): string {
    // If endpoints haven't loaded yet, use fallback
    if (!this.apiEndpoints) {
      const fallback = {
        admin: 'https://api-placeholder.tsa.dev/admin',
        coach: 'https://api-placeholder.tsa.dev/coach',
        auth: 'https://hcp1htntxf.execute-api.us-east-2.amazonaws.com/api'
      };
      return fallback[endpoint];
    }

    switch (endpoint) {
      case 'admin':
        return this.apiEndpoints.adminApi;
      case 'coach':
        return this.apiEndpoints.coachApi;
      case 'auth':
        return this.apiEndpoints.passwordlessAuth;
      default:
        throw new Error(`Unknown endpoint type: ${endpoint}`);
    }
  }

  public async getBaseUrlAsync(endpoint: 'admin' | 'coach' | 'auth'): Promise<string> {
    const endpoints = await this.ensureApiEndpoints();
    
    switch (endpoint) {
      case 'admin':
        return endpoints.adminApi;
      case 'coach':
        return endpoints.coachApi;
      case 'auth':
        return endpoints.passwordlessAuth;
      default:
        throw new Error(`Unknown endpoint type: ${endpoint}`);
    }
  }

  private getHeaders(): Record<string, string> {
    const authHeader = adminAuth.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    return headers;
  }

  private checkAuthentication(): boolean {
    if (!adminAuth.isAuthenticated()) {
      // Don't reload the page, let the AuthGuard handle the redirect
      return false;
    }
    return true;
  }

  private async apiRequest(path: string, options: RequestInit = {}, endpoint: 'admin' | 'coach' | 'auth' = 'admin') {
    // Check authentication before making any API calls
    if (!this.checkAuthentication()) {
      return null; // User will be redirected to login
    }

    const baseUrl = await this.getBaseUrlAsync(endpoint);
    // Fix URL construction to avoid double slashes
    const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`; // Ensure path starts with /
    const url = `${cleanBaseUrl}${cleanPath}`;
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      console.error('Invalid URL format:', url, urlError);
      throw new Error(`Invalid API URL configuration: ${url}`);
    }
    
    // Prepare headers properly
    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string> || {})
    };
    
    if (config.features.debugMode) {
      console.log(`🌐 Admin API Request: ${options.method || 'GET'} ${url}`, {
        endpoint,
        baseUrl,
        path,
        headers,
        body: options.body
      });
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // Add timeout and other fetch options for better reliability
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      // Handle 401 - logout and redirect to login
      if (response.status === 401) {
        console.log('API returned 401 - token invalid, logging out');
        adminAuth.handle401();
        return null;
      }

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.error || jsonError.message || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        if (config.features.debugMode) {
          console.error(`❌ API Error Response:`, {
            status: response.status,
            statusText: response.statusText,
            url,
            errorData,
            headers: Object.fromEntries(response.headers.entries())
          });
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (config.features.debugMode) {
        console.log(`✅ Admin API Response:`, data);
      }
      
      return data;
    } catch (error) {
      if (config.features.debugMode) {
        console.error(`❌ Admin API Error:`, {
          error,
          url,
          endpoint,
          errorName: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Handle AbortError (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('API request timeout:', error);
        throw new Error('Request timed out. The API may be experiencing delays. Please try again.');
      }
      
      // Handle network errors (TypeError: Failed to fetch)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - API might be unreachable:', {
          error,
          url,
          baseUrl,
          endpoint
        });
        
        // Check if user is authenticated, if not, redirect to login
        if (!adminAuth.isAuthenticated()) {
          console.log('User not authenticated during network error');
          return null;
        }
        
        // Provide more specific error messages based on URL
        if (baseUrl.includes('localhost')) {
          throw new Error('Cannot connect to local API server. Please ensure the backend service is running.');
        } else {
          throw new Error('Unable to connect to the API. Please check your network connection and try again.');
        }
      }
      
      // Handle CORS errors
      if (error instanceof TypeError && error.message.includes('CORS')) {
        console.error('CORS error - API configuration issue:', error);
        throw new Error('Unable to connect to the API due to security restrictions. Please contact support.');
      }
      
      // Handle other network-related errors
      if (error instanceof TypeError) {
        console.error('Network or connection error:', error);
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }



  // Invitations Management
  async getInvitations(statusFilter?: string) {
    const endpoint = statusFilter 
      ? `/admin/invitations?status=${statusFilter}`
      : '/admin/invitations';
    return this.apiRequest(endpoint);
  }

  async createInvitation(invitationData: {
    email: string;
    message?: string;
  }) {
    return this.apiRequest('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify(invitationData)
    });
  }

  async deleteInvitation(invitationId: string) {
    return this.apiRequest(`/admin/invitations/${invitationId}`, {
      method: 'DELETE'
    });
  }

  async resendInvitation(invitationId: string) {
    return this.apiRequest(`/admin/invitations/${invitationId}/resend`, {
      method: 'POST'
    });
  }

  async bulkCreateInvitations(invitations: Array<{
    email: string;
    message?: string;
  }>) {
    return this.apiRequest('/admin/invitations/bulk', {
      method: 'POST',
      body: JSON.stringify({ invitations })
    });
  }

  async bulkDeleteInvitations(invitationIds: string[]) {
    return this.apiRequest('/admin/invitations/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ invitation_ids: invitationIds })
    });
  }

  // Coach Management
  async getCoaches() {
    return this.apiRequest('/admin/coaches');
  }

  async getCoach(coachId: string) {
    return this.apiRequest(`/admin/coaches/${coachId}`);
  }

  async updateCoach(coachId: string, updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    sport?: string;
    school_name?: string;
    school_type?: string;
    role?: string;
    status?: string;
    phone?: string;
  }) {
    return this.apiRequest(`/admin/coaches/${coachId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteCoach(coachId: string) {
    return this.apiRequest(`/admin/coaches/${coachId}`, {
      method: 'DELETE'
    });
  }

  // Audit logs - missing method added for compatibility
  async getAuditLogs(limit = 50) {
    return this.apiRequest(`/admin/audit?limit=${limit}`);
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.apiRequest('/admin/health');
  }

  // Backward compatibility - keep old method name
  async getHealth() {
    return this.healthCheck();
  }

  // Connection test method for debugging
  async testConnection(): Promise<{
    success: boolean;
    endpoint: string;
    error?: string;
    details?: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
      name?: string;
      message?: string;
      stack?: string;
    };
  }> {
    try {
      const baseUrl = this.getBaseUrl('admin');
      const testUrl = `${baseUrl}/admin/health`;
      
      console.log('🔍 Testing API connection:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout for test
      });
      
      const result = {
        success: response.ok,
        endpoint: testUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      if (response.ok) {
        console.log('✅ API connection successful:', result);
        return { success: true, endpoint: testUrl, details: result };
      } else {
        console.warn('⚠️ API responded with error:', result);
        return { 
          success: false, 
          endpoint: testUrl, 
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: result
        };
      }
    } catch (error) {
      const errorInfo = {
        name: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      
      console.error('❌ API connection test failed:', errorInfo);
      
      let errorMessage = 'Connection test failed';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - API unreachable';
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Connection timeout';
      }
      
      return {
        success: false,
        endpoint: this.getBaseUrl('admin'),
        error: errorMessage,
        details: errorInfo
      };
    }
  }

  /**
   * Public method for making authenticated requests from other modules
   */
  async authenticatedRequest(url: string, options: RequestInit = {}) {
    // Check authentication before making any API calls
    if (!this.checkAuthentication()) {
      throw new Error('User not authenticated');
    }

    // Prepare headers properly
    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string> || {})
    };
    
    if (config.features.debugMode) {
      console.log(`🌐 Authenticated Request: ${options.method || 'GET'} ${url}`, {
        headers,
        body: options.body
      });
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      // Handle 401 - logout and redirect to login
      if (response.status === 401) {
        console.log('API returned 401 - token invalid, logging out');
        adminAuth.handle401();
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.error || jsonError.message || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(`API Error: ${errorMessage}`);
      }

      const responseData = await response.json();
      
      if (config.features.debugMode) {
        console.log(`✅ Authenticated Request Success: ${options.method || 'GET'} ${url}`, responseData);
      }
      
      return responseData;
    } catch (error) {
      if (config.features.debugMode) {
        console.error(`❌ Authenticated Request Failed: ${options.method || 'GET'} ${url}`, error);
      }
      throw error;
    }
  }
}

export const adminAPI = new TSAAdminAPI(); 