'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Checkbox } from '@/components/checkbox'
import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { CheckCircleIcon, CalendarIcon, MapPinIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

interface Event {
  event_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  location: string
  street: string
  city: string
  state: string
  zip: string
  category: string
  subcategory: string
  max_participants?: number
  current_participants: number
  cost: number
  registration_deadline: string
  is_public: boolean
  status: string
  tags: string[]
  requirements: string[]
}

interface RSVPFormData {
  event_id: string
  parent_name: string
  parent_email: string
  parent_phone: string
  student_name: string
  student_age: string
  special_requirements: string
  emergency_contact: string
  emergency_phone: string
  additional_notes: string
  consent_contact: boolean
  consent_marketing: boolean
}

export default function EventInterestForm() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [formData, setFormData] = useState<RSVPFormData>({
    event_id: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    student_name: '',
    student_age: '',
    special_requirements: '',
    emergency_contact: '',
    emergency_phone: '',
    additional_notes: '',
    consent_contact: true,
    consent_marketing: false
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      const response = await fetch(`${API_BASE_URL}/events`)
      if (response.ok) {
        const data = await response.json()
        // Filter to only show public events that are scheduled/upcoming
        const publicEvents = (data.events || []).filter((event: Event) => 
          event.is_public && 
          event.status === 'scheduled' &&
          new Date(event.registration_deadline) > new Date()
        )
        setEvents(publicEvents)
      } else {
        console.error('Failed to fetch events')
        setEvents([])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RSVPFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEventSelect = (eventId: string) => {
    const event = events.find(e => e.event_id === eventId)
    setSelectedEvent(event || null)
    setFormData(prev => ({
      ...prev,
      event_id: eventId
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      const requiredFields = [
        'event_id', 'parent_name', 'parent_email', 
        'student_name', 'student_age'
      ]
      
      for (const field of requiredFields) {
        if (!formData[field as keyof RSVPFormData]) {
          throw new Error(`Please fill in all required fields`)
        }
      }

      // Validate student age is a valid number
      const studentAge = parseInt(formData.student_age)
      if (isNaN(studentAge) || studentAge < 5 || studentAge > 18) {
        throw new Error('Please select a valid student age')
      }

      if (!formData.consent_contact) {
        throw new Error('You must consent to being contacted to proceed')
      }

      // Submit RSVP to API
      const response = await fetch(`${API_BASE_URL}/events/${formData.event_id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_name: formData.parent_name,
          parent_email: formData.parent_email,
          parent_phone: formData.parent_phone,
          student_name: formData.student_name,
          student_age: studentAge, // Use the validated number
          rsvp_status: 'pending',
          special_requirements: formData.special_requirements,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
          additional_notes: formData.additional_notes,
          rsvp_date: new Date().toISOString(),
          source: 'event_interest_form'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to submit RSVP')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RSVP')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getFullAddress = (event: Event) => {
    const parts = [event.street, event.city, event.state, event.zip].filter(Boolean)
    return parts.join(', ')
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              RSVP Submitted Successfully!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Thank you for your interest in {selectedEvent?.title}. We&apos;ve received your RSVP and will contact you with event details.
            </p>
          </div>
          
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{selectedEvent && formatDate(selectedEvent.start_date)} at {selectedEvent && formatTime(selectedEvent.start_date)}</span>
                  </div>
                  {selectedEvent?.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">What happens next?</h3>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">1.</span>
                    A coach will review your RSVP
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">2.</span>
                    You&apos;ll receive a confirmation email within 24 hours
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">3.</span>
                    We&apos;ll send you event reminders and any additional details
                  </li>
                </ul>
              </div>
              
              <div className="text-center">
                <Button href="https://www.texassportsacademy.com" className="w-full">
                  Return to Website
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg" 
            alt="Texas Sports Academy"
            className="h-20 w-auto mx-auto mb-6"
          />
          <Heading className="text-3xl font-bold text-gray-900">
            RSVP for Texas Sports Academy Events
          </Heading>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Join us for exciting events and programs. Select an event below and register your student today!
          </p>
        </div>

        {/* Available Events */}
        <div className="mb-8">
          <Subheading className="text-xl font-semibold text-gray-900 mb-6">
            Available Events
          </Subheading>
          
          {eventsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No events available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back soon for upcoming events and programs!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div 
                  key={event.event_id} 
                  className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all ${
                    selectedEvent?.event_id === event.event_id 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleEventSelect(event.event_id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {event.title}
                      </h3>
                      <Badge color="blue">{event.category}</Badge>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-4 h-4">🕐</span>
                        <span>{formatTime(event.start_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPinIcon className="w-4 h-4" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserIcon className="w-4 h-4" />
                        <span>
                          {event.current_participants}
                          {event.max_participants ? `/${event.max_participants}` : ''} participants
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        <span>
                          {(() => {
                            const cost = typeof event.cost === 'string' ? parseFloat(event.cost) : event.cost
                            return isNaN(cost) || cost === 0 ? 'Free' : `$${cost.toFixed(2)}`
                          })()}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {event.description}
                    </p>
                    
                    {selectedEvent?.event_id === event.event_id && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">
                          ✓ Selected - Fill out the form below to RSVP
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RSVP Form - Only show if event is selected */}
        {selectedEvent && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-8 py-6 bg-blue-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                RSVP for: {selectedEvent.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(selectedEvent.start_date)} at {formatTime(selectedEvent.start_date)}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Parent Information */}
              <div>
                <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                  Parent/Guardian Information
                </Subheading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Name *
                    </label>
                    <Input
                      value={formData.parent_name}
                      onChange={(e) => handleInputChange('parent_name', e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.parent_email}
                      onChange={(e) => handleInputChange('parent_email', e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={formData.parent_phone}
                      onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div>
                <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                  Student Information
                </Subheading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Name *
                    </label>
                    <Input
                      value={formData.student_name}
                      onChange={(e) => handleInputChange('student_name', e.target.value)}
                      placeholder="Student's full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Age *
                    </label>
                    <Select
                      value={formData.student_age}
                      onChange={(e) => handleInputChange('student_age', e.target.value)}
                      required
                    >
                      <option value="">Select age</option>
                      {Array.from({ length: 14 }, (_, i) => i + 5).map(age => (
                        <option key={age} value={age.toString()}>{age} years old</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                  Emergency Contact (Optional)
                </Subheading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Name
                    </label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Phone
                    </label>
                    <Input
                      type="tel"
                      value={formData.emergency_phone}
                      onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                  Additional Information
                </Subheading>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Requirements or Accommodations
                    </label>
                    <Textarea
                      value={formData.special_requirements}
                      onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                      placeholder="Any special requirements, allergies, or accommodations needed..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <Textarea
                      value={formData.additional_notes}
                      onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                      placeholder="Any additional information or questions..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <Checkbox
                    checked={formData.consent_contact}
                    onChange={(checked) => handleInputChange('consent_contact', checked)}
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    I consent to being contacted by Texas Sports Academy regarding this event and my RSVP. *
                  </label>
                </div>
                <div className="flex items-start">
                  <Checkbox
                    checked={formData.consent_marketing}
                    onChange={(checked) => handleInputChange('consent_marketing', checked)}
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    I would like to receive updates about other Texas Sports Academy events and programs.
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  color="blue"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Submitting RSVP...' : 'Submit RSVP'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:info@texassportsacademy.com" className="text-blue-600 hover:text-blue-800">
              info@texassportsacademy.com
            </a>{' '}
            or{' '}
            <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-800">
              (123) 456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 