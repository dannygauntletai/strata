'use client'

import { Stat } from '@/app/stat'
import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/20/solid'
import { 
  CheckCircleIcon, 
  DocumentIcon,
  CheckIcon,
  AcademicCapIcon,
  HomeIcon,
  Square2StackIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  MegaphoneIcon,
  BuildingOffice2Icon,
  ScaleIcon,
  ShoppingBagIcon,
  CameraIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'
import { getCurrentUser, type AuthUser } from '@/lib/auth'
import { CoachOnboardingTour } from '@/components/coach-onboarding-tour'
import { BootcampStep, ReviewMaterialsStep, FindRealEstateStep, HostEventsStep, SimpleStep } from '@/components/dashboard-steps'
import { getCoachApiUrl } from '@/lib/ssm-config'

interface ParentInvitation {
  invitation_id: string
  parent_email: string
  student_first_name: string
  student_last_name: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  accepted_at?: string
}

interface SchedulingBooking {
  id: string
  eventTypeId: string
  coachId: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  parentName: string
  parentEmail: string
  studentName: string
  eventType: 'call' | 'tour' | 'shadow-day'
  createdAt: string
  updatedAt: string
}

interface Application {
  id: string
  coachId: string
  studentFirstName: string
  studentLastName: string
  parentName: string
  parentEmail: string
  type: 'application' | 'interest-form'
  status: 'pending' | 'under-review' | 'accepted' | 'rejected' | 'waitlisted'
  submittedAt: string
  lastUpdated: string
  schoolYear?: string
  grade?: string
  notes?: string
}

// School opening steps with auto-detection mapping
const openingSteps = [
  { id: 1, name: 'Bootcamp', description: 'Complete TSA coaching certification program', status: 'current', autoDetected: true, autoDetectionKey: 'bootcamp' },
  { id: 2, name: 'Review Materials', description: 'Review promotional content for your school', status: 'upcoming', autoDetected: false },
  { id: 3, name: 'Find Real Estate', description: 'Secure facility location and lease', status: 'upcoming', autoDetected: false },
  { id: 4, name: 'Host Events', description: 'Plan and execute community events', status: 'upcoming', autoDetected: true, autoDetectionKey: 'host_events' },
  { id: 5, name: 'Invite Parents', description: 'Reach out to prospective families', status: 'upcoming', autoDetected: true, autoDetectionKey: 'invite_parents' },
  { id: 6, name: 'Incorporate LLC', description: 'Register your school as a legal entity', status: 'upcoming', autoDetected: false },
  { id: 7, name: 'Facility Setup', description: 'Set up your training facility and equipment', status: 'upcoming', autoDetected: false },
  { id: 8, name: 'Student Enrollment', description: 'Begin enrolling students for your programs', status: 'upcoming', autoDetected: true, autoDetectionKey: 'student_enrollment' },
  { id: 9, name: 'Grand Opening', description: 'Launch your Texas Sports Academy school', status: 'upcoming', autoDetected: false }
]

export default function CoachDashboard() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')
  
  // Tour state
  const [showTour, setShowTour] = useState(false)
  const [forceRestart, setForceRestart] = useState(false)
  const [greeting, setGreeting] = useState('Good afternoon, Coach')
  const [parentInvitations, setParentInvitations] = useState<ParentInvitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)
  const [schedulingBookings, setSchedulingBookings] = useState<SchedulingBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [autoDetectedStatuses, setAutoDetectedStatuses] = useState<{[key: string]: any}>({})
  const mainContentRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState({
    totalInvites: 0,
    pendingInvites: 0,
    acceptedInvites: 0,
    weekChange: '+0'
  })

  // Load API endpoint from SSM
  useEffect(() => {
    try {
      const url = getCoachApiUrl();
      setApiBaseUrl(url);
    } catch (error) {
      console.error('Failed to load API endpoint:', error);
    }
  }, [])

  // Fetch parent invitations for recent activity and stats
  useEffect(() => {
    if (!apiBaseUrl) return

    // Log access token for testing
    const user = getCurrentUser()
    if (user?.token) {
      console.log('🔑 ACCESS TOKEN for API Testing:')
      console.log('Token:', user.token)
      console.log('User Email:', user.email)
      console.log('Copy this token to test the /invitations API endpoint')
      console.log('---')
    }

    fetchParentInvitations()
    fetchSchedulingBookings()
    fetchApplications()
    fetchTimelineStatus()
    fetchRecentEvents()
  }, [apiBaseUrl])

  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  const fetchRecentEvents = async () => {
    try {
      setEventsLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available for events')
        return
      }

      const response = await fetch(`${apiBaseUrl}/events?created_by=${encodeURIComponent(user.email)}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        // Sort by start_date and take most recent
        const sortedEvents = (data.events || []).sort((a: any, b: any) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )
        setRecentEvents(sortedEvents.slice(0, 3)) // Show top 3 recent events
        console.log('Recent events fetched:', sortedEvents.slice(0, 3))
      } else {
        console.error('Failed to fetch recent events:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching recent events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchTimelineStatus = async () => {
    try {
      // Get current user for coach_id
      const user = getCurrentUser()
      if (!user || !user.email) {
        console.error('No user email available for timeline status')
        return
      }

      const response = await fetch(`${apiBaseUrl}/events?action=timeline_status&coach_id=${user.email}`)
      if (response.ok) {
        const data = await response.json()
        setAutoDetectedStatuses(data.timeline_status || {})
        console.log('Timeline status fetched:', data)
      } else {
        console.error('Failed to fetch timeline status:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching timeline status:', error)
    }
  }

  const fetchParentInvitations = async () => {
    try {
      setInvitationsLoading(true)
      const response = await fetch(`${apiBaseUrl}/parent-invitations`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch parent invitations')
        return
      }

      const data = await response.json()
      const invitations = data.invitations || []
      setParentInvitations(invitations)
      
      // Calculate stats
      const total = invitations.length
      const pending = invitations.filter((inv: ParentInvitation) => inv.status === 'pending').length
      const accepted = invitations.filter((inv: ParentInvitation) => inv.status === 'accepted').length
      
      // Calculate week-over-week change (simplified for demo)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const recentInvites = invitations.filter((inv: ParentInvitation) => 
        new Date(inv.created_at) > weekAgo
      ).length
      
      setStats({
        totalInvites: total,
        pendingInvites: pending,
        acceptedInvites: accepted,
        weekChange: recentInvites > 0 ? `+${recentInvites}` : '0'
      })
      
    } catch (err) {
      console.error('Error fetching parent invitations:', err)
    } finally {
      setInvitationsLoading(false)
    }
  }

  const fetchSchedulingBookings = async () => {
    try {
      setBookingsLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available for scheduling bookings')
        return
      }

      // TODO: Replace with real API endpoint when scheduling backend is implemented
      // Real implementation would be:
      // const response = await fetch(`${apiBaseUrl}/scheduling/bookings?coach_id=${user.email}`, {
      //   headers: { 'Content-Type': 'application/json' }
      // })
      // const data = await response.json()
      // setSchedulingBookings(data.bookings || [])
      
      // Return empty array until real API is implemented
      const bookings: SchedulingBooking[] = []
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setSchedulingBookings(bookings)
      
    } catch (err) {
      console.error('Error fetching scheduling bookings:', err)
    } finally {
      setBookingsLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available for applications')
        return
      }

      // TODO: Replace with real API endpoint when applications backend is implemented
      // Real implementation would be:
      // const response = await fetch(`${apiBaseUrl}/applications?coach_id=${user.email}&limit=5`, {
      //   headers: { 'Content-Type': 'application/json' }
      // })
      // const data = await response.json()
      // setApplications(data.applications || [])
      
      // Return empty array until real API is implemented
      const applications: Application[] = []
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setApplications(applications)
      
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setApplicationsLoading(false)
    }
  }

  // Start tour on each page load
  useEffect(() => {
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      setShowTour(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Listen for tour restart events from settings page
  useEffect(() => {
    const handleRestartTour = (event: CustomEvent) => {
      if (event.detail?.forceRestart) {
        setForceRestart(true)
        setShowTour(true)
        // Reset force restart after a brief delay
        setTimeout(() => setForceRestart(false), 100)
      }
    }

    window.addEventListener('restartTour', handleRestartTour as EventListener)
    
    return () => {
      window.removeEventListener('restartTour', handleRestartTour as EventListener)
    }
  }, [])

  // Load user information and generate greeting
  useEffect(() => {
    try {
      const user = getCurrentUser()
      setCurrentUser(user)
      
      if (user) {
        let firstName = 'Coach'
        if (user.name) {
          firstName = user.name.split(' ')[0]
        } else if (user.email) {
          const emailName = user.email.split('@')[0]
          firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
        }
        
        // Generate time-based greeting
        const hour = new Date().getHours()
        let timeGreeting = 'Good morning'
        if (hour >= 12 && hour < 17) {
          timeGreeting = 'Good afternoon'
        } else if (hour >= 17) {
          timeGreeting = 'Good evening'
        }
        
        setGreeting(`${timeGreeting}, Coach ${firstName}`)
      }
    } catch (error) {
      console.error('Error loading auth context:', error)
      setGreeting('Good afternoon, Coach')
    }
  }, [])

  // Handle tour completion
  const handleTourComplete = () => {
    setShowTour(false)
  }

  // Function to format date - only show year if different from current year
  const formatDate = (dateString: string) => {
    const currentYear = new Date().getFullYear();
    const date = new Date(dateString);
    const dateYear = date.getFullYear();
    
    // If the year matches current year, only show month and day
    if (dateYear === currentYear) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    }
    
    // Otherwise show the full date including year
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge color="green">Accepted</Badge>
      case 'pending':
        return <Badge color="amber">Pending</Badge>
      case 'expired':
        return <Badge color="red">Expired</Badge>
      default:
        return <Badge color="zinc">Unknown</Badge>
    }
  }

  // Get recent invitations (last 5)
  const recentInvitations = parentInvitations
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Helper functions for scheduling bookings
  const getBookingIcon = (eventType: string) => {
    switch (eventType) {
      case 'call': return UserGroupIcon
      case 'tour': return BuildingOffice2Icon
      case 'shadow-day': return AcademicCapIcon
      default: return DocumentIcon
    }
  }

  const getBookingColor = (eventType: string) => {
    switch (eventType) {
      case 'call': return 'blue'
      case 'tour': return 'green'
      case 'shadow-day': return 'purple'
      default: return 'gray'
    }
  }

  const getBookingDescription = (booking: SchedulingBooking) => {
    const eventTypeNames = {
      'call': 'Consultation Call Booked',
      'tour': 'Campus Tour Booked', 
      'shadow-day': 'Shadow Day Booked'
    }
    return eventTypeNames[booking.eventType] || 'Booking'
  }

  const getBookingUrl = (eventType: string) => {
    switch (eventType) {
      case 'call': return '/coach/registrations/book-call'
      case 'tour': return '/coach/registrations/book-tour'
      case 'shadow-day': return '/coach/registrations/shadow-day'
      default: return '/coach/registrations'
    }
  }

  // Get recent bookings (last 3 for applications section)
  const recentBookings = schedulingBookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  // Helper functions for applications
  const getApplicationIcon = (type: string) => {
    switch (type) {
      case 'application': return AcademicCapIcon
      case 'interest-form': return DocumentIcon
      default: return DocumentIcon
    }
  }

  const getApplicationColor = (type: string) => {
    switch (type) {
      case 'application': return 'green'
      case 'interest-form': return 'blue'
      default: return 'gray'
    }
  }

  const getApplicationDescription = (application: Application) => {
    const typeNames = {
      'application': 'Application',
      'interest-form': 'Interest Form'
    }
    return typeNames[application.type] || 'Application'
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'amber'
      case 'under-review': return 'blue'
      case 'accepted': return 'green'
      case 'rejected': return 'red'
      case 'waitlisted': return 'orange'
      default: return 'zinc'
    }
  }

  // Get recent applications (last 2 for applications section)
  const recentApplications = applications
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 2)

  // Get effective status for a step (auto-detected status takes precedence, then default)
  const getStepStatus = (step: typeof openingSteps[0]) => {
    // Check if this step has auto-detection enabled
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]) {
      const autoStatus = autoDetectedStatuses[step.autoDetectionKey].status
      // Auto-detected status takes precedence
      if (autoStatus === 'completed') {
        return autoStatus
      }
    }
    
    // Fall back to default status
    return step.status
  }

  return (
    <>
      {/* Onboarding Tour */}
      <CoachOnboardingTour run={showTour} onComplete={handleTourComplete} forceRestart={forceRestart} />
      
      {/* Dynamic Greeting that spans full width */}
      <div className="mb-8">
          <Heading className="text-2xl sm:text-3xl">{greeting}</Heading>
        <p className="mt-2 text-zinc-500">
          Welcome to your dashboard. Here you can find all the information you need to manage your school.
        </p>
      </div>
      
      {/* Horizontal Timeline */}
      <div className="mb-8" data-tour="timeline-steps">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                          </div>
                <Subheading className="text-lg font-semibold text-gray-900">School Starter Checklist</Subheading>
                        </div>
              <a 
                href="/coach/timeline" 
                className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors"
              >
                View Details
              </a>
              </div>
          </div>

          <div className="px-6 py-6">
            {/* Horizontal Timeline */}
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" aria-hidden="true">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(openingSteps.filter(step => getStepStatus(step) === 'completed').length / openingSteps.length) * 100}%` 
                  }}
                />
              </div>
              
              {/* Timeline Steps */}
              <div className="relative flex justify-between">
                {openingSteps.map((step, stepIdx) => {
                  const status = getStepStatus(step)
                  const stepIsAutoDetected = Boolean(step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]?.status === 'completed')
                      
                      return (
                    <div key={step.id} className="flex flex-col items-center group">
                      {/* Step Circle */}
                      <div className="relative z-10 mb-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                            status === 'completed' 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : status === 'current' 
                                ? 'bg-[#004aad] border-[#004aad] text-white' 
                                : 'bg-white border-gray-300 text-gray-500'
                        }`}
                      >
                          {status === 'completed' ? (
                            <CheckIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <span className="text-sm font-semibold">{step.id}</span>
                          )}
                              </div>
                        
                        {/* Auto-detected indicator */}
                        {stepIsAutoDetected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="h-2.5 w-2.5 text-white" />
                              </div>
                        )}
                            </div>
                      
                      {/* Step Content */}
                      <div className="text-center max-w-24">
                        <h3 className={`text-sm font-semibold mb-1 ${
                          status === 'current' ? 'text-[#004aad]' : 'text-gray-900'
                        }`}>
                          {step.name}
                        </h3>
                        <p className="text-xs text-gray-500 leading-tight">
                          {step.description}
                        </p>
                        
                        {/* Status Badge */}
                        <div className="mt-2">
                          {status === 'completed' && (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              Complete
                            </span>
                          )}
                          {status === 'current' && (
                            <span className="inline-flex items-center rounded-full bg-[#004aad]/10 px-2 py-1 text-xs font-medium text-[#004aad]">
                              Current
                            </span>
                          )}
                          {status === 'upcoming' && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              Pending
                            </span>
                          )}
                              </div>
                              </div>
                            </div>
                      )
                    })}
                      </div>
              </div>
            </div>
                </div>
              </div>
              
      {/* All Timeline Steps Content */}
      <div className="space-y-8">
        {openingSteps.map((step) => {
          const stepComponent = (() => {
            switch (step.id) {
              case 1:
                return <BootcampStep />
              case 2:
                return <ReviewMaterialsStep />
              case 3:
                return <FindRealEstateStep />
              case 4:
                return <HostEventsStep />
              case 5:
                return (
                  <SimpleStep
                    stepNumber={5}
                    title="Invite Parents"
                    description="Reach out to prospective families and build your student base"
                    icon={<UserGroupIcon className="h-12 w-12" />}
                  />
                )
              case 6:
                return (
                  <SimpleStep
                    stepNumber={6}
                    title="Incorporate LLC"
                    description="Register your school as a legal entity and handle business formation"
                    icon={<ScaleIcon className="h-12 w-12" />}
                  />
                )
              case 7:
                return (
                  <SimpleStep
                    stepNumber={7}
                    title="Facility Setup"
                    description="Set up your training facility with equipment and safety measures"
                    icon={<BuildingOffice2Icon className="h-12 w-12" />}
                  />
                )
              case 8:
                return (
                  <SimpleStep
                    stepNumber={8}
                    title="Student Enrollment"
                    description="Begin enrolling students for your programs and manage registrations"
                    icon={<AcademicCapIcon className="h-12 w-12" />}
                  />
                )
              case 9:
                return (
                  <SimpleStep
                    stepNumber={9}
                    title="Grand Opening"
                    description="Launch your Texas Sports Academy school and celebrate with the community"
                    icon={<MegaphoneIcon className="h-12 w-12" />}
                  />
                )
              default:
                return null
            }
          })()
                    
                    return (
            <div key={step.id} className="mb-8">
              {stepComponent}
                      </div>
          )
        })}
          </div>
          
      <div className="flex flex-col xl:flex-row">
        {/* Main Content Column */}
        <div className="flex-1" ref={mainContentRef}>
          {/* Recent Activity - Enhanced */}
          <div className="mb-8" data-tour="recent-activity">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-zinc-600" />
                    </div>
                    <Subheading className="text-lg font-semibold text-gray-900">Recent Activity</Subheading>
                  </div>
              <a 
                    href="/coach/parents" 
                    className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors"
              >
                View All
              </a>
            </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {/* Empty state - all activity will come from API calls */}
                <div className="px-6 py-12 text-center">
                  <ClipboardDocumentListIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No recent activity</h3>
                  <p className="text-sm text-gray-500 mb-4">Recent activity will appear here when available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
