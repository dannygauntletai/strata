'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { buildInvitationURL, ONBOARDING_STEPS } from '@/lib/invitation-api'
import { useOnboardingState } from '@/hooks/useOnboardingState'
import Link from 'next/link'

export default function StudentPlanning() {
  const router = useRouter()
  
  // Use the onboarding state hook for hybrid local+server persistence
  const {
    formData,
    invitationData,
    isLoading: onboardingLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    errors,
    updateField,
    updateMultipleFields,
    validateStep,
    markStepComplete,
    isFieldPreFilled,
    getProgressPercentage
  } = useOnboardingState({
    currentStep: ONBOARDING_STEPS.STUDENT_PLANNING,
    requiredFields: ['estimated_student_count']
  })

  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Initialize form data with defaults
  useEffect(() => {
    if (!onboardingLoading) {
      const updates: any = {}
      
      // Always default enrollment capacity to 100
      if (!formData.enrollment_capacity) {
        updates.enrollment_capacity = 100
      }
      
      if (Object.keys(updates).length > 0) {
        updateMultipleFields(updates)
      }
    }
  }, [formData.enrollment_capacity, onboardingLoading, updateMultipleFields])

  const studentCountRanges = [
    { id: '0', name: '0 students', description: 'Starting fresh' },
    { id: '1-5', name: '1-5 students', description: 'Small group' },
    { id: '6-15', name: '6-15 students', description: 'Medium group' },
    { id: '16-30', name: '16-30 students', description: 'Large group' },
    { id: '31-50', name: '31-50 students', description: 'Very large group' },
    { id: '50+', name: '50+ students', description: 'Multiple classes' }
  ]

  const handleInputChange = (field: string, value: string | boolean | number) => {
    updateField(field, value)
    setShowError(false)
    setErrorMessage('')
  }

  const validateForm = () => {
    if (!formData.estimated_student_count) {
      setErrorMessage('Please select your estimated student count')
      return false
    }
    return true
  }

  const handleContinue = async () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    // Mark step as complete and save progress (hybrid: local + server)
    const success = await markStepComplete()
    
    if (success) {
      router.push(buildInvitationURL('/onboarding/agreements'))
    } else {
      setErrorMessage('Failed to save progress. Please try again.')
      setShowError(true)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-poppins pb-[132px]">
      {/* Header */}
      <header className="px-10 py-5 flex justify-between items-center flex-shrink-0">
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
      <main className="flex-grow flex items-center justify-center p-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-[#222222]">
            Student Planning
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Tell us about your expected student enrollment for the upcoming fall semester.
          </p>

          <div className="space-y-8">
            {/* Current Students */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Do you currently have students?</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => handleInputChange('has_current_students', true)}
                  className={`px-6 py-3 rounded-xl border-2 transition-all ${
                    formData.has_current_students
                      ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Yes, I have current students
                </button>
                <button
                  onClick={() => handleInputChange('has_current_students', false)}
                  className={`px-6 py-3 rounded-xl border-2 transition-all ${
                    !formData.has_current_students
                      ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  No, I&apos;m starting fresh
                </button>
              </div>
            </div>

            {/* Current Student Count */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">
                {formData.has_current_students ? 'How many students do you currently have?' : 'How many students do you plan to start with?'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentCountRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => handleInputChange('estimated_student_count', range.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.estimated_student_count === range.id
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-semibold text-lg text-[#222222]">{range.name}</h4>
                    <p className="text-[#717171] text-sm mt-1">{range.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Details for Current Students */}
            {formData.has_current_students && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-semibold text-[#222222] mb-4">Tell us about your current students</h3>
                <textarea
                  value={formData.current_student_details}
                  onChange={(e) => handleInputChange('current_student_details', e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Briefly describe your current students, their interests, grade levels, or any special considerations..."
                />
              </motion.div>
            )}
          </div>

          {/* Error message */}
          {showError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={getProgressPercentage()}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/school-focus')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 