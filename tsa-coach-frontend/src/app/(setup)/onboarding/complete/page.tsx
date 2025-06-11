'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/components/link'
import { motion } from 'framer-motion'
import { invitationAPI, getStoredInvitationData, isInvitationOnboarding, getCachedInvitationToken, buildInvitationURL } from '@/lib/invitation-api'
import { getSyncEnvironmentConfig } from '@/config/environments'

export default function Complete() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState<any>(null)
  const [isInvitationFlow, setIsInvitationFlow] = useState(false)
  
  // Use ref to prevent infinite loops
  const hasSubmittedRef = useRef(false)

  const collectOnboardingData = () => {
    const isInvitation = isInvitationOnboarding()
    const invitationToken = getCachedInvitationToken()
    const invitationData = getStoredInvitationData()

    // Base onboarding data - properly typed according to database schema
    const onboardingData: any = {
      // Core identity fields (from basic info step)
      email: localStorage.getItem('onboarding_email') || 'debug@tsacoach.com',
      first_name: localStorage.getItem('onboarding_first_name') || '',
      last_name: localStorage.getItem('onboarding_last_name') || '',
      middle_name: localStorage.getItem('onboarding_middle_name') || '',
      full_name: localStorage.getItem('onboarding_full_name') || '',
      cell_phone: localStorage.getItem('onboarding_cell_phone') || '',
      birth_date: localStorage.getItem('onboarding_birth_date') || '',
      gender: localStorage.getItem('onboarding_gender') || '',
      
      // Location for backend compatibility (derived from school city or default)
      location: localStorage.getItem('onboarding_school_city') || 'Texas',
      
      // Role and experience information
      role_type: localStorage.getItem('onboarding_role_type') || '',
      years_experience: localStorage.getItem('onboarding_years_experience') || '0',
      certification_level: localStorage.getItem('onboarding_certification_level') || '',
      specializations: JSON.parse(localStorage.getItem('onboarding_specializations') || '[]'),
      
      // School information
      school_name: localStorage.getItem('onboarding_school_name') || '',
      school_type: localStorage.getItem('onboarding_school_type') || '',
      grade_levels_served: JSON.parse(localStorage.getItem('onboarding_grade_levels_served') || '[]'),
      has_physical_location: localStorage.getItem('onboarding_has_physical_location') !== 'false',
      website: localStorage.getItem('onboarding_website') || '',
      academic_year: localStorage.getItem('onboarding_academic_year') || '2024-2025',
      
      // School address information (optional)
      school_street: localStorage.getItem('onboarding_school_street') || '',
      school_city: localStorage.getItem('onboarding_school_city') || '',
      school_state: localStorage.getItem('onboarding_school_state') || '',
      school_zip: localStorage.getItem('onboarding_school_zip') || '',
      school_phone: localStorage.getItem('onboarding_school_phone') || '',
      
      // School focus and programs
      sport: localStorage.getItem('onboarding_sport') || '',
      football_type: localStorage.getItem('onboarding_football_type') || '',
      school_categories: JSON.parse(localStorage.getItem('onboarding_school_categories') || '[]'),
      program_focus: JSON.parse(localStorage.getItem('onboarding_program_focus') || '[]'),
      
      // Student planning
      estimated_student_count: parseInt(localStorage.getItem('onboarding_estimated_student_count') || '0'),
      student_grade_levels: JSON.parse(localStorage.getItem('onboarding_student_grade_levels') || '[]'),
      enrollment_capacity: parseInt(localStorage.getItem('onboarding_enrollment_capacity') || '0'),
      has_current_students: localStorage.getItem('onboarding_has_current_students') === 'true',
      current_student_details: localStorage.getItem('onboarding_current_student_details') || '',
      
      // Compliance and agreements (if collected)
      platform_agreement: localStorage.getItem('onboarding_platform_agreement') === 'true',
      microschool_agreement: localStorage.getItem('onboarding_microschool_agreement') === 'true',
      background_check_status: localStorage.getItem('onboarding_background_check_status') || 'pending',
      
      // System fields
      timestamp: new Date().toISOString(),
      source: 'coach_onboarding_complete'
    }

    // Add invitation-specific data and defaults
    if (isInvitation && invitationToken) {
      onboardingData.invitation_token = invitationToken
      
      // Add invitation data for backend reference
      if (invitationData) {
        onboardingData.invitation_email = invitationData.email
        onboardingData.invitation_role = invitationData.role
        onboardingData.invitation_school_name = invitationData.school_name
        onboardingData.invitation_sport = invitationData.sport
        onboardingData.invitation_school_type = invitationData.school_type
        
        // Use invitation data as fallbacks if not collected in onboarding
        onboardingData.school_name = onboardingData.school_name || invitationData.school_name || ''
        onboardingData.sport = onboardingData.sport || invitationData.sport || ''
        onboardingData.school_type = onboardingData.school_type || invitationData.school_type || ''
        onboardingData.role_type = onboardingData.role_type || invitationData.role || 'coach'
      }
      
      // Provide defaults for invitation-based onboarding
      if (!onboardingData.grade_levels_served || onboardingData.grade_levels_served.length === 0) {
        onboardingData.grade_levels_served = ['9', '10', '11', '12'] // Default to high school
      }
    }

    return onboardingData
  }

  const clearOnboardingData = () => {
    // Clear all onboarding data from localStorage including invitation data
    const keysToRemove = [
      // Personal information
      'onboarding_first_name',
      'onboarding_last_name', 
      'onboarding_middle_name',
      'onboarding_full_name',
      'onboarding_email',
      'onboarding_cell_phone',
      'onboarding_birth_date',
      'onboarding_gender',
      
      // Role and experience
      'onboarding_role_type',
      'onboarding_years_experience',
      'onboarding_certification_level',
      'onboarding_specializations',
      
      // School information
      'onboarding_school_name',
      'onboarding_school_type',
      'onboarding_grade_levels_served',
      'onboarding_has_physical_location',
      'onboarding_website',
      'onboarding_academic_year',
      
      // School address
      'onboarding_school_street',
      'onboarding_school_city',
      'onboarding_school_state',
      'onboarding_school_zip',
      'onboarding_school_phone',
      
      // School focus
      'onboarding_sport',
      'onboarding_football_type',
      'onboarding_school_categories',
      'onboarding_program_focus',
      
      // Student planning
      'onboarding_estimated_student_count',
      'onboarding_student_grade_levels',
      'onboarding_enrollment_capacity',
      'onboarding_has_current_students',
      'onboarding_current_student_details',
      
      // Compliance
      'onboarding_platform_agreement',
      'onboarding_microschool_agreement',
      'onboarding_background_check_status',
      
      // Legacy fields
      'onboarding_location',
      'onboarding_has_location',
      'onboarding_knows_2hl',
      'onboarding_has_students',
      'onboarding_candidate_info',
      'onboarding_grade_levels_teaching'
    ]

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
  }

  const submitOnboardingData = useCallback(async () => {
    // Prevent duplicate submissions
    if (hasSubmittedRef.current || isSubmitting) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const isInvitation = isInvitationOnboarding()
      setIsInvitationFlow(isInvitation)
      
      const onboardingData = collectOnboardingData()

      // Different validation for invitation vs regular flow
      if (isInvitation) {
        // For invitation flow, validate core application fields
        const requiredFields = ['email', 'first_name', 'last_name', 'cell_phone', 'birth_date', 'gender', 'location']
        const missingFields = requiredFields.filter(field => !onboardingData[field])
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required information: ${missingFields.join(', ')}. Please complete your application.`)
        }

        if (!onboardingData.invitation_token) {
          throw new Error('Invalid invitation. Please use a valid invitation link.')
        }
        
        // Validate role and school info
        if (!onboardingData.role_type) {
          throw new Error('Role type is required. Please complete the role & experience step.')
        }
        
        if (!onboardingData.school_name) {
          throw new Error('School name is required. Please complete the school setup step.')
        }
      } else {
        // Regular onboarding validation
        const requiredFields = ['email', 'school_name', 'sport', 'school_type', 'role_type', 'location'] as const
      const missingFields = requiredFields.filter(field => !onboardingData[field])
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required information: ${missingFields.join(', ')}. Please go back and complete the onboarding process.`)
      }

      if (!onboardingData.grade_levels_served || onboardingData.grade_levels_served.length === 0) {
        throw new Error('Grade levels served is required. Please go back and complete the onboarding process.')
        }
      }

      console.log('Submitting onboarding data:', onboardingData)
      setIsSubmitting(true)
      hasSubmittedRef.current = true // Mark as submitted to prevent duplicates

      let result
      
      if (isInvitation) {
        // Use invitation API for invitation-based onboarding
        result = await invitationAPI.completeOnboarding(onboardingData)
      } else {
        // Use regular API for standard onboarding
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || getSyncEnvironmentConfig().apiEndpoints.coachApi
      
      const response = await fetch(`${apiUrl}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      })

        result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
        }
      }

      console.log('Onboarding completed successfully:', result)
      setProfileData(result)
      setIsSuccess(true)

      // Clear localStorage after successful submission
      clearOnboardingData()

    } catch (error) {
      console.error('Error submitting onboarding data:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      hasSubmittedRef.current = false // Reset on error to allow retry
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  useEffect(() => {
    // Collect and submit onboarding data on mount
    submitOnboardingData()
  }, [submitOnboardingData]) // Add submitOnboardingData dependency

  if (isLoading || isSubmitting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#004aad] to-[#003a8c] font-poppins flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center text-white max-w-2xl mx-auto px-8"
        >
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {isSubmitting ? 'Finalizing Your Profile...' : 'Processing Your Information...'}
          </h1>
          
          <p className="text-xl opacity-90">
            {isSubmitting ? 
              'Creating your coach profile and setting up your academy access.' :
              'Please wait while we prepare your onboarding completion.'
            }
          </p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 font-poppins">
        {/* Header */}
        <header className="px-10 py-5 flex justify-between items-center">
          <Link href="/" aria-label="Homepage">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
        </header>

        {/* Error content */}
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-white max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto">
                <span className="text-6xl">⚠️</span>
              </div>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Oops! Something went wrong
            </h1>
            
            <div className="bg-white/10 rounded-lg p-6 mb-8">
              <p className="text-lg mb-4">
                {error}
              </p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-white text-red-600 font-bold py-4 px-10 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wide transform hover:scale-105 mr-4"
              >
                Try Again
              </button>
              
              <Link href={buildInvitationURL('/onboarding/school-name')}>
                <button className="bg-transparent border-2 border-white text-white font-bold py-4 px-10 rounded-lg text-lg hover:bg-white hover:text-red-600 transition-all duration-300 uppercase tracking-wide">
                  Go Back to Onboarding
                </button>
              </Link>
            </div>

            <p className="text-sm opacity-80 mt-6">
              If this problem persists, please contact us at{' '}
              <a href="mailto:team@sportsacademy.school" className="underline">
                team@sportsacademy.school
              </a>
            </p>
          </motion.div>
        </main>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#004aad] to-[#003a8c] font-poppins">
        {/* Header */}
        <header className="px-10 py-5 flex justify-between items-center">
          <Link href="/" aria-label="Homepage">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
        </header>

        {/* Success content */}
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-white max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto">
                <span className="text-6xl">🎉</span>
              </div>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-integral tracking-tight mb-6 leading-[0.9]">
              {isInvitationFlow ? 'WELCOME TO THE TEAM!' : 'WELCOME!'}
            </h1>
            
            <p className="text-xl md:text-2xl leading-relaxed opacity-90 mb-8 max-w-2xl mx-auto">
              {isInvitationFlow ? 
                "Thank you for accepting your invitation and completing your application. We're excited to have you join the team!" :
                "Thank you for completing your onboarding. We're excited to have you join the"
              } {!isInvitationFlow && <strong>Texas Sports Academy</strong>} {!isInvitationFlow && "family!"}
            </p>

            {profileData && (
              <div className="bg-white/10 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Your Profile Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
                  <div>
                    <span className="font-medium text-blue-200">Name:</span>
                    <span className="ml-2 text-white">{profileData.data_received?.full_name || profileData.data_received?.first_name + ' ' + profileData.data_received?.last_name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Email:</span>
                    <span className="ml-2 text-white">{profileData.data_received?.email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Role:</span>
                    <span className="ml-2 text-white">{profileData.data_received?.role_type || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">School:</span>
                    <span className="ml-2 text-white">{profileData.data_received?.school_name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Sport:</span>
                    <span className="ml-2 text-white">{profileData.data_received?.sport || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Profile ID:</span>
                    <span className="ml-2 text-white font-mono text-xs">{profileData.profile_id}</span>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-lg leading-relaxed opacity-90 mb-12 max-w-2xl mx-auto">
              Our team will review your information and be in touch within 24-48 hours with next steps. 
              In the meantime, you can start exploring the platform and preparing for your students.
            </p>
            
            <div className="space-y-4">
              <Link href="/">
                <button className="bg-white text-[#004aad] font-bold py-4 px-10 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wide transform hover:scale-105">
                  GET STARTED
                </button>
              </Link>
              
              <p className="text-sm opacity-80 mt-6">
                Questions? Email us at{' '}
                <a href="mailto:team@sportsacademy.school" className="underline">
                  team@sportsacademy.school
                </a>
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  return null
} 