'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { buildInvitationURL, ONBOARDING_STEPS } from '@/lib/invitation-api'
import { useOnboardingState } from '@/hooks/useOnboardingState'
import Link from 'next/link'

export default function RoleExperience() {
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
    currentStep: ONBOARDING_STEPS.ROLE_EXPERIENCE,
    requiredFields: ['role_type', 'years_experience']
  })

  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Initialize form data and ensure defaults
  useEffect(() => {
    if (!onboardingLoading) {
      const updates: any = {}
      
      // Always ensure role_type is 'coach'
      if (!formData.role_type) {
        updates.role_type = 'coach'
      }
      
      // Always ensure Technology Education is included
      const specializations = formData.specializations || []
      if (!specializations.includes('Technology Education')) {
        updates.specializations = [...specializations, 'Technology Education']
      }
      
      // Auto-deduce certification level from years_experience
      if (formData.years_experience && formData.years_experience !== formData.certification_level) {
        updates.certification_level = autoDeduceCertificationLevel(formData.years_experience)
      }
      
      if (Object.keys(updates).length > 0) {
        updateMultipleFields(updates)
      }
    }
  }, [formData.role_type, formData.years_experience, formData.specializations, formData.certification_level, onboardingLoading, updateMultipleFields])

  const autoDeduceCertificationLevel = (yearsExperience: string): string => {
    const years = parseInt(yearsExperience) || 0
    if (years === 0) return 'Beginner'
    if (years <= 2) return 'Novice'
    if (years <= 5) return 'Intermediate'
    if (years <= 10) return 'Advanced'
    return 'Expert'
  }

  const sportSpecializations = [
    'Basketball', 'Football', 'Soccer', 'Baseball', 'Track & Field', 
    'Tennis', 'Volleyball', 'Swimming', 'Wrestling', 'Cross Country',
    'Golf', 'Softball', 'Lacrosse', 'Hockey', 'Martial Arts'
  ]

  const handleSpecializationToggle = (specialization: string) => {
    const current = formData.specializations || []
    
    // Don't allow removing Technology Education
    if (specialization === 'Technology Education' && current.includes(specialization)) {
      return
    }
    
    const updated = current.includes(specialization)
      ? current.filter((s: string) => s !== specialization)
      : [...current, specialization]
    
    updateField('specializations', updated)
  }

  const handleYearsExperienceChange = (value: string) => {
    updateMultipleFields({
      years_experience: value,
      certification_level: autoDeduceCertificationLevel(value)
    })
    setShowError(false)
    setErrorMessage('')
  }

  const handleContinue = async () => {
    if (!formData.years_experience) {
      setShowError(true)
      setErrorMessage('Please select your years of experience')
      return
    }
    
    // Mark step as complete and save progress (hybrid: local + server)
    const success = await markStepComplete()
    
    if (success) {
      router.push(buildInvitationURL('/onboarding/school-setup'))
    } else {
      setErrorMessage('Failed to save progress. Please try again.')
      setShowError(true)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-poppins pb-[88px]">
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
            Your Coaching Experience
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Help us understand your coaching background so we can customize your experience.
          </p>

          <div className="space-y-8">
            {/* Years of Experience */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Years of Coaching Experience</h3>
              <div className="max-w-md">
                <select
                  value={formData.years_experience}
                  onChange={(e) => handleYearsExperienceChange(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                >
                  <option value="">Select your coaching experience</option>
                  <option value="0">New to coaching</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="11-15">11-15 years</option>
                  <option value="16-20">16-20 years</option>
                  <option value="20+">20+ years</option>
                </select>
              </div>
              {formData.certification_level && (
                <p className="text-sm text-blue-600 mt-2">
                  Certification level: <span className="font-medium capitalize">{formData.certification_level}</span>
                </p>
              )}
            </div>

            {/* Sports Specializations */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Sports Expertise <span className="text-gray-500 text-lg">(Optional)</span></h3>
              <p className="text-lg text-[#717171] mb-6">Select any sports you have experience coaching</p>
              
              <div className="flex flex-wrap gap-2">
                {sportSpecializations.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => handleSpecializationToggle(sport)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      (formData.specializations || []).includes(sport)
                        ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
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
        backButtonHref={buildInvitationURL('/onboarding/school-name')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 