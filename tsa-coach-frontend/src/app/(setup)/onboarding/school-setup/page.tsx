'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { getStoredInvitationData, isInvitationOnboarding, buildInvitationURL } from '@/lib/invitation-api'
import Link from 'next/link'

export default function SchoolSetup() {
  const router = useRouter()
  const [isInvitationFlow, setIsInvitationFlow] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [formData, setFormData] = useState({
    school_name: '',
    school_type: '',
    grade_levels_served: [] as string[],
    school_street: '',
    school_city: '',
    school_state: '',
    school_zip: '',
    school_phone: '',
    website: '',
    has_physical_location: true,
    academic_year: '2024-2025'
  })
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Load existing data on mount
  useEffect(() => {
    // Check if this is invitation-based onboarding
    const isInvitation = isInvitationOnboarding()
    setIsInvitationFlow(isInvitation)

    if (isInvitation) {
      // Load invitation data
      const invitationData = getStoredInvitationData()
      if (invitationData) {
        setInvitationData(invitationData)
        setFormData(prev => ({
          ...prev,
          school_name: invitationData.school_name || '',
          school_type: invitationData.school_type || ''
        }))
      }
    }

    const savedData = {
      school_name: localStorage.getItem('onboarding_school_name') || formData.school_name,
      school_type: localStorage.getItem('onboarding_school_type') || formData.school_type,
      grade_levels_served: JSON.parse(localStorage.getItem('onboarding_grade_levels_served') || '[]'),
      school_street: localStorage.getItem('onboarding_school_street') || '',
      school_city: localStorage.getItem('onboarding_school_city') || '',
      school_state: localStorage.getItem('onboarding_school_state') || '',
      school_zip: localStorage.getItem('onboarding_school_zip') || '',
      school_phone: localStorage.getItem('onboarding_school_phone') || '',
      website: localStorage.getItem('onboarding_website') || '',
      has_physical_location: localStorage.getItem('onboarding_has_physical_location') !== 'false',
      academic_year: localStorage.getItem('onboarding_academic_year') || '2024-2025'
    }
    setFormData(prev => ({ ...prev, ...savedData }))
  }, [formData.school_name, formData.school_type])

  // Save to localStorage when data changes
  useEffect(() => {
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        localStorage.setItem(`onboarding_${key}`, value)
      } else if (Array.isArray(value)) {
        localStorage.setItem(`onboarding_${key}`, JSON.stringify(value))
      } else if (typeof value === 'boolean') {
        localStorage.setItem(`onboarding_${key}`, value.toString())
      }
    })
  }, [formData])

  const schoolTypes = [
    { id: 'elementary', name: 'Elementary School', description: 'Grades K-5', grades: ['K', '1', '2', '3', '4', '5'] },
    { id: 'middle', name: 'Middle School', description: 'Grades 6-8', grades: ['6', '7', '8'] },
    { id: 'high', name: 'High School', description: 'Grades 9-12', grades: ['9', '10', '11', '12'] },
    { id: 'combined', name: 'Combined/Multi-level', description: 'Multiple grade ranges', grades: [] },
    { id: 'other', name: 'Other/Specialized', description: 'Specialized programs', grades: [] }
  ]

  const allGradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  const handleSchoolTypeChange = (schoolTypeId: string) => {
    const schoolType = schoolTypes.find(st => st.id === schoolTypeId)
    setFormData({
      ...formData,
      school_type: schoolTypeId,
      grade_levels_served: schoolType?.grades || formData.grade_levels_served
    })
    setShowError(false)
  }

  const handleGradeLevelToggle = (grade: string) => {
    const updatedGrades = formData.grade_levels_served.includes(grade)
      ? formData.grade_levels_served.filter(g => g !== grade)
      : [...formData.grade_levels_served, grade].sort((a, b) => {
          if (a === 'K') return -1
          if (b === 'K') return 1
          return parseInt(a) - parseInt(b)
        })
    
    setFormData({
      ...formData,
      grade_levels_served: updatedGrades
    })
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData({
      ...formData,
      [field]: value
    })
    setShowError(false)
  }

  const handleAddressSelect = (addressData: { street: string; city: string; state: string; zip: string }) => {
    setFormData({
      ...formData,
      school_street: addressData.street,
      school_city: addressData.city,
      school_state: addressData.state,
      school_zip: addressData.zip
    })
    setShowError(false)
  }

  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const validateForm = () => {
    if (!formData.school_name.trim()) {
      setErrorMessage('School name is required')
      return false
    }

    if (!formData.school_type) {
      setErrorMessage('Please select a school type')
      return false
    }
    
    if (formData.grade_levels_served.length === 0) {
      setErrorMessage('Please select at least one grade level')
      return false
    }

    if (!formData.academic_year) {
      setErrorMessage('Please specify the academic year')
      return false
    }

    return true
  }

  const handleContinue = () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    router.push(buildInvitationURL('/onboarding/school-focus'))
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
            School Information
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Tell us about your school. Don&apos;t worry - you can update this information later.
          </p>

          <div className="space-y-8">
            {/* School Name */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">School Name</h3>
              <input
                type="text"
                value={formData.school_name}
                onChange={(e) => handleInputChange('school_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="Enter your school name"
                readOnly={isInvitationFlow && !!invitationData?.school_name}
              />
              {isInvitationFlow && invitationData?.school_name && (
                <p className="text-sm text-blue-600 mt-1">Pre-filled from invitation</p>
              )}
            </div>

            {/* School Type Selection */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">School Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSchoolTypeChange(type.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.school_type === type.id
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <h4 className="font-semibold text-lg text-[#222222]">
                          {type.name}
                        </h4>
                    <p className="text-sm mt-1 text-[#717171]">
                          {type.description}
                        </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade Levels */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Grade Levels Served</h3>
                <div className="flex flex-wrap gap-3">
                  {allGradeLevels.map((grade) => (
                    <button
                      key={grade}
                      onClick={() => handleGradeLevelToggle(grade)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.grade_levels_served.includes(grade)
                          ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                    </button>
                  ))}
                </div>
            </div>

            {/* Physical Location Option */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">School Location</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="has-location"
                    name="location-type"
                    checked={formData.has_physical_location}
                    onChange={() => handleInputChange('has_physical_location', true)}
                    className="w-4 h-4 text-[#174fa2] border-gray-300 focus:ring-[#174fa2]"
                  />
                  <label htmlFor="has-location" className="text-base font-medium text-gray-700">
                    I have a physical school location
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="no-location"
                    name="location-type"
                    checked={!formData.has_physical_location}
                    onChange={() => handleInputChange('has_physical_location', false)}
                    className="w-4 h-4 text-[#174fa2] border-gray-300 focus:ring-[#174fa2]"
                  />
                  <label htmlFor="no-location" className="text-base font-medium text-gray-700">
                    I don&apos;t have a physical location yet (virtual/mobile program)
                  </label>
                </div>
              </div>
            </div>

            {/* School Address - Optional */}
            {formData.has_physical_location && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-semibold text-[#222222] mb-4">School Address <span className="text-gray-500 text-lg">(Optional)</span></h3>
                <p className="text-gray-600 mb-4">You can add this information later if you haven&apos;t finalized your location.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <AddressAutocomplete
                    label="Street Address"
                    value={formData.school_street}
                    onChange={(value) => handleInputChange('school_street', value)}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Start typing your school address..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.school_city}
                    onChange={(e) => handleInputChange('school_city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dallas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={formData.school_state}
                    onChange={(e) => handleInputChange('school_state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.school_zip}
                    onChange={(e) => handleInputChange('school_zip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75201"
                    maxLength={5}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Phone <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.school_phone}
                    onChange={(e) => handleInputChange('school_phone', formatPhoneInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                    maxLength={14}
                  />
                </div>
              </div>
              </motion.div>
            )}

            {/* Website */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Website <span className="text-gray-500 text-lg">(Optional)</span></h3>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="https://yourschool.com"
              />
            </div>

            {/* Academic Year */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Academic Year</h3>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Academic Year
                </label>
                <select
                  value={formData.academic_year}
                  onChange={(e) => handleInputChange('academic_year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
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
        progressPercent={45}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/role-experience')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 