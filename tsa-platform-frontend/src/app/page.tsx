'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { coachAuth, authEventEmitter } from '@/lib/auth'

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900">Loading your dashboard...</h2>
        <p className="text-gray-600">Determining your access level</p>
      </div>
    </div>
  )
}

// Error component
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// Role selector component for users with multiple roles
function RoleSelector({ roles, onRoleSelect }: { roles: string[]; onRoleSelect: (role: string) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Portal</h1>
          <p className="text-gray-600">You have access to multiple portals. Please select which one you'd like to use.</p>
        </div>
        
        <div className="space-y-4">
          {roles.includes('coach') && (
            <button
              onClick={() => onRoleSelect('coach')}
              className="w-full p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Coach Portal</h3>
                  <p className="text-gray-600">Manage students, schedules, and coaching activities</p>
                </div>
              </div>
            </button>
          )}
          
          {roles.includes('parent') && (
            <button
              onClick={() => onRoleSelect('parent')}
              className="w-full p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Parent Portal</h3>
                  <p className="text-gray-600">View your child's progress and activities</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RoleBasedHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRoleSelector, setShowRoleSelector] = useState(false)

  const handleRoleBasedRouting = useCallback(() => {
    try {
      setLoading(true)
      setError(null)

      // Get current auth state from existing system
      const authState = coachAuth.getAuthState()

      if (!authState.isAuthenticated) {
        console.log('[ROLE ROUTING] No authenticated user found, redirecting to login')
        router.replace('/login')
        return
      }

      if (!authState.user) {
        console.log('[ROLE ROUTING] No user data found, redirecting to login')
        router.replace('/login')
        return
      }

      // Check if user has multiple roles and needs to select one
      if (authState.roles.length > 1 && !authState.primaryRole) {
        console.log('[ROLE ROUTING] User has multiple roles, showing role selector')
        setShowRoleSelector(true)
        setLoading(false)
        return
      }

      // Get primary role
      const primaryRole = authState.primaryRole || authState.roles[0]
      
      console.log('[ROLE ROUTING] User role determined:', primaryRole, 'for user:', authState.user.email)

      switch (primaryRole) {
        case 'coach':
          console.log('[ROLE ROUTING] Redirecting to coach dashboard')
          router.replace('/coach')
          break
        
        case 'parent':
          console.log('[ROLE ROUTING] Redirecting to parent dashboard')
          router.replace('/parent')
          break
        
        default:
          console.log('[ROLE ROUTING] Unknown role, defaulting to coach')
          router.replace('/coach')
          break
      }

    } catch (err) {
      console.error('[ROLE ROUTING] Error during role-based routing:', err)
      setError('Failed to determine your access level. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Initial routing
    handleRoleBasedRouting()

    // Listen for auth state changes
    const unsubscribe = authEventEmitter.subscribe((authState) => {
      if (authState.isAuthenticated && authState.primaryRole) {
        // User has selected a role, redirect appropriately
        if (authState.primaryRole === 'parent') {
          router.replace('/parent')
        } else {
          router.replace('/coach')
        }
      } else if (!authState.isAuthenticated) {
        router.replace('/login')
      }
    })

    return unsubscribe
  }, [handleRoleBasedRouting, router])

  const handleRoleSelect = (role: string) => {
    try {
      coachAuth.setPrimaryRole(role as 'coach' | 'parent')
      setShowRoleSelector(false)
      
      // The auth event emitter will handle the redirect
    } catch (error) {
      console.error('[ROLE ROUTING] Error selecting role:', error)
      setError('Failed to select role. Please try again.')
    }
  }

  const handleRetry = () => {
    setError(null)
    setShowRoleSelector(false)
    handleRoleBasedRouting()
  }

  // Show loading screen
  if (loading) {
    return <LoadingScreen />
  }

  // Show error screen
  if (error) {
    return <ErrorScreen message={error} onRetry={handleRetry} />
  }

  // Show role selector for multi-role users
  if (showRoleSelector) {
    const roles = coachAuth.getUserRoles()
    return <RoleSelector roles={roles} onRoleSelect={handleRoleSelect} />
  }

  // This should not be reached as we redirect, but just in case
  return <LoadingScreen />
} 