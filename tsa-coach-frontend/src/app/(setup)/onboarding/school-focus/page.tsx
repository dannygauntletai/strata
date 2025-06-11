'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'
import { getStoredInvitationData, isInvitationOnboarding, buildInvitationURL } from '@/lib/invitation-api'

export default function SchoolFocus() {
  const router = useRouter()
  const [isInvitationFlow, setIsInvitationFlow] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [formData, setFormData] = useState({
    sport: '',
    football_type: '',
    school_categories: [] as string[],
    program_focus: [] as string[]
  })
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Load saved state on mount
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
          sport: invitationData.sport || ''
        }))
      }
    }

    // Load saved data
    const savedData = {
      sport: localStorage.getItem('onboarding_sport') || formData.sport,
      football_type: localStorage.getItem('onboarding_football_type') || '',
      school_categories: JSON.parse(localStorage.getItem('onboarding_school_categories') || '[]'),
      program_focus: JSON.parse(localStorage.getItem('onboarding_program_focus') || '[]')
    }
    setFormData(prev => ({ ...prev, ...savedData }))
  }, [formData.sport])

  // Save to localStorage when data changes
  useEffect(() => {
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        localStorage.setItem(`onboarding_${key}`, value)
      } else if (Array.isArray(value)) {
        localStorage.setItem(`onboarding_${key}`, JSON.stringify(value))
      }
    })
  }, [formData])

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setShowError(false)
    setErrorMessage('')
  }

  const handleSportChange = (sportId: string) => {
    setFormData(prev => ({
      ...prev,
      sport: sportId,
      football_type: sportId !== 'football' ? '' : prev.football_type
    }))
    setShowError(false)
    setErrorMessage('')
  }

  const handleCategoryToggle = (category: string) => {
    const updated = formData.school_categories.includes(category)
      ? formData.school_categories.filter(c => c !== category)
      : [...formData.school_categories, category]
    
    handleInputChange('school_categories', updated)
  }

  const handleFocusToggle = (focus: string) => {
    const updated = formData.program_focus.includes(focus)
      ? formData.program_focus.filter(f => f !== focus)
      : [...formData.program_focus, focus]
    
    handleInputChange('program_focus', updated)
  }

  const handleContinue = () => {
    if (!formData.sport) {
      setShowError(true)
      setErrorMessage('Please select a primary sport')
      return
    }
    if (formData.sport === 'football' && !formData.football_type) {
      setShowError(true)
      setErrorMessage('Please select a football type')
      return
    }
    if (formData.school_categories.length === 0) {
      setShowError(true)
      setErrorMessage('Please select at least one school category')
      return
    }
    
    router.push(buildInvitationURL('/onboarding/student-planning'))
  }

  const sports = [
    { id: 'basketball', name: 'Basketball', icon: '🏀', bgColor: 'bg-orange-100' },
    { id: 'football', name: 'Football', icon: '🏈', bgColor: 'bg-blue-100' },
    { id: 'soccer', name: 'Soccer', icon: '⚽', bgColor: 'bg-green-100' },
    { id: 'baseball', name: 'Baseball', icon: '⚾', bgColor: 'bg-red-100' },
    { id: 'tennis', name: 'Tennis', icon: '🎾', bgColor: 'bg-yellow-100' },
    { id: 'track', name: 'Track & Field', icon: '🏃', bgColor: 'bg-purple-100' },
    { id: 'other', name: 'Other Sport', icon: '🏆', bgColor: 'bg-gray-100' }
  ]

  const footballTypes = [
    { id: '6-man', name: '6-man' },
    { id: '7-man', name: '7-man' },
    { id: '8-man', name: '8-man' },
    { id: '11-man', name: '11-man' }
  ]

  const schoolCategories = [
    { id: 'academic_focus', name: 'Academic Excellence', description: 'Strong focus on traditional academics' },
    { id: 'athletic_focus', name: 'Athletic Program', description: 'Sports-centered curriculum and training' },
    { id: 'stem_focus', name: 'STEM Education', description: 'Science, Technology, Engineering, Math focus' },
    { id: 'arts_focus', name: 'Arts Integration', description: 'Creative arts and performance programs' },
    { id: 'career_prep', name: 'Career Preparation', description: 'Vocational and career readiness training' },
    { id: 'college_prep', name: 'College Preparation', description: 'Advanced placement and college readiness' }
  ]

  const programFoci = [
    'Character Development',
    'Leadership Training',
    'Academic Tutoring',
    'College Recruiting',
    'Professional Athletics Path',
    'Life Skills Training',
    'Community Service',
    'Entrepreneurship'
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
          className="w-full max-w-6xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-[#222222]">
            School Focus & Programs
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Help us understand your school&apos;s primary focus and program offerings.
          </p>

          <div className="space-y-12">
            {/* Primary Sport Selection */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-[#222222]">Primary Sport</h2>
              {invitationData?.sport && (
                <p className="text-sm text-blue-600 mb-4">Pre-filled from invitation: {invitationData.sport}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {sports.map((sport) => (
              <motion.button
                key={sport.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                    onClick={() => handleSportChange(sport.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      formData.sport === sport.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                    disabled={isInvitationFlow && !!invitationData?.sport && invitationData.sport !== sport.id}
              >
                    <div className={`text-3xl mb-2 ${sport.bgColor} p-2 rounded-full`}>
                  {sport.icon}
                </div>
                    <span className="text-sm font-medium text-[#222222] text-center">{sport.name}</span>
              </motion.button>
            ))}
              </div>
          </div>

          {/* Football Type Selection */}
            {formData.sport === 'football' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
                <h2 className="text-2xl font-semibold mb-6 text-[#222222]">Football Type</h2>
                <div className="flex flex-wrap justify-center gap-4">
                {footballTypes.map((type) => (
                  <button
                    key={type.id}
                      onClick={() => handleInputChange('football_type', type.id)}
                    className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                        formData.football_type === type.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
                </div>
              </motion.div>
            )}

            {/* School Categories */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-[#222222]">School Categories</h2>
              <p className="text-gray-600 mb-4">Select all that apply to your school&apos;s educational approach.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.school_categories.includes(category.id)
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-semibold text-lg text-[#222222]">{category.name}</h4>
                    <p className="text-[#717171] text-sm mt-1">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Program Focus */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-[#222222]">Additional Program Focus <span className="text-gray-500 text-lg">(Optional)</span></h2>
              <p className="text-gray-600 mb-4">Select any additional areas your program will emphasize.</p>
              <div className="flex flex-wrap gap-3">
                {programFoci.map((focus) => (
                  <button
                    key={focus}
                    onClick={() => handleFocusToggle(focus)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      formData.program_focus.includes(focus)
                        ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {focus}
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
        progressPercent={60}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/school-setup')}
        nextButtonClassName="bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white"
      />
    </div>
  )
} 