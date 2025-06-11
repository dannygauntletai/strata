'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  AcademicCapIcon,
  ClockIcon,
  DocumentIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { config } from '@/config/environments'

// API Configuration
const API_BASE_URL = config.apiEndpoints.parentApi

interface Enrollment {
  enrollment_id: string
  student_first_name: string
  student_last_name: string
  grade_level: string
  sport_interest: string
  status: 'in_progress' | 'consultation_scheduled' | 'shadow_day_completed' | 'documents_pending' | 'enrolled' | 'completed'
  current_step: number
  total_steps: number
  created_at: string
  updated_at: string
  next_action?: string
  coach_name?: string
  school_name?: string
  progress_percentage?: number
}

function EnrollmentContent() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    fetchEnrollments()
  }, [])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      setError('')
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/admissions/enrollments`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch enrollments: ${response.status}`)
      }

      const data = await response.json()
      const enrollmentsData = data.enrollments || []
      
      // Calculate progress percentage for each enrollment
      const enrichedEnrollments = enrollmentsData.map((enrollment: Enrollment) => ({
        ...enrollment,
        progress_percentage: Math.round((enrollment.current_step / enrollment.total_steps) * 100)
      }))
      
      setEnrollments(enrichedEnrollments)
      
    } catch (err) {
      console.error('Error fetching enrollments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_progress: { color: 'amber' as const, text: 'In Progress' },
      consultation_scheduled: { color: 'blue' as const, text: 'Consultation Scheduled' },
      shadow_day_completed: { color: 'green' as const, text: 'Shadow Day Completed' },
      documents_pending: { color: 'amber' as const, text: 'Documents Pending' },
      enrolled: { color: 'green' as const, text: 'Enrolled' },
      completed: { color: 'green' as const, text: 'Completed' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'zinc' as const, text: status }
    return <Badge color={config.color}>{config.text}</Badge>
  }

  const getFilteredEnrollments = () => {
    switch (filter) {
      case 'active':
        return enrollments.filter(e => e.status !== 'completed' && e.status !== 'enrolled')
      case 'completed':
        return enrollments.filter(e => e.status === 'completed' || e.status === 'enrolled')
      default:
        return enrollments
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-600">Loading enrollments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading className="text-2xl font-bold">Student Enrollments</Heading>
          <Subheading>Manage and track your children&apos;s enrollment progress</Subheading>
        </div>
        <Button color="blue" className="bg-blue-600 hover:bg-blue-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Enrollment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <Button 
          color={filter === 'all' ? 'blue' : 'zinc'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600 text-white' : ''}
        >
          All ({enrollments.length})
        </Button>
        <Button 
          color={filter === 'active' ? 'blue' : 'zinc'}
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-blue-600 text-white' : ''}
        >
          Active ({enrollments.filter(e => e.status !== 'completed' && e.status !== 'enrolled').length})
        </Button>
        <Button 
          color={filter === 'completed' ? 'blue' : 'zinc'}
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-blue-600 text-white' : ''}
        >
          Completed ({enrollments.filter(e => e.status === 'completed' || e.status === 'enrolled').length})
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-700">{error}</span>
          <Button onClick={fetchEnrollments} className="ml-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Enrollments List */}
      <div className="space-y-4">
        {getFilteredEnrollments().length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <Heading className="text-xl text-gray-600 mb-2">No enrollments found</Heading>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? "You don't have any enrollments yet." 
                : `No ${filter} enrollments to display.`}
            </p>
            <Button color="blue" className="bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              Start New Enrollment
            </Button>
          </div>
        ) : (
          getFilteredEnrollments().map((enrollment) => (
            <div key={enrollment.enrollment_id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Heading className="text-xl font-semibold">
                      {enrollment.student_first_name} {enrollment.student_last_name}
                    </Heading>
                    {getStatusBadge(enrollment.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <AcademicCapIcon className="h-4 w-4 text-gray-400" />
                      <span>{enrollment.grade_level} • {enrollment.sport_interest}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Coach: {enrollment.coach_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{enrollment.school_name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {enrollment.current_step}/{enrollment.total_steps} steps ({enrollment.progress_percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${enrollment.progress_percentage}%` }}
                  />
                </div>
              </div>

              {/* Next Action */}
              {enrollment.next_action && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800 text-sm font-medium">Next: {enrollment.next_action}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.location.href = `/enrollment/${enrollment.enrollment_id}`}
                >
                  {enrollment.status === 'completed' || enrollment.status === 'enrolled' ? 'View' : 'Continue'}
                </Button>
                
                <Button 
                  color="zinc"
                  onClick={() => window.location.href = `/enrollment/documents?enrollment_id=${enrollment.enrollment_id}`}
                >
                  <DocumentIcon className="h-4 w-4 mr-2" />
                  Documents
                </Button>
                
                <Button 
                  color="zinc"
                  onClick={() => window.location.href = `/enrollment/schedule?enrollment_id=${enrollment.enrollment_id}`}
                >
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>

              {/* Metadata */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Started: {formatDate(enrollment.created_at)}</span>
                <span>Last updated: {formatDate(enrollment.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function EnrollmentsPage() {
  return (
    <ParentPortalLayout>
      <EnrollmentContent />
    </ParentPortalLayout>
  )
} 