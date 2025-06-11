'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { getSyncEnvironmentConfig } from '@/config/environments'

function VerifyTokenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  
  // Prevent double execution in React Strict Mode
  const verificationAttempted = useRef(false)
  const verificationSuccessful = useRef(false)

  useEffect(() => {
    // Prevent duplicate calls - check if already attempted
    if (verificationAttempted.current) {
      return
    }

    const verifyToken = async () => {
      const token = searchParams.get('token')
      const email = searchParams.get('email')
      const role = searchParams.get('role') || 'coach' // Default to coach for backward compatibility
      const invitation = searchParams.get('invitation')

      if (!token || !email) {
        setStatus('error')
        setError('Invalid verification link. Please request a new login link.')
        return
      }

      // Mark as attempting verification
      verificationAttempted.current = true

      try {
        const config = getSyncEnvironmentConfig()
        const apiUrl = process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_URL || config.apiEndpoints.passwordlessAuth
        
        console.log('Verifying token:', token.substring(0, 8) + '...', 'for role:', role)
        
        const response = await fetch(`${apiUrl}/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: token,
            email: email.toLowerCase().trim(),
            user_role: role,
            invitation_token: invitation
          })
        })

        const data = await response.json()

        if (response.ok) {
          verificationSuccessful.current = true
          
          // Store tokens and role information
          localStorage.setItem('auth_token', data.tokens.access_token)
          localStorage.setItem('id_token', data.tokens.id_token)
          if (data.tokens.refresh_token) {
            localStorage.setItem('refresh_token', data.tokens.refresh_token)
          }

          // Store role context for role-based rendering
          const userRole = data.user_role || role
          if (userRole) {
            localStorage.setItem('invitation_context', JSON.stringify({
              user_role: userRole,
              verified_at: new Date().toISOString(),
              invitation_token: invitation
            }))
          }

          console.log('✅ Authentication successful for role:', userRole)
          setStatus('success')
          
          // Role-based redirect with delay to show success message
          setTimeout(() => {
            if (userRole === 'parent') {
              // Redirect to parent portal
              window.location.href = '/parent'
            } else {
              // Redirect to coach portal  
              window.location.href = '/coach'
            }
          }, 2000)
        } else {
          console.error('❌ Token verification failed:', data.error)
          
          // Don't show "token already used" error if this is a duplicate call
          if (data.error?.includes('already been used')) {
            console.log('Token already used - this may be a duplicate call from React Strict Mode')
            // Don't set error state, just return
            return
          }
          
          setStatus('error')
          setError(data.error || 'Failed to verify login link. It may have expired or been used already.')
        }
      } catch (err) {
        console.error('Verification network error:', err)
        setStatus('error')
        setError('Network error. Please check your connection and try again.')
      }
    }

    verifyToken()
  }, [searchParams, router]) // Proper dependencies for Next.js hydration

  const handleReturnToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="w-full max-w-md text-center px-4">
      {/* TSA Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
          alt="Texas Sports Academy"
          className="h-16 w-auto"
        />
      </div>

      {status === 'loading' && (
        <div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#004aad]"></div>
          </div>
          
          <Heading className="text-gray-900 mb-2">Verifying Login Link</Heading>
          <Text className="text-gray-600">
            Please wait while we securely log you in...
          </Text>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <Heading className="text-green-800 mb-2">Login Successful!</Heading>
          <Text className="text-green-700 mb-4">
            You have been successfully authenticated. Redirecting to your dashboard...
          </Text>
          
          <div className="animate-pulse">
            <div className="h-2 bg-green-200 rounded-full">
              <div className="h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <Heading className="text-red-800 mb-2">Verification Failed</Heading>
          <Text className="text-red-700 mb-4">
            {error}
          </Text>
          
          <Button 
            onClick={handleReturnToLogin}
            className="w-full bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
          >
            Return to Login
          </Button>
        </div>
      )}
    </div>
  )
}

export default function VerifyToken() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md text-center px-4">
        <div className="flex justify-center mb-6">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-16 w-auto"
          />
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#004aad]"></div>
        </div>
        <Heading className="text-gray-900 mb-2">Loading...</Heading>
        <Text className="text-gray-600">Preparing verification...</Text>
      </div>
    }>
      <VerifyTokenContent />
    </Suspense>
  )
} 