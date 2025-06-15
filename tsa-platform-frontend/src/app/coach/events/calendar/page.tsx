'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/20/solid'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// Types
interface Event {
  event_id: string
  title: string
  start_date: string
  start_time: string
  end_date?: string
  end_time?: string
  location?: string
  description?: string
  event_type?: string
  max_participants?: number
  current_participants?: number
  cost?: number
  created_at: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function EventsCalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Load API endpoint from SSM
  useEffect(() => {
    getCoachApiUrl().then(setApiBaseUrl).catch(error => {
      console.error('Failed to load API endpoint:', error)
    })
  }, [])

  useEffect(() => {
    if (apiBaseUrl) {
      fetchEvents()
    }
  }, [apiBaseUrl])

  // Helper function to extract time from datetime string
  const formatEventTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } catch (error) {
      return ''
    }
  }

  const fetchEvents = async () => {
    if (!apiBaseUrl) return

    try {
      setLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }

      const response = await fetch(`${apiBaseUrl}/events?created_by=${encodeURIComponent(user.email)}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      } else {
        console.error('Failed to fetch events:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Days from previous month to show
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // Days from next month to show
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
    
    const days = []
    const currentDateIter = new Date(startDate)
    
    while (currentDateIter <= endDate) {
      const dateStr = currentDateIter.toISOString().split('T')[0]
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start_date).toISOString().split('T')[0]
        return eventDate === dateStr
      })
      
      days.push({
        date: new Date(currentDateIter),
        dateString: dateStr,
        isCurrentMonth: currentDateIter.getMonth() === month,
        isToday: currentDateIter.toDateString() === new Date().toDateString(),
        events: dayEvents
      })
      
      currentDateIter.setDate(currentDateIter.getDate() + 1)
    }
    
    // Group days into weeks
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return weeks
  }, [currentDate, events])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (date: Date, hasEvents: boolean) => {
    if (hasEvents) {
      // If there are events, go to events list filtered by this date
      const dateStr = date.toISOString().split('T')[0]
      router.push(`/coach/events?date=${dateStr}`)
    } else {
      // If no events, create a new event for this date
      const dateStr = date.toISOString().split('T')[0]
      router.push(`/coach/events/create?date=${dateStr}`)
    }
  }

  const handleEventClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    router.push(`/coach/events/${eventId}`)
  }

  const getEventTypeColor = (eventType?: string) => {
    switch (eventType?.toLowerCase()) {
      case 'training':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'tournament':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'meeting':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'camp':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'Events', href: '/coach/events' },
          { name: 'Calendar' }
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Heading className="text-3xl font-bold text-gray-900">Events Calendar</Heading>
          <p className="mt-2 text-gray-600">View and manage your events in calendar format</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            href="/coach/events"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            List View
          </Button>
          <Button
            color="blue"
            href="/coach/events/create"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            onClick={goToToday}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Today
          </Button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map((day) => (
            <div key={day} className="px-3 py-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarData.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`min-h-[120px] border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !day.isCurrentMonth ? 'bg-gray-50' : ''
                } ${day.isToday ? 'bg-blue-50' : ''}`}
                onClick={() => handleDateClick(day.date, day.events.length > 0)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      !day.isCurrentMonth
                        ? 'text-gray-400'
                        : day.isToday
                        ? 'text-blue-600 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                        : 'text-gray-900'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.events.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {day.events.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.event_id}
                      className={`text-xs px-2 py-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getEventTypeColor(event.event_type)}`}
                      onClick={(e) => handleEventClick(e, event.event_id)}
                      title={`${event.title} - ${formatEventTime(event.start_date)}`}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="flex items-center gap-1 text-xs opacity-75">
                        <ClockIcon className="h-3 w-3" />
                        <span>{formatEventTime(event.start_date)}</span>
                      </div>
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
          <span>Training</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Tournament</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
          <span>Camp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
          <span>Other</span>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-500">
        <p>Click on a date with events to view details, or click on an empty date to create a new event.</p>
      </div>
    </div>
  )
} 