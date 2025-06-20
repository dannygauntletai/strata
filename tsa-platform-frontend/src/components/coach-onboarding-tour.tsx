'use client'

import React, { useState, useEffect } from 'react'
import Joyride, { ACTIONS, EVENTS, STATUS, Step, CallBackProps } from 'react-joyride'
import { getCurrentUser, getAuthHeader } from '@/lib/auth'
import { config } from '@/config/environments'

interface CoachOnboardingTourProps {
  run: boolean
  onComplete: () => void
  forceRestart?: boolean
}

export function CoachOnboardingTour({ run, onComplete, forceRestart = false }: CoachOnboardingTourProps) {
  const [tourIndex, setTourIndex] = useState(0)
  const [tourRun, setTourRun] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [hasCompletedTour, setHasCompletedTour] = useState(false)

  // Ensure we only render on client side to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check if user has completed the tour before (enhanced with server check)
  useEffect(() => {
    if (!isMounted) return

    const loadTourStatus = async () => {
    try {
      const user = getCurrentUser()
      if (user?.email) {
        const tourCompletionKey = `onboarding_tour_completed_${user.email}`
          
          // First check localStorage for immediate response
          const localCompleted = localStorage.getItem(tourCompletionKey) === 'true'
          setHasCompletedTour(localCompleted)
          
          // Then check server for authoritative status (async)
          try {
            const serverCompleted = await loadTourStatusFromServer(user.email)
            if (serverCompleted !== null && serverCompleted !== localCompleted) {
              // Sync localStorage with server
              console.log(`🔄 Syncing tour status: server=${serverCompleted}, local=${localCompleted}`)
              setHasCompletedTour(serverCompleted)
              if (serverCompleted) {
                localStorage.setItem(tourCompletionKey, 'true')
                localStorage.setItem(`onboarding_tour_completed_at_${user.email}`, new Date().toISOString())
              } else {
                localStorage.removeItem(tourCompletionKey)
                localStorage.removeItem(`onboarding_tour_completed_at_${user.email}`)
              }
            }
          } catch (serverError) {
            // Server check failed, keep using localStorage
            console.warn('Server tour status check failed, using localStorage:', serverError)
          }
      }
    } catch (err) {
      console.error('Error checking tour completion status:', err)
    }
    }

    loadTourStatus()
  }, [isMounted])

  // Load tour completion status from server (new function)
  const loadTourStatusFromServer = async (email: string): Promise<boolean | null> => {
    try {
      const coachApiUrl = config?.apiEndpoints?.coach
      if (!coachApiUrl) return null

      const authHeaders = getAuthHeader()
      const response = await fetch(`${coachApiUrl}/profile`, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.profile?.dashboard_tour_completed || false
      }
      return null
    } catch (error) {
      console.error('Error loading tour status from server:', error)
      return null
    }
  }

  // Save tour completion status to server (new function)
  const saveTourStatusToServer = async (email: string, completed: boolean): Promise<boolean> => {
    try {
      const coachApiUrl = config?.apiEndpoints?.coach
      if (!coachApiUrl) return false

      const authHeaders = getAuthHeader()
      const response = await fetch(`${coachApiUrl}/profile/preferences`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dashboard_tour_completed: completed,
          dashboard_tour_completed_at: completed ? new Date().toISOString() : null
        })
      })

      if (response.ok) {
        console.log(`✅ Tour completion status saved to server: ${completed}`)
        return true
      }
      return false
    } catch (error) {
      console.error('Error saving tour status to server:', error)
      return false
    }
  }

  // Tour steps with proper selectors and content
  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to Texas Sports Academy!</h2>
          <p>Let's take a quick tour of your coaching dashboard and discover the key features to help you succeed.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="home-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Dashboard Home</h3>
          <p>Your main dashboard with overview of all activities, shortcuts, and timeline progress.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="bootcamp-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Bootcamp Programs</h3>
          <p>Manage your training programs, curriculum, and educational content for students.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="marketing-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Marketing Tools</h3>
          <p>Create promotional materials, manage your school's online presence, and attract new families.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="events-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Events Management</h3>
          <p>Plan and organize school events, workshops, and community activities.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="students-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Student Management</h3>
          <p>Track student progress, manage enrollment, and communicate with families.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="registrations-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Registrations</h3>
          <p>Handle new student registrations, applications, and enrollment processes.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="legal-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Legal Compliance</h3>
          <p>Handle all legal requirements including LLC formation, insurance, and regulatory compliance.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="real-estate-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Real Estate</h3>
          <p>Find and manage your school facility, leases, and property requirements.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="applications-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Applications Management</h3>
          <p>Review and process student applications, track enrollment status, and manage the admissions pipeline.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="media-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Media Management</h3>
          <p>Upload, organize, and share photos and videos from school events, activities, and student achievements.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="quick-shortcuts"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Shortcuts</h3>
          <p>Customize your dashboard with shortcuts to your most-used features. Click the settings icon to personalize them.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="timeline-steps"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">School Opening Timeline</h3>
          <p>Follow this step-by-step guide to open your school. Track progress and get guidance on what to do next.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '[data-tour="recent-activity"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
          <p>Stay updated with recent parent invitations, applications, and bookings in one convenient place.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="profile-dropdown"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Profile & Settings</h3>
          <p>Access your account settings, update your profile, and find help resources from this dropdown menu.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">You're All Set! 🚀</h2>
          <p>You've completed the tour! Start by reviewing your timeline steps and exploring each section of your coaching dashboard.</p>
          <p className="mt-2 text-sm text-gray-600">You can restart this tour anytime from your profile settings if you need a refresher.</p>
        </div>
      ),
      placement: 'center',
    },
  ]

  // Only run tour for new users or when force restart is enabled
  useEffect(() => {
    if (run && isMounted && (!hasCompletedTour || forceRestart)) {
      setTourRun(true)
      setTourIndex(0) // Reset to beginning if restarting
    }
  }, [run, isMounted, hasCompletedTour, forceRestart])

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { action, index, status, type } = data

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Update state to advance the tour
      setTourIndex(index + (action === ACTIONS.PREV ? -1 : 1))
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Tour completed - save to both localStorage and server
      try {
        const user = getCurrentUser()
        if (user?.email) {
          const tourCompletionKey = `onboarding_tour_completed_${user.email}`
          const completedAtKey = `onboarding_tour_completed_at_${user.email}`
          const completedAt = new Date().toISOString()
          
          // 1. Save to localStorage immediately for instant feedback
          localStorage.setItem(tourCompletionKey, 'true')
          localStorage.setItem(completedAtKey, completedAt)
          setHasCompletedTour(true)
          
          // 2. Save to server asynchronously (don't block completion)
          saveTourStatusToServer(user.email, true).catch(error => {
            console.error('Failed to save tour completion to server:', error)
            // Note: We don't revert localStorage here because the user did complete the tour
            // The server save will be retried on next load
          })
          
          console.log('✅ Tour completed and saved locally and to server')
        }
      } catch (err) {
        console.error('Error saving tour completion:', err)
      }

      setTourRun(false)
      onComplete()
    }
  }

  // Don't render anything on server side to prevent hydration mismatch
  if (!isMounted) {
    return null
  }

  // Don't run tour if user has already completed it (unless forced)
  if (hasCompletedTour && !forceRestart) {
    return null
  }

  // Joyride styling
  const joyrideStyles = {
    options: {
      primaryColor: '#004aad', // TSA Blue
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Original dark overlay
    },
    spotlight: {
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '8px',
      boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.5)', // Dark overlay around spotlight
      padding: '2px', // Reduced from default to minimize overflow
    },
    tooltip: {
      borderRadius: '8px',
      fontSize: '16px',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    buttonNext: {
      backgroundColor: '#004aad',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    buttonBack: {
      color: '#6b7280',
      border: 'none',
      backgroundColor: 'transparent',
      padding: '8px 16px',
      fontSize: '14px',
    },
    buttonSkip: {
      color: '#6b7280',
      border: 'none',
      backgroundColor: 'transparent',
      padding: '8px 16px',
      fontSize: '14px',
    },
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={tourRun}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={tourIndex}
      steps={steps}
      styles={joyrideStyles}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      disableOverlayClose
      spotlightPadding={8}
      spotlightClicks={false}
    />
  )
}

 