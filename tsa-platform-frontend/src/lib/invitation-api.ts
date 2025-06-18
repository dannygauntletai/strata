/**
 * TSA Coach Invitation API Client
 * Handles invitation validation and onboarding integration with comprehensive coach data
 */

import { config } from '@/config/environments'

export interface InvitationData {
  // Basic invitation info
  email: string;
  role: string;
  
  // Comprehensive coach data (pre-collected from admin)
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  state: string;
  bio?: string;
  message?: string;
  
  // Generated fields
  full_name: string;
  location: string;
  phone_formatted: string;
  
  // Legacy fields for compatibility
  school_name?: string;
  school_type?: string;
  sport?: string;
}

export interface InvitationValidationResponse {
  valid: boolean;
  invitation?: InvitationData;
  error?: string;
  status?: string;
}

export interface OnboardingProgress {
  user_id: string;
  email: string;
  current_step: string;
  completed_steps: string[];
  step_data: Record<string, any>;
  last_updated: string;
  invitation_based: boolean;
  invitation_id?: string;
}

export interface OnboardingData {
  // Pre-filled from invitation (should not be re-collected)
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  state: string;
  bio?: string;
  
  // Ed-Fi compliant personal information
  birth_date?: string;
  birth_city?: string;
  birth_state_abbreviation_descriptor?: string;
  middle_name?: string;
  generation_code_suffix?: string; // Jr., Sr., III, etc.
  
  // Ed-Fi compliant demographics (optional for coaches, required for students)
  hispanic_latino_ethnicity?: boolean;
  races?: string[]; // Array of race descriptors
  gender?: string;
  
  // TSA-specific fields
  emergency_contact?: string;
  certifications?: string[];
  experience?: string;
  specialties?: string[];
  school_name?: string;
  school_type?: string;
  grade_levels?: string[];
  
  // OneRoster compliant organizational data
  role: string; // teacher, administrator, etc.
  org_ids?: string[]; // Array of organization IDs
  enabled_user?: boolean;
  
  // Progress tracking
  current_step: string;
  completed_steps: string[];
  
  // Include invitation ID for backend validation
  invitation_id?: string;
}

export interface OnboardingResponse {
  message: string;
  profile_id: string;
  status: string;
  invitation_based: boolean;
  progress?: OnboardingProgress;
}

// Session storage keys
const SESSION_KEYS = {
  INVITATION_DATA: 'onboarding_invitation_data',
  INVITATION_TOKEN: 'onboarding_invitation_token', 
  INVITATION_URL: 'onboarding_invitation_url',
  INVITATION_URL_PARAMS: 'onboarding_invitation_url_params',
  ONBOARDING_PROGRESS: 'onboarding_progress'
} as const;

// Onboarding step definitions
export const ONBOARDING_STEPS = {
  PERSONAL_INFO: 'personal-info',
  ROLE_EXPERIENCE: 'role-experience', 
  SCHOOL_SETUP: 'school-setup',
  SCHOOL_NAME: 'school-name',
  SCHOOL_FOCUS: 'school-focus',
  STUDENT_PLANNING: 'student-planning',
  STUDENTS: 'students',
  BACKGROUND_CHECK: 'background-check',
  AGREEMENTS: 'agreements',
  FINALIZE: 'finalize',
  COMPLETE: 'complete'
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

class CoachInvitationAPI {
  private getBaseURL(): string {
    return config.apiEndpoints.coach
  }

  /**
   * Validate an invitation token and get comprehensive pre-fill data
   */
  async validateInvitation(token: string): Promise<InvitationValidationResponse> {
    try {
      const response = await fetch(`${this.getBaseURL()}/onboarding/validate-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitation_id: token })
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        
        console.error('Invitation validation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          token: token
        });
        
        return {
          valid: false,
          error: errorMessage,
          status: `HTTP ${response.status}`
        };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating invitation:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get or create onboarding progress for a coach
   */
  async getOnboardingProgress(email: string, invitationToken?: string): Promise<OnboardingProgress | null> {
    try {
      const response = await fetch(`${this.getBaseURL()}/onboarding/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          invitation_id: invitationToken 
        })
      });
      
      if (!response.ok) {
        console.error('Failed to get onboarding progress:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data.progress;
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return null;
    }
  }

  /**
   * Update onboarding progress and step data
   */
  async updateOnboardingProgress(
    email: string, 
    currentStep: OnboardingStep, 
    stepData: Record<string, any>,
    completedSteps: string[] = [],
    invitationToken?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseURL()}/onboarding/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          current_step: currentStep,
          step_data: stepData,
          completed_steps: completedSteps,
          invitation_id: invitationToken
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update onboarding progress:', response.status);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      return false;
    }
  }

  /**
   * Complete onboarding with invitation data
   */
  async completeOnboarding(data: OnboardingData): Promise<OnboardingResponse> {
    try {
      const response = await fetch(`${this.getBaseURL()}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const invitationAPI = new CoachInvitationAPI();

/**
 * Get invitation token from URL params or cache
 */
export function getInvitationTokenFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  // First check current URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('invite');
  
  if (token) {
    console.log('Found invitation token in URL:', token);
    // Store the token for the session
    storeInvitationToken(token);
    // Store the full URL with params for propagation
    storeInvitationURL(window.location.href);
    return token;
  }
  
  // Fall back to cached token
  const cachedToken = getCachedInvitationToken();
  if (cachedToken) {
    console.log('Using cached invitation token:', cachedToken);
  } else {
    console.log('No invitation token found in URL or cache');
  }
  
  return cachedToken;
}

/**
 * Store invitation token in session/local storage
 */
export function storeInvitationToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Store in both session and local storage for redundancy
    sessionStorage.setItem(SESSION_KEYS.INVITATION_TOKEN, token);
    localStorage.setItem(SESSION_KEYS.INVITATION_TOKEN, token);
  } catch (error) {
    console.error('Error storing invitation token:', error);
  }
}

/**
 * Get cached invitation token
 */
export function getCachedInvitationToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try session storage first, then local storage
    return sessionStorage.getItem(SESSION_KEYS.INVITATION_TOKEN) || 
           localStorage.getItem(SESSION_KEYS.INVITATION_TOKEN);
  } catch (error) {
    console.error('Error getting cached invitation token:', error);
    return null;
  }
}

/**
 * Store full invitation URL for propagation
 */
export function storeInvitationURL(url: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const urlObj = new URL(url);
    const params = Object.fromEntries(urlObj.searchParams);
    
    sessionStorage.setItem(SESSION_KEYS.INVITATION_URL, url);
    sessionStorage.setItem(SESSION_KEYS.INVITATION_URL_PARAMS, JSON.stringify(params));
    localStorage.setItem(SESSION_KEYS.INVITATION_URL, url);
    localStorage.setItem(SESSION_KEYS.INVITATION_URL_PARAMS, JSON.stringify(params));
  } catch (error) {
    console.error('Error storing invitation URL:', error);
  }
}

/**
 * Get invitation URL with params for propagation to other pages
 */
export function getInvitationURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return sessionStorage.getItem(SESSION_KEYS.INVITATION_URL) || 
           localStorage.getItem(SESSION_KEYS.INVITATION_URL);
  } catch (error) {
    console.error('Error getting invitation URL:', error);
    return null;
  }
}

/**
 * Get invitation URL params
 */
export function getInvitationURLParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const params = sessionStorage.getItem(SESSION_KEYS.INVITATION_URL_PARAMS) || 
                   localStorage.getItem(SESSION_KEYS.INVITATION_URL_PARAMS);
    return params ? JSON.parse(params) : null;
  } catch (error) {
    console.error('Error getting invitation URL params:', error);
    return null;
  }
}

/**
 * Build URL with invitation params for navigation
 */
export function buildInvitationURL(basePath: string): string {
  if (typeof window === 'undefined') return basePath;
  
  const token = getCachedInvitationToken();
  if (!token) return basePath;
  
  const url = new URL(basePath, window.location.origin);
  url.searchParams.set('invite', token);
  
  // Add any other preserved params
  const storedParams = getInvitationURLParams();
  if (storedParams) {
    Object.entries(storedParams).forEach(([key, value]) => {
      if (key !== 'invite') {
        url.searchParams.set(key, value);
      }
    });
  }
  
  return url.pathname + url.search;
}

/**
 * Check if this is an invitation-based onboarding
 */
export function isInvitationOnboarding(): boolean {
  return getInvitationTokenFromURL() !== null || getCachedInvitationToken() !== null;
}

/**
 * Store invitation data in localStorage for the onboarding session
 */
export function storeInvitationData(data: InvitationData): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(SESSION_KEYS.INVITATION_DATA, JSON.stringify(data));
    localStorage.setItem(SESSION_KEYS.INVITATION_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error storing invitation data:', error);
  }
}

/**
 * Get stored invitation data from localStorage
 */
export function getStoredInvitationData(): InvitationData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS.INVITATION_DATA) || 
                   localStorage.getItem(SESSION_KEYS.INVITATION_DATA);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting stored invitation data:', error);
    return null;
  }
}

/**
 * Store onboarding progress locally (redundancy)
 */
export function storeOnboardingProgress(progress: OnboardingProgress): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(SESSION_KEYS.ONBOARDING_PROGRESS, JSON.stringify(progress));
    localStorage.setItem(SESSION_KEYS.ONBOARDING_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Error storing onboarding progress:', error);
  }
}

/**
 * Get stored onboarding progress (local cache)
 */
export function getStoredOnboardingProgress(): OnboardingProgress | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS.ONBOARDING_PROGRESS) || 
                   localStorage.getItem(SESSION_KEYS.ONBOARDING_PROGRESS);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting stored onboarding progress:', error);
    return null;
  }
}

/**
 * Check if a field should be pre-filled from invitation data
 */
export function isFieldPreFilled(fieldName: string, invitationData: InvitationData | null): boolean {
  if (!invitationData) return false;
  
  const preFilledFields = [
    'first_name', 'last_name', 'email', 'phone', 'city', 'state', 'bio'
  ];
  
  return preFilledFields.includes(fieldName) && 
         invitationData[fieldName as keyof InvitationData] !== undefined;
}

/**
 * Get pre-filled value for a field from invitation data
 */
export function getPreFilledValue(fieldName: string, invitationData: InvitationData | null): string {
  if (!invitationData || !isFieldPreFilled(fieldName, invitationData)) {
    return '';
  }
  
  return String(invitationData[fieldName as keyof InvitationData] || '');
}

/**
 * Clear invitation data from localStorage
 */
export function clearInvitationData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear from both storages
    Object.values(SESSION_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    console.log('Cleared all cached invitation data');
  } catch (error) {
    console.error('Error clearing invitation data:', error);
  }
}

/**
 * Debug function: Get current invitation state
 */
export function getInvitationDebugInfo(): object {
  if (typeof window === 'undefined') return {};
  
  return {
    currentURL: window.location.href,
    urlToken: new URLSearchParams(window.location.search).get('invite'),
    cachedToken: getCachedInvitationToken(),
    cachedData: getStoredInvitationData(),
    cachedURL: getInvitationURL(),
    cachedParams: getInvitationURLParams(),
    cachedProgress: getStoredOnboardingProgress()
  };
} 