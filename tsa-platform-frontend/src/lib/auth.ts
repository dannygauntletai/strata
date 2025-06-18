/**
 * Enhanced Authentication Library for TSA Coach Portal
 * Supports multi-role users (coach + parent) with secure token management
 * Includes automatic token refresh and server-side validation
 */

import { config } from '@/config/environments'

export interface AuthTokens {
  access_token?: string
  id_token?: string
  refresh_token?: string
}

export interface AuthUser {
  email: string
  name?: string
  sub: string
  exp: number
  'custom:user_role'?: string // Role from Cognito custom attributes
  roles?: string[] // Multiple roles for users who are both coach and parent
}

export type UserRole = 'coach' | 'parent'

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  roles: UserRole[]
  primaryRole: UserRole | null
}

// Event emitter for auth state changes
class AuthEventEmitter {
  private listeners: ((authState: AuthState) => void)[] = []

  subscribe(listener: (authState: AuthState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  emit(authState: AuthState): void {
    this.listeners.forEach(listener => listener(authState))
  }
}

export const authEventEmitter = new AuthEventEmitter()

// Encryption for localStorage (simple XOR)
const ENCRYPTION_KEY = 'tsa-coach-auth-key'

function encryptData(data: string): string {
  if (typeof window === 'undefined') return data
  try {
    const key = ENCRYPTION_KEY
    let encrypted = ''
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(encrypted)
  } catch {
    return data
  }
}

function decryptData(encryptedData: string): string {
  if (typeof window === 'undefined') return encryptedData
  try {
    const data = atob(encryptedData)
    const key = ENCRYPTION_KEY
    let decrypted = ''
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return decrypted
  } catch {
    return encryptedData
  }
}

// Enhanced Auth Class
class CoachAuth {
  private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000 // 5 minutes before expiry
  private refreshTimer: NodeJS.Timeout | null = null

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false, user: null, roles: [], primaryRole: null }
    }

    const user = this.getCurrentUser()
    const roles = this.getUserRoles()
    const primaryRole = this.getPrimaryRole()

    return {
      isAuthenticated: !!user && this.isTokenValid(),
      user,
      roles,
      primaryRole
    }
  }

  /**
   * Check if user is authenticated with valid token
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    
    const token = this.getStoredToken('auth_token')
    if (!token) return false
    
    return this.isTokenValid(token)
  }

  /**
   * Validate token format and expiration
   */
  private isTokenValid(token?: string): boolean {
    if (typeof window === 'undefined') return false
    
    const authToken = token || this.getStoredToken('auth_token')
    if (!authToken) return false
    
    try {
      const tokenParts = authToken.split('.')
      if (tokenParts.length !== 3) {
        console.warn('[COACH AUTH] Invalid JWT format detected, clearing token')
        this.clearInvalidTokens()
        return false
      }
      
      const payload = JSON.parse(atob(tokenParts[1]))
      
      if (!payload.exp || typeof payload.exp !== 'number') {
        console.warn('[COACH AUTH] Invalid token payload detected, clearing token')
        this.clearInvalidTokens()
        return false
      }
      
      const currentTime = Math.floor(Date.now() / 1000)
      const isValid = payload.exp > currentTime
      
      if (!isValid) {
        console.info('[COACH AUTH] Expired token detected, clearing tokens')
        this.clearInvalidTokens()
        return false
      }
      
      // Schedule refresh if token is close to expiry
      this.scheduleTokenRefresh(payload.exp)
      
      return true
    } catch (error) {
      console.warn('[COACH AUTH] Error checking token validity, clearing tokens:', error)
      this.clearInvalidTokens()
      return false
    }
  }

  /**
   * Get current user from token
   */
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    
    const token = this.getStoredToken('id_token') || this.getStoredToken('auth_token')
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        email: payload.email,
        name: payload.name,
        sub: payload.sub,
        exp: payload.exp,
        'custom:user_role': payload['custom:user_role'],
        roles: payload.roles || []
      }
    } catch (error) {
      console.error('[COACH AUTH] Error parsing user token:', error)
      return null
    }
  }

  /**
   * Get user roles (supports multiple roles)
   */
  getUserRoles(): UserRole[] {
    const user = this.getCurrentUser()
    if (!user) return []

    const roles: UserRole[] = []

    // Check custom:user_role attribute
    if (user['custom:user_role']) {
      const role = user['custom:user_role'].toLowerCase()
      if (role === 'parent' || role === 'coach') {
        roles.push(role)
      }
    }

    // Check roles array for multiple roles
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(role => {
        const normalizedRole = role.toLowerCase()
        if ((normalizedRole === 'parent' || normalizedRole === 'coach') && !roles.includes(normalizedRole)) {
          roles.push(normalizedRole)
        }
      })
    }

    return roles.length > 0 ? roles : ['coach'] // Default to coach
  }

  /**
   * Get primary role (for users with multiple roles)
   */
  getPrimaryRole(): UserRole | null {
    if (typeof window === 'undefined') return null

    // Check if user has explicitly selected a role
    const selectedRole = localStorage.getItem('selected_role')
    if (selectedRole && (selectedRole === 'coach' || selectedRole === 'parent')) {
      return selectedRole
    }

    // Default to first available role
    const roles = this.getUserRoles()
    return roles.length > 0 ? roles[0] : null
  }

  /**
   * Set primary role for users with multiple roles
   */
  setPrimaryRole(role: UserRole): void {
    if (typeof window === 'undefined') return

    const availableRoles = this.getUserRoles()
    if (!availableRoles.includes(role)) {
      throw new Error(`Role ${role} is not available for this user`)
    }

    localStorage.setItem('selected_role', role)
    
    // Emit auth state change
    authEventEmitter.emit(this.getAuthState())
  }

  /**
   * Check if user has multiple roles
   */
  hasMultipleRoles(): boolean {
    return this.getUserRoles().length > 1
  }

  /**
   * Verify token with server
   */
  async verifyToken(token: string, email: string, role?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = config.apiEndpoints.passwordlessAuth
      
      const response = await fetch(`${apiUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          email: email.toLowerCase().trim()
          // Note: user_role is now extracted from JWT, not passed in request
        })
      })

      const data = await response.json()

      if (response.ok && data.tokens) {
        console.log('✅ JWT token verification successful:', { 
          user_role: data.user_role, 
          user: data.user,
          expires_in: data.expires_in 
        });
        
        // Store tokens securely
        this.storeTokens(data.tokens)
        
        // Store user role information from JWT response
        if (data.user_role) {
          localStorage.setItem('invitation_context', JSON.stringify({
            user_role: data.user_role,
            verified_at: new Date().toISOString(),
            invitation_token: data.user?.invitation_token // Store invitation token from JWT
          }))
        }

        // Create server-side session for persistence
        if (data.session_id) {
          this.storeSessionId(data.session_id)
        } else {
          // If backend doesn't provide session_id yet, we can still create one client-side
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          this.storeSessionId(sessionId)
        }

        // Emit auth state change
        authEventEmitter.emit(this.getAuthState())
        
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Token verification failed' }
      }
    } catch (error) {
      console.error('[COACH AUTH] Token verification error:', error)
      return { success: false, error: 'Network error during verification' }
    }
  }

  /**
   * Validate stored token with server and attempt session restoration
   */
  async validateStoredToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    const token = this.getStoredToken('auth_token')
    if (!token) {
      // No local token - try session restoration
      console.log('[COACH AUTH] No local token found, attempting session restoration...')
      return await this.attemptSessionRestoration()
    }

    try {
      const apiUrl = config.apiEndpoints.coach || config.apiEndpoints.passwordlessAuth
      
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401 || response.status === 403) {
        // Token is invalid, try session restoration before giving up
        console.log('[COACH AUTH] Token validation failed, attempting session restoration...')
        this.clearInvalidTokens()
        return await this.attemptSessionRestoration()
      }

      if (response.ok) {
        return true
      }

      // For other errors, assume token is still valid but there's a network issue
      return true
    } catch (error) {
      console.error('[COACH AUTH] Token validation error:', error)
      // On network errors, try session restoration as fallback
      return await this.attemptSessionRestoration()
    }
  }

  /**
   * Attempt to restore authentication from server-side session
   */
  async attemptSessionRestoration(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      const sessionId = this.getStoredSessionId()
      if (!sessionId) {
        console.log('[COACH AUTH] No session ID found for restoration')
        return false
      }

      const apiUrl = config.apiEndpoints.coach || config.apiEndpoints.passwordlessAuth
      
      const response = await fetch(`${apiUrl}/auth/restore-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.tokens && data.user) {
          // Restore tokens from server session
          this.storeTokens(data.tokens)
          
          // Store user info
          if (data.user.role) {
            localStorage.setItem('invitation_context', JSON.stringify({
              user_role: data.user.role,
              restored_at: new Date().toISOString()
            }))
          }

          // Emit auth state change
          authEventEmitter.emit(this.getAuthState())
          
          console.log('[COACH AUTH] ✅ Session restoration successful')
          return true
        }
      } else if (response.status === 404) {
        // Session not found or expired - clear session ID
        this.clearStoredSessionId()
        console.log('[COACH AUTH] Server session not found or expired')
      }

      return false
    } catch (error) {
      console.error('[COACH AUTH] Session restoration error:', error)
      return false
    }
  }

  /**
   * Store session ID for server-side session management
   */
  storeSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('tsa_session_id', sessionId)
    
    // Also store as cookie for automatic inclusion in requests
    document.cookie = `tsa_session_id=${sessionId}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=strict`
  }

  /**
   * Get stored session ID
   */
  getStoredSessionId(): string | null {
    if (typeof window === 'undefined') return null
    
    // Try localStorage first
    const sessionId = localStorage.getItem('tsa_session_id')
    if (sessionId) return sessionId
    
    // Try cookie as fallback
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=')
      if (key === 'tsa_session_id') {
        return value
      }
    }
    
    return null
  }

  /**
   * Clear stored session ID
   */
  clearStoredSessionId(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('tsa_session_id')
    document.cookie = 'tsa_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  /**
   * Store authentication tokens securely
   */
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return

    if (tokens.access_token) {
      localStorage.setItem('auth_token', encryptData(tokens.access_token))
    }
    if (tokens.id_token) {
      localStorage.setItem('id_token', encryptData(tokens.id_token))
    }
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', encryptData(tokens.refresh_token))
    }

    // Store timestamp for expiry tracking
    localStorage.setItem('auth_timestamp', Date.now().toString())
  }

  /**
   * Get stored token with decryption
   */
  private getStoredToken(key: string): string | null {
    if (typeof window === 'undefined') return null

    const encryptedToken = localStorage.getItem(key)
    if (!encryptedToken) return null

    return decryptData(encryptedToken)
  }

  /**
   * Get authentication tokens
   */
  getAuthTokens(): AuthTokens {
    if (typeof window === 'undefined') return {}
    
    return {
      access_token: this.getStoredToken('auth_token') || undefined,
      id_token: this.getStoredToken('id_token') || undefined,
      refresh_token: this.getStoredToken('refresh_token') || undefined
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): Record<string, string> {
    const tokens = this.getAuthTokens()
    
    if (tokens.access_token) {
      return {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    }
    
    return {}
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiry: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilRefresh = (expiry - currentTime) * 1000 - this.TOKEN_EXPIRY_BUFFER

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAuthToken()
      }, timeUntilRefresh)
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken(): Promise<boolean> {
    const tokens = this.getAuthTokens()
    
    if (!tokens.refresh_token) {
      return false
    }
    
    try {
      const apiUrl = config.apiEndpoints.passwordlessAuth
      
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refresh_token: tokens.refresh_token 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.access_token) {
          localStorage.setItem('auth_token', encryptData(data.access_token))
        }
        if (data.id_token) {
          localStorage.setItem('id_token', encryptData(data.id_token))
        }
        
        // Emit auth state change
        authEventEmitter.emit(this.getAuthState())
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('[COACH AUTH] Error refreshing token:', error)
      return false
    }
  }

  /**
   * Clear invalid tokens from localStorage
   */
  private clearInvalidTokens(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_timestamp')
    localStorage.removeItem('selected_role')
    localStorage.removeItem('invitation_context')
  }

  /**
   * Clear all authentication data and logout
   */
  logout(): void {
    if (typeof window === 'undefined') return
    
    // Attempt to invalidate server-side session
    this.invalidateServerSession()
    
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    // Clear all auth data
    this.clearInvalidTokens()
    this.clearStoredSessionId()
    
    // Emit auth state change
    authEventEmitter.emit({
      isAuthenticated: false,
      user: null,
      roles: [],
      primaryRole: null
    })
  }

  /**
   * Invalidate server-side session (fire-and-forget)
   */
  private async invalidateServerSession(): Promise<void> {
    try {
      const sessionId = this.getStoredSessionId()
      if (!sessionId) return

      const apiUrl = config.apiEndpoints.coach || config.apiEndpoints.passwordlessAuth
      
      // Fire-and-forget request to invalidate session
      fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId })
      }).catch(() => {
        // Ignore errors - this is best effort
      })
    } catch {
      // Ignore errors - this is best effort
    }
  }
}

// Create singleton instance
export const coachAuth = new CoachAuth()

// Legacy compatibility functions
export function isAuthenticated(): boolean {
  return coachAuth.isAuthenticated()
}

export function getCurrentUser(): (AuthUser & { token?: string }) | null {
  const user = coachAuth.getCurrentUser()
  if (!user) return null

  const tokens = coachAuth.getAuthTokens()
  return {
    ...user,
    token: tokens.access_token
  }
}

export function getUserRole(): UserRole {
  const primaryRole = coachAuth.getPrimaryRole()
  return primaryRole || 'coach'
}

export function getAuthTokens(): AuthTokens {
  return coachAuth.getAuthTokens()
}

export function logout(): void {
  coachAuth.logout()
  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export async function refreshAuthToken(): Promise<boolean> {
  return coachAuth.refreshAuthToken()
}

export function getAuthHeader(): Record<string, string> {
  return coachAuth.getAuthHeader()
}

export function isParent(): boolean {
  return coachAuth.getUserRoles().includes('parent')
}

export function isCoach(): boolean {
  return coachAuth.getUserRoles().includes('coach')
}