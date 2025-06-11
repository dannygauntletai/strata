'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { buildInvitationURL } from '@/lib/invitation-api'

export default function BackgroundCheck() {
  const router = useRouter()
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState<'pending' | 'initiated' | 'completed' | null>(null)
  const [candidateInfo, setCandidateInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    ssn: ''
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

  // Load saved state and pre-fill from onboarding data on mount
  useEffect(() => {
    // Pre-fill from basic info step
    const savedFirstName = localStorage.getItem('onboarding_first_name')
    const savedLastName = localStorage.getItem('onboarding_last_name')
    const savedEmail = localStorage.getItem('onboarding_email')
    const savedCellPhone = localStorage.getItem('onboarding_cell_phone')
    const savedBirthDate = localStorage.getItem('onboarding_birth_date')

    // Load existing background check data
    const savedStatus = localStorage.getItem('onboarding_background_check_status')
    const savedInfo = localStorage.getItem('onboarding_candidate_info')
    const savedCheckrData = localStorage.getItem('onboarding_checkr_data')
    
    if (savedStatus) {
      setBackgroundCheckStatus(savedStatus as any)
    }
    
    // Pre-fill with onboarding data if no saved candidate info
    if (savedInfo) {
      setCandidateInfo(JSON.parse(savedInfo))
    } else {
      setCandidateInfo({
        firstName: savedFirstName || '',
        lastName: savedLastName || '',
        email: savedEmail || '',
        phone: savedCellPhone || '',
        dob: savedBirthDate || '',
        ssn: ''
      })
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
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/background-check/status?candidate_id=${checkrData.candidate_id}`)
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
    
    return true
  }

  const initiateBackgroundCheck = async () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/background-check/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...candidateInfo,
          package: 'standard_background_check'
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
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
      
    } catch (error) {
      console.error('Error initiating background check:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate background check. Please try again.')
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const retryBackgroundCheck = () => {
    if (checkrData.invitation_url) {
      window.open(checkrData.invitation_url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
    } else {
      // Reset and start over
      setBackgroundCheckStatus(null)
      setCheckrData({})
    }
  }

  const handleContinue = () => {
    if (backgroundCheckStatus === 'completed') {
      router.push(buildInvitationURL('/onboarding/complete'))
    } else {
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
        <Link href={buildInvitationURL('/onboarding')}>
          <button className="text-sm font-medium rounded-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
            Exit
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)] px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-[#222222]">
            Background Check
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            A background check is required for all coaches. This helps ensure the safety of our students and families.
          </p>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter first name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter last name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={candidateInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                      readOnly={!!candidateInfo.email}
                    />
                    {candidateInfo.email && (
                      <p className="text-xs text-blue-600 mt-1">Pre-filled from your profile</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={candidateInfo.phone}
                      onChange={(e) => handleInputChange('phone', formatPhoneInput(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={candidateInfo.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
              </div>

              {/* Background Check Info */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  🔒 Secure Background Check Process
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• Powered by Checkr - industry-leading background screening</p>
                  <p>• Your information is encrypted and securely processed</p>
                  <p>• Results typically available within 1-3 business days</p>
                  <p>• Required for compliance with youth sports safety regulations</p>
                </div>
              </div>

              <button
                onClick={initiateBackgroundCheck}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Initiating Background Check...' : 'Start Background Check'}
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
                <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
              </div>
              <h3 className="text-2xl font-semibold text-[#222222]">
                Background Check in Progress
              </h3>
              <p className="text-lg text-[#717171] mb-4">
                Your background check has been initiated. Please complete the process in the new window that opened, 
                or click the button below to re-open the background check form.
              </p>
              <button
                onClick={retryBackgroundCheck}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Re-open Background Check Form
              </button>
              <p className="text-sm text-gray-500">
                This page will automatically update when your background check is complete.
              </p>
            </motion.div>
          )}

          {backgroundCheckStatus === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#222222]">
                Background Check Complete
              </h3>
              <p className="text-lg text-[#717171]">
                Your background check has been successfully completed and approved. 
                You can now proceed to finalize your onboarding.
              </p>
            </motion.div>
          )}

          {/* Error message */}
          <div className="mt-8 mb-4">
            <ErrorMessage 
              message={errorMessage} 
              show={showError} 
            />
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={90}
        nextButtonText={backgroundCheckStatus === 'completed' ? 'Continue' : 'Complete Background Check First'}
        buttonAction={handleContinue}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/agreements')}
        nextButtonClassName={`${
          backgroundCheckStatus === 'completed' 
            ? 'bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      />
    </div>
  )
} 