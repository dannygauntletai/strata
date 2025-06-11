'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { getStoredInvitationData, isInvitationOnboarding, buildInvitationURL } from '@/lib/invitation-api'

export default function BasicInformation() {
  const router = useRouter()
  const [isInvitationFlow, setIsInvitationFlow] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    cell_phone: '',
    birth_date: '',
    gender: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showError, setShowError] = useState(false)

  // Load data on mount
  useEffect(() => {
    // Check if this is invitation-based onboarding
    const isInvitation = isInvitationOnboarding()
    setIsInvitationFlow(isInvitation)

    if (isInvitation) {
      // Load invitation data
      const invitationData = getStoredInvitationData()
      if (invitationData) {
        setInvitationData(invitationData)
        
        // Store email in localStorage for compatibility
        localStorage.setItem('onboarding_email', invitationData.email)
      }
    }

    // Load any existing form data
    const savedFirstName = localStorage.getItem('onboarding_first_name')
    const savedLastName = localStorage.getItem('onboarding_last_name')
    const savedMiddleName = localStorage.getItem('onboarding_middle_name')
      const savedCellPhone = localStorage.getItem('onboarding_cell_phone')
    const savedBirthDate = localStorage.getItem('onboarding_birth_date')
    const savedGender = localStorage.getItem('onboarding_gender')

    if (savedFirstName) setFormData(prev => ({ ...prev, first_name: savedFirstName }))
    if (savedLastName) setFormData(prev => ({ ...prev, last_name: savedLastName }))
    if (savedMiddleName) setFormData(prev => ({ ...prev, middle_name: savedMiddleName }))
      if (savedCellPhone) setFormData(prev => ({ ...prev, cell_phone: savedCellPhone }))
    if (savedBirthDate) setFormData(prev => ({ ...prev, birth_date: savedBirthDate }))
    if (savedGender) setFormData(prev => ({ ...prev, gender: savedGender }))
  }, [])

  // Update localStorage when data changes
  useEffect(() => {
    Object.entries(formData).forEach(([key, value]) => {
      if (value.trim()) {
        localStorage.setItem(`onboarding_${key}`, value)
      }
    })
  }, [formData])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (showError) {
      setShowError(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }
    
    if (!formData.cell_phone.trim()) {
      newErrors.cell_phone = 'Cell phone is required'
    }
    
    if (!formData.birth_date.trim()) {
      newErrors.birth_date = 'Birth date is required'
    } else {
      // Validate age (must be 18+)
      const birthDate = new Date(formData.birth_date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 18) {
        newErrors.birth_date = 'You must be at least 18 years old'
      }
    }

    if (!formData.gender.trim()) {
      newErrors.gender = 'Gender is required for compliance purposes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validateForm()) {
      // Create full name for compatibility
      const fullName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`.trim()
      localStorage.setItem('onboarding_full_name', fullName)
      
      router.push(buildInvitationURL('/onboarding/role-experience'))
    } else {
      setShowError(true)
    }
  }

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ]

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
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#222222]">
              Tell us about yourself
            </h1>
            <p className="text-lg text-[#717171]">
              Let&apos;s start with some basic information to set up your profile.
            </p>
          </div>
          
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
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
                value={formData.middle_name}
                onChange={(e) => handleInputChange('middle_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="Your middle name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="Your last name"
              />
              {errors.last_name && <ErrorMessage message={errors.last_name} show={true} />}
            </div>

            {/* Cell Phone */}
            <div>
              <label htmlFor="cellPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Cell Phone *
              </label>
              <input
                type="tel"
                id="cellPhone"
                value={formData.cell_phone}
                onChange={(e) => handleInputChange('cell_phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                placeholder="(555) 123-4567"
              />
              {errors.cell_phone && <ErrorMessage message={errors.cell_phone} show={true} />}
            </div>

            {/* Birth Date */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date *
              </label>
              <input
                type="date"
                id="birthDate"
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] transition-colors text-base"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {errors.birth_date && <ErrorMessage message={errors.birth_date} show={true} />}
              <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
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
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={15}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding')}
        nextButtonClassName="bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white disabled:opacity-50"
      />
    </div>
  )
} 