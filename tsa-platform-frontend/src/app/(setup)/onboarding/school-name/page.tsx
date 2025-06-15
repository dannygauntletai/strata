'use client'

import React, { Suspense } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { buildInvitationURL, ONBOARDING_STEPS } from '@/lib/invitation-api'
import { useOnboardingState } from '@/hooks/useOnboardingState'

function PersonalInformationContent() {
  const router = useRouter()
  
  const {
    formData,
    invitationData,
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    errors,
    hasErrors,
    updateField,
    validateStep,
    markStepComplete,
    isFieldPreFilled,
    getProgressPercentage
  } = useOnboardingState({
    currentStep: ONBOARDING_STEPS.PERSONAL_INFO, // This step collects personal info, not school name
    requiredFields: ['first_name', 'last_name', 'phone', 'birth_date', 'gender', 'birth_city', 'birth_state_abbreviation_descriptor']
  })

  const handleContinue = async () => {
    if (validateStep()) {
      const success = await markStepComplete()
      if (success) {
        router.push(buildInvitationURL('/onboarding/role-experience'))
      }
    }
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

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ]

  const stateOptions = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ]

  const raceOptions = [
    { value: 'american-indian-alaska-native', label: 'American Indian or Alaska Native' },
    { value: 'asian', label: 'Asian' },
    { value: 'black-african-american', label: 'Black or African American' },
    { value: 'native-hawaiian-pacific-islander', label: 'Native Hawaiian or Other Pacific Islander' },
    { value: 'white', label: 'White' },
    { value: 'two-or-more-races', label: 'Two or More Races' }
  ]

  if (isLoading) {
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
    <div className="min-h-screen bg-white font-poppins pb-[132px]">
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
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#222222]">
              Tell us about yourself
            </h1>
            <p className="text-lg text-[#717171]">
              {invitationData ? 
                "We've pre-filled some information from your invitation. Please complete the remaining details." :
                "Let's start with some basic information to set up your profile."
              }
            </p>
            {invitationData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Welcome, {invitationData.first_name}!</strong> Some fields have been pre-filled from your invitation.
                </p>
              </div>
            )}
            
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
          
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
                {isFieldPreFilled('first_name') && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Pre-filled</span>
                )}
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                disabled={isFieldPreFilled('first_name')}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base ${
                  isFieldPreFilled('first_name') ? 'bg-gray-50 text-gray-600' : ''
                }`}
                placeholder="Your first name"
              />
              {errors.first_name && <ErrorMessage message={errors.first_name} show={true} />}
            </div>

            {/* Middle Name */}
            <div>
              <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
                Middle Name <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                id="middleName"
                value={formData.middle_name || ''}
                onChange={(e) => updateField('middle_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="Your middle name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
                {isFieldPreFilled('last_name') && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Pre-filled</span>
                )}
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                disabled={isFieldPreFilled('last_name')}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base ${
                  isFieldPreFilled('last_name') ? 'bg-gray-50 text-gray-600' : ''
                }`}
                placeholder="Your last name"
              />
              {errors.last_name && <ErrorMessage message={errors.last_name} show={true} />}
            </div>

            {/* Generation Code Suffix */}
            <div>
              <label htmlFor="generationSuffix" className="block text-sm font-medium text-gray-700 mb-2">
                Generation Code <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                id="generationSuffix"
                value={formData.generation_code_suffix || ''}
                onChange={(e) => updateField('generation_code_suffix', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
              >
                <option value="">Select suffix</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
                <option value="V">V</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Jr., Sr., III, etc. - Required for Ed-Fi compliance</p>
            </div>

            {/* Email (Pre-filled, read-only) */}
            {invitationData?.email && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Pre-filled</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-base"
                />
              </div>
            )}

            {/* Cell Phone */}
            <div>
              <label htmlFor="cellPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Cell Phone *
                {isFieldPreFilled('phone') && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Pre-filled</span>
                )}
              </label>
              <input
                type="tel"
                id="cellPhone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={isFieldPreFilled('phone')}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base ${
                  isFieldPreFilled('phone') ? 'bg-gray-50 text-gray-600' : ''
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <ErrorMessage message={errors.phone} show={true} />}
            </div>

            {/* Location (Pre-filled, read-only) */}
            {invitationData?.city && invitationData?.state && (
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Pre-filled</span>
                </label>
                <input
                  type="text"
                  id="location"
                  value={`${formData.city}, ${formData.state}`}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-base"
                />
              </div>
            )}

            {/* Birth Date */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date *
              </label>
              <input
                type="date"
                id="birthDate"
                value={formData.birth_date}
                onChange={(e) => updateField('birth_date', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {errors.birth_date && <ErrorMessage message={errors.birth_date} show={true} />}
              <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
            </div>

            {/* Birth City */}
            <div>
              <label htmlFor="birthCity" className="block text-sm font-medium text-gray-700 mb-2">
                Birth City *
              </label>
              <input
                type="text"
                id="birthCity"
                value={formData.birth_city || ''}
                onChange={(e) => updateField('birth_city', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="City where you were born"
              />
              {errors.birth_city && <ErrorMessage message={errors.birth_city} show={true} />}
              <p className="text-xs text-gray-500 mt-1">Required for Ed-Fi compliance records</p>
            </div>

            {/* Birth State */}
            <div>
              <label htmlFor="birthState" className="block text-sm font-medium text-gray-700 mb-2">
                Birth State *
              </label>
              <select
                id="birthState"
                value={formData.birth_state_abbreviation_descriptor || ''}
                onChange={(e) => updateField('birth_state_abbreviation_descriptor', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
              >
                <option value="">Select birth state</option>
                {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.birth_state_abbreviation_descriptor && <ErrorMessage message={errors.birth_state_abbreviation_descriptor} show={true} />}
              <p className="text-xs text-gray-500 mt-1">Required for Ed-Fi compliance records</p>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
              >
                <option value="">Select gender</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gender && <ErrorMessage message={errors.gender} show={true} />}
              <p className="text-xs text-gray-500 mt-1">Required for compliance and demographic reporting</p>
            </div>

            {/* Hispanic/Latino Ethnicity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Hispanic or Latino Ethnicity <span className="text-gray-500">(Optional)</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hispanic_latino_ethnicity"
                    value="true"
                    checked={formData.hispanic_latino_ethnicity === true}
                    onChange={(e) => updateField('hispanic_latino_ethnicity', true)}
                    className="mr-3 text-[#004aad] focus:ring-[#004aad]"
                  />
                  <span className="text-base">Yes, Hispanic or Latino</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hispanic_latino_ethnicity"
                    value="false"
                    checked={formData.hispanic_latino_ethnicity === false}
                    onChange={(e) => updateField('hispanic_latino_ethnicity', false)}
                    className="mr-3 text-[#004aad] focus:ring-[#004aad]"
                  />
                  <span className="text-base">No, not Hispanic or Latino</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hispanic_latino_ethnicity"
                    value=""
                    checked={formData.hispanic_latino_ethnicity === undefined || formData.hispanic_latino_ethnicity === null}
                    onChange={(e) => updateField('hispanic_latino_ethnicity', undefined)}
                    className="mr-3 text-[#004aad] focus:ring-[#004aad]"
                  />
                  <span className="text-base">Prefer not to answer</span>
                </label>
              </div>
            </div>

            {/* Race */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Race <span className="text-gray-500">(Optional - Select all that apply)</span>
              </label>
              <div className="space-y-2">
                {raceOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={(formData.races || []).includes(option.value)}
                      onChange={(e) => {
                        const currentRaces = formData.races || []
                        if (e.target.checked) {
                          updateField('races', [...currentRaces, option.value])
                        } else {
                          updateField('races', currentRaces.filter((race: string) => race !== option.value))
                        }
                      }}
                      className="mr-3 text-[#004aad] focus:ring-[#004aad]"
                    />
                    <span className="text-base">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bio (Pre-filled if available) */}
            {invitationData?.bio && (
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Background Information
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">From invitation</span>
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  disabled
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-base resize-none"
                />
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={getProgressPercentage()}
        nextButtonText={isSaving ? "Saving..." : "Continue"}
        buttonAction={handleContinue}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding')}
        nextButtonClassName="bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white disabled:opacity-50"
        disabled={isSaving || hasErrors}
      />
    </div>
  )
}

export default function PersonalInformation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white font-poppins flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174fa2] mx-auto mb-4"></div>
          <p className="text-[#717171]">Loading...</p>
        </div>
      </div>
    }>
      <PersonalInformationContent />
    </Suspense>
  )
} 