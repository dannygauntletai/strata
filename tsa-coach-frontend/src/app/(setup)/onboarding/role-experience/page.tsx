'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { buildInvitationURL } from '@/lib/invitation-api'
import Link from 'next/link'

export default function RoleExperience() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    role_type: '',
    years_experience: '',
    certification_level: '',
    specializations: [] as string[]
  })
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Load existing data on mount
  useEffect(() => {
    const savedData = {
      role_type: localStorage.getItem('onboarding_role_type') || '',
      years_experience: localStorage.getItem('onboarding_years_experience') || '',
      certification_level: localStorage.getItem('onboarding_certification_level') || '',
      specializations: JSON.parse(localStorage.getItem('onboarding_specializations') || '[]')
    }
    setFormData(savedData)
  }, [])

  const roleTypes = [
    { 
      id: 'school_owner', 
      name: 'School Owner/Founder', 
      description: 'I own or am founding this school',
      icon: '🏢'
    },
    { 
      id: 'coach', 
      name: 'Coach', 
      description: 'I coach sports programs',
      icon: '🏃‍♂️'
    },
    { 
      id: 'instructor', 
      name: 'Instructor/Teacher', 
      description: 'I teach academic subjects',
      icon: '👨‍🏫'
    },
    { 
      id: 'administrator', 
      name: 'Administrator', 
      description: 'I handle administrative duties',
      icon: '📋'
    },
    { 
      id: 'director', 
      name: 'Program Director', 
      description: 'I direct specific programs',
      icon: '🎯'
    },
    { 
      id: 'principal', 
      name: 'Principal', 
      description: 'I serve as principal',
      icon: '👔'
    },
    { 
      id: 'counselor', 
      name: 'Counselor', 
      description: 'I provide student counseling',
      icon: '🤝'
    }
  ]

  const certificationLevels = [
    { id: 'beginner', name: 'Beginner', description: 'New to coaching/teaching' },
    { id: 'intermediate', name: 'Intermediate', description: '2-5 years experience' },
    { id: 'advanced', name: 'Advanced', description: '5+ years experience' },
    { id: 'master', name: 'Master', description: 'Expert level with certifications' }
  ]

  const sportSpecializations = [
    'Basketball', 'Football', 'Soccer', 'Baseball', 'Track & Field', 
    'Tennis', 'Volleyball', 'Swimming', 'Wrestling', 'Cross Country',
    'Golf', 'Softball', 'Lacrosse', 'Hockey', 'Martial Arts'
  ]

  const academicSpecializations = [
    'STEM', 'Mathematics', 'Science', 'English/Language Arts', 'Social Studies',
    'Technology Education', 'Engineering', 'Computer Science', 'Career Planning',
    'Leadership Development', 'Business', 'Arts', 'Physical Education'
  ]

  const handleRoleTypeChange = (roleId: string) => {
    setFormData({
      ...formData,
      role_type: roleId
    })
    setShowError(false)
  }

  const handleSpecializationToggle = (specialization: string) => {
    const updated = formData.specializations.includes(specialization)
      ? formData.specializations.filter(s => s !== specialization)
      : [...formData.specializations, specialization]
    
    setFormData({
      ...formData,
      specializations: updated
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    })
    setShowError(false)
  }

  const validateForm = () => {
    if (!formData.role_type) {
      setErrorMessage('Please select your role type')
      return false
    }
    
    if (!formData.years_experience) {
      setErrorMessage('Please specify your years of experience')
      return false
    }

    if (!formData.certification_level) {
      setErrorMessage('Please select your certification level')
      return false
    }

    return true
  }

  const handleContinue = () => {
    if (!validateForm()) {
      setShowError(true)
      return
    }

    // Save to localStorage
    localStorage.setItem('onboarding_role_type', formData.role_type)
    localStorage.setItem('onboarding_years_experience', formData.years_experience)
    localStorage.setItem('onboarding_certification_level', formData.certification_level)
    localStorage.setItem('onboarding_specializations', JSON.stringify(formData.specializations))

    router.push(buildInvitationURL('/onboarding/school-setup'))
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
            Your Role & Experience
          </h1>
          
          <p className="text-xl text-center text-[#717171] mb-12">
            Help us understand your background so we can customize your experience.
          </p>

          <div className="space-y-8">
            {/* Role Type Selection */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">What&apos;s your primary role?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleTypes.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleTypeChange(role.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.role_type === role.id
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{role.icon}</div>
                    <h4 className="font-semibold text-lg text-[#222222]">{role.name}</h4>
                    <p className="text-[#717171] text-sm mt-1">{role.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Years of Experience */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Years of Experience</h3>
              <div className="max-w-md">
                <select
                  value={formData.years_experience}
                  onChange={(e) => handleInputChange('years_experience', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                >
                  <option value="">Select experience level</option>
                  <option value="0">New to teaching/coaching</option>
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
            </div>

            {/* Certification Level */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Certification Level</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificationLevels.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => handleInputChange('certification_level', cert.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.certification_level === cert.id
                        ? 'border-[#174fa2] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-semibold text-lg text-[#222222]">{cert.name}</h4>
                    <p className="text-[#717171] text-sm mt-1">{cert.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <h3 className="text-2xl font-semibold text-[#222222] mb-4">Areas of Expertise <span className="text-gray-500 text-lg">(Optional)</span></h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-[#222222] mb-3">Sports</h4>
                  <div className="flex flex-wrap gap-2">
                    {sportSpecializations.map((sport) => (
                      <button
                        key={sport}
                        onClick={() => handleSpecializationToggle(sport)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          formData.specializations.includes(sport)
                            ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-[#222222] mb-3">Academic Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {academicSpecializations.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => handleSpecializationToggle(subject)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          formData.specializations.includes(subject)
                            ? 'border-[#174fa2] bg-blue-50 text-[#174fa2]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
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
        progressPercent={30}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/school-name')}
        nextButtonText="Continue"
        buttonAction={handleContinue}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 