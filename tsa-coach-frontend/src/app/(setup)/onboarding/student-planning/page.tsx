'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { buildInvitationURL } from '@/lib/invitation-api'
import Link from 'next/link'

export default function StudentPlanning() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    estimated_student_count: '',
    student_grade_levels: [] as string[],
    enrollment_capacity: '',
    has_current_students: false,
    current_student_details: ''
  })
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Load existing data on mount
  useEffect(() => {
    const savedData = {
      estimated_student_count: localStorage.getItem('onboarding_estimated_student_count') || '',
      student_grade_levels: JSON.parse(localStorage.getItem('onboarding_student_grade_levels') || '[]'),
      enrollment_capacity: localStorage.getItem('onboarding_enrollment_capacity') || '',
      has_current_students: localStorage.getItem('onboarding_has_current_students') === 'true',
      current_student_details: localStorage.getItem('onboarding_current_student_details') || ''
    }
    setFormData(savedData)
  }, [])

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

  const allGradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

  const studentCountRanges = [
    { id: '0', name: '0 students', description: 'Starting fresh' },
    { id: '1-5', name: '1-5 students', description: 'Small group' },
    { id: '6-15', name: '6-15 students', description: 'Medium group' },
    { id: '16-30', name: '16-30 students', description: 'Large group' },
    { id: '31-50', name: '31-50 students', description: 'Very large group' },
    { id: '50+', name: '50+ students', description: 'Multiple classes' }
  ]

  const capacityRanges = [
    { id: '10', name: 'Up to 10 students', description: 'Intimate setting' },
    { id: '25', name: 'Up to 25 students', description: 'Small classroom' },
    { id: '50', name: 'Up to 50 students', description: 'Medium capacity' },
    { id: '100', name: 'Up to 100 students', description: 'Large capacity' },
    { id: '200', name: 'Up to 200 students', description: 'Very large capacity' },
    { id: '200+', name: '200+ students', description: 'Multiple classrooms' }
  ]

  const handleGradeLevelToggle = (grade: string) => {
    const updatedGrades = formData.student_grade_levels.includes(grade)
      ? formData.student_grade_levels.filter(g => g !== grade)
      : [...formData.student_grade_levels, grade].sort((a, b) => {
          if (a === 'K') return -1
          if (b === 'K') return 1
          return parseInt(a) - parseInt(b)
        })
    
    setFormData({
      ...formData,
      student_grade_levels: updatedGrades
    })
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData({
      ...formData,
      [field]: value
    })
    setShowError(false)
  }

  const validateForm = () => {
    if (!formData.estimated_student_count) {
      setErrorMessage('Please select your estimated student count')
      return false
    }
    
    if (formData.student_grade_levels.length === 0) {
      setErrorMessage('Please select at least one grade level for students')
      return false
    }

    if (!formData.enrollment_capacity) {
      setErrorMessage('Please select your enrollment capacity')
      return false
    }

    return true
  }

  const handleContinue = () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    // Continue to agreements
    router.push(buildInvitationURL('/onboarding/agreements'))
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
            Student Planning
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Help us understand your student population to set up proper academic tracking.
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

            {/* Student Grade Levels */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">What grade levels will your students be in?</h3>
              <div className="flex flex-wrap gap-3">
                {allGradeLevels.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeLevelToggle(grade)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      formData.student_grade_levels.includes(grade)
                        ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Enrollment Capacity */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">What&apos;s your maximum enrollment capacity?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capacityRanges.map((capacity) => (
                  <button
                    key={capacity.id}
                    onClick={() => handleInputChange('enrollment_capacity', capacity.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.enrollment_capacity === capacity.id
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-semibold text-lg text-[#222222]">{capacity.name}</h4>
                    <p className="text-[#717171] text-sm mt-1">{capacity.description}</p>
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

            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📊 Why We Need This Information
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• <strong>Academic Records:</strong> We&apos;ll set up proper grade-level tracking and compliance</p>
                <p>• <strong>Resource Planning:</strong> Helps us recommend appropriate tools and curriculum</p>
                <p>• <strong>Compliance:</strong> Ensures proper student data management per EdFi standards</p>
                <p>• <strong>Growth Planning:</strong> Supports your expansion and enrollment goals</p>
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
        progressPercent={70}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/school-focus')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 