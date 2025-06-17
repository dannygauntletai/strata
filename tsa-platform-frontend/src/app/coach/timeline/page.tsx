'use client'

import React, { useState, useEffect } from 'react'
import { Heading, Subheading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { 
  CheckIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  HomeIcon,
  BuildingOffice2Icon,
  ScaleIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/react/24/solid'
import { getCurrentUser, type AuthUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// Full timeline with detailed steps and next actions - integrated with auto-detection
const fullTimeline = [
  {
    id: 1,
    name: 'Onboarding',
    description: 'Complete coach onboarding process',
    status: 'completed',
    icon: AcademicCapIcon,
    completedDate: '2024-01-15',
    nextActions: [],
    details: 'Successfully completed all onboarding requirements including profile setup, documentation, and initial training modules.',
    autoDetected: true,
    autoDetectionKey: 'onboarding'
  },
  {
    id: 2,
    name: 'Background Check',
    description: 'Submit and clear background verification',
    status: 'completed',
    icon: DocumentTextIcon,
    completedDate: '2024-01-22',
    nextActions: [],
    details: 'Background check cleared through Checkr. Valid for 2 years until January 2026.',
    autoDetected: true,
    autoDetectionKey: 'background_check'
  },
  {
    id: 3,
    name: 'Develop Marketing Materials',
    description: 'Develop promotional content for your school',
    status: 'current',
    icon: MegaphoneIcon,
    nextActions: [
      'Complete school branding and logo design',
      'Create informational flyers for local community',
      'Set up social media accounts (Facebook, Instagram)',
      'Develop website with school information',
      'Create parent information packet'
    ],
    details: 'Marketing materials are essential for attracting families. Focus on highlighting your unique sports-focused curriculum and small class sizes.',
    autoDetected: false
  },
  {
    id: 4,
    name: 'Host Events',
    description: 'Plan and execute community events',
    status: 'upcoming',
    icon: CalendarDaysIcon,
    nextActions: [
      'Plan information sessions for prospective families',
      'Organize sports demonstration events',
      'Schedule community open houses',
      'Partner with local sports leagues for visibility',
      'Host parent coffee meetings'
    ],
    details: 'Community events help build trust and showcase your program. Start with small, informal gatherings to build relationships.',
    autoDetected: true,
    autoDetectionKey: 'host_events'
  },
  {
    id: 5,
    name: 'Invite Students',
    description: 'Reach out to prospective families',
    status: 'upcoming',
    icon: UserGroupIcon,
    nextActions: [
      'Create target list of 50+ families in your area',
      'Launch referral program with existing contacts',
      'Use marketing materials to reach out via social media',
      'Contact local homeschool networks',
      'Offer trial days or sports clinics'
    ],
    details: 'Student recruitment is critical. Aim for 10-15 committed families before moving to next steps. Quality over quantity is key.',
    autoDetected: true,
    autoDetectionKey: 'invite_students'
  },
  {
    id: 6,
    name: 'Find Real Estate',
    description: 'Secure facility location and lease',
    status: 'upcoming',
    icon: BuildingOffice2Icon,
    nextActions: [
      'Define space requirements (min 2,000 sq ft recommended)',
      'Research zoning requirements for educational use',
      'Identify 5-10 potential locations',
      'Calculate budget including utilities and insurance',
      'Negotiate lease terms with landlord',
      'Ensure adequate outdoor space for sports activities'
    ],
    details: 'Location is crucial for a sports-focused microschool. Look for spaces with both indoor classrooms and outdoor athletic areas.',
    autoDetected: false
  },
  {
    id: 7,
    name: 'Incorporate LLC',
    description: 'Register your school as a legal entity',
    status: 'upcoming',
    icon: ScaleIcon,
    nextActions: [
      'Choose LLC name and check availability',
      'File Articles of Organization with state',
      'Obtain Federal EIN number',
      'Set up business bank account',
      'Get required business insurance',
      'Register for state and local taxes'
    ],
    details: 'Legal structure protects you personally and is required for legitimate business operations. Consider consulting with a business attorney.',
    autoDetected: false
  },
  {
    id: 8,
    name: 'Curriculum Development',
    description: 'Finalize lesson plans and learning materials',
    status: 'upcoming',
    icon: AcademicCapIcon,
    nextActions: [
      'Integrate 2-Hour Learning methodology',
      'Develop sports-integrated academic lessons',
      'Create assessment and progress tracking systems',
      'Source textbooks and learning materials',
      'Plan daily and weekly schedules'
    ],
    details: 'Your curriculum should blend academic excellence with sports training, creating a unique value proposition for families.',
    autoDetected: true,
    autoDetectionKey: 'curriculum_development'
  },
  {
    id: 9,
    name: 'Staff Recruitment',
    description: 'Hire necessary teaching and support staff',
    status: 'upcoming',
    icon: UserGroupIcon,
    nextActions: [
      'Define roles needed (assistant teachers, admin)',
      'Create job descriptions and compensation plans',
      'Post on education job boards',
      'Conduct interviews and background checks',
      'Develop staff training program'
    ],
    details: 'Start small with 1-2 key staff members. Look for candidates with both educational and sports backgrounds when possible.',
    autoDetected: false
  },
  {
    id: 10,
    name: 'Facility Setup',
    description: 'Prepare classrooms and install equipment',
    status: 'upcoming',
    icon: HomeIcon,
    nextActions: [
      'Design classroom layouts for flexibility',
      'Purchase furniture and educational technology',
      'Set up sports equipment storage',
      'Install safety and security systems',
      'Create outdoor learning/sports areas'
    ],
    details: 'Focus on flexible spaces that can accommodate both academic learning and physical activity throughout the day.',
    autoDetected: false
  },
  {
    id: 11,
    name: 'Student Enrollment',
    description: 'Process applications and confirm enrollment',
    status: 'upcoming',
    icon: DocumentTextIcon,
    nextActions: [
      'Create enrollment application process',
      'Set tuition rates and payment schedules',
      'Conduct family interviews',
      'Process enrollment deposits',
      'Finalize class rosters and groups'
    ],
    details: 'Aim for 12-20 students in your first year. This provides a good learning environment while maintaining financial viability.',
    autoDetected: true,
    autoDetectionKey: 'student_enrollment'
  },
  {
    id: 12,
    name: 'Grand Opening',
    description: 'Launch your microschool with celebration',
    status: 'upcoming',
    icon: CalendarDaysIcon,
    nextActions: [
      'Plan grand opening celebration event',
      'Invite community leaders and families',
      'Coordinate media coverage',
      'Begin first day of school operations',
      'Implement feedback collection systems'
    ],
    details: 'Your grand opening is a milestone to celebrate and an opportunity to generate positive community awareness for future growth.',
    autoDetected: false
  }
]

export default function TimelinePage() {
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [autoDetectedStatuses, setAutoDetectedStatuses] = useState<{[key: string]: any}>({})
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Load API endpoint from SSM
  useEffect(() => {
    try {
      const url = getCoachApiUrl();
      setApiBaseUrl(url);
    } catch (error) {
      console.error('Failed to load API endpoint:', error);
    }
  }, [])

  // Load user and fetch timeline status
  useEffect(() => {
    if (!apiBaseUrl) return

    const loadUserAndTimeline = async () => {
      try {
        const user = getCurrentUser()
        setCurrentUser(user)
        
        if (user?.email) {
          await fetchTimelineStatus(user.email)
        }
      } catch (error) {
        console.error('Error loading user or timeline:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUserAndTimeline()
  }, [apiBaseUrl])

  const fetchTimelineStatus = async (coachEmail: string) => {
    if (!apiBaseUrl) return

    try {
      const response = await fetch(`${apiBaseUrl}/events?action=timeline_status`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': currentUser?.token ? `Bearer ${currentUser.token}` : ''
        }
      })
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

  // Get effective status for a step (auto-detected status takes precedence)
  const getStepStatus = (step: typeof fullTimeline[0]) => {
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]) {
      const autoStatus = autoDetectedStatuses[step.autoDetectionKey].status
      if (autoStatus === 'completed') {
        return autoStatus
      }
    }
    return step.status
  }

  // Check if step status is auto-detected
  const isAutoDetected = (step: typeof fullTimeline[0]) => {
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]) {
      return autoDetectedStatuses[step.autoDetectionKey].status === 'completed'
    }
    return false
  }

  // Get auto-detection details if available
  const getAutoDetectionDetails = (step: typeof fullTimeline[0]) => {
    if (step.autoDetected && step.autoDetectionKey && autoDetectedStatuses[step.autoDetectionKey]?.details) {
      const details = autoDetectedStatuses[step.autoDetectionKey].details
      if (step.autoDetectionKey === 'host_events') {
        return `${details.events_created} events created`
      } else if (step.autoDetectionKey === 'invite_students') {
        return `${details.invitations_sent} invitations sent`
      } else if (step.autoDetectionKey === 'student_enrollment') {
        return `${details.students_enrolled} students enrolled`
      }
    }
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'current':
        return 'bg-blue-500'
      default:
        return 'bg-zinc-300'
    }
  }

  const getStatusBadge = (step: typeof fullTimeline[0]) => {
    const status = getStepStatus(step)
    const autoDetected = isAutoDetected(step)
    
    switch (status) {
      case 'completed':
        return (
          <Badge color="green">
            Complete
          </Badge>
        )
      case 'current':
        return <Badge color="blue">In Progress</Badge>
      default:
        return <Badge color="zinc">Upcoming</Badge>
    }
  }

  // Calculate progress using real data
  const completedSteps = fullTimeline.filter(step => getStepStatus(step) === 'completed').length
  const totalSteps = fullTimeline.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <Heading level={1} className="text-3xl font-bold text-gray-900">
          Microschool Launch Timeline
        </Heading>
        <p className="text-gray-600 mt-2">
          Your comprehensive roadmap to launching a successful sports-focused microschool
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
          <span className="text-sm text-gray-500">
            {completedSteps} of {totalSteps} steps completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progressPercentage}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flow-root p-6">
          <ul role="list" className="space-y-6">
            {fullTimeline.map((step, stepIdx) => {
              const Icon = step.icon
              const isSelected = selectedStep === step.id
              
              return (
                <li key={step.id}>
                  <div className="relative">
                    {stepIdx !== fullTimeline.length - 1 && (
                      <span className="absolute left-6 top-12 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    
                    <div 
                      className={`group relative flex items-start space-x-4 cursor-pointer rounded-lg p-4 transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStep(isSelected ? null : step.id)}
                    >
                      <div className="flex-shrink-0">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${getStatusColor(getStepStatus(step))}`}>
                          {getStepStatus(step) === 'completed' ? (
                            <CheckIcon className="h-6 w-6 text-white" />
                          ) : (
                            <Icon className="h-6 w-6 text-white" />
                          )}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{step.name}</h4>
                            <p className="text-sm text-gray-500">{step.description}</p>
                            {/* Show auto-detection details if available */}
                            {getAutoDetectionDetails(step) && (
                              <p className="text-xs text-blue-600 mt-1">
                                📊 {getAutoDetectionDetails(step)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(step)}
                            {step.completedDate && getStepStatus(step) === 'completed' && (
                              <span className="text-xs text-gray-500">
                                Completed {new Date(step.completedDate).toLocaleDateString()}
                              </span>
                            )}
                            <ChevronRightIcon 
                              className={`h-5 w-5 text-gray-400 transition-transform ${
                                isSelected ? 'rotate-90' : ''
                              }`} 
                            />
                          </div>
                        </div>
                        
                        {/* Expanded details */}
                        {isSelected && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <p className="text-sm text-gray-700 mb-4">{step.details}</p>
                            
                            {step.nextActions.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Next Actions:</h5>
                                <ul className="space-y-2">
                                  {step.nextActions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="flex items-start">
                                      <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 mr-3"></div>
                                      <span className="text-sm text-gray-700">{action}</span>
                                    </li>
                                  ))}
                                </ul>
                                
                                {/* Only show action buttons for non-auto-detected steps or incomplete auto-detected steps */}
                                {getStepStatus(step) === 'current' && !isAutoDetected(step) && (
                                  <div className="mt-4 flex space-x-3">
                                    <Button color="blue">
                                      <PlusIcon className="h-4 w-4 mr-2" />
                                      Add Task
                                    </Button>
                                    <Button color="zinc">
                                      <PencilIcon className="h-4 w-4 mr-2" />
                                      Customize Steps
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Timeline Features</h3>
        <div className="space-y-2 text-blue-800 mb-4">
          <p>📊 <strong>Auto-Detection:</strong> Some steps are automatically marked complete based on your activity in the system.</p>
          <p>✅ <strong>Real-Time Progress:</strong> Your progress updates immediately when you complete tracked activities.</p>
          <p>🎯 <strong>Personalized Guidance:</strong> Get specific next actions for each step of your journey.</p>
        </div>
        <div className="space-y-2 text-blue-800 mb-4">
          <p><strong>Need Help?</strong> Our team is here to support you through every step of your microschool journey.</p>
        </div>
        <Button color="blue" className="mr-3">
          Schedule Consultation
        </Button>
        <Button outline>
          Join Coach Community
        </Button>
      </div>
    </div>
  )
} 