'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Calendar } from '@/components/scheduling/Calendar'
import { AvailabilityManager } from '@/components/scheduling/AvailabilityManager'
import {
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  CogIcon,
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
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

// Mock data - in real app this would come from API
const mockAvailabilityRules: AvailabilityRule[] = [
  {
    id: 'rule-1',
    coachId: 'coach-123',
    eventTypeId: 'call-event-1',
    type: 'recurring',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rule-2',
    coachId: 'coach-123',
    eventTypeId: 'call-event-1',
    type: 'recurring',
    dayOfWeek: 2, // Tuesday
    startTime: '10:00',
    endTime: '16:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rule-3',
    coachId: 'coach-123',
    eventTypeId: 'call-event-1',
    type: 'recurring',
    dayOfWeek: 4, // Thursday
    startTime: '08:00',
    endTime: '15:00',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }
]

const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    eventTypeId: 'call-event-1',
    coachId: 'coach-123',
    date: '2024-01-16',
    startTime: '10:00',
    endTime: '10:30',
    status: 'confirmed',
    parentName: 'Jennifer Chen',
    parentEmail: 'jennifer.chen@email.com',
    parentPhone: '(555) 123-4567',
    studentName: 'Alex Chen',
    studentAge: 8,
    notes: 'Interested in STEM programs for gifted student',
    customAnswers: {
      'student-grade': '3rd',
      'interests': 'Math, Science, Robotics'
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    confirmedAt: '2024-01-15T10:05:00Z',
    reminderSent: false,
    confirmationSent: true,
  },
  {
    id: 'booking-2',
    eventTypeId: 'call-event-1',
    coachId: 'coach-123',
    date: '2024-01-17',
    startTime: '14:00',
    endTime: '14:30',
    status: 'confirmed',
    parentName: 'Marcus Williams',
    parentEmail: 'marcus.williams@email.com',
    parentPhone: '(555) 987-6543',
    studentName: 'Emma Williams',
    studentAge: 10,
    notes: 'Looking for advanced language arts curriculum',
    customAnswers: {
      'student-grade': '5th',
      'interests': 'Reading, Writing, Literature'
    },
    createdAt: '2024-01-16T14:00:00Z',
    updatedAt: '2024-01-16T14:00:00Z',
    reminderSent: false,
    confirmationSent: true,
  },
]

export default function ConsultationCallsPage() {
  const [eventType] = useState<EventType>(() => ({
    id: 'call-event-1',
    ...DEFAULT_EVENT_TYPES[0]
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
    title: `Call: ${booking.parentName}`,
    type: 'booking',
    eventType: 'call',
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
      
      // Generate individual time slots based on event duration
      const startHour = parseInt(rule.startTime!.split(':')[0])
      const startMinute = parseInt(rule.startTime!.split(':')[1])
      const endHour = parseInt(rule.endTime!.split(':')[0])
      const endMinute = parseInt(rule.endTime!.split(':')[1])
      
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      // Create slots every [duration] minutes
      for (let slotStart = startTotalMinutes; slotStart + eventType.duration <= endTotalMinutes; slotStart += eventType.duration) {
        const slotEnd = slotStart + eventType.duration
        
        const slotStartTime = `${Math.floor(slotStart / 60).toString().padStart(2, '0')}:${(slotStart % 60).toString().padStart(2, '0')}`
        const slotEndTime = `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`
        
        // Check if this specific slot is booked
        const isSlotBooked = bookings.some(booking => 
          booking.date === dateStr &&
          booking.startTime === slotStartTime
        )
        
        if (!isSlotBooked) {
          availabilityEvents.push({
            id: `slot-${rule.id}-${dateStr}-${slotStartTime}`,
            title: `Open Slot`,
            type: 'availability',
            eventType: 'call',
            date: dateStr,
            startTime: slotStartTime,
            endTime: slotEndTime,
            color: '#E5F3FF', // Light blue for available slots
          })
        }
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
    // In real app, this would call API to save rules
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
            <span className="text-gray-900 font-medium">Consultation Calls</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1} className="text-2xl font-semibold text-gray-900">
              Consultation Call Scheduling
            </Heading>
            <Text className="text-gray-600 mt-1">
              Manage your availability and view upcoming consultation calls with prospective families
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
              <PhoneIcon className="h-4 w-4 mr-2" />
              Book Manual Call
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">Today&apos;s Calls</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {todaysBookings.length}
              </Text>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <ChartBarIcon className="h-5 w-5 text-green-600" />
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
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <Text className="text-sm font-medium text-gray-500">Total Booked</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {bookings.length}
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
              <Text className="text-sm font-medium text-gray-500">Duration</Text>
              <Text className="text-2xl font-semibold text-gray-900 mt-1">
                {eventType.duration}min
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
          {/* Upcoming Bookings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mr-3">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <Heading level={3} className="text-lg font-semibold text-gray-900">
                    Upcoming Calls
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
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <PhoneIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {booking.parentName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Student: {booking.studentName}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Badge color="blue">
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
                  <PhoneIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Text className="text-gray-500">No upcoming calls</Text>
                </div>
              )}
            </div>
          </div>

          {/* Event Type Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <Heading level={3} className="text-lg font-semibold text-gray-900">
                Call Settings
              </Heading>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Duration</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {eventType.duration} minutes
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
                  {eventType.maxBookingsPerDay} calls
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Advance Notice</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {eventType.advanceNotice} hours
                </Text>
              </div>
              <Button outline className="w-full mt-4">
                <CogIcon className="h-4 w-4 mr-2" />
                Edit Settings
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

      {/* Booking Details Modal */}
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
                    Call Details
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
                        Grade: {selectedBooking.customAnswers?.['student-grade']}
                      </Text>
                    </div>
                  </div>
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Schedule</Text>
                  <div className="flex items-center space-x-4">
                    <Badge color="blue">
                      {new Date(selectedBooking.date).toLocaleDateString()}
                    </Badge>
                    <Badge color="green">
                      {selectedBooking.startTime} - {selectedBooking.endTime}
                    </Badge>
                    <Badge color={selectedBooking.status === 'confirmed' ? 'green' : 'amber'}>
                      {selectedBooking.status}
                    </Badge>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Notes</Text>
                    <Text className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedBooking.notes}
                    </Text>
                  </div>
                )}

                {selectedBooking.customAnswers?.['interests'] && (
                  <div>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Student Interests</Text>
                    <Text className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedBooking.customAnswers['interests']}
                    </Text>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button outline>
                    Reschedule
                  </Button>
                  <Button outline>
                    Cancel Call
                  </Button>
                  <Button>
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Start Call
                  </Button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
} 