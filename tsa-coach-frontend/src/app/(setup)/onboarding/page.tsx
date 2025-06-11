'use client'

import React, { useEffect, useState } from 'react'
import { Link } from '@/components/link'
import { motion } from 'framer-motion'
import { ProgressFooter } from '@/components/progress-footer'
import Image from 'next/image'
import { 
  invitationAPI, 
  getInvitationTokenFromURL, 
  isInvitationOnboarding,
  storeInvitationData,
  buildInvitationURL,
  InvitationData 
} from '@/lib/invitation-api'

const steps = [
  {
    number: 1,
    title: 'Tell us about yourself',
    description: 'Share basic personal information and professional background.',
    imageUrl: '/onboarding/coach.png',
    altText: 'Illustration of a coach with a clipboard'
  },
  {
    number: 2,
    title: 'School information',
    description: 'Set up your school details, location, and grade levels.',
    imageUrl: '/onboarding/school.png',
    altText: 'Illustration of a school building'
  },
  {
    number: 3,
    title: 'Programs & focus',
    description: 'Define your sports programs and educational approach.',
    imageUrl: '/onboarding/family.png',
    altText: 'Illustration of a diverse group of students and families'
  }
]

export default function CoachOnboarding() {
  const [isInvitation, setIsInvitation] = useState(false)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(true)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    // Check if this is an invitation-based onboarding
    const inviteToken = getInvitationTokenFromURL()
    
    if (inviteToken) {
      setIsInvitation(true)
      setInvitationLoading(true)
      
      // Validate the invitation token
      invitationAPI.validateInvitation(inviteToken)
        .then(response => {
          if (response.valid && response.invitation) {
            setInvitationData(response.invitation)
            storeInvitationData(response.invitation)
            setInvitationError(null)
            setAccessDenied(false)
          } else {
            setInvitationError(response.error || 'Invalid invitation')
            setAccessDenied(true)
          }
        })
        .catch(error => {
          setInvitationError('Failed to validate invitation')
          setAccessDenied(true)
          console.error('Invitation validation error:', error)
        })
        .finally(() => {
          setInvitationLoading(false)
        })
    } else {
      // No invitation token - deny access
      setIsInvitation(false)
      setAccessDenied(true)
      setInvitationLoading(false)
    }
  }, [])

  // Show loading state for invitation validation
  if (invitationLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-poppins">
        <header className="px-10 py-5 flex justify-between items-center flex-shrink-0">
          <Link href="/" aria-label="Homepage">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-12 w-auto"
            />
          </Link>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174fa2] mx-auto mb-4"></div>
            <h1 className="text-2xl font-semibold text-[#222222] mb-2">
              {isInvitation ? 'Validating your invitation...' : 'Checking access...'}
            </h1>
            <p className="text-[#717171]">
              Please wait while we verify your access.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Show access denied or error state
  if (accessDenied || invitationError) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-poppins">
        <header className="px-10 py-5 flex justify-between items-center flex-shrink-0">
          <Link href="/" aria-label="Homepage">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-12 w-auto"
            />
          </Link>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-7V6a2 2 0 00-2-2H7a2 2 0 00-2 2v2" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#222222] mb-2">
              {invitationError ? 'Invalid Invitation' : 'Access Restricted'}
            </h1>
            <p className="text-[#717171] mb-6">
              {invitationError || 'Onboarding is only available through invitation. Please contact an administrator to receive an invitation link.'}
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <button className="w-full bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Coach Login
                </button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
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
        <Link href="/">
          <button className="text-sm font-medium rounded-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
            Exit
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-grow flex flex-col md:flex-row">
        {/* Left column - Title */} 
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="md:w-1/2 flex flex-col justify-center p-10 md:px-16 md:pt-8 md:pb-20 lg:px-24 lg:pt-12 lg:pb-28"
        >
          <h1 className="text-5xl md:text-6xl leading-[0.9] font-integral tracking-tight text-[#222222]">
            It&apos;s easy to start a school with{' '}
            <span className="text-[#174fa2]">
              Texas Sports Academy
            </span>
          </h1>
        </motion.div>
        
        {/* Right column - Steps list */} 
        <div className="md:w-1/2 flex flex-col justify-center p-10 md:py-0 md:pt-8 md:pb-20 md:pl-10 md:pr-16 lg:pt-12 lg:pb-28 lg:pr-24">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div 
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="flex items-start">
                  {/* Step number */}
                  <div className="w-8 flex-shrink-0 text-2xl font-bold text-[#222222]">
                    {step.number}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow mr-6">
                    <h2 className="text-2xl font-semibold text-[#222222] mb-1">
                      {step.title}
                    </h2>
                    <p className="text-xl text-[#717171]">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Image */}
                  <div className="flex-shrink-0 w-30 h-30 flex items-center justify-center">
                    <Image 
                      src={step.imageUrl} 
                      alt={step.altText} 
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="pt-8 pb-0 border-b border-gray-200" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Progress Footer */}
      <ProgressFooter
        progressPercent={0}
        nextButtonText="Get started"
        nextButtonHref={buildInvitationURL('/onboarding/school-name')}
        nextButtonClassName="bg-gradient-to-r from-[#004aad] to-[#0066ff] hover:from-[#003a8c] hover:to-[#0052cc] text-white"
      />
    </div>
  )
} 