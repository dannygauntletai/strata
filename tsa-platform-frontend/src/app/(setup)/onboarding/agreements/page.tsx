'use client'

import React, { useState } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { buildInvitationURL, ONBOARDING_STEPS } from '@/lib/invitation-api'
import { useOnboardingState } from '@/hooks/useOnboardingState'

export default function Agreements() {
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
    currentStep: ONBOARDING_STEPS.AGREEMENTS,
    requiredFields: ['platform_agreement']
  })

  const [showError, setShowError] = useState(false)

  const handleAgreementChange = (field: string, value: boolean) => {
    updateField(field, value)
    setShowError(false)
  }

  const handleContinue = async () => {
    if (formData.platform_agreement) {
      // Mark step as complete and save progress (hybrid: local + server)
      const success = await markStepComplete()
      
      if (success) {
      router.push(buildInvitationURL('/onboarding/background-check'))
      } else {
        setShowError(true)
      }
    } else {
      setShowError(true)
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
          className="w-full max-w-4xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-[#222222]">
            Platform Agreement
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12 max-w-2xl mx-auto">
            Please review and accept the platform agreement to continue with your onboarding
          </p>

          <div className="space-y-8">
            {/* Platform Agreement */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-50 rounded-xl p-6 border"
            >
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">
                Texas Sports Academy Platform Agreement
              </h3>
              <div className="bg-white rounded-lg p-4 mb-4 max-h-40 overflow-y-auto text-sm text-gray-700">
                <p className="mb-2">
                  <strong>Platform Usage Terms:</strong> By using the Texas Sports Academy platform, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Use the platform in accordance with our terms of service</li>
                  <li>Maintain professional standards in all interactions</li>
                  <li>Protect student privacy and data</li>
                  <li>Comply with educational and safety regulations</li>
                  <li>Report any issues or concerns promptly</li>
                  <li>Follow state and local educational regulations</li>
                  <li>Maintain appropriate coaching certifications</li>
                  <li>Provide a safe learning environment</li>
                  <li>Implement Texas Sports Academy curriculum standards</li>
                  <li>Submit required progress reports and assessments</li>
                  <li>Participate in ongoing professional development</li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  Full terms available at{' '}
                  <a href="/legal/platform-terms" target="_blank" className="text-blue-600 hover:underline">
                    platform-terms
                  </a>
                </p>
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.platform_agreement}
                  onChange={(e) => handleAgreementChange('platform_agreement', e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-base text-[#222222]">
                  I have read, understood, and agree to the Platform Agreement
                </span>
              </label>
            </motion.div>
          </div>

          {/* Error message */}
          <div className="mt-8 mb-4">
            <ErrorMessage 
              message="Please accept the platform agreement to continue" 
              show={showError} 
            />
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={getProgressPercentage()}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/student-planning')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 