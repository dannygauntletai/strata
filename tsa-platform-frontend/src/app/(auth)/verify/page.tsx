'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { coachAuth } from '@/lib/auth'

function VerifyTokenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  
  // Prevent double execution in React Strict Mode
  const verificationAttempted = useRef(false)

  useEffect(() => {
    const verifyToken = async () => {
      // Prevent multiple runs
      if (verificationAttempted.current) return
      verificationAttempted.current = true

    const token = searchParams.get('token')
    const email = searchParams.get('email')
      const role = searchParams.get('role')
    const errorParam = searchParams.get('error')

      // Handle error parameter from URL
    if (errorParam) {
      setStatus('error')
      setError(decodeURIComponent(errorParam))
      return
    }

      // Validate required parameters
      if (!token || !email) {
        setStatus('error')
        setError('Invalid verification link. Please request a new login link.')
        return
      }

      try {
        // Verify token with backend
        console.log('🔄 Starting token verification...', { token: token.substring(0, 8) + '...', email, role })
        const result = await coachAuth.verifyToken(token, email, role || undefined)

        if (result.success) {
          console.log('✅ Token verification successful')
          setStatus('success')
          
          // Clear URL parameters and redirect to home
          window.history.replaceState({}, '', '/')
          
          // Redirect after showing success message briefly
          setTimeout(() => {
            router.push('/')
          }, 1500)
        } else {
          console.error('❌ Token verification failed:', result.error)
          setStatus('error')
          setError(result.error || 'Token verification failed')
        }
      } catch (err) {
        console.error('❌ Token verification error:', err)
        setStatus('error')
        setError('Network error during verification. Please try again.')
      }
    }

    verifyToken()
  }, [searchParams, router])

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