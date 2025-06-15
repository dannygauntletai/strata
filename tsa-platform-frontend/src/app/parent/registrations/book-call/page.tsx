'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Input } from '@/components/input'
import {
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import { 
  EventType, 
  AvailabilitySlot, 
  Booking,
  DEFAULT_EVENT_TYPES 
} from '@/types/scheduling'

// Mock available time slots - in real app this would come from API
const mockAvailableSlots: AvailabilitySlot[] = [
  { date: '2024-01-18', startTime: '09:00', endTime: '09:30', isAvailable: true, isBooked: false },
  { date: '2024-01-18', startTime: '10:00', endTime: '10:30', isAvailable: true, isBooked: false },
  { date: '2024-01-18', startTime: '14:00', endTime: '14:30', isAvailable: true, isBooked: false },
  { date: '2024-01-19', startTime: '09:30', endTime: '10:00', isAvailable: true, isBooked: false },
  { date: '2024-01-19', startTime: '11:00', endTime: '11:30', isAvailable: true, isBooked: false },
  { date: '2024-01-19', startTime: '15:00', endTime: '15:30', isAvailable: true, isBooked: false },
  { date: '2024-01-22', startTime: '10:00', endTime: '10:30', isAvailable: true, isBooked: false },
  { date: '2024-01-22', startTime: '13:00', endTime: '13:30', isAvailable: true, isBooked: false },
  { date: '2024-01-23', startTime: '09:00', endTime: '09:30', isAvailable: true, isBooked: false },
  { date: '2024-01-23', startTime: '16:00', endTime: '16:30', isAvailable: true, isBooked: false },
]

interface BookingFormData {
  parentName: string
  parentEmail: string
  parentPhone: string
  studentName: string
  studentGrade: string
  interests: string
  selectedSlot: AvailabilitySlot | null
}

export default function ParentBookCallPage() {
  const [eventType] = useState<EventType>(() => ({
    id: 'call-event-1',
    ...DEFAULT_EVENT_TYPES[0]
  }))
  
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  
  const [formData, setFormData] = useState<BookingFormData>({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    studentName: '',
    studentGrade: '',
    interests: '',
    selectedSlot: null
  })

  const getWeekDates = (startDate: Date) => {
    const start = new Date(startDate)
    start.setDate(start.getDate() - start.getDay()) // Start from Sunday
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates(currentWeek)
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentWeek(newDate)
  }

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return mockAvailableSlots.filter(slot => slot.date === dateStr)
  }

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot)
    setFormData(prev => ({ ...prev, selectedSlot: slot }))
    setShowBookingForm(true)
  }

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBookingSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Here you would actually submit to your API
    console.log('Booking submitted:', formData)
    
    setIsSubmitting(false)
    setBookingComplete(true)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (bookingComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <Heading level={1} className="text-2xl font-semibold text-gray-900 mb-4">
            Consultation Call Booked!
          </Heading>
          <Text className="text-gray-600 mb-6 max-w-md mx-auto">
            Your consultation call has been successfully scheduled. You&apos;ll receive a confirmation email shortly with all the details.
          </Text>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <PhoneIcon className="h-5 w-5 text-blue-600 mr-2" />
              <Text className="font-semibold text-blue-900">Call Details</Text>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{new Date(selectedSlot!.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{formatTime(selectedSlot!.startTime)} - {formatTime(selectedSlot!.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{eventType.duration} minutes</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full">
              Add to Calendar
            </Button>
            <Button outline className="w-full" onClick={() => window.location.href = '/parent'}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showBookingForm) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Button outline onClick={() => setShowBookingForm(false)} className="mb-4">
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Back to Time Slots
          </Button>
          <Heading level={1} className="text-2xl font-semibold text-gray-900">
            Book Your Consultation Call
          </Heading>
          <Text className="text-gray-600 mt-1">
            Please provide your information to complete the booking
          </Text>
        </div>

        {/* Selected Time Slot */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <Text className="font-semibold text-blue-900">
                {new Date(selectedSlot!.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text className="text-blue-700">
                {formatTime(selectedSlot!.startTime)} - {formatTime(selectedSlot!.endTime)} ({eventType.duration} minutes)
              </Text>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Name *
              </label>
              <Input
                type="text"
                value={formData.parentName}
                onChange={(e) => handleInputChange('parentName', e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.parentEmail}
                onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <Input
                type="tel"
                value={formData.parentPhone}
                onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name *
              </label>
              <Input
                type="text"
                value={formData.studentName}
                onChange={(e) => handleInputChange('studentName', e.target.value)}
                placeholder="Your child's name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Grade *
            </label>
            <select
              value={formData.studentGrade}
              onChange={(e) => handleInputChange('studentGrade', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select grade level</option>
              <option value="Pre-K">Pre-K</option>
              <option value="Kindergarten">Kindergarten</option>
              <option value="1st">1st Grade</option>
              <option value="2nd">2nd Grade</option>
              <option value="3rd">3rd Grade</option>
              <option value="4th">4th Grade</option>
              <option value="5th">5th Grade</option>
              <option value="6th">6th Grade</option>
              <option value="7th">7th Grade</option>
              <option value="8th">8th Grade</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are your child&apos;s main academic interests?
            </label>
            <textarea
              value={formData.interests}
              onChange={(e) => handleInputChange('interests', e.target.value)}
              placeholder="Tell us about your child's interests, strengths, or areas you'd like to discuss..."
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
              <div>
                <Text className="text-sm font-medium text-amber-800">
                  What to expect during your call:
                </Text>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Discussion of your child&apos;s educational needs and goals</li>
                  <li>• Overview of our curriculum and teaching approach</li>
                  <li>• Information about enrollment process and next steps</li>
                  <li>• Opportunity to ask questions about our school</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button 
              outline 
              onClick={() => setShowBookingForm(false)}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleBookingSubmit}
              disabled={isSubmitting || !formData.parentName || !formData.parentEmail || !formData.studentName || !formData.studentGrade}
              className="flex-1"
            >
              {isSubmitting ? 'Booking...' : 'Book Consultation Call'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Heading level={1} className="text-2xl font-semibold text-gray-900">
        Schedule a Consultation Call
      </Heading>
      <Text className="text-gray-600 mt-1">
        Book a 30-minute consultation call to discuss your child's educational journey
      </Text>
    </div>
  )
} 