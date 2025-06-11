'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/components/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import { ErrorMessage } from '@/components/error-message'

export default function InterestedStudents() {
  const router = useRouter()
  const [selection, setSelection] = useState<string>('')
  const [showError, setShowError] = useState(false)

  // Load saved state on mount
  useEffect(() => {
    const savedRawValue = localStorage.getItem('onboarding_has_current_students')
    if (savedRawValue === 'true') {
      setSelection('yes')
    } else if (savedRawValue === 'false') {
      setSelection('no')
    }
  }, [])

  // Update localStorage whenever selection changes
  useEffect(() => {
    if (selection) {
      localStorage.setItem('onboarding_has_current_students', selection === 'yes' ? 'true' : 'false')
    }
  }, [selection])

  const handleComplete = async () => {
    if (selection) {
      localStorage.setItem('onboarding_has_current_students', selection === 'yes' ? 'true' : 'false')
      
      // Navigate to student-planning page
      router.push('/onboarding/student-planning')
    } else {
      setShowError(true)
    }
  }

  const options = [
    {
      id: 'yes',
      icon: '👥',
      label: 'Yes, I have students',
      bgColor: 'bg-green-100',
      selectedBg: 'bg-green-50',
      selectedBorder: 'border-green-500'
    },
    {
      id: 'no',
      icon: '🔍',
      label: 'No, I need help finding students',
      bgColor: 'bg-yellow-100',
      selectedBg: 'bg-yellow-50',
      selectedBorder: 'border-yellow-500'
    }
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
        <Link href="/onboarding">
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
          className="w-full max-w-4xl text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 text-[#222222]">
            Do you have interested students?
          </h1>
          
          {/* Options */}
          <div className="flex flex-col md:flex-row justify-center gap-6">
            {options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelection(option.id)
                  setShowError(false)
                }}
                className={`w-full md:w-64 h-40 rounded-2xl border-2 transition-all flex flex-col items-center justify-center px-6 ${
                  selection === option.id
                    ? `${option.selectedBorder} ${option.selectedBg}`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-5xl mb-3 p-3 rounded-full ${option.bgColor}`}>
                  {option.icon}
                </div>
                <span className="text-lg font-semibold text-[#222222]">{option.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Error message */}
          <ErrorMessage 
            message="Please select an option" 
            show={showError} 
          />
        </motion.div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={60}
        nextButtonText="Complete"
        buttonAction={handleComplete}
        showBackButton={true}
        backButtonHref="/onboarding/timeback"
        nextButtonClassName="bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] hover:from-[#2563EB] hover:to-[#0EA5E9] text-white disabled:opacity-50"
      />
    </div>
  )
} 