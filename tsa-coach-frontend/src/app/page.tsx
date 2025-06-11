'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useCallback, useState } from 'react'
import { getCurrentUser, getUserRole, isAuthenticated, type AuthUser } from '@/lib/auth'

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

export default function RoleBasedHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  const handleRoleBasedRouting = useCallback(() => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      if (!isAuthenticated()) {
        console.log('👤 No authenticated user found, redirecting to login')
        router.replace('/login')
        return
      }

      // Get current user from auth context
      const currentUser = getCurrentUser()
      setUser(currentUser)

      if (!currentUser) {
        console.log('👤 No user data found, redirecting to login')
        router.replace('/login')
        return
      }

      // Get user role using the existing auth utility
      const userRole = getUserRole()
      
      console.log('👤 User role determined:', userRole, 'for user:', currentUser.email)

      switch (userRole) {
        case 'coach':
          console.log('🏀 Redirecting to coach dashboard')
          router.replace('/coach')
          break
        
        case 'parent':
          console.log('👨‍👩‍👧‍👦 Redirecting to parent dashboard')
          router.replace('/dashboard')
          break
        
        default:
          console.log('❓ Unknown role, defaulting to coach for now')
          router.replace('/coach')
          break
      }

    } catch (err) {
      console.error('❌ Error during role-based routing:', err)
      setError('Failed to determine your access level. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    handleRoleBasedRouting()
  }, [handleRoleBasedRouting])

  const handleRetry = () => {
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

  // This should not be reached as we redirect, but just in case
  return <LoadingScreen />
} 