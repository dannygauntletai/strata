'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/dropdown'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Link } from '@/components/link'
import { Select } from '@/components/select'
import { getEvents } from '@/data'
import { EllipsisVerticalIcon, MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  CalendarDaysIcon,
} from '@heroicons/react/20/solid'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

function generateCalendarDays(year: number, month: number, events: any[]) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  const today = new Date()
  
  const days = []
  
  // Helper function to get events for a specific date
  const getEventsForDate = (dateString: string) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date).toISOString().split('T')[0]
      return eventDate === dateString
    }).map(event => {
      const eventDate = new Date(event.start_date).toISOString().split('T')[0]
      return {
        id: event.event_id,
        name: event.title,
        time: new Date(event.start_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        datetime: event.start_date,
        date: eventDate,
        href: `/coach/events/${event.event_id}`
      }
    })
  }
  
  // Add previous month's days
  const prevMonth = new Date(year, month - 1, 0)
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i)
    const dateString = date.toISOString().split('T')[0]
    days.push({
      date: dateString,
      isCurrentMonth: false,
      events: getEventsForDate(dateString)
    })
  }
  
  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateString = date.toISOString().split('T')[0]
    
    days.push({
      date: dateString,
      isCurrentMonth: true,
      isToday: dateString === today.toISOString().split('T')[0],
      events: getEventsForDate(dateString)
    })
  }
  
  // Add next month's days to complete the grid
  const totalCells = 42 // 6 rows × 7 days
  const remainingCells = totalCells - days.length
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day)
    const dateString = date.toISOString().split('T')[0]
    days.push({
      date: dateString,
      isCurrentMonth: false,
      events: getEventsForDate(dateString)
    })
  }
  
  return days
}

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function EventsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateFilter = searchParams.get('date') // Get date filter from URL
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [view, setView] = useState('month')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<any>(null)
  
  // Google Calendar integration state
  const [creatingGoogleEvents, setCreatingGoogleEvents] = useState<Record<string, boolean>>({})
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleCalendarStatus = async () => {
      try {
        const user = getCurrentUser()
        if (!user?.email) return

        const response = await fetch(`${API_BASE_URL}/coach/google-calendar/status?coach_email=${encodeURIComponent(user.email)}`)
        
        if (response.ok) {
          const data = await response.json()
          setGoogleCalendarConnected(data.connected)
        }
      } catch (error) {
        console.error('Error checking Google Calendar status:', error)
      }
    }
    checkGoogleCalendarStatus()
  }, [])

  // Create Google Calendar event
  const handleCreateGoogleCalendarEvent = async (event: any) => {
    if (!googleCalendarConnected) {
      alert('Please connect your Google Calendar in Settings first.')
      return
    }

    try {
      setCreatingGoogleEvents(prev => ({ ...prev, [event.event_id]: true }))
      
      const user = getCurrentUser()
      if (!user?.email) {
        alert('You must be logged in to create Google Calendar events')
        return
      }

      const response = await fetch('/api/google-calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tsa_event_id: event.event_id,
          coach_email: user.email
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert('Google Calendar event created successfully!')
      } else {
        alert(result.error || 'Failed to create Google Calendar event')
      }
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
      alert('Failed to create Google Calendar event')
    } finally {
      setCreatingGoogleEvents(prev => ({ ...prev, [event.event_id]: false }))
    }
  }

  const days = useMemo(() => {
    return generateCalendarDays(currentDate.getFullYear(), currentDate.getMonth(), events)
  }, [currentDate, events])

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true)
        const user = getCurrentUser()
        if (!user?.email) {
          console.error('No user email available')
          return
        }

        // Call Lambda API with coach filtering
        const response = await fetch(`${API_BASE_URL}/events?created_by=${encodeURIComponent(user.email)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        const data = await response.json()
        setEvents(data.events || [])
      } catch (error) {
        console.error('Failed to load events:', error)
        // Fallback to mock data if API fails
        const eventData = await getEvents()
        setEvents(eventData)
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  // Function to refresh events data
  const refreshEvents = async () => {
    try {
      const user = getCurrentUser()
      if (!user?.email) return

      const response = await fetch(`${API_BASE_URL}/events?created_by=${encodeURIComponent(user.email)}`)
      if (!response.ok) return

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to refresh events:', error)
    }
  }

  // Set up periodic refresh to keep participant counts current
  useEffect(() => {
    const refreshInterval = setInterval(refreshEvents, 30000) // Refresh every 30 seconds

    // Listen for focus events to refresh when user returns to tab
    const handleFocus = () => {
      refreshEvents()
    }
    
    window.addEventListener('focus', handleFocus)

    // Listen for custom events from individual event pages
    const handleEventUpdate = () => {
      refreshEvents()
    }
    
    window.addEventListener('eventUpdated', handleEventUpdate)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('eventUpdated', handleEventUpdate)
    }
  }, [])

  useEffect(() => {
    // Set today as selected day by default only once or when currentDate changes
    const today = days.find(day => day.isToday)
    if (today && !selectedDay) {
      setSelectedDay(today)
    }
  }, [currentDate, days, selectedDay])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleAddEvent = () => {
    const createUrl = dateFilter 
      ? `/coach/events/create?date=${dateFilter}`
      : '/coach/events/create'
    router.push(createUrl)
  }

  const handleDeleteEvent = (event: any) => {
    setEventToDelete(event)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!eventToDelete) return
    
    try {
      setDeleteLoading(true)
      const response = await fetch(`${API_BASE_URL}/events/${eventToDelete.event_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }

      // Remove the event from the local state
      setEvents(prev => prev.filter(e => e.event_id !== eventToDelete.event_id))
      
      console.log('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete event')
    } finally {
      setDeleteLoading(false)
      setShowDeleteDialog(false)
      setEventToDelete(null)
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Heading className="text-3xl font-bold text-gray-900">Events</Heading>
          {dateFilter && (
            <p className="mt-2 text-gray-600">
              Events for {formatEventDate(dateFilter)}
              <button
                onClick={() => router.push('/coach/events')}
                className="ml-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                (View all events)
              </button>
            </p>
          )}
          {!dateFilter && (
            <p className="mt-2 text-gray-600">Manage and organize your coaching events</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            href="/coach/events/calendar"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
          <Button color="blue" onClick={handleAddEvent}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            {dateFilter ? `No events on ${formatEventDate(dateFilter)}` : 'No events found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {dateFilter 
              ? 'Create a new event for this date.' 
              : 'Get started by creating your first event.'
            }
          </p>
          <div className="mt-6">
            <Button color="blue" onClick={handleAddEvent}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.event_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Event image or placeholder */}
              <div className="aspect-video bg-gray-100 relative">
                {event.photos && event.photos.length > 0 ? (
                  <img 
                    className="w-full h-full object-cover" 
                    src={event.photos[0].url} 
                    alt={event.title}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <CalendarDaysIcon className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <div className="bg-white rounded-lg px-2 py-1 text-xs font-semibold text-gray-900">
                    {formatDateShort(event.start_date)}
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <Dropdown>
                    <DropdownButton className="bg-white/80 hover:bg-white rounded-lg p-2">
                      <EllipsisVerticalIcon className="w-4 h-4 text-gray-700" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem href={`/coach/events/${event.event_id}`}>View</DropdownItem>
                      <DropdownItem href={`/coach/events/${event.event_id}/edit`}>Edit</DropdownItem>
                      {googleCalendarConnected && (
                        <DropdownItem 
                          onClick={() => handleCreateGoogleCalendarEvent(event)}
                          disabled={creatingGoogleEvents[event.event_id]}
                        >
                          {creatingGoogleEvents[event.event_id] ? 'Adding to Calendar...' : 'Add to Google Calendar'}
                        </DropdownItem>
                      )}
                      <DropdownItem onClick={() => handleDeleteEvent(event)}>Delete</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>

              {/* Event content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    <Link href={`/coach/events/${event.event_id}`} className="hover:text-blue-600">
                      {event.title}
                    </Link>
                  </h3>
                  {event.event_type && (
                    <Badge 
                      color={
                        event.event_type === 'training' ? 'blue' :
                        event.event_type === 'tournament' ? 'red' :
                        event.event_type === 'meeting' ? 'green' :
                        event.event_type === 'camp' ? 'purple' :
                        'zinc'
                      }
                    >
                      {event.event_type}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>{formatEventTime(event.start_date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{event.current_participants || 0}/{event.max_participants || '∞'} participants</span>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}

                {event.cost && (
                  <div className="text-lg font-semibold text-green-600 mb-4">
                    ${event.cost}
                  </div>
                )}

                {/* Card actions */}
                <div className="flex gap-3 mt-auto pt-4">
                  <Button
                    href={`/coach/events/${event.event_id}`}
                    className="flex-1"
                    outline
                  >
                    View Details
                  </Button>
                  <Button
                    href={`/coach/events/${event.event_id}/edit`}
                    color="blue"
                    className="flex-1"
                  >
                    Edit Event
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md space-y-4 bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
            </div>
            <p className="text-gray-600">
              Are you sure you want to delete &ldquo;{eventToDelete?.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button outline onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                color="red" 
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Event'}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default function Events() {
  return (
    <Suspense fallback={
      <>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </>
    }>
      <EventsContent />
    </Suspense>
  )
}