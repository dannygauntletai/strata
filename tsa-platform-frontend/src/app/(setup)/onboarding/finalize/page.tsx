'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { buildInvitationURL } from '@/lib/invitation-api'

interface OnboardingData {
  // School Information
  school_name: string
  sport: string
  football_type: string
  school_type: string
  grade_levels_served: string[]
  academic_year: string
  
  // School Address
  school_street: string
  school_city: string
  school_state: string
  school_zip: string
  school_phone: string
  
  // Location (Physical location status from school-setup)
  has_physical_location: boolean
  
  // Coach Profile
  role_type: string
  years_experience: number
  certification_level: string
  grade_levels_teaching: string[]
  specializations: string[]
  
  // Students
  estimated_student_count: number
  student_grade_levels: string[]
  enrollment_capacity: number
  has_current_students: boolean
  current_student_details: string
  
  // Personal Information
  email: string
  firstName: string
  lastName: string
  phone: string
  
  // Agreements & Background Check
  platform_agreement: boolean
  microschool_agreement: boolean
  background_check_status: string
}

export default function Finalize() {
  const router = useRouter()
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  // Load all onboarding data on mount
  useEffect(() => {
    const data: OnboardingData = {
      // School Information
      school_name: localStorage.getItem('onboarding_school_name') || '',
      sport: localStorage.getItem('onboarding_sport') || '',
      football_type: localStorage.getItem('onboarding_football_type') || '',
      school_type: localStorage.getItem('onboarding_school_type') || '',
      grade_levels_served: JSON.parse(localStorage.getItem('onboarding_grade_levels_served') || '[]'),
      academic_year: localStorage.getItem('onboarding_academic_year') || '',
      
      // School Address
      school_street: localStorage.getItem('onboarding_school_street') || '',
      school_city: localStorage.getItem('onboarding_school_city') || '',
      school_state: localStorage.getItem('onboarding_school_state') || '',
      school_zip: localStorage.getItem('onboarding_school_zip') || '',
      school_phone: localStorage.getItem('onboarding_school_phone') || '',
      
      // Location (Physical location status from school-setup)
        has_physical_location: localStorage.getItem('onboarding_has_physical_location') === 'true',
      
      // Coach Profile
      role_type: localStorage.getItem('onboarding_role_type') || '',
      years_experience: parseInt(localStorage.getItem('onboarding_years_experience') || '0'),
      certification_level: localStorage.getItem('onboarding_certification_level') || '',
        grade_levels_teaching: JSON.parse(localStorage.getItem('onboarding_grade_levels_teaching') || '[]'),
        specializations: JSON.parse(localStorage.getItem('onboarding_specializations') || '[]'),
        
      // Students
      estimated_student_count: parseInt(localStorage.getItem('onboarding_estimated_student_count') || '0'),
        student_grade_levels: JSON.parse(localStorage.getItem('onboarding_student_grade_levels') || '[]'),
      enrollment_capacity: parseInt(localStorage.getItem('onboarding_enrollment_capacity') || '0'),
        has_current_students: localStorage.getItem('onboarding_has_current_students') === 'true',
      current_student_details: localStorage.getItem('onboarding_current_student_details') || '',
      
      // Personal Information (from background check)
      email: JSON.parse(localStorage.getItem('onboarding_candidate_info') || '{}').email || localStorage.getItem('onboarding_email') || '',
      firstName: JSON.parse(localStorage.getItem('onboarding_candidate_info') || '{}').firstName || '',
      lastName: JSON.parse(localStorage.getItem('onboarding_candidate_info') || '{}').lastName || '',
      phone: JSON.parse(localStorage.getItem('onboarding_candidate_info') || '{}').phone || '',
      
      // Agreements & Background Check
        platform_agreement: localStorage.getItem('onboarding_platform_agreement') === 'true',
        microschool_agreement: localStorage.getItem('onboarding_microschool_agreement') === 'true',
      // Simple mock logic: if mock mode, set to completed, otherwise read from storage
      background_check_status: process.env.NODE_ENV === 'development' || localStorage.getItem('MOCK_MODE') === 'true' 
        ? 'completed' 
        : localStorage.getItem('onboarding_background_check_status') || 'pending',
    }
    
    setOnboardingData(data)
  }, [])

  const handleConfirm = () => {
    setIsConfirmed(true)
    router.push('/onboarding/complete')
  }

  const formatGradeLevels = (grades: string[]) => {
    if (!grades || grades.length === 0) return 'None selected'
    return grades.map(grade => grade === 'K' ? 'Kindergarten' : `Grade ${grade}`).join(', ')
  }

  const formatSchoolType = (type: string) => {
    const types: { [key: string]: string } = {
      'elementary': 'Elementary School',
      'middle': 'Middle School', 
      'high': 'High School'
    }
    return types[type] || type
  }

  const formatRoleType = (role: string) => {
    const roles: { [key: string]: string } = {
      'coach': 'Coach',
      'teacher_coach': 'Teacher & Coach',
      'administrator': 'Administrator',
      'parent_coach': 'Parent Coach'
    }
    return roles[role] || role
  }

  const getProgressPercentage = () => {
    // Implement the logic to calculate the progress percentage based on the onboarding data
    // This is a placeholder and should be replaced with the actual implementation
    return 95; // Placeholder value, actual implementation needed
  }

  if (!onboardingData) {
    return (
      <div className="min-h-screen bg-white font-poppins flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your information...</p>
        </div>
      </div>
    )
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
        <Link href={buildInvitationURL('/onboarding/school-name')}>
          <button className="text-sm font-medium rounded-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
            Exit
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#222222]">
              Confirm Your Information
          </h1>
            <p className="text-xl text-[#717171] max-w-2xl mx-auto">
              Please review all the information below to ensure everything is correct before finalizing your onboarding.
          </p>
          </div>

          <div className="space-y-8">
            {/* Personal Information */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                👤 Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2">{onboardingData.firstName} {onboardingData.lastName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2">{onboardingData.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2">{onboardingData.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Background Check:</span>
                  <span className={`ml-2 capitalize ${onboardingData.background_check_status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {onboardingData.background_check_status}
                  </span>
                </div>
              </div>
            </div>

            {/* School Information */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                🏫 School Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">School Name:</span>
                  <span className="ml-2">{onboardingData.school_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">School Type:</span>
                  <span className="ml-2">{formatSchoolType(onboardingData.school_type)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Sport:</span>
                  <span className="ml-2">{onboardingData.sport}</span>
                </div>
                {onboardingData.football_type && (
                  <div>
                    <span className="font-medium text-gray-700">Football Type:</span>
                    <span className="ml-2">{onboardingData.football_type}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Academic Year:</span>
                  <span className="ml-2">{onboardingData.academic_year}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Grade Levels Served:</span>
                  <span className="ml-2">{formatGradeLevels(onboardingData.grade_levels_served)}</span>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                📍 School Address & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Physical Location:</span>
                  <span className="ml-2">
                    {onboardingData.has_physical_location ? 'Yes, has a physical location' : 'No, operates without a fixed location'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Street Address:</span>
                  <span className="ml-2">{onboardingData.school_street || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">City:</span>
                  <span className="ml-2">{onboardingData.school_city || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">State:</span>
                  <span className="ml-2">{onboardingData.school_state || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ZIP Code:</span>
                  <span className="ml-2">{onboardingData.school_zip || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">School Phone:</span>
                  <span className="ml-2">{onboardingData.school_phone || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Coach Profile */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                🎯 Coach Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <span className="ml-2">{formatRoleType(onboardingData.role_type)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Years Experience:</span>
                  <span className="ml-2">{onboardingData.years_experience} years</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Certification Level:</span>
                  <span className="ml-2">{onboardingData.certification_level}</span>
                </div>
                {onboardingData.grade_levels_teaching.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Teaching Grade Levels:</span>
                    <span className="ml-2">{formatGradeLevels(onboardingData.grade_levels_teaching)}</span>
                  </div>
                )}
                {onboardingData.specializations.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Specializations:</span>
                    <span className="ml-2">{onboardingData.specializations.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Information */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                👨‍🎓 Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Has Current Students:</span>
                  <span className="ml-2">{onboardingData.has_current_students ? 'Yes, currently have students' : 'No, starting fresh'}</span>
                </div>
                {onboardingData.has_current_students && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Estimated Count:</span>
                      <span className="ml-2">{onboardingData.estimated_student_count}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Enrollment Capacity:</span>
                      <span className="ml-2">{onboardingData.enrollment_capacity}</span>
                    </div>
                    {onboardingData.student_grade_levels.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Student Grade Levels:</span>
                        <span className="ml-2">{formatGradeLevels(onboardingData.student_grade_levels)}</span>
                      </div>
                    )}
                    {onboardingData.current_student_details && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Student Details:</span>
                        <p className="ml-2 text-gray-600 whitespace-pre-wrap">{onboardingData.current_student_details}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Agreements */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h3 className="text-xl font-semibold text-[#222222] mb-4">
                ✅ Agreements & Compliance
              </h3>
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Platform Agreement:</span>
                  <span className={`ml-2 ${onboardingData.platform_agreement ? 'text-green-600' : 'text-red-600'}`}>
                    {onboardingData.platform_agreement ? 'Accepted' : 'Not Accepted'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Microschool Agreement:</span>
                  <span className={`ml-2 ${onboardingData.microschool_agreement ? 'text-green-600' : 'text-red-600'}`}>
                    {onboardingData.microschool_agreement ? 'Accepted' : 'Not Accepted'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">ℹ️</span>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  Ready to Submit?
                </h4>
                <p className="text-blue-800 text-sm">
                  Please review all information above carefully. Once you confirm, your onboarding will be submitted 
                  and you&apos;ll receive access to the Texas Sports Academy platform. You can always update your 
                  information later in your profile settings.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={getProgressPercentage()}
        showBackButton={true}
        backButtonHref={buildInvitationURL('/onboarding/background-check')}
        nextButtonText="Complete Onboarding"
        nextButtonHref={buildInvitationURL('/onboarding/complete')}
        buttonAction={handleConfirm}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 