'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Calendar } from '@/components/scheduling/Calendar'
import { AvailabilityManager } from '@/components/scheduling/AvailabilityManager'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CogIcon,
  ChartBarIcon,
  UserGroupIcon, 
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import Link from 'next/link'
import { 
  EventType, 
  AvailabilityRule, 
  Booking, 
  CalendarView, 
  CalendarEvent,
  DEFAULT_EVENT_TYPES 
} from '@/types/scheduling'

// Mock data for shadow days
const mockAvailabilityRules: AvailabilityRule[] = [
  {
    id: 'shadow-rule-1',
    coachId: 'coach-123',
    eventTypeId: 'shadow-event-1',
    type: 'recurring',
    dayOfWeek: 1, // Monday
    startTime: '08:00',
    endTime: '12:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'shadow-rule-2',
    coachId: 'coach-123',
    eventTypeId: 'shadow-event-1',
    type: 'recurring',
    dayOfWeek: 3, // Wednesday
    startTime: '08:00',
    endTime: '12:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'shadow-rule-3',
    coachId: 'coach-123',
    eventTypeId: 'shadow-event-1',
    type: 'recurring',
    dayOfWeek: 5, // Friday
    startTime: '08:00',
    endTime: '12:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }
]

const mockBookings: Booking[] = [
  {
    id: 'shadow-booking-1',
    eventTypeId: 'shadow-event-1',
    coachId: 'coach-123',
    date: '2024-01-22',
    startTime: '08:00',
    endTime: '12:00',
    status: 'confirmed',
    parentName: 'Lisa Chen',
    parentEmail: 'lisa.chen@email.com',
    parentPhone: '(555) 234-5678',
    studentName: 'Sophie Chen',
    studentAge: 11,
    notes: 'Sophie is particularly interested in science and math classes. She\'s a bit shy but very curious.',
    customAnswers: {
      'student-grade-shadow': '5th',
      'dietary-restrictions': 'Vegetarian, no nuts',
      'emergency-contact': 'Dad - (555) 234-5679'
    },
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
    confirmedAt: '2024-01-18T10:05:00Z',
    reminderSent: false,
    confirmationSent: true,
  },
  {
    id: 'shadow-booking-2',
    eventTypeId: 'shadow-event-1',
    coachId: 'coach-123',
    date: '2024-01-24',
    startTime: '08:00',
    endTime: '12:00',
    status: 'pending',
    parentName: 'Robert Martinez',
    parentEmail: 'robert.martinez@email.com',
    parentPhone: '(555) 345-6789',
    studentName: 'Carlos Martinez',
    studentAge: 13,
    notes: 'Carlos is interested in exploring different subjects to find his passion. Family is considering enrollment for next school year.',
    customAnswers: {
      'student-grade-shadow': '7th',
      'dietary-restrictions': 'No dietary restrictions',
      'emergency-contact': 'Mom - (555) 345-6780'
    },
    createdAt: '2024-01-19T14:00:00Z',
    updatedAt: '2024-01-19T14:00:00Z',
    reminderSent: false,
    confirmationSent: false,
  },
]

export default function ShadowDaysPage() {
  const [eventType] = useState<EventType>(() => ({
    id: 'shadow-event-1',
    ...DEFAULT_EVENT_TYPES[2] // Shadow day event type
  }))
  
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>(mockAvailabilityRules)
  const [bookings, setBookings] = useState<Booking[]>(mockBookings)
  const [showAvailabilityManager, setShowAvailabilityManager] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  
  const [calendarView, setCalendarView] = useState<CalendarView>({
    type: 'month',
    currentDate: new Date(),
    selectedDate: new Date()
  })

  // Convert bookings to calendar events
  const calendarEvents: CalendarEvent[] = bookings.map(booking => ({
    id: booking.id,
    title: `Shadow Day: ${booking.studentName}`,
    type: 'booking',
    eventType: 'shadow-day',
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    color: eventType.color,
    parentName: booking.parentName,
    studentName: booking.studentName,
    status: booking.status,
  }))

  // Generate availability time slots for the next 30 days
  const availabilityEvents: CalendarEvent[] = []
  const today = new Date()
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayOfWeek = date.getDay()
    
    const dayRules = availabilityRules.filter(rule => 
      rule.type === 'recurring' && 
      rule.dayOfWeek === dayOfWeek && 
      rule.isActive &&
      rule.eventTypeId === eventType.id
    )
    
    dayRules.forEach(rule => {
      const dateStr = date.toISOString().split('T')[0]
      
      // For shadow days, show the full available block since they're typically 4-hour experiences
      const isDateBooked = bookings.some(booking => 
        booking.date === dateStr &&
        booking.startTime === rule.startTime!
      )
      
      if (!isDateBooked) {
        availabilityEvents.push({
          id: `shadow-slot-${rule.id}-${dateStr}`,
          title: `Open Shadow Day`,
          type: 'availability',
          eventType: 'shadow-day',
          date: dateStr,
          startTime: rule.startTime!,
          endTime: rule.endTime!,
          color: '#FDF4FF', // Light purple for available shadow day slots
        })
      }
    })
  }

  const allEvents = [...calendarEvents, ...availabilityEvents]

  const handleDateSelect = (date: Date) => {
    setCalendarView(prev => ({ ...prev, selectedDate: date }))
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'booking') {
      const booking = bookings.find(b => b.id === event.id)
      if (booking) {
        setSelectedBooking(booking)
      }
    }
  }

  const handleSaveAvailability = (rules: AvailabilityRule[]) => {
    setAvailabilityRules(rules)
    setShowAvailabilityManager(false)
  }

  const upcomingBookings = bookings
    .filter(b => new Date(b.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const todaysBookings = bookings.filter(b => {
    const today = new Date().toISOString().split('T')[0]
    return b.date === today
  })

  const thisWeekBookings = bookings.filter(b => {
    const today = new Date()
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
    const weekEnd = new Date(today.setDate(weekStart.getDate() + 6))
    const bookingDate = new Date(b.date)
    return bookingDate >= weekStart && bookingDate <= weekEnd
  })

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const pendingBookings = bookings.filter(b => b.status === 'pending')

  // Lock scroll when modals are open
  useEffect(() => {
    if (showAvailabilityManager || selectedBooking) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAvailabilityManager, selectedBooking])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link 
              href="/coach/registrations" 
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Registrations
            </Link>
          </li>
          <li>
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          </li>
          <li>
            <span className="text-gray-900 font-medium">Shadow Days</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1} className="text-2xl font-semibold text-gray-900">
              Shadow Day Scheduling
        </Heading>
            <Text className="text-gray-600 mt-1">
              Manage shadow day availability and coordinate half-day student experiences
        </Text>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              outline 
              onClick={() => setShowAvailabilityManager(true)}
            >
              <CogIcon className="h-4 w-4 mr-2" />
              Set Availability
            </Button>
            <Button>
              <CalendarDaysIcon className="h-4 w-4 mr-2" />
              Book Manual Shadow Day
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">Today&apos;s Shadow Days</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {todaysBookings.length}
              </Text>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">This Week</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {thisWeekBookings.length}
              </Text>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">Confirmed</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {confirmedBookings.length}
              </Text>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">Pending</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {pendingBookings.length}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Calendar
            view={calendarView}
            onViewChange={setCalendarView}
            events={allEvents}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
            selectedDate={calendarView.selectedDate}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Shadow Days */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mr-3">
                    <AcademicCapIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <Heading level={3} className="text-lg font-semibold text-gray-900">
                    Upcoming Shadow Days
                  </Heading>
                </div>

              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {upcomingBookings.map(booking => (
                <div 
                  key={booking.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center">
                      <AcademicCapIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {booking.studentName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Parent: {booking.parentName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Grade: {booking.customAnswers?.['student-grade-shadow']}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Badge color={booking.status === 'confirmed' ? 'green' : 'amber'}>
                        {booking.status}
                      </Badge>
                      <Text className="text-xs text-gray-500 mt-1">
                        {new Date(booking.date).toLocaleDateString()} {booking.startTime}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingBookings.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <AcademicCapIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Text className="text-gray-500">No upcoming shadow days</Text>
                </div>
              )}
            </div>
          </div>

          {/* Shadow Day Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={3} className="text-lg font-semibold text-gray-900">
                Shadow Day Settings
              </Heading>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Duration</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {Math.floor(eventType.duration / 60)}h {eventType.duration % 60}m
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Buffer Time</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {eventType.bufferTimeBefore}min before, {eventType.bufferTimeAfter}min after
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Max per Day</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {eventType.maxBookingsPerDay} students
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Advance Notice</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {eventType.advanceNotice} hours
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Requires Confirmation</Text>
                <Badge color={eventType.settings.requiresConfirmation ? 'green' : 'zinc'}>
                  {eventType.settings.requiresConfirmation ? 'Yes' : 'No'}
                </Badge>
              </div>
              <Button outline className="w-full mt-4">
                <CogIcon className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={3} className="text-lg font-semibold text-gray-900">
                Quick Actions
              </Heading>
            </div>
            <div className="p-6 space-y-3">
              <Button outline className="w-full justify-start">
                <BookOpenIcon className="h-4 w-4 mr-2" />
                Prepare Class Materials
              </Button>
              <Button outline className="w-full justify-start">
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Notify Teachers
              </Button>
              <Button outline className="w-full justify-start">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Send Confirmations
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Manager Modal */}
      {showAvailabilityManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
            onClick={() => setShowAvailabilityManager(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <AvailabilityManager
              eventType={eventType}
              availabilityRules={availabilityRules.filter(rule => 
                rule.eventTypeId === eventType.id || !rule.eventTypeId
              )}
              onSaveAvailability={handleSaveAvailability}
              onClose={() => setShowAvailabilityManager(false)}
            />
          </div>
        </div>
      )}

      {/* Shadow Day Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
            onClick={() => setSelectedBooking(null)} 
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-xl rounded-xl">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <Heading level={3} className="text-lg font-semibold text-gray-900">
                    Shadow Day Details
                  </Heading>
                  <Button outline onClick={() => setSelectedBooking(null)}>
                    <XCircleIcon className="h-4 w-4" />
                  </Button>
                </div>
      </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Parent Information</Text>
                    <div className="space-y-1">
                      <Text className="font-semibold text-gray-900">{selectedBooking.parentName}</Text>
                      <Text className="text-sm text-gray-600">{selectedBooking.parentEmail}</Text>
                      <Text className="text-sm text-gray-600">{selectedBooking.parentPhone}</Text>
                    </div>
                  </div>
                  
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Student Information</Text>
                    <div className="space-y-1">
                      <Text className="font-semibold text-gray-900">{selectedBooking.studentName}</Text>
                      <Text className="text-sm text-gray-600">Age: {selectedBooking.studentAge}</Text>
                      <Text className="text-sm text-gray-600">
                        Grade: {selectedBooking.customAnswers?.['student-grade-shadow']}
                      </Text>
                    </div>
                  </div>
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Shadow Day Schedule</Text>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Badge color="purple">
                        {new Date(selectedBooking.date).toLocaleDateString()}
                      </Badge>
                      <Badge color="blue">
                        {selectedBooking.startTime} - {selectedBooking.endTime}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge color={selectedBooking.status === 'confirmed' ? 'green' : 'amber'}>
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedBooking.customAnswers?.['emergency-contact'] && (
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Emergency Contact</Text>
                    <Text className="text-sm text-gray-900 bg-red-50 rounded-lg p-3 border border-red-200">
                      {selectedBooking.customAnswers['emergency-contact']}
                    </Text>
                  </div>
                )}

                {selectedBooking.customAnswers?.['dietary-restrictions'] && (
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</Text>
                    <Text className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
                      {selectedBooking.customAnswers['dietary-restrictions']}
                    </Text>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Notes</Text>
                    <Text className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedBooking.notes}
                    </Text>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button outline>
                    Reschedule
                  </Button>
                  <Button outline>
                    Cancel Shadow Day
                  </Button>
                  {selectedBooking.status === 'pending' && (
                    <Button>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button>
                      <AcademicCapIcon className="h-4 w-4 mr-2" />
                      Start Shadow Day
                    </Button>
                  )}
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
