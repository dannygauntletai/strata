'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect, useCallback } from 'react'
import { config } from '@/config/environments'

// API Configuration
const API_BASE_URL = config.apiEndpoints.parentApi

interface CalendarEvent {
  event_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  date: string
  type: 'appointment' | 'training' | 'assessment' | 'meeting' | 'deadline' | 'reminder'
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  location?: string
  coach_name?: string
  student_name?: string
  enrollment_id?: string
  meeting_link?: string
  notes?: string
}

interface CalendarDay {
  date: Date
  events: CalendarEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

function ScheduleContent() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getViewStartDate = useCallback(() => {
    const date = new Date(currentDate)
    switch (viewMode) {
      case 'month':
        date.setDate(1)
        date.setDate(date.getDate() - date.getDay())
        return date
      case 'week':
        date.setDate(date.getDate() - date.getDay())
        return date
      case 'day':
        return date
      default:
        return date
    }
  }, [currentDate, viewMode])

  const getViewEndDate = useCallback(() => {
    const date = new Date(currentDate)
    switch (viewMode) {
      case 'month':
        date.setMonth(date.getMonth() + 1, 0) // Last day of current month
        date.setDate(date.getDate() + (6 - date.getDay())) // End of week
        return date
      case 'week':
        date.setDate(date.getDate() - date.getDay() + 6)
        return date
      case 'day':
        return date
      default:
        return date
    }
  }, [currentDate, viewMode])

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      // Calculate date range based on view mode
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const response = await fetch(
        `${API_BASE_URL}/admissions/calendar/events?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`)
      }

      const data = await response.json()
      setEvents(data.events || [])
      
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [getViewStartDate, getViewEndDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const getCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = []
    const startDate = getViewStartDate()
    const endDate = getViewEndDate()
    
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const dayEvents = events.filter(event => event.date === dateStr)
      
      days.push({
        date: new Date(current),
        events: dayEvents,
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.toDateString() === new Date().toDateString(),
        isSelected: selectedDate ? current.toDateString() === selectedDate.toDateString() : false
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'meeting':
        return <UserIcon className="h-3 w-3" />
      case 'training':
        return <CalendarDaysIcon className="h-3 w-3" />
      case 'deadline':
        return <ClockIcon className="h-3 w-3" />
      default:
        return <CalendarDaysIcon className="h-3 w-3" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'training':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'assessment':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'meeting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'deadline':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'reminder':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge color="green">Confirmed</Badge>
      case 'completed':
        return <Badge color="blue">Completed</Badge>
      case 'cancelled':
        return <Badge color="red">Cancelled</Badge>
      default:
        return <Badge color="amber">Pending</Badge>
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateHeader = () => {
    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'week':
        const weekStart = getViewStartDate()
        const weekEnd = getViewEndDate()
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'day':
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      default:
        return ''
    }
  }

  const selectedDateEvents = selectedDate 
    ? events.filter(event => event.date === selectedDate.toISOString().split('T')[0])
    : []

  if (loading) {
    return (
      <ParentPortalLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto mb-4"></div>
            <span className="text-gray-600">Loading schedule...</span>
          </div>
        </div>
      </ParentPortalLayout>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading className="text-2xl font-bold">Microschool Schedule</Heading>
          <Subheading>Schedule tours, shadow days, and stay connected with your coach</Subheading>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => window.location.href = '/parent/enrollment/schedule'}
            className="bg-[#004aad] hover:bg-[#003888] text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Schedule Visit
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-700">{error}</span>
          <Button onClick={fetchEvents} className="ml-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => navigateDate('prev')}
                color="zinc"
                className="p-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              
              <span className="font-semibold text-lg min-w-0 text-center">
                {formatDateHeader()}
              </span>
              
              <Button
                onClick={() => navigateDate('next')}
                color="zinc"
                className="p-2"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={goToToday}
              color="blue"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <Button
                key={mode}
                onClick={() => setViewMode(mode)}
                color={viewMode === mode ? 'blue' : 'zinc'}
                className={`capitalize ${viewMode === mode ? 'bg-blue-600 text-white' : ''}`}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200">
            {viewMode === 'month' && (
              <>
                {/* Month Header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-4 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-7">
                  {getCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(day.date)}
                      className={`min-h-24 p-2 border-r border-b border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                        !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                      } ${day.isToday ? 'bg-blue-50' : ''} ${day.isSelected ? 'bg-blue-100' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {day.events.slice(0, 2).map((event) => (
                          <div
                            key={event.event_id}
                            className={`text-xs p-1 rounded border ${getEventTypeColor(event.type)} truncate`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {day.events.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{day.events.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <div className="space-y-4 p-4">
                {getCalendarDays().map((day, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                        {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      <Badge color="zinc">{day.events.length} events</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {day.events.map((event) => (
                        <div
                          key={event.event_id}
                          className={`p-3 rounded border ${getEventTypeColor(event.type)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm opacity-75">
                                {formatTime(event.start_time)} - {formatTime(event.end_time)}
                              </div>
                              {event.location && (
                                <div className="text-sm opacity-75 flex items-center mt-1">
                                  <MapPinIcon className="h-3 w-3 mr-1" />
                                  {event.location}
                                </div>
                              )}
                            </div>
                            {getStatusBadge(event.status)}
                          </div>
                        </div>
                      ))}
                      {day.events.length === 0 && (
                        <div className="text-gray-500 text-sm text-center py-4">
                          No events scheduled
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'day' && (
              <div className="p-4">
                <div className="space-y-3">
                  {events
                    .filter(event => event.date === currentDate.toISOString().split('T')[0])
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((event) => (
                      <div
                        key={event.event_id}
                        className={`p-4 rounded border ${getEventTypeColor(event.type)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getEventTypeIcon(event.type)}
                            <span className="font-medium">{event.title}</span>
                          </div>
                          {getStatusBadge(event.status)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-4">
                            <span>🕐 {formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                            {event.location && (
                              <span className="flex items-center">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {event.location}
                              </span>
                            )}
                          </div>
                          
                          {event.coach_name && (
                            <div>👨‍🏫 Coach: {event.coach_name}</div>
                          )}
                          
                          {event.student_name && (
                            <div>👨‍🎓 Student: {event.student_name}</div>
                          )}
                          
                          {event.description && (
                            <div className="bg-white bg-opacity-50 p-2 rounded">
                              {event.description}
                            </div>
                          )}
                          
                          {event.meeting_link && (
                            <div>
                              <a 
                                href={event.meeting_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Join Virtual Meeting
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                  {events.filter(event => event.date === currentDate.toISOString().split('T')[0]).length === 0 && (
                    <div className="text-center py-12">
                      <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <span className="text-gray-500">No events scheduled for this day</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Details Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Heading className="text-lg font-semibold mb-4">
              {selectedDate 
                ? `Events for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Select a date'}
            </Heading>
            
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDaysIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <span className="text-gray-500 text-sm">No events</span>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div key={event.event_id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{event.title}</span>
                      {getStatusBadge(event.status)}
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>🕐 {formatTime(event.start_time)} - {formatTime(event.end_time)}</div>
                      {event.location && <div>📍 {event.location}</div>}
                      {event.coach_name && <div>👨‍🏫 {event.coach_name}</div>}
                    </div>
                    
                    {event.enrollment_id && (
                      <div className="mt-2">
                        <Button
                          onClick={() => window.location.href = `/enrollment/${event.enrollment_id}`}
                          color="blue"
                          className="text-xs py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Heading className="text-lg font-semibold mb-4">This Month</Heading>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total Events:</span>
                <span className="font-medium">{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Appointments:</span>
                <span className="font-medium">
                  {events.filter(e => e.type === 'appointment').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Training Sessions:</span>
                <span className="font-medium">
                  {events.filter(e => e.type === 'training').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Confirmed:</span>
                <span className="font-medium text-green-600">
                  {events.filter(e => e.status === 'confirmed').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <ParentPortalLayout>
      <ScheduleContent />
    </ParentPortalLayout>
  )
} 