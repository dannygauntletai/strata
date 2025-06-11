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
  UsersIcon,
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

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

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

// Available shortcuts with their details
const availableShortcuts = [
  { id: 'home', title: 'Home', icon: HomeIcon, href: '/coach', description: 'Dashboard overview' },
  { id: 'bootcamp', title: 'Bootcamp', icon: AcademicCapIcon, href: '/coach/bootcamp', description: 'Training programs' },
  { id: 'events', title: 'Events', icon: Square2StackIcon, href: '/coach/events', description: 'Manage events' },
  { id: 'students', title: 'Students', icon: UserGroupIcon, href: '/coach/students', description: 'Student management' },
  { id: 'registrations', title: 'Registrations', icon: ClipboardDocumentListIcon, href: '/coach/registrations', description: 'Registration overview' },
  { id: 'applications', title: 'Applications', icon: DocumentArrowUpIcon, href: '/coach/applications', description: 'Application management' },
  { id: 'marketing', title: 'Marketing', icon: MegaphoneIcon, href: '/coach/marketing', description: 'Marketing tools' },
  { id: 'real-estate', title: 'Real Estate', icon: BuildingOffice2Icon, href: '/coach/real-estate', description: 'Property management' },
  { id: 'legal', title: 'Legal', icon: ScaleIcon, href: '/coach/legal', description: 'Legal compliance' },
  { id: 'shop', title: 'Shop', icon: ShoppingBagIcon, href: '/coach/shop', description: 'Online store' },
  { id: 'photos', title: 'Photos', icon: CameraIcon, href: '/coach/photos', description: 'Photo management' },
  { id: 'parents', title: 'Parents', icon: UsersIcon, href: '/coach/parents', description: 'Parent portal' },
  { id: 'settings', title: 'Settings', icon: Cog6ToothIcon, href: '/coach/settings', description: 'System settings' },
  { id: 'support', title: 'Support', icon: QuestionMarkCircleIcon, href: '#', description: 'Help and support' }
]

// Default shortcuts (first 6 items)
const defaultShortcuts = ['home', 'students', 'parents', 'legal', 'settings', 'support']

// School opening steps with auto-detection mapping
const openingSteps = [
  { id: 1, name: 'Onboarding', description: 'Complete coach onboarding process', status: 'completed', autoDetected: true, autoDetectionKey: 'onboarding' },
  { id: 2, name: 'Background Check', description: 'Submit and clear background verification', status: 'completed', autoDetected: true, autoDetectionKey: 'background_check' },
  { id: 3, name: 'Review Materials', description: 'Review promotional content for your school', status: 'current', autoDetected: false },
  { id: 4, name: 'Host Events', description: 'Plan and execute community events', status: 'upcoming', autoDetected: true, autoDetectionKey: 'host_events' },
  { id: 5, name: 'Invite Students', description: 'Reach out to prospective families', status: 'upcoming', autoDetected: true, autoDetectionKey: 'invite_students' },
  { id: 6, name: 'Find Real Estate', description: 'Secure facility location and lease', status: 'upcoming', autoDetected: false },
  { id: 7, name: 'Incorporate LLC', description: 'Register your school as a legal entity', status: 'upcoming', autoDetected: false }
]

export default function CoachDashboard() {
  const [shortcuts, setShortcuts] = useState<string[]>(defaultShortcuts)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  
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
  const [timelineSteps, setTimelineSteps] = useState(5)
  const [stepStatuses, setStepStatuses] = useState<{[key: number]: string}>({})
  const [autoDetectedStatuses, setAutoDetectedStatuses] = useState<{[key: string]: any}>({})
  const mainContentRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState({
    totalInvites: 0,
    pendingInvites: 0,
    acceptedInvites: 0,
    weekChange: '+0'
  })

  // Calculate timeline steps based on available height
  useEffect(() => {
    const calculateTimelineSteps = () => {
      if (mainContentRef.current) {
        const mainContentHeight = mainContentRef.current.offsetHeight
        // Each timeline step takes approximately 80px (including spacing)
        // Reserve 200px for header and "View Full Timeline" button
        const availableHeight = mainContentHeight - 200
        const maxSteps = Math.max(3, Math.min(7, Math.floor(availableHeight / 80)))
        setTimelineSteps(maxSteps)
      }
    }

    // Initial calculation
    calculateTimelineSteps()

    // Recalculate on window resize
    window.addEventListener('resize', calculateTimelineSteps)
    return () => window.removeEventListener('resize', calculateTimelineSteps)
  }, [])

  // Fetch parent invitations for recent activity and stats
  useEffect(() => {
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
  }, [])

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

      const response = await fetch(`${API_BASE_URL}/events?created_by=${encodeURIComponent(user.email)}&limit=5`)
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

      const response = await fetch(`${API_BASE_URL}/events?action=timeline_status&coach_id=${user.email}`)
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
      const response = await fetch(`${API_BASE_URL}/parent-invitations`, {
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
      // const response = await fetch(`${API_BASE_URL}/scheduling/bookings?coach_id=${user.email}`, {
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
      // const response = await fetch(`${API_BASE_URL}/applications?coach_id=${user.email}&limit=5`, {
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

  // Load shortcuts from localStorage on mount
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('dashboard-shortcuts')
    if (savedShortcuts) {
      try {
        setShortcuts(JSON.parse(savedShortcuts))
      } catch (error) {
        console.error('Failed to parse saved shortcuts:', error)
      }
    }
  }, [])

  // Save shortcuts to localStorage
  const saveShortcuts = (newShortcuts: string[]) => {
    setShortcuts(newShortcuts)
    localStorage.setItem('dashboard-shortcuts', JSON.stringify(newShortcuts))
  }

  // Toggle shortcut in/out of the list
  const toggleShortcut = (shortcutId: string) => {
    const isCurrentlySelected = shortcuts.includes(shortcutId)
    
    // If trying to add and already at limit, prevent addition
    if (!isCurrentlySelected && shortcuts.length >= 4) {
      return
    }
    
    const newShortcuts = isCurrentlySelected
      ? shortcuts.filter(id => id !== shortcutId)
      : [...shortcuts, shortcutId]
    saveShortcuts(newShortcuts)
  }

  // Get shortcut details
  const getShortcutDetails = (id: string) => availableShortcuts.find(s => s.id === id)

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

  // Handle manual step completion
  const toggleStepCompletion = (stepId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'upcoming' : 'completed'
    setStepStatuses(prev => ({
      ...prev,
      [stepId]: newStatus
    }))
    
    // Save to localStorage
    const savedStatuses = JSON.parse(localStorage.getItem('timeline-step-statuses') || '{}')
    savedStatuses[stepId] = newStatus
    localStorage.setItem('timeline-step-statuses', JSON.stringify(savedStatuses))
  }

  // Load step statuses from localStorage
  useEffect(() => {
    const savedStatuses = JSON.parse(localStorage.getItem('timeline-step-statuses') || '{}')
    setStepStatuses(savedStatuses)
  }, [])

  // Get effective status for a step (auto-detected status takes precedence, then saved status, then default)
  const getStepStatus = (step: typeof openingSteps[0]) => {
    // Check if this step has auto-detection enabled
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]) {
      const autoStatus = autoDetectedStatuses[step.autoDetectionKey].status
      // Auto-detected status takes precedence over manual status
      if (autoStatus === 'completed') {
        return autoStatus
      }
    }
    
    // Fall back to manual status or default status
    return stepStatuses[step.id] || step.status
  }

  // Check if step status is auto-detected (and thus cannot be manually overridden)
  const isAutoDetected = (step: typeof openingSteps[0]) => {
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]) {
      return autoDetectedStatuses[step.autoDetectionKey].status === 'completed'
    }
    return false
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
      
      <div className="flex flex-col xl:flex-row">
        {/* Main Content Column */}
        <div className="flex-1" ref={mainContentRef}>
          {/* Shortcuts Section */}
          <div className="mb-8" data-tour="quick-shortcuts">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-6">
              <Subheading className="text-xl">Quick Actions</Subheading>
              <button
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="flex items-center text-sm font-medium text-[#004aad] hover:text-[#003888] cursor-pointer"
              >
                {isCustomizing ? 'Done' : 'Customize'}
              </button>
            </div>
            
            {isCustomizing ? (
              // Customization view
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-600">Select up to 4 shortcuts for your dashboard:</p>
                  <p className="text-sm font-medium text-zinc-500">
                    {shortcuts.length}/4 selected
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Show selected shortcuts first */}
                  {[
                    ...availableShortcuts.filter(s => shortcuts.includes(s.id)),
                    ...availableShortcuts.filter(s => !shortcuts.includes(s.id))
                  ].map((shortcut) => {
                    const isSelected = shortcuts.includes(shortcut.id)
                    const isDisabled = !isSelected && shortcuts.length >= 4
                    
                    return (
                      <label
                        key={shortcut.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' 
                            : isDisabled
                            ? 'border-zinc-200 bg-zinc-50 opacity-50 cursor-not-allowed'
                            : 'border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleShortcut(shortcut.id)}
                          disabled={isDisabled}
                          className="mr-3"
                        />
                        <div className="flex items-center gap-3">
                          <shortcut.icon className={`h-5 w-5 ${
                            isSelected ? 'text-blue-600' : 'text-zinc-600'
                          }`} />
                          <div>
                            <div className={`font-medium text-sm ${
                              isSelected ? 'text-blue-900' : 'text-zinc-900'
                            }`}>{shortcut.title}</div>
                            <div className="text-xs text-zinc-500">{shortcut.description}</div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Display view
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {shortcuts.slice(0, 4).map((shortcutId) => {
                  const shortcut = getShortcutDetails(shortcutId)
                  if (!shortcut) return null
                  
                  return (
                    <a
                      key={shortcut.id}
                      href={shortcut.href}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <shortcut.icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-zinc-900 text-sm">{shortcut.title}</h3>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* Applicant Approval Widget */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <AcademicCapIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <Subheading className="text-lg font-semibold text-gray-900">Pending Applications</Subheading>
                  </div>
                  <a href="/coach/applications/pending" className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors">
                    View All
                  </a>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {(bookingsLoading || applicationsLoading) ? (
                  <div className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading applications...</p>
                  </div>
                ) : (
                  <>
                    {/* Recent Booking Entries from API */}
                    {recentBookings.map((booking) => {
                      const IconComponent = getBookingIcon(booking.eventType)
                      const colorClass = getBookingColor(booking.eventType)
                      const bgColor = `${colorClass === 'blue' ? 'bg-blue-50 border-blue-200' : 
                                       colorClass === 'green' ? 'bg-green-50 border-green-200' :
                                       colorClass === 'purple' ? 'bg-purple-50 border-purple-200' : 
                                       'bg-gray-50 border-gray-200'}`
                      const iconColor = `${colorClass === 'blue' ? 'text-blue-600' : 
                                         colorClass === 'green' ? 'text-green-600' :
                                         colorClass === 'purple' ? 'text-purple-600' : 
                                         'text-gray-600'}`
                      
                      return (
                        <a 
                          key={booking.id} 
                          href={getBookingUrl(booking.eventType)} 
                          className="block px-6 py-5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <IconComponent className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">{booking.parentName}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatDate(booking.date)} • {getBookingDescription(booking)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <Badge color={colorClass as any}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        </a>
                      )
                    })}

                    {/* Recent Application Entries from API */}
                    {recentApplications.map((application) => {
                      const IconComponent = getApplicationIcon(application.type)
                      const colorClass = getApplicationColor(application.type)
                      const statusColor = getApplicationStatusColor(application.status)
                      const bgColor = `${colorClass === 'blue' ? 'bg-blue-50 border-blue-200' : 
                                       colorClass === 'green' ? 'bg-green-50 border-green-200' :
                                       'bg-gray-50 border-gray-200'}`
                      const iconColor = `${colorClass === 'blue' ? 'text-blue-600' : 
                                         colorClass === 'green' ? 'text-green-600' :
                                         'text-gray-600'}`
                      
                      return (
                        <a 
                          key={application.id} 
                          href="/coach/applications/pending" 
                          className="block px-6 py-5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <IconComponent className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  {application.studentFirstName} {application.studentLastName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {formatDate(application.submittedAt)} • {getApplicationDescription(application)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <Badge color={statusColor as any}>
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1).replace('-', ' ')}
                              </Badge>
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        </a>
                      )
                    })}

                    {/* Empty state if no bookings or applications */}
                    {recentBookings.length === 0 && recentApplications.length === 0 && (
                      <div className="px-6 py-8 text-center">
                        <AcademicCapIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">No recent activity</h3>
                        <p className="text-sm text-gray-500 mb-4">Bookings and applications will appear here</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Event Management Widget */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Square2StackIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <Subheading className="text-lg font-semibold text-gray-900">Recent Events</Subheading>
                  </div>
                  <a href="/coach/events" className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors">
                    {recentEvents.length > 0 ? 'View All' : 'Create Event'}
                  </a>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {eventsLoading ? (
                  <div className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading events...</p>
                  </div>
                ) : recentEvents.length > 0 ? (
                  recentEvents.map((event) => {
                    const eventDate = new Date(event.start_date)
                    const isUpcoming = eventDate > new Date()
                    const isPast = eventDate < new Date()
                    const isToday = eventDate.toDateString() === new Date().toDateString()
                    
                    return (
                      <a key={event.event_id} href={`/coach/events/${event.event_id}`} className="block px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Square2StackIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">{event.title}</h4>
                              <p className="text-sm text-gray-600">
                                {formatDate(event.start_date)} • {event.current_participants || 0}
                                {event.max_participants ? `/${event.max_participants}` : ''} participants
                              </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                            {isToday && <Badge color="blue">Today</Badge>}
                            {isUpcoming && !isToday && <Badge color="green">Upcoming</Badge>}
                            {isPast && <Badge color="zinc">Past</Badge>}
                      <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </a>
                    )
                  })
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Square2StackIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No events yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Create your first event to get started</p>
                    <a 
                      href="/coach/events/create" 
                      className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Event
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
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
        
        {/* Vertical Divider - Only visible on xl screens */}
        <div className="hidden xl:block w-px bg-zinc-200 mx-8"></div>
        
        {/* Right Column with Enhanced Timeline */}
        <div className="mt-12 xl:mt-0 xl:w-80 flex-shrink-0" data-tour="timeline-steps">
          <div className="sticky top-4">
            <div className="border-b border-zinc-200 pb-2">
              <Subheading className="text-xl">Timeline</Subheading>
            </div>
            
            <div className="mt-6 flow-root relative">
              <ul role="list" className="-mb-8">
                {openingSteps.slice(0, timelineSteps).map((step, stepIdx) => {
                  return (
                  <li key={step.id}>
                    <div className="relative pb-8">
                      {stepIdx !== openingSteps.slice(0, timelineSteps).length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              getStepStatus(step) === 'completed' 
                                ? 'bg-green-500' 
                                : getStepStatus(step) === 'current' 
                                  ? 'bg-[#004aad]' 
                                    : 'bg-zinc-200'
                            }`}
                          >
                            {getStepStatus(step) === 'completed' ? (
                                <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                            ) : (
                                <span className="text-xs font-medium text-white">{step.id}</span>
                            )}
                          </span>
                        </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 py-1.5">
                          <div>
                              <p className={`text-sm font-medium ${
                                getStepStatus(step) === 'current' ? 'text-[#004aad]' : 'text-zinc-900'
                              }`}>
                                {step.name}
                              </p>
                              <p className="mt-0.5 text-sm text-zinc-500">
                                {step.description}
                            </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-zinc-500">
                              {getStepStatus(step) === 'completed' && (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                  <CheckIcon className="mr-0.5 h-3.5 w-3.5" />
                                  Complete
                                </span>
                              )}
                              {getStepStatus(step) === 'current' && (
                                <span className="inline-flex items-center rounded-full bg-[#004aad]/10 px-2 py-1 text-xs font-medium text-[#004aad]">
                                  In Progress
                                </span>
                              )}
                              {/* Manual completion toggle for non-auto-detected steps that aren't completed */}
                              {!step.autoDetected && getStepStatus(step) !== 'completed' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    toggleStepCompletion(step.id, getStepStatus(step))
                                  }}
                                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors group"
                                  title="Mark as complete"
                                >
                                  <span className="group-hover:hidden">Pending</span>
                                  <span className="hidden group-hover:inline">Mark as Done</span>
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  )
                })}
              </ul>
              
              {/* View Full Timeline Button */}
              <div className="mt-8 pt-4 border-t border-zinc-200">
                <a 
                  href="/coach/timeline" 
                  className="flex items-center justify-center w-full text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors"
                >
                  View Full Timeline
                  <ChevronRightIcon className="ml-1 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
