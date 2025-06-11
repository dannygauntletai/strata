'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  DocumentIcon,
  AcademicCapIcon,
  UserIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { config } from '@/config/environments'

// API Configuration
const API_BASE_URL = config.apiEndpoints.parentApi

interface TimelineStep {
  step_number: number
  title: string
  description: string
  status: 'completed' | 'current' | 'upcoming' | 'blocked'
  completed_date?: string
  due_date?: string
  actions?: string[]
  documents_required?: string[]
}

interface StudentTimeline {
  enrollment_id: string
  student_name: string
  coach_name: string
  sport_interest: string
  current_step: number
  total_steps: number
  status: string
  timeline_steps: TimelineStep[]
}

function TimelineContent() {
  const [timelines, setTimelines] = useState<StudentTimeline[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTimelines()
  }, [])

  const fetchTimelines = async () => {
    try {
      setLoading(true)
      setError('')
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/admissions/enrollments/timeline`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.status}`)
      }

      const data = await response.json()
      setTimelines(data.timelines || [])
      
      // Auto-select first student
      if (data.timelines && data.timelines.length > 0) {
        setSelectedStudent(data.timelines[0].enrollment_id)
      }
      
    } catch (err) {
      console.error('Error fetching timeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />
      case 'current':
        return <ClockIcon className="h-6 w-6 text-blue-600" />
      case 'blocked':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
      default:
        return <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
    }
  }

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'green' as const, text: 'Completed' }
      case 'current':
        return { color: 'blue' as const, text: 'In Progress' }
      case 'blocked':
        return { color: 'red' as const, text: 'Blocked' }
      default:
        return { color: 'zinc' as const, text: 'Upcoming' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const selectedTimeline = timelines.find(t => t.enrollment_id === selectedStudent)

  if (loading) {
    return (
      <ParentPortalLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto mb-4"></div>
            <span className="text-gray-600">Loading your journey...</span>
          </div>
        </div>
      </ParentPortalLayout>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading className="text-2xl font-bold">Microschool Journey</Heading>
        <Subheading>Track your enrollment progress from application to first day</Subheading>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-700">{error}</span>
          <Button onClick={fetchTimelines} className="ml-4">
            Try Again
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student Selector */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Heading className="text-lg font-semibold mb-4">Students</Heading>
            {timelines.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <AcademicCapIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <span className="text-sm">No enrollments found</span>
              </div>
            ) : (
              <div className="space-y-2">
                {timelines.map((timeline) => (
                  <div
                    key={timeline.enrollment_id}
                    onClick={() => setSelectedStudent(timeline.enrollment_id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStudent === timeline.enrollment_id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="font-medium text-sm">{timeline.student_name}</div>
                    <div className="text-xs text-gray-600">{timeline.sport_interest}</div>
                    <div className="text-xs text-gray-500">Coach: {timeline.coach_name}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{timeline.current_step}/{timeline.total_steps}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(timeline.current_step / timeline.total_steps) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Details */}
        <div className="lg:col-span-3">
          {selectedTimeline ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Student Header */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                <div>
                  <Heading className="text-xl font-semibold">{selectedTimeline.student_name}</Heading>
                  <div className="text-gray-600">
                    {selectedTimeline.sport_interest} • Coach: {selectedTimeline.coach_name}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    color="zinc"
                    onClick={() => window.location.href = `/enrollment/${selectedTimeline.enrollment_id}`}
                  >
                    View Enrollment
                  </Button>
                  <Button 
                    color="blue"
                    onClick={() => window.location.href = `/messages`}
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                    Message Coach
                  </Button>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-6">
                {selectedTimeline.timeline_steps.map((step, index) => (
                  <div key={step.step_number} className="relative">
                    {/* Connector Line */}
                    {index < selectedTimeline.timeline_steps.length - 1 && (
                      <div className="absolute left-3 top-8 w-0.5 h-16 bg-gray-200"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      {/* Step Icon */}
                      <div className="flex-shrink-0">
                        {getStepIcon(step.status)}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Heading className="text-lg font-semibold">{step.title}</Heading>
                            <Badge color={getStepStatus(step.status).color}>
                              {getStepStatus(step.status).text}
                            </Badge>
                          </div>
                          {step.completed_date && (
                            <span className="text-sm text-gray-500">
                              Completed: {formatDate(step.completed_date)}
                            </span>
                          )}
                          {step.due_date && step.status === 'current' && (
                            <span className="text-sm text-amber-600">
                              Due: {formatDate(step.due_date)}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3">{step.description}</p>

                        {/* Actions */}
                        {step.actions && step.actions.length > 0 && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">Actions:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                              {step.actions.map((action, actionIndex) => (
                                <li key={actionIndex}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Required Documents */}
                        {step.documents_required && step.documents_required.length > 0 && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">Required Documents:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                              {step.documents_required.map((doc, docIndex) => (
                                <li key={docIndex}>{doc}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {step.status === 'current' && (
                          <div className="flex space-x-2 mt-4">
                            {step.documents_required && step.documents_required.length > 0 && (
                              <Button 
                                color="blue"
                                onClick={() => window.location.href = `/enrollment/documents?enrollment_id=${selectedTimeline.enrollment_id}`}
                              >
                                <DocumentIcon className="h-4 w-4 mr-2" />
                                Upload Documents
                              </Button>
                            )}
                            {step.title.includes('Consultation') && (
                              <Button 
                                color="blue"
                                onClick={() => window.location.href = `/enrollment/schedule?enrollment_id=${selectedTimeline.enrollment_id}`}
                              >
                                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                                Schedule Meeting
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <Heading className="text-xl text-gray-600 mb-2">Select a Student</Heading>
              <p className="text-gray-500">Choose a student from the left to view their enrollment timeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  return (
    <ParentPortalLayout>
      <TimelineContent />
    </ParentPortalLayout>
  )
} 