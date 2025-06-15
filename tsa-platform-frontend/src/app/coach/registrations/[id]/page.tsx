'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { 
  ChevronLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ChartBarIcon,
  UserCircleIcon,
  MapPinIcon,
  LinkIcon,
  DocumentTextIcon,
  CursorArrowRaysIcon,
  InformationCircleIcon
} from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useState } from 'react'

interface UTMData {
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
}

interface TouchPoint {
  id: string
  type: 'email_opened' | 'email_clicked' | 'phone_call' | 'website_visit' | 'form_submit' | 'tour_scheduled' | 'tour_completed' | 'shadow_day_scheduled' | 'shadow_day_completed' | 'enrollment'
  title: string
  description: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  metadata?: any
}

interface LeadDetails {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: 'new' | 'contacted' | 'qualified' | 'sales_qualified' | 'converted' | 'lost' | 'inactive'
  score: number
  source: string
  utmData: UTMData
  createdAt: string
  lastTouch: string
  assignedTo: string
  studentName: string
  studentAge: number
  interestedPrograms: string[]
  touchPoints: TouchPoint[]
  emailStats: {
    sent: number
    opened: number
    clicked: number
    bounced: number
  }
  callStats: {
    attempted: number
    connected: number
    duration: string
  }
}

// Mock data - in real app this would come from API
const leadDetails: LeadDetails = {
  id: '1',
  firstName: 'Jennifer',
  lastName: 'Chen',
  email: 'jennifer.chen@email.com',
  phone: '(555) 123-4567',
  status: 'qualified',
  score: 85,
  source: 'Google Ads',
  utmData: {
    source: 'google',
    medium: 'cpc',
    campaign: 'summer_sports_academy',
    term: 'youth sports programs',
    content: 'responsive_ad_1'
  },
  createdAt: '2024-01-15T10:30:00Z',
  lastTouch: '2 hours ago',
  assignedTo: 'Coach Martinez',
  studentName: 'Emma Chen',
  studentAge: 12,
  interestedPrograms: ['Tennis', 'Swimming'],
  emailStats: {
    sent: 5,
    opened: 4,
    clicked: 2,
    bounced: 0
  },
  callStats: {
    attempted: 2,
    connected: 1,
    duration: '12 minutes'
  },
  touchPoints: [
    {
      id: '1',
      type: 'website_visit',
      title: 'Initial Website Visit',
      description: 'Visited homepage via Google Ads',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'completed',
      metadata: { page: '/programs', duration: '3m 45s' }
    },
    {
      id: '2',
      type: 'form_submit',
      title: 'Interest Form Submitted',
      description: 'Completed initial interest form',
      timestamp: '2024-01-15T10:33:00Z',
      status: 'completed',
      metadata: { form: 'tennis_interest', source: 'programs_page' }
    },
    {
      id: '3',
      type: 'email_opened',
      title: 'Welcome Email Opened',
      description: 'Opened automated welcome email',
      timestamp: '2024-01-15T11:15:00Z',
      status: 'completed',
      metadata: { emailId: 'welcome_001', openTime: '45s' }
    },
    {
      id: '4',
      type: 'email_clicked',
      title: 'Schedule Call Link Clicked',
      description: 'Clicked "Schedule a Call" button in email',
      timestamp: '2024-01-15T11:16:00Z',
      status: 'completed',
      metadata: { link: 'schedule_consultation', emailId: 'welcome_001' }
    },
    {
      id: '5',
      type: 'phone_call',
      title: 'Initial Consultation Call',
      description: 'First phone consultation with Coach Martinez',
      timestamp: '2024-01-16T14:00:00Z',
      status: 'completed',
      metadata: { duration: '12 minutes', outcome: 'qualified', notes: 'Very interested in tennis program. Daughter Emma, age 12.' }
    },
    {
      id: '6',
      type: 'tour_scheduled',
      title: 'Campus Tour Scheduled',
      description: 'Scheduled for this Saturday at 10:00 AM',
      timestamp: '2024-01-16T14:12:00Z',
      status: 'completed',
      metadata: { scheduledFor: '2024-01-20T10:00:00Z', coach: 'Coach Martinez' }
    },
    {
      id: '7',
      type: 'tour_completed',
      title: 'Campus Tour Completed',
      description: 'Completed campus tour with Emma',
      timestamp: '2024-01-20T11:30:00Z',
      status: 'completed',
      metadata: { duration: '1.5 hours', satisfaction: 'high', nextStep: 'shadow_day' }
    },
    {
      id: '8',
      type: 'shadow_day_scheduled',
      title: 'Shadow Day Scheduled',
      description: 'Emma to join tennis practice session',
      timestamp: '2024-01-20T11:35:00Z',
      status: 'pending',
      metadata: { scheduledFor: '2024-01-25T16:00:00Z', program: 'Tennis' }
    },
    {
      id: '9',
      type: 'enrollment',
      title: 'Enrollment Application',
      description: 'Complete enrollment process',
      timestamp: '',
      status: 'pending',
      metadata: { estimatedDate: '2024-01-30T00:00:00Z' }
    }
  ]
}

const statusColors = {
  new: 'zinc',
  contacted: 'blue', 
  qualified: 'amber',
  sales_qualified: 'emerald',
  converted: 'green',
  lost: 'red',
  inactive: 'zinc'
} as const

const touchPointIcons = {
  email_opened: EnvelopeIcon,
  email_clicked: CursorArrowRaysIcon,
  phone_call: PhoneIcon,
  website_visit: GlobeAltIcon,
  form_submit: DocumentTextIcon,
  tour_scheduled: CalendarDaysIcon,
  tour_completed: EyeIcon,
  shadow_day_scheduled: CalendarDaysIcon,
  shadow_day_completed: CheckCircleIcon,
  enrollment: UserCircleIcon
}

const touchPointColors = {
  email_opened: 'blue',
  email_clicked: 'indigo',
  phone_call: 'green',
  website_visit: 'purple',
  form_submit: 'amber',
  tour_scheduled: 'orange',
  tour_completed: 'emerald',
  shadow_day_scheduled: 'orange',
  shadow_day_completed: 'emerald',
  enrollment: 'green'
} as const

export default function LeadDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'communications'>('timeline')

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon
      case 'pending': return ClockIcon
      case 'failed': return XCircleIcon
      default: return InformationCircleIcon
    }
  }

  return (
    <>
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Link 
          href="/coach/registrations" 
          className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Registration Pipeline
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1} className="text-2xl font-semibold text-zinc-900">
              {leadDetails.firstName} {leadDetails.lastName}
            </Heading>
            <Text className="text-zinc-600 mt-1">
              Lead #{leadDetails.id} • Created {formatDate(leadDetails.createdAt)}
            </Text>
          </div>
          <div className="flex items-center space-x-3">
            <Badge color={statusColors[leadDetails.status]}>
              {leadDetails.status.replace('_', ' ')}
            </Badge>
            <div className="flex items-center">
              <Text className="text-sm font-medium text-zinc-900 mr-2">Score: {leadDetails.score}</Text>
              <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${leadDetails.score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <Text className="text-sm font-medium text-gray-900">Email Engagement</Text>
              <Text className="text-2xl font-semibold text-gray-900">
                {Math.round((leadDetails.emailStats.opened / leadDetails.emailStats.sent) * 100)}%
              </Text>
              <Text className="text-xs text-gray-600">
                {leadDetails.emailStats.opened}/{leadDetails.emailStats.sent} opened
              </Text>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <Text className="text-sm font-medium text-gray-900">Call Success</Text>
              <Text className="text-2xl font-semibold text-gray-900">
                {Math.round((leadDetails.callStats.connected / leadDetails.callStats.attempted) * 100)}%
              </Text>
              <Text className="text-xs text-gray-600">
                {leadDetails.callStats.connected}/{leadDetails.callStats.attempted} connected
              </Text>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <Text className="text-sm font-medium text-gray-900">Funnel Progress</Text>
              <Text className="text-2xl font-semibold text-gray-900">
                {Math.round((leadDetails.touchPoints.filter(tp => tp.status === 'completed').length / leadDetails.touchPoints.length) * 100)}%
              </Text>
              <Text className="text-xs text-gray-600">
                {leadDetails.touchPoints.filter(tp => tp.status === 'completed').length}/{leadDetails.touchPoints.length} steps
              </Text>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <Text className="text-sm font-medium text-gray-900">Days in Pipeline</Text>
              <Text className="text-2xl font-semibold text-gray-900">
                {Math.ceil((new Date().getTime() - new Date(leadDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
              </Text>
              <Text className="text-xs text-gray-600">Since first contact</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'timeline', label: 'Timeline & Funnel' },
            { id: 'details', label: 'Lead Details' },
            { id: 'communications', label: 'Communications' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Registration Funnel Progress */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <Heading level={2} className="text-lg font-semibold text-gray-900">Registration Funnel</Heading>
                  <Text className="text-sm text-gray-600">Track progress through enrollment process</Text>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {leadDetails.touchPoints.map((touchPoint, index) => {
                  const Icon = touchPointIcons[touchPoint.type]
                  const StatusIcon = getStatusIcon(touchPoint.status)
                  const isLast = index === leadDetails.touchPoints.length - 1
                  
                  return (
                    <div key={touchPoint.id} className="relative">
                      {!isLast && (
                        <div className="absolute left-5 top-12 w-0.5 h-16 bg-gray-200" />
                      )}
                      <div className="flex items-start">
                        <div className={`relative w-10 h-10 bg-${touchPointColors[touchPoint.type]}-50 border border-${touchPointColors[touchPoint.type]}-200 rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 text-${touchPointColors[touchPoint.type]}-600`} />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                            touchPoint.status === 'completed' ? 'bg-green-500' :
                            touchPoint.status === 'pending' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}>
                            <StatusIcon className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <Text className="font-semibold text-gray-900">{touchPoint.title}</Text>
                            <Text className="text-sm text-gray-500">{formatDate(touchPoint.timestamp)}</Text>
                          </div>
                          <Text className="text-sm text-gray-600 mt-1">{touchPoint.description}</Text>
                          {touchPoint.metadata && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(touchPoint.metadata).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium text-gray-700">{key.replace('_', ' ')}:</span>
                                    <span className="text-gray-600 ml-1">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
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
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={2} className="text-lg font-semibold text-gray-900">Contact Information</Heading>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{leadDetails.email}</Text>
                  <Text className="text-sm text-gray-600">Primary email</Text>
                </div>
              </div>
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{leadDetails.phone}</Text>
                  <Text className="text-sm text-gray-600">Primary phone</Text>
                </div>
              </div>
              <div className="flex items-center">
                <UserCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{leadDetails.assignedTo}</Text>
                  <Text className="text-sm text-gray-600">Assigned coach</Text>
                </div>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={2} className="text-lg font-semibold text-gray-900">Student Information</Heading>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Text className="font-medium text-gray-900">{leadDetails.studentName}</Text>
                <Text className="text-sm text-gray-600">Student name</Text>
              </div>
              <div>
                <Text className="font-medium text-gray-900">{leadDetails.studentAge} years old</Text>
                <Text className="text-sm text-gray-600">Age</Text>
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  {leadDetails.interestedPrograms.map((program) => (
                    <Badge key={program} color="blue">{program}</Badge>
                  ))}
                </div>
                <Text className="text-sm text-gray-600 mt-1">Interested programs</Text>
              </div>
            </div>
          </div>

          {/* UTM Tracking */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={2} className="text-lg font-semibold text-gray-900">UTM Tracking</Heading>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm font-medium text-gray-700">Source</Text>
                  <Text className="text-sm text-gray-900">{leadDetails.utmData.source}</Text>
                </div>
                <div>
                  <Text className="text-sm font-medium text-gray-700">Medium</Text>
                  <Text className="text-sm text-gray-900">{leadDetails.utmData.medium}</Text>
                </div>
                <div>
                  <Text className="text-sm font-medium text-gray-700">Campaign</Text>
                  <Text className="text-sm text-gray-900">{leadDetails.utmData.campaign}</Text>
                </div>
                <div>
                  <Text className="text-sm font-medium text-gray-700">Term</Text>
                  <Text className="text-sm text-gray-900">{leadDetails.utmData.term || 'N/A'}</Text>
                </div>
              </div>
              {leadDetails.utmData.content && (
                <div>
                  <Text className="text-sm font-medium text-gray-700">Content</Text>
                  <Text className="text-sm text-gray-900">{leadDetails.utmData.content}</Text>
                </div>
              )}
            </div>
          </div>

          {/* Lead Source */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={2} className="text-lg font-semibold text-gray-900">Lead Source Details</Heading>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{leadDetails.source}</Text>
                  <Text className="text-sm text-gray-600">Primary source</Text>
                </div>
              </div>
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{leadDetails.utmData.campaign}</Text>
                  <Text className="text-sm text-gray-600">Campaign</Text>
                </div>
              </div>
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <Text className="font-medium text-gray-900">{formatDate(leadDetails.createdAt)}</Text>
                  <Text className="text-sm text-gray-600">First contact</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Statistics */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <Heading level={2} className="text-lg font-semibold text-gray-900">Email Performance</Heading>
                  <Text className="text-sm text-gray-600">Email engagement metrics</Text>
                </div>
              </div>
            </div>
            <div className="p-6 divide-y divide-gray-100">
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Emails Sent</Text>
                  <Text className="text-sm text-gray-600">Total emails delivered</Text>
                </div>
                <Text className="text-2xl font-semibold text-gray-900">{leadDetails.emailStats.sent}</Text>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Open Rate</Text>
                  <Text className="text-sm text-gray-600">Emails opened</Text>
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-semibold text-gray-900">
                    {Math.round((leadDetails.emailStats.opened / leadDetails.emailStats.sent) * 100)}%
                  </Text>
                  <Text className="text-sm text-gray-600">{leadDetails.emailStats.opened}/{leadDetails.emailStats.sent}</Text>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Click Rate</Text>
                  <Text className="text-sm text-gray-600">Links clicked</Text>
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-semibold text-gray-900">
                    {Math.round((leadDetails.emailStats.clicked / leadDetails.emailStats.sent) * 100)}%
                  </Text>
                  <Text className="text-sm text-gray-600">{leadDetails.emailStats.clicked}/{leadDetails.emailStats.sent}</Text>
                </div>
              </div>
            </div>
          </div>

          {/* Call Statistics */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                  <PhoneIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <Heading level={2} className="text-lg font-semibold text-gray-900">Call Activity</Heading>
                  <Text className="text-sm text-gray-600">Phone interaction history</Text>
                </div>
              </div>
            </div>
            <div className="p-6 divide-y divide-gray-100">
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Calls Attempted</Text>
                  <Text className="text-sm text-gray-600">Total call attempts</Text>
                </div>
                <Text className="text-2xl font-semibold text-gray-900">{leadDetails.callStats.attempted}</Text>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Connection Rate</Text>
                  <Text className="text-sm text-gray-600">Successful connections</Text>
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-semibold text-gray-900">
                    {Math.round((leadDetails.callStats.connected / leadDetails.callStats.attempted) * 100)}%
                  </Text>
                  <Text className="text-sm text-gray-600">{leadDetails.callStats.connected}/{leadDetails.callStats.attempted}</Text>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text className="font-medium text-gray-900">Talk Time</Text>
                  <Text className="text-sm text-gray-600">Total conversation time</Text>
                </div>
                <Text className="text-2xl font-semibold text-gray-900">{leadDetails.callStats.duration}</Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Button>Schedule Call</Button>
          <Button outline>Send Email</Button>
          <Button outline>Book Tour</Button>
        </div>
        <div className="flex items-center space-x-3">
          <Text className="text-sm text-gray-600">Last updated: {leadDetails.lastTouch}</Text>
          <Button outline>Export Data</Button>
        </div>
      </div>
    </>
  )
} 