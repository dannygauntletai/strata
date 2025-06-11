'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/button'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { config } from '@/config/environments'
import { isAuthenticated } from '@/lib/auth'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  // Get role from URL params or default to coach
  const role = searchParams.get('role') || 'coach'
  const invitationToken = searchParams.get('invitation')

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (isAuthenticated()) {
          // User is properly authenticated, redirect to appropriate dashboard
          console.info('User already authenticated, redirecting to dashboard')
          router.push('/')  // Both roles redirect to unified home with role-based routing
        }
      } catch (error) {
        // If there's an error checking auth (e.g., malformed token),
        // clear the invalid tokens to prevent loop
        console.warn('Invalid authentication token detected, clearing:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('id_token')
        localStorage.removeItem('refresh_token')
      }
    }
    
    checkAuth()
  }, [router, role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Use unified magic link endpoint with role-based authentication
      const authApiUrl = config.apiEndpoints.passwordlessAuth
      
      const requestBody: any = { 
        email: email.toLowerCase().trim(),
        user_role: role
      }

      // Add invitation token for parent logins
      if (role === 'parent' && invitationToken) {
        requestBody.invitation_token = invitationToken
      }
      
      const response = await fetch(`${authApiUrl}/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        // Role-specific error messages
        if (role === 'coach' && response.status === 404) {
          setError('Email not found. Only invited coaches can access this portal. Please contact an administrator for an invitation.')
        } else if (role === 'parent' && response.status === 404) {
          setError('Invalid invitation or email address. Please check your invitation email and try again.')
        } else {
          setError(data.error || 'Failed to send login link. Please try again.')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      if (config.features.debugMode) {
        console.error('Environment config:', config)
        console.error('API URLs being used:', {
          passwordlessAuth: config.apiEndpoints.passwordlessAuth
        })
      }
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Role-specific content
  const portalConfig = {
    coach: {
      title: 'Login Portal',
      subtitle: 'Enter your email to receive a secure login link',
      buttonText: 'Send Login Link',
      successMessage: 'We\'ve sent a secure login link to your email'
    },
    parent: {
      title: 'Login Portal',
      subtitle: invitationToken 
        ? 'Complete your child\'s enrollment by signing in'
        : 'Access your child\'s enrollment and information',
      buttonText: invitationToken ? 'Continue Enrollment' : 'Send Login Link',
      successMessage: invitationToken
        ? 'Check your email for the enrollment continuation link'
        : 'We\'ve sent a secure login link to your email'
    }
  }

  const currentConfig = portalConfig[role as keyof typeof portalConfig]

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md px-4">
        {/* TSA Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-16 w-auto"
          />
        </div>

        {/* Success Message */}
        <div className={`${role === 'parent' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-6 text-center`}>
          <div className={`w-12 h-12 ${role === 'parent' ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-6 h-6 ${role === 'parent' ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <Heading className={`${role === 'parent' ? 'text-blue-800' : 'text-green-800'} mb-2`}>Check Your Email</Heading>
          
          <Text className={`${role === 'parent' ? 'text-blue-700' : 'text-green-700'} mb-3`}>
            {currentConfig.successMessage} <strong>{email}</strong>
          </Text>
          
          <Text className={`${role === 'parent' ? 'text-blue-600' : 'text-green-600'} text-sm mb-4`}>
            Click the link in your email to sign in. The link will expire in 15 minutes.
          </Text>
          
          <Button 
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
            }}
            className={`w-full ${role === 'parent' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            Send Another Link
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 px-4">
      {/* TSA Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
          alt="Texas Sports Academy"
          className="h-16 w-auto"
        />
      </div>

      <div className="text-center mb-6">
        <Heading className="text-gray-900">{currentConfig.title}</Heading>
        <Text className="mt-2 text-gray-600">
          {currentConfig.subtitle}
        </Text>
        {invitationToken && (
          <Text className="mt-2 text-sm text-blue-600">
            🎉 You&apos;ve been invited to join Texas Sports Academy!
          </Text>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <Text className="text-red-700 text-sm">{error}</Text>
        </div>
      )}

      <Field>
        <Label htmlFor="email">Email Address</Label>
        <Input 
          id="email"
          type="email" 
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          required
          disabled={isLoading}
          autoComplete="email"
          autoFocus
        />
      </Field>

      <Button 
        type="submit" 
        className={`w-full ${
          role === 'parent' 
            ? 'bg-gradient-to-r from-[#0066ff] to-[#004aad] hover:from-[#0052cc] hover:to-[#003a8c]' 
            : 'bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc]'
        } text-white`}
        disabled={isLoading}
      >
        {isLoading ? 'Sending Login Link...' : currentConfig.buttonText}
      </Button>

      {/* Google Sign In Button */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => {
          // Add role parameter to Google OAuth
          const googleAuthUrl = `/api/auth/google/connect?role=${role}${invitationToken ? `&invitation=${invitationToken}` : ''}`
          window.location.href = googleAuthUrl
        }}
        className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3"
        disabled={isLoading}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </Button>
    </form>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-6">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-16 w-auto"
          />
        </div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <Heading className="text-gray-900">Loading...</Heading>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
