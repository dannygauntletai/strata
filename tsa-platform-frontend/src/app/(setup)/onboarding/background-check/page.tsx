'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { buildInvitationURL, ONBOARDING_STEPS } from '@/lib/invitation-api'
import { useOnboardingState } from '@/hooks/useOnboardingState'
import { config } from '@/config/environments'

// Mock mode flag - set to true to use fake background check responses
const MOCK_MODE = true

function BackgroundCheckContent() {
  const router = useRouter()
  
  // Use the onboarding state hook for consistent data management
  const {
    formData,
    invitationData,
    isLoading: onboardingLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    errors,
    updateField,
    validateStep,
    markStepComplete,
    isFieldPreFilled,
    getProgressPercentage
  } = useOnboardingState({
    currentStep: ONBOARDING_STEPS.BACKGROUND_CHECK,
    requiredFields: ['first_name', 'last_name', 'email', 'phone', 'birth_date', 'ssn']
  })

  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState<'pending' | 'initiated' | 'completed' | null>(null)
  const [candidateInfo, setCandidateInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    ssn: '',
    zipcode: '',
    city: '',
    workState: 'TX',
    driverLicenseNumber: '',
    driverLicenseState: 'TX'
  })
  const [checkrData, setCheckrData] = useState<{
    candidate_id?: string
    invitation_id?: string
    invitation_url?: string
  }>({})
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [mockProgress, setMockProgress] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Auto-fill candidate info from onboarding data when it loads
  useEffect(() => {
    if (!onboardingLoading && formData) {
      setCandidateInfo(prev => ({
        ...prev,
        firstName: formData.first_name || '',
        lastName: formData.last_name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        dob: formData.birth_date || '',
        city: formData.city || '',
        // Keep existing values for fields not in onboarding data
        ssn: prev.ssn,
        zipcode: prev.zipcode,
        workState: prev.workState || 'TX',
        driverLicenseNumber: prev.driverLicenseNumber,
        driverLicenseState: prev.driverLicenseState || 'TX'
      }))
    }
  }, [onboardingLoading, formData])

  // Load saved background check state on mount
  useEffect(() => {
    // Load existing background check data
    const savedStatus = localStorage.getItem('onboarding_background_check_status')
    const savedInfo = localStorage.getItem('onboarding_candidate_info')
    const savedCheckrData = localStorage.getItem('onboarding_checkr_data')
    
    if (savedStatus) {
      setBackgroundCheckStatus(savedStatus as any)
    }
    
    if (savedInfo) {
      const parsed = JSON.parse(savedInfo)
      setCandidateInfo(prev => ({ ...prev, ...parsed }))
    }
    
    if (savedCheckrData) {
      setCheckrData(JSON.parse(savedCheckrData))
    }

    // Check URL parameters for status updates from Checkr redirect
    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = urlParams.get('status')
    if (statusParam === 'completed') {
      setBackgroundCheckStatus('completed')
    }
  }, [])

  // Update localStorage whenever status changes
  useEffect(() => {
    if (backgroundCheckStatus) {
      localStorage.setItem('onboarding_background_check_status', backgroundCheckStatus)
    }
  }, [backgroundCheckStatus])

  useEffect(() => {
    localStorage.setItem('onboarding_candidate_info', JSON.stringify(candidateInfo))
  }, [candidateInfo])

  useEffect(() => {
    localStorage.setItem('onboarding_checkr_data', JSON.stringify(checkrData))
  }, [checkrData])

  // Poll for status updates when background check is initiated
  useEffect(() => {
    if (backgroundCheckStatus === 'initiated' && checkrData.candidate_id) {
      if (MOCK_MODE) {
        // Mock mode - status is handled by the progress simulation in initiateBackgroundCheck
        return
      }
      
      // Real mode - poll the actual API
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${config.apiEndpoints.coach}/background-check/status?candidate_id=${checkrData.candidate_id}`)
          if (response.ok) {
            const result = await response.json()
            const status = result.data.overall_status
            
            if (status === 'complete' || status === 'clear' || status === 'consider') {
              setBackgroundCheckStatus('completed')
              clearInterval(interval)
            }
          }
        } catch (error) {
          console.error('Error polling status:', error)
        }
      }, 30000) // Poll every 30 seconds

      setStatusPollingInterval(interval)

      // Clean up interval on unmount or status change
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [backgroundCheckStatus, checkrData.candidate_id])

  // Debug effect to track background check status changes
  useEffect(() => {
    console.log('🎭 Background Check Status changed to:', backgroundCheckStatus)
    console.log('🎭 Continue button should be:', backgroundCheckStatus === 'completed' ? 'ENABLED' : 'DISABLED')
    
    // Clear any errors when background check completes
    if (backgroundCheckStatus === 'completed') {
      setShowError(false)
      setErrorMessage('')
    }
  }, [backgroundCheckStatus])

  // Clean up polling interval
  useEffect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval)
      }
    }
  }, [statusPollingInterval])

  const handleInputChange = (field: string, value: string) => {
    setCandidateInfo(prev => ({
      ...prev,
      [field]: value
    }))
    setShowError(false)
  }

  // Helper to check if a field is pre-filled and valid
  const isFieldPreFilledLocal = (field: keyof typeof candidateInfo): boolean => {
    const value = candidateInfo[field]
    if (!value) return false
    
    // Check if this field comes from onboarding data
    const onboardingFields = {
      firstName: formData?.first_name,
      lastName: formData?.last_name,
      email: formData?.email,
      phone: formData?.phone,
      dob: formData?.birth_date,
      city: formData?.city
    }
    
    if (onboardingFields[field as keyof typeof onboardingFields]) {
      return true
    }
    
    // For email, check if it's a valid email
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    }
    
    // For names, check if they're not empty
    if (field === 'firstName' || field === 'lastName') {
      return value.trim().length > 0
    }
    
    return true
  }

  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never saved'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    
    if (diffSeconds < 30) return 'Just now'
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    return date.toLocaleTimeString()
  }

  const validateForm = () => {
    const { firstName, lastName, email, phone, dob, ssn } = candidateInfo
    
    if (!firstName || !lastName || !email || !phone || !dob || !ssn) {
      setErrorMessage('Please fill in all required fields')
      return false
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address')
      return false
    }
    
    // Basic phone validation (US format)
    const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/
    if (!phoneRegex.test(phone)) {
      setErrorMessage('Please enter phone in format: (555) 123-4567')
      return false
    }
    
    // Basic SSN validation (XXX-XX-XXXX)
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/
    if (!ssnRegex.test(ssn)) {
      setErrorMessage('Please enter SSN in format: 123-45-6789')
      return false
    }

    // Validate date of birth format
    try {
      const dobDate = new Date(dob)
      if (isNaN(dobDate.getTime())) {
        setErrorMessage('Please enter a valid date of birth')
        return false
      }
      
      // Check if person is at least 16 years old
      const today = new Date()
      const age = today.getFullYear() - dobDate.getFullYear()
      if (age < 16) {
        setErrorMessage('You must be at least 16 years old')
        return false
      }
    } catch (error) {
      setErrorMessage('Please enter a valid date of birth')
      return false
    }
    
    return true
  }

  const initiateBackgroundCheck = async () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    setIsLoading(true)
    
    try {
      if (MOCK_MODE) {
        // 🎭 MOCK MODE - Simulate background check process
        console.log('🎭 Mock Mode: Simulating background check initiation...')
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Create mock Checkr data
        const mockCheckrData = {
          candidate_id: `mock_candidate_${Date.now()}`,
          invitation_id: `mock_invitation_${Date.now()}`,
          invitation_url: '#mock-invitation-url'
        }
        
        // Store mock data
        setCheckrData(mockCheckrData)
        setBackgroundCheckStatus('initiated')
        setMockProgress(0)
        
        // Start mock progress simulation
        let progressTimeoutId: NodeJS.Timeout | null = null
        const progressInterval = setInterval(() => {
          setMockProgress(prev => {
            const newProgress = prev + 25 // Faster progress - 25% increments
            if (newProgress >= 100) {
              clearInterval(progressInterval)
              // Simulate background check completion after progress reaches 100%
              progressTimeoutId = setTimeout(async () => {
                console.log('🎭 Mock Mode: Setting status to completed...')
                
                setBackgroundCheckStatus('completed')
                setShowError(false)
                setErrorMessage('')
                setIsLoading(false)
                
                console.log('🎭 Mock Mode: Background check completed! Saving progress...')
                
                // Update cache and server persistence
                try {
                  await markStepComplete()
                  console.log('🎭 Mock Mode: Progress saved to server')
                } catch (error) {
                  console.error('🎭 Mock Mode: Error saving progress:', error)
                }
                
                console.log('🎭 Mock Mode: Background check ready - user can now continue')
                
              }, 1000) // Shorter delay
              return 100
            }
            return newProgress
          })
        }, 500) // Faster updates - every 500ms
        
        // Store cleanup function for this mock process
        const cleanup = () => {
          if (progressInterval) clearInterval(progressInterval)
          if (progressTimeoutId) clearTimeout(progressTimeoutId)
        }
        
        // Cleanup on component unmount (store in a way we can access it later)
        ;(window as any).mockBackgroundCheckCleanup = cleanup
        
        // Show mock notification instead of opening real window
        console.log('🎭 Mock Mode: Background check initiated successfully!')
        
      } else {
        // Real API call to Checkr
      const response = await fetch(`${config.apiEndpoints.coach}/background-check/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...candidateInfo,
          package: 'standard_background_check'
        }),
      })

      if (!response.ok) {
        // Get error details for better debugging
        const errorText = await response.text()
        console.error('Background check API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url
        })
        
        // Try to parse as JSON, fallback to text
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If not JSON, show the first part of the HTML/text response
          errorMessage = errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        // Store Checkr data for later reference
        setCheckrData(result.data)
        setBackgroundCheckStatus('initiated')
        
        // Open Checkr invitation in new window
        if (result.data.invitation_url) {
          window.open(result.data.invitation_url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
        }
        
      } else {
        throw new Error(result.error || 'Failed to initiate background check')
        }
      }
      
    } catch (error) {
      console.error('Error initiating background check:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate background check. Please try again.')
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const retryBackgroundCheck = () => {
    if (MOCK_MODE) {
      // Mock mode - reset everything to start fresh
      console.log('🎭 Mock Mode: Resetting background check to initial state...')
      setBackgroundCheckStatus(null)
      setCheckrData({})
      setMockProgress(0)
      setCountdown(null)
      setShowError(false)
      setErrorMessage('')
      setIsLoading(false)
      
      // Clear localStorage
      localStorage.removeItem('onboarding_background_check_status')
      localStorage.removeItem('onboarding_checkr_data')
      
      console.log('🎭 Mock Mode: Reset complete - you should now see the Start Background Check button')
    } else {
      // Real mode
    if (checkrData.invitation_url) {
      window.open(checkrData.invitation_url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
    } else {
      // Reset and start over
      setBackgroundCheckStatus(null)
      setCheckrData({})
      }
    }
  }

  const handleContinue = async () => {
    console.log('🔴 handleContinue called! Status:', backgroundCheckStatus)
    
    // This function is now only used for debugging/testing
    // The actual navigation is handled by nextButtonHref in ProgressFooter
    if (backgroundCheckStatus === 'completed') {
      console.log('✅ Background check completed - would proceed to next step')
      console.log('✅ Using nextButtonHref for navigation instead')
    } else {
      console.log('❌ Background check not completed - showing error')
      setErrorMessage('Please complete the background check to continue')
      setShowError(true)
    }
  }

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return digits
    }
  }

  const formatSSNInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as XXX-XX-XXXX
    if (digits.length >= 5) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
    } else if (digits.length >= 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return digits
    }
  }

  if (onboardingLoading) {
    return (
      <div className="min-h-screen bg-white font-poppins flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174fa2] mx-auto mb-4"></div>
          <p className="text-[#717171]">Loading your information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-poppins pb-[88px]">
      {/* Header */}
      <header className="px-10 py-5 flex justify-between items-center">
        <Link href="/" aria-label="Homepage">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-12 w-auto"
          />
        </Link>
        <div className="flex items-center space-x-4">
          {MOCK_MODE && (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              🎭 Mock Mode
            </div>
          )}
        <Link href={buildInvitationURL('/onboarding')}>
          <button className="text-sm font-medium rounded-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
            Exit
          </button>
        </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)] px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#222222]">
              Background Check
            </h1>
            <p className="text-xl text-[#717171] mb-4">
              A background check is required for all coaches. This helps ensure the safety of our students and families.
            </p>
            
            {/* Save Status Indicator */}
            <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
              {isSaving && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span>Saving...</span>
                </div>
              )}
              
              {!isSaving && hasUnsavedChanges && (
                <div className="flex items-center text-amber-600">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                  <span>Unsaved changes</span>
                </div>
              )}
              
              {!isSaving && !hasUnsavedChanges && lastSaved && (
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Saved {formatLastSaved(lastSaved)}</span>
                </div>
              )}
              
              {!lastSaved && !isSaving && (
                <div className="flex items-center text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  <span>Auto-save enabled</span>
                </div>
              )}
            </div>
          </div>

          {backgroundCheckStatus === null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Candidate Information Form */}
              <div className="bg-gray-50 rounded-xl p-6 border">
                <h3 className="text-xl font-semibold text-[#222222] mb-4">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isFieldPreFilledLocal('firstName') 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter first name"
                    />
                    {isFieldPreFilledLocal('firstName') && (
                      <p className="text-xs text-green-600 mt-1">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isFieldPreFilledLocal('lastName') 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter last name"
                    />
                    {isFieldPreFilledLocal('lastName') && (
                      <p className="text-xs text-green-600 mt-1">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={candidateInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isFieldPreFilledLocal('email') 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {isFieldPreFilledLocal('email') ? (
                      <p className="text-xs text-green-600 mt-1">✓ Pre-filled from your profile</p>
                    ) : candidateInfo.email ? (
                      <p className="text-xs text-amber-600 mt-1">⚠ Please verify your email address</p>
                    ) : null}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={candidateInfo.phone}
                      onChange={(e) => handleInputChange('phone', formatPhoneInput(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isFieldPreFilledLocal('phone') 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                    {isFieldPreFilledLocal('phone') && (
                      <p className="text-xs text-green-600 mt-1">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={candidateInfo.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isFieldPreFilledLocal('dob') 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300'
                      }`}
                    />
                    {isFieldPreFilledLocal('dob') && (
                      <p className="text-xs text-green-600 mt-1">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Social Security Number *
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.ssn}
                      onChange={(e) => handleInputChange('ssn', formatSSNInput(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123-45-6789"
                      maxLength={11}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.zipcode}
                      onChange={(e) => handleInputChange('zipcode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12345"
                      maxLength={5}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Dallas"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work State
                    </label>
                    <select
                      value={candidateInfo.workState}
                      onChange={(e) => handleInputChange('workState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TX">Texas</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver License Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.driverLicenseNumber}
                      onChange={(e) => handleInputChange('driverLicenseNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Driver license number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver License State
                    </label>
                    <select
                      value={candidateInfo.driverLicenseState}
                      onChange={(e) => handleInputChange('driverLicenseState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TX">Texas</option>
                      <option value="CA">California</option>
                      <option value="FL">Florida</option>
                      <option value="NY">New York</option>
                      <option value="IL">Illinois</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="OH">Ohio</option>
                      <option value="GA">Georgia</option>
                      <option value="NC">North Carolina</option>
                      <option value="MI">Michigan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Background Check Info */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  🔒 {MOCK_MODE ? 'Mock ' : ''}Secure Background Check Process
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  {MOCK_MODE ? (
                    <>
                      <p>• <strong>Mock Mode:</strong> This is a simulated background check for testing purposes</p>
                      <p>• The process will complete automatically in about 30-60 seconds</p>
                      <p>• In production, this would integrate with Checkr's real background screening</p>
                      <p>• Your information would be encrypted and securely processed</p>
                    </>
                  ) : (
                    <>
                  <p>• Powered by Checkr - industry-leading background screening</p>
                  <p>• Your information is encrypted and securely processed</p>
                  <p>• Required for compliance with youth sports safety regulations</p>
                  <p>• You will receive an email with instructions to complete the process</p>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={initiateBackgroundCheck}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 
                  (MOCK_MODE ? 'Starting Mock Background Check...' : 'Initiating Background Check...') : 
                  (MOCK_MODE ? 'Start Mock Background Check' : 'Start Background Check')
                }
              </button>
            </motion.div>
          )}

          {backgroundCheckStatus === 'initiated' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                {MOCK_MODE ? (
                  <div className="text-2xl">🎭</div>
                ) : (
                <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
                )}
              </div>
              <h3 className="text-2xl font-semibold text-[#222222]">
                {MOCK_MODE ? 'Mock Background Check in Progress' : 'Background Check in Progress'}
              </h3>
              <p className="text-lg text-[#717171] mb-4">
                {MOCK_MODE ? (
                  <>
                    Your mock background check is being processed. In a real scenario, you would complete 
                    the process in a new window with Checkr's secure platform.
                  </>
                ) : (
                  <>
                Your background check has been initiated. Please complete the process in the new window that opened, 
                or click the button below to re-open the background check form.
                  </>
                )}
              </p>
              
              {MOCK_MODE && (
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing...</span>
                    <span>{Math.round(mockProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${mockProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {mockProgress < 30 ? 'Verifying identity...' :
                     mockProgress < 60 ? 'Checking criminal records...' :
                     mockProgress < 90 ? 'Reviewing employment history...' :
                     'Finalizing report...'}
                  </p>
                </div>
              )}
              
              <button
                onClick={retryBackgroundCheck}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {MOCK_MODE ? 'Reset to Start Form' : 'Re-open Background Check'}
              </button>
            </motion.div>
          )}

          {backgroundCheckStatus === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                {MOCK_MODE ? (
                  <div className="text-2xl">🎭✅</div>
                ) : (
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                )}
              </div>
              <h3 className="text-2xl font-semibold text-green-600">
                {MOCK_MODE ? 'Mock Background Check Completed!' : 'Background Check Completed!'}
              </h3>
              <p className="text-lg text-[#717171]">
                {MOCK_MODE ? (
                  countdown !== null ? (
                    `Redirecting to the next step in ${countdown} seconds...`
                  ) : (
                    'Your mock background check has been successfully completed. You can now continue to the next step of your onboarding.'
                  )
                ) : (
                  'Your background check has been successfully completed. You can now continue to the next step of your onboarding.'
                )}
              </p>
              {MOCK_MODE && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <p><strong>Mock Mode:</strong> In a real scenario, this would show actual background check results and any required actions.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Error message */}
          <div className="mt-4 mb-8">
            <ErrorMessage 
              message={errorMessage} 
              show={showError} 
            />
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={getProgressPercentage()}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/agreements')}
        nextButtonText="Continue"
        nextButtonHref={backgroundCheckStatus === 'completed' ? buildInvitationURL('/onboarding/finalize') : undefined}
        buttonAction={backgroundCheckStatus !== 'completed' ? handleContinue : undefined}
        disabled={backgroundCheckStatus !== 'completed'}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
}

export default function BackgroundCheck() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white font-poppins flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174fa2] mx-auto mb-4"></div>
          <p className="text-[#717171]">Loading...</p>
        </div>
      </div>
    }>
      <BackgroundCheckContent />
    </Suspense>
  )
} 