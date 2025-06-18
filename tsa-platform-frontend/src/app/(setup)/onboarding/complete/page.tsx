'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/components/link'
import { motion } from 'framer-motion'
import { invitationAPI, getStoredInvitationData, isInvitationOnboarding, getCachedInvitationToken, buildInvitationURL, clearInvitationData } from '@/lib/invitation-api'
import { config } from '@/config/environments'
import { getNextAcademicYear } from '@/lib/academic-year-utils'

export default function Complete() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState<any>(null)
  const [isInvitationFlow, setIsInvitationFlow] = useState(false)
  const [showMissingFieldsForm, setShowMissingFieldsForm] = useState(false)
  const [missingFieldsData, setMissingFieldsData] = useState<any>({})
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([])
  
  // Use ref to prevent infinite loops
  const hasSubmittedRef = useRef(false)

  const collectOnboardingData = async () => {
    const isInvitation = isInvitationOnboarding()
    const invitationToken = getCachedInvitationToken()
    const invitationData = getStoredInvitationData()

    let serverData: any = {}
    let serverFields: Set<string> = new Set() // Track which fields came from server
    
    // 🔥 FETCH FROM SERVER FIRST - this is the source of truth
    try {
      console.log('📡 Fetching onboarding data from server-side session...')
      const email = localStorage.getItem('onboarding_email') || invitationData?.email || ''
      if (email) {
        const progress = await invitationAPI.getOnboardingProgress(email, invitationToken || undefined)
        if (progress && progress.step_data) {
          console.log('✅ Found server-side onboarding data:', progress.step_data)
          serverData = progress.step_data
          // Track which fields have server data
          Object.keys(serverData).forEach(key => {
            if (serverData[key] !== undefined && serverData[key] !== null && serverData[key] !== '') {
              serverFields.add(key)
            }
          })
        } else {
          console.log('⚠️ No server-side onboarding data found, will use localStorage')
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to fetch server-side data, falling back to localStorage:', error)
    }

    // Merge server data with localStorage fallback - server data takes precedence
    const onboardingData: any = {
      // Core identity fields (server first, then localStorage)
      email: serverData.email || localStorage.getItem('onboarding_email') || invitationData?.email || '',
      first_name: serverData.first_name || localStorage.getItem('onboarding_first_name') || '',
      last_name: serverData.last_name || localStorage.getItem('onboarding_last_name') || '',
      middle_name: serverData.middle_name || localStorage.getItem('onboarding_middle_name') || '',
      full_name: serverData.full_name || localStorage.getItem('onboarding_full_name') || '',
      cell_phone: serverData.cell_phone || localStorage.getItem('onboarding_cell_phone') || '',
      birth_date: serverData.birth_date || localStorage.getItem('onboarding_birth_date') || '',
      gender: serverData.gender || localStorage.getItem('onboarding_gender') || '',
      
      // Location for backend compatibility (derived from school city or default)
      location: serverData.location || localStorage.getItem('onboarding_school_city') || 'Texas',
      
      // Role and experience information
      role_type: serverData.role_type || localStorage.getItem('onboarding_role_type') || '',
      years_experience: serverData.years_experience || localStorage.getItem('onboarding_years_experience') || '0',
      certification_level: serverData.certification_level || localStorage.getItem('onboarding_certification_level') || '',
      specializations: serverData.specializations || JSON.parse(localStorage.getItem('onboarding_specializations') || '[]'),
      
      // School information
      school_name: serverData.school_name || localStorage.getItem('onboarding_school_name') || '',
      school_type: serverData.school_type || localStorage.getItem('onboarding_school_type') || '',
      grade_levels_served: serverData.grade_levels_served || JSON.parse(localStorage.getItem('onboarding_grade_levels_served') || '[]'),
      has_physical_location: serverData.has_physical_location !== undefined ? serverData.has_physical_location : (localStorage.getItem('onboarding_has_physical_location') !== 'false'),
      website: serverData.website || localStorage.getItem('onboarding_website') || '',
      academic_year: serverData.academic_year || localStorage.getItem('onboarding_academic_year') || getNextAcademicYear(),
      
      // School address information (optional)
      school_street: serverData.school_street || localStorage.getItem('onboarding_school_street') || '',
      school_city: serverData.school_city || localStorage.getItem('onboarding_school_city') || '',
      school_state: serverData.school_state || localStorage.getItem('onboarding_school_state') || '',
      school_zip: serverData.school_zip || localStorage.getItem('onboarding_school_zip') || '',
      school_phone: serverData.school_phone || localStorage.getItem('onboarding_school_phone') || '',
      
      // School focus and programs
      sport: serverData.sport || localStorage.getItem('onboarding_sport') || '',
      football_type: serverData.football_type || localStorage.getItem('onboarding_football_type') || '',
      school_categories: serverData.school_categories || JSON.parse(localStorage.getItem('onboarding_school_categories') || '[]'),
      program_focus: serverData.program_focus || JSON.parse(localStorage.getItem('onboarding_program_focus') || '[]'),
      
      // Student planning
      estimated_student_count: serverData.estimated_student_count || parseInt(localStorage.getItem('onboarding_estimated_student_count') || '0'),
      student_grade_levels: serverData.student_grade_levels || JSON.parse(localStorage.getItem('onboarding_student_grade_levels') || '[]'),
      enrollment_capacity: serverData.enrollment_capacity || parseInt(localStorage.getItem('onboarding_enrollment_capacity') || '0'),
      has_current_students: serverData.has_current_students !== undefined ? serverData.has_current_students : (localStorage.getItem('onboarding_has_current_students') === 'true'),
      current_student_details: serverData.current_student_details || localStorage.getItem('onboarding_current_student_details') || '',
      
      // Compliance and agreements (if collected)
      platform_agreement: serverData.platform_agreement !== undefined ? serverData.platform_agreement : (localStorage.getItem('onboarding_platform_agreement') === 'true'),

      background_check_status: serverData.background_check_status || localStorage.getItem('onboarding_background_check_status') || 'pending',
      
      // System fields
      timestamp: new Date().toISOString(),
      source: 'coach_onboarding_complete',
      
      // 🔥 IMPORTANT: Track which fields came from server to prevent localStorage override
      _serverFields: Array.from(serverFields)
    }

    // Add invitation-specific data and defaults
    if (isInvitation && invitationToken) {
      onboardingData.invitation_token = invitationToken
      
      // Add invitation data for backend reference
      if (invitationData) {
        onboardingData.invitation_email = invitationData.email
        onboardingData.invitation_role = invitationData.role
        
        // 🔥 FIX: Use actual onboarding data instead of undefined invitation data
        onboardingData.invitation_school_name = onboardingData.school_name || invitationData.school_name || ''
        onboardingData.invitation_sport = onboardingData.sport || invitationData.sport || ''
        onboardingData.invitation_school_type = onboardingData.school_type || invitationData.school_type || ''
        
        // Use invitation data as fallbacks if not collected in onboarding
        onboardingData.school_name = onboardingData.school_name || invitationData.school_name || ''
        onboardingData.sport = onboardingData.sport || invitationData.sport || ''
        onboardingData.school_type = onboardingData.school_type || invitationData.school_type || ''
        onboardingData.role_type = onboardingData.role_type || invitationData.role || 'coach'
      } else {
        // If no invitation data, use onboarding data for invitation fields
        onboardingData.invitation_school_name = onboardingData.school_name || ''
        onboardingData.invitation_sport = onboardingData.sport || ''
        onboardingData.invitation_school_type = onboardingData.school_type || ''
      }
      
      // Provide defaults for invitation-based onboarding
      if (!onboardingData.grade_levels_served || onboardingData.grade_levels_served.length === 0) {
        onboardingData.grade_levels_served = ['9', '10', '11', '12'] // Default to high school
      }
    }

    console.log('📊 Final collected onboarding data:', {
      source: serverData.email ? 'server+localStorage' : 'localStorage-only',
      email: onboardingData.email,
      first_name: onboardingData.first_name,
      last_name: onboardingData.last_name,
      school_name: onboardingData.school_name,
      sport: onboardingData.sport,
      role_type: onboardingData.role_type,
      invitation_school_name: onboardingData.invitation_school_name,
      invitation_sport: onboardingData.invitation_sport,
      fields_from_server: serverFields.size,
      server_fields: Array.from(serverFields),
      total_fields: Object.keys(onboardingData).length
    })

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

    // Clear invitation tokens and cache after successful completion
    clearInvitationData()
    
    console.log('✅ Cleared all onboarding and invitation data after successful completion')
    console.log('🧹 Cleared debug candidate info to prevent future data override issues')
  }

  const submitOnboardingData = useCallback(async () => {
    // Prevent duplicate submissions
    if (hasSubmittedRef.current) {
      console.log('🚫 Already processed onboarding completion')
      return
    }

    console.log('🚀 Starting onboarding data submission...')
    setIsLoading(true)
    setError('')

    try {
      const isInvitation = isInvitationOnboarding()
      setIsInvitationFlow(isInvitation)
      
      const onboardingData = await collectOnboardingData()

      // Different validation for invitation vs regular flow
      if (isInvitation) {
        // For invitation flow, check ALL required fields (personal + school + role)
        const allRequiredFields = [
          'email', 'first_name', 'last_name', 'cell_phone', 'birth_date', 'gender', 'location',
          'role_type', 'school_name'
        ]
        let missingFields = allRequiredFields.filter(field => !onboardingData[field] || onboardingData[field].toString().trim() === '')
        
        // If we have missing fields, try to get them from server or enhanced localStorage search
        if (missingFields.length > 0) {
          console.log('🔍 Missing fields detected, trying to recover:', missingFields)
          
          // Try alternative localStorage keys for missing fields
          const alternativeKeys: Record<string, string[]> = {
            'cell_phone': ['onboarding_phone', 'phone', 'onboarding_cell_phone'],
            'first_name': ['firstName', 'onboarding_firstName', 'onboarding_first_name'], 
            'last_name': ['lastName', 'onboarding_lastName', 'onboarding_last_name'],
            'birth_date': ['onboarding_dob', 'dob', 'onboarding_birth_date'],
            'gender': ['onboarding_gender'],
            'email': ['onboarding_email', 'email'],
            'location': ['onboarding_location', 'onboarding_city', 'onboarding_school_city', 'city'],
            'role_type': ['onboarding_role_type', 'role', 'role_type'],
            'school_name': ['onboarding_school_name', 'school_name', 'schoolName']
          }
          
          // Try to recover missing fields from alternative localStorage keys
          missingFields.forEach(field => {
            if (!onboardingData[field] || onboardingData[field].toString().trim() === '') {
              const altKeys = alternativeKeys[field] || []
              for (const altKey of altKeys) {
                const value = localStorage.getItem(altKey) || sessionStorage.getItem(altKey) || ''
                if (value && value.trim() !== '') {
                  console.log(`✅ Recovered ${field} from ${altKey}:`, value)
                  onboardingData[field] = value.trim()
                  break
                }
              }
            }
          })
          
          // Try to get data from candidate info (background check form) - DON'T override server data
          const candidateInfo = JSON.parse(localStorage.getItem('onboarding_candidate_info') || '{}')
          if (candidateInfo && Object.keys(candidateInfo).length > 0) {
            console.log('🔍 Found candidate info, trying to recover missing fields:', candidateInfo)
            
            // Only recover if the field didn't come from server (to prevent debug override)
            const serverFields = onboardingData._serverFields || []
            
            if (!onboardingData.first_name && candidateInfo.firstName && !serverFields.includes('first_name')) {
              onboardingData.first_name = candidateInfo.firstName
              console.log('✅ Recovered first_name from candidate info')
            } else if (serverFields.includes('first_name')) {
              console.log('🔒 Skipping first_name recovery - server data takes precedence')
            }
            
            if (!onboardingData.last_name && candidateInfo.lastName && !serverFields.includes('last_name')) {
              onboardingData.last_name = candidateInfo.lastName
              console.log('✅ Recovered last_name from candidate info')
            } else if (serverFields.includes('last_name')) {
              console.log('🔒 Skipping last_name recovery - server data takes precedence')
            }
            
            if (!onboardingData.email && candidateInfo.email && !serverFields.includes('email')) {
              onboardingData.email = candidateInfo.email
              console.log('✅ Recovered email from candidate info')
            } else if (serverFields.includes('email')) {
              console.log('🔒 Skipping email recovery - server data takes precedence')
            }
            
            if (!onboardingData.cell_phone && candidateInfo.phone && !serverFields.includes('cell_phone')) {
              onboardingData.cell_phone = candidateInfo.phone
              console.log('✅ Recovered cell_phone from candidate info')
            } else if (serverFields.includes('cell_phone')) {
              console.log('🔒 Skipping cell_phone recovery - server data takes precedence')
            }
            
            if (!onboardingData.birth_date && candidateInfo.dob && !serverFields.includes('birth_date')) {
              onboardingData.birth_date = candidateInfo.dob
              console.log('✅ Recovered birth_date from candidate info')
            } else if (serverFields.includes('birth_date')) {
              console.log('🔒 Skipping birth_date recovery - server data takes precedence')
            }
          }
          
          // Try to get school/role data from invitation data
          const storedInvitationData = getStoredInvitationData()
          if (storedInvitationData) {
            if (!onboardingData.school_name && storedInvitationData.school_name) {
              onboardingData.school_name = storedInvitationData.school_name
              console.log('✅ Recovered school_name from invitation data')
            }
            if (!onboardingData.role_type && storedInvitationData.role) {
              onboardingData.role_type = storedInvitationData.role
              console.log('✅ Recovered role_type from invitation data')
            }
          }
          
          // Re-check missing fields after recovery attempts
          missingFields = allRequiredFields.filter(field => !onboardingData[field] || onboardingData[field].toString().trim() === '')
          
          if (missingFields.length > 0) {
            console.log('❌ Still missing after recovery attempt:', missingFields)
            console.log('📊 Current onboarding data:', onboardingData)
            
            // Show form for ALL missing fields (personal + school + role)
            setMissingFieldsList(missingFields)
            setMissingFieldsData({...onboardingData}) // Store current data
            setShowMissingFieldsForm(true)
            setIsLoading(false)
            return // Stop processing and show the form
          } else {
            console.log('✅ All required fields recovered successfully')
          }
        }

        if (!onboardingData.invitation_token) {
          throw new Error('Invalid invitation. Please use a valid invitation link.')
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

      // Clean up internal metadata before sending to backend
      const cleanedData = { ...onboardingData }
      delete cleanedData._serverFields

      console.log('🚀 SENDING TO BACKEND:', {
        email: cleanedData.email,
        first_name: cleanedData.first_name,
        last_name: cleanedData.last_name,
        school_name: cleanedData.school_name,
        sport: cleanedData.sport,
        role_type: cleanedData.role_type,
        invitation_school_name: cleanedData.invitation_school_name,
        invitation_sport: cleanedData.invitation_sport,
        total_fields: Object.keys(cleanedData).length
      })

      let result
      
      if (isInvitation) {
        // Use invitation API for invitation-based onboarding
        console.log('🔍 DEBUG: Using invitation API with data:', {
          email: onboardingData.email,
          invitation_token: onboardingData.invitation_token,
          school_name: onboardingData.school_name,
          role_type: onboardingData.role_type,
          first_name: onboardingData.first_name,
          last_name: onboardingData.last_name
        })
        console.log('🔍 DEBUG: Cached invitation token:', getCachedInvitationToken())
        console.log('🔍 DEBUG: Stored invitation data:', getStoredInvitationData())
        console.log('🔍 DEBUG: Full onboarding data being sent:', onboardingData)
        
        try {
          result = await invitationAPI.completeOnboarding(cleanedData)
        } catch (completionError) {
          console.error('Completion error:', completionError)
          
          // Check if it's a "session not found" error (404)
          if (completionError instanceof Error && 
              (completionError.message.includes('Onboarding session not found') || 
               completionError.message.includes('404') ||
               completionError.message.includes('session not found'))) {
            
            console.log('🛠️ Session not found, creating on-the-fly with collected data')
            
            // Try to create the session using the data we have
            try {
              const sessionCreated = await invitationAPI.updateOnboardingProgress(
                onboardingData.email,
                'complete', // current step
                cleanedData, // all step data
                ['personal-info', 'role-experience', 'school-setup', 'school-name', 'school-focus', 'student-planning', 'agreements'], // completed steps
                onboardingData.invitation_token
              )
              
              if (sessionCreated) {
                console.log('✅ Session created successfully, retrying completion')
                // Retry the completion now that session exists
        result = await invitationAPI.completeOnboarding(cleanedData)
                console.log('✅ Completion successful after session creation')
              } else {
                throw new Error('Failed to create onboarding session')
              }
            } catch (sessionError) {
              console.error('Failed to create session:', sessionError)
              throw new Error(`Failed to create onboarding session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`)
            }
          } else {
            // Re-throw other errors
            throw completionError
          }
        }
      } else {
        // Use coach API for standard onboarding
        const coachApiUrl = config.apiEndpoints.coach
        console.log('🎯 Using coach API URL:', coachApiUrl)
      
        const response = await fetch(`${coachApiUrl}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: response.url
          })
          
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch (e) {
            errorMessage = errorText || errorMessage
          }
          
          // Check if it's a "session not found" error and try to create session
          if (response.status === 404 || errorMessage.includes('Onboarding session not found') || errorMessage.includes('session not found')) {
            console.log('🛠️ Session not found for regular onboarding, creating on-the-fly')
            
            try {
              // Create session using the API
              const sessionCreated = await invitationAPI.updateOnboardingProgress(
                onboardingData.email,
                'complete', // current step
                cleanedData, // all step data
                ['personal-info', 'role-experience', 'school-setup', 'school-name', 'school-focus', 'student-planning', 'agreements'], // completed steps
                undefined // no invitation token for regular onboarding
              )
              
              if (sessionCreated) {
                console.log('✅ Session created successfully, retrying completion')
                // Retry the API call
                const retryResponse = await fetch(`${coachApiUrl}/onboarding/complete`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(cleanedData),
                })
                
                if (retryResponse.ok) {
                  result = await retryResponse.json()
                  console.log('✅ Completion successful after session creation')
                } else {
                  const retryErrorText = await retryResponse.text()
                  throw new Error(`Retry failed: ${retryErrorText}`)
                }
              } else {
                throw new Error('Failed to create onboarding session')
              }
            } catch (sessionError) {
              console.error('Failed to create session for regular onboarding:', sessionError)
              throw new Error(`Failed to create onboarding session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`)
            }
          } else {
            throw new Error(errorMessage)
          }
        } else {
          // Successful response - parse the result
        result = await response.json()
        }
      }

      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to complete onboarding')
      }

      console.log('Onboarding completed successfully:', result)
      console.log('🔍 BACKEND RESPONSE DATA:', {
        profile_id: result.profile_id,
        data_received_keys: result.data_received ? Object.keys(result.data_received) : 'no data_received',
        data_received_sample: result.data_received ? {
          first_name: result.data_received.first_name,
          last_name: result.data_received.last_name,
          email: result.data_received.email,
          school_name: result.data_received.school_name,
          sport: result.data_received.sport,
          role_type: result.data_received.role_type
        } : 'no data_received'
      })
      setProfileData(result)
      
      setIsSuccess(true)

      // Clear localStorage after successful completion
      clearOnboardingData()

    } catch (error) {
      console.error('Error submitting onboarding data:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      hasSubmittedRef.current = false // Reset on error to allow retry
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }, []) // Remove dependencies to prevent infinite loop

  const handleMissingFieldChange = (field: string, value: string) => {
    setMissingFieldsData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const completeMissingFieldsAndSubmit = async () => {
    // Validate that all missing fields are now filled
    const stillMissing = missingFieldsList.filter(field => 
      !missingFieldsData[field] || missingFieldsData[field].toString().trim() === ''
    )
    
    if (stillMissing.length > 0) {
      setError(`Please fill in all required fields: ${stillMissing.join(', ')}`)
      return
    }

    // Update localStorage with the new values
    missingFieldsList.forEach(field => {
      const value = missingFieldsData[field]
      if (value) {
        localStorage.setItem(`onboarding_${field}`, value)
      }
    })

    // Hide the form and retry submission
    setShowMissingFieldsForm(false)
    setMissingFieldsList([])
    setError('')
    
    // Reset submission flag and retry
    hasSubmittedRef.current = false
    setTimeout(() => {
      submitOnboardingData()
    }, 100)
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      'first_name': 'First Name',
      'last_name': 'Last Name', 
      'email': 'Email Address',
      'cell_phone': 'Cell Phone',
      'birth_date': 'Birth Date',
      'gender': 'Gender',
      'location': 'Location',
      'role_type': 'Role Type',
      'school_name': 'School Name'
    }
    return labels[field] || field
  }

  useEffect(() => {
    // Collect and submit onboarding data on mount (only if not showing missing fields form)
    if (!showMissingFieldsForm) {
    submitOnboardingData()
    }
  }, [submitOnboardingData, showMissingFieldsForm]) // Add showMissingFieldsForm dependency

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

  // Show missing fields form if we have missing data
  if (showMissingFieldsForm && missingFieldsList.length > 0) {
    return (
      <div className="min-h-screen bg-white font-poppins">
        {/* Header */}
        <header className="px-10 py-5 flex justify-between items-center">
          <Link href="/" aria-label="Homepage">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-12 w-auto"
            />
          </Link>
        </header>

        {/* Missing fields form */}
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#222222]">
                Complete Your Information
              </h1>
              <p className="text-lg text-[#717171] mb-6">
                We need just a few more details to complete your onboarding.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-6">
                Missing Required Information
              </h3>
              
              <div className="space-y-4">
                {missingFieldsList.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {getFieldLabel(field)} *
                    </label>
                    {field === 'gender' ? (
                      <select
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    ) : field === 'role_type' ? (
                      <select
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select role</option>
                        <option value="coach">Coach</option>
                        <option value="teacher_coach">Teacher & Coach</option>
                      </select>
                    ) : field === 'birth_date' ? (
                      <input
                        type="date"
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      />
                    ) : field === 'email' ? (
                      <input
                        type="email"
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your.email@example.com"
                      />
                    ) : field === 'cell_phone' ? (
                      <input
                        type="tel"
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 123-4567"
                      />
                    ) : field === 'school_name' ? (
                      <input
                        type="text"
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your school name"
                      />
                    ) : (
                      <input
                        type="text"
                        value={missingFieldsData[field] || ''}
                        onChange={(e) => handleMissingFieldChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter your ${getFieldLabel(field).toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  onClick={completeMissingFieldsAndSubmit}
                  className="w-full bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  Complete Onboarding
                </button>
                
                <button
                  onClick={() => window.history.back()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        </main>
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

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-5xl md:text-6xl font-integral tracking-tight mb-6 leading-[0.9]"
            >
              {isInvitationFlow ? 'WELCOME TO THE TEAM!' : 'WELCOME!'}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-xl md:text-2xl leading-relaxed opacity-90 mb-8 max-w-2xl mx-auto"
            >
              {isInvitationFlow ? 
                "Thank you for accepting your invitation and completing your application. We're excited to have you join the team!" :
                "Thank you for completing your onboarding. We're excited to have you join the"
              } {!isInvitationFlow && <strong>Texas Sports Academy</strong>} {!isInvitationFlow && "family!"}
            </motion.p>

            {profileData && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="bg-white/10 rounded-lg p-6 mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Your Profile Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
                  <div>
                    <span className="font-medium text-blue-200">Name:</span>
                    <span className="ml-2 text-white">
                      {/* Try multiple data paths - data_received first, then root level */}
                      {profileData.data_received?.full_name || 
                       profileData.full_name ||
                       (profileData.data_received?.first_name && profileData.data_received?.last_name ? 
                        `${profileData.data_received.first_name} ${profileData.data_received.last_name}` : 
                        (profileData.first_name && profileData.last_name ? 
                         `${profileData.first_name} ${profileData.last_name}` :
                        profileData.data_received?.first_name || 
                         profileData.first_name ||
                        profileData.data_received?.last_name || 
                         profileData.last_name ||
                         'Not provided'))}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Email:</span>
                    <span className="ml-2 text-white">
                      {profileData.data_received?.email || 
                       profileData.email ||
                       profileData.data_received?.invitation_email || 
                       profileData.invitation_email ||
                       'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Role:</span>
                    <span className="ml-2 text-white">
                      {profileData.data_received?.role_type || 
                       profileData.role_type ||
                       profileData.data_received?.invitation_role || 
                       profileData.invitation_role ||
                       'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">School:</span>
                    <span className="ml-2 text-white">
                      {profileData.data_received?.school_name || 
                       profileData.school_name ||
                       profileData.data_received?.invitation_school_name || 
                       profileData.invitation_school_name ||
                       'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Sport:</span>
                    <span className="ml-2 text-white">
                      {profileData.data_received?.sport || 
                       profileData.sport ||
                       profileData.data_received?.invitation_sport || 
                       profileData.invitation_sport ||
                       'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-200">Profile ID:</span>
                    <span className="ml-2 text-white font-mono text-xs">{profileData.profile_id}</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="text-lg leading-relaxed opacity-90 mb-12 max-w-2xl mx-auto"
            >
              Our team will review your information and be in touch within 24-48 hours with next steps. 
              In the meantime, you can start exploring the platform and preparing for your students.
            </motion.p>
            
            {/* Delayed CTA Button */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3.0, duration: 0.5 }}
              className="space-y-4"
            >
              <Link href="/">
                <button className="bg-white text-[#004aad] font-bold py-4 px-10 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wide transform hover:scale-105">
                  GET STARTED
                </button>
              </Link>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                className="text-sm opacity-80 mt-6"
                style={{ marginBottom: '88px' }}
              >
                Questions? Email us at{' '}
                <a href="mailto:team@sportsacademy.school" className="underline">
                  team@sportsacademy.school
                </a>
              </motion.p>
            </motion.div>
          </motion.div>
        </main>
      </div>
    )
  }

  return null
} 