'use client'

import { useState, useEffect } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  CalendarDaysIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  MapPinIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { 
  CalendarDaysIcon as CalendarSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  ChatBubbleLeftRightIcon as ChatSolidIcon,
  ClockIcon as ClockSolidIcon,
  UserIcon as UserSolidIcon,
  AcademicCapIcon as AcademicSolidIcon,
} from '@heroicons/react/24/solid'

// Safe import with fallback
let getCurrentUser: (() => { email: string; name?: string } | null) | undefined
try {
  const authModule = require('@/lib/auth')
  getCurrentUser = authModule.getCurrentUser
} catch (error) {
  console.error('Error importing auth module:', error)
  getCurrentUser = () => null
}

interface QuickActionCard {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

interface DashboardActivity {
  id: string
  type: 'enrollment' | 'document' | 'message' | 'appointment'
  title: string
  description: string
  timestamp: string
  status: 'completed' | 'pending' | 'action_required'
  avatar?: string
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  time: string
  type: 'appointment' | 'deadline' | 'training'
  location?: string
  status: 'confirmed' | 'pending'
}

function ParentDashboardContent() {
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [dashboardStats, setDashboardStats] = useState({
    pendingDocuments: 3,
    unreadMessages: 2,
    upcomingAppointments: 1,
    enrollmentProgress: 75
  })

  useEffect(() => {
    loadDashboardData()
    setLoading(false)
  }, [])

  const loadDashboardData = () => {
    // Mock data following TSA design patterns
    setRecentActivity([
      {
        id: '1',
        type: 'enrollment',
        title: 'Microschool Application Approved',
        description: 'Congratulations! Your child has been accepted. Next step: Schedule shadow day.',
        timestamp: '2 hours ago',
        status: 'completed',
        avatar: 'M'
      },
      {
        id: '2',
        type: 'document',
        title: 'MAP Screener Scheduled',
        description: 'Academic assessment scheduled for next week. Please review preparation materials.',
        timestamp: '1 day ago',
        status: 'action_required',
        avatar: 'A'
      },
      {
        id: '3',
        type: 'message',
        title: 'Coach Johnson sent you a message',
        description: 'Welcome! I\'m excited to have your child join our microschool community.',
        timestamp: '2 days ago',
        status: 'pending',
        avatar: 'CJ'
      },
    ])

    setUpcomingEvents([
      {
        id: '1',
        title: 'Initial Consultation with Coach',
        date: '2025-02-15',
        time: '10:00 AM',
        type: 'appointment',
        location: 'TSA Microschool Campus',
        status: 'confirmed'
      },
      {
        id: '2',
        title: 'Enrollment Documents Due',
        date: '2025-02-20',
        time: '11:59 PM',
        type: 'deadline',
        status: 'pending'
      },
      {
        id: '3',
        title: 'Shadow Day Experience',
        date: '2025-02-25',
        time: '9:00 AM',
        type: 'training',
        location: 'Microschool Classroom',
        status: 'confirmed'
      }
    ])
  }

  // TSA Quick Action Cards
  const quickActionCards: QuickActionCard[] = [
    {
      title: 'Microschool Enrollment',
      description: 'Continue enrollment process',
      href: '/parent/enrollment',
      icon: AcademicCapIcon,
      color: 'text-[#004aad]',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Upload Documents',
      description: 'Submit enrollment documents',
      href: '/parent/documents',
      icon: DocumentTextIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
    },
    {
      title: 'Schedule Visit',
      description: 'Book tour or shadow day',
      href: '/parent/schedule',
      icon: CalendarDaysIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
    {
      title: 'Coach Messages',
      description: 'Chat with your coach',
      href: '/parent/messages',
      icon: ChatBubbleLeftRightIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge color="green">Completed</Badge>
      case 'action_required':
        return <Badge color="amber">Action Required</Badge>
      case 'pending':
        return <Badge color="blue">Pending</Badge>
      case 'confirmed':
        return <Badge color="green">Confirmed</Badge>
      default:
        return <Badge color="zinc">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'action_required':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-blue-500" />
      default:
        return <InformationCircleIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <UserIcon className="h-4 w-4 text-blue-500" />
      case 'deadline':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      case 'training':
        return <AcademicCapIcon className="h-4 w-4 text-green-500" />
      default:
        return <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <ParentPortalLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto mb-4"></div>
            <span className="text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </ParentPortalLayout>
    )
  }

  return (
    <ParentPortalLayout>
      <div className="space-y-8">
        {/* TSA Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-4">
                <AcademicSolidIcon className="h-6 w-6 text-[#004aad]" />
              </div>
                              <div>
                  <p className="text-sm font-semibold text-gray-900">Enrollment Complete</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.enrollmentProgress}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mr-4">
                  <DocumentSolidIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Documents Needed</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingDocuments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mr-4">
                  <ChatSolidIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Coach Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.unreadMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mr-4">
                  <CalendarSolidIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Upcoming Visits</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.upcomingAppointments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TSA Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActionCards.map((card) => (
            <div key={card.title} className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${card.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-lg p-2 mr-3">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                    <p className="text-xs text-gray-600">{card.description}</p>
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* TSA Feature Dashboard Card - Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mr-3">
                    <ClockSolidIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <Heading className="text-lg font-semibold text-gray-900">
                    Recent Activity
                  </Heading>
                </div>
                <Button href="/parent/timeline" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">
                  View All
                </Button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center px-6 py-5 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mr-4">
                    <span className="text-xs font-semibold text-[#004aad]">{activity.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-3" />
                </div>
              ))}
            </div>
          </div>

          {/* TSA Feature Dashboard Card - Upcoming Events */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mr-3">
                    <CalendarSolidIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <Heading className="text-lg font-semibold text-gray-900">
                    Upcoming Events
                  </Heading>
                </div>
                <Button href="/parent/schedule" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">
                  View Calendar
                </Button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center px-6 py-5 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center mr-4">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <Badge color={event.type === 'deadline' ? 'amber' : 'blue'}>
                        {formatDate(event.date)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.time}
                      {event.location && (
                        <>
                          {' • '}
                          <span className="inline-flex items-center">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            {event.location}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ParentPortalLayout>
  )
}

export default function ParentDashboard() {
  return <ParentDashboardContent />
} 