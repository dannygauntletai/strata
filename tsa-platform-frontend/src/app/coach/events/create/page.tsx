'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// IMPORTANT: Always use getCoachApiUrl() from SSM config - DO NOT hardcode API endpoints!
// This ensures centralized configuration management and prevents broken URLs during infrastructure changes

interface AddressData {
  street: string
  city: string
  state: string
  zip: string
}

interface TicketType {
  name: string
  description: string
  cost: number
  currency: string
  quantity_total?: number
  include_fee: boolean
}

interface EventFormData {
  title: string
  description: string
  venue_name: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  timezone: string
  category: string
  capacity: string
  registration_deadline: string
  visibility: 'public' | 'private'
  ticket_types: TicketType[]
}

function CreateEventContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    venue_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    timezone: 'America/Chicago',
    category: 'training',
    capacity: '',
    registration_deadline: '',
    visibility: 'public',
    ticket_types: [{
      name: 'General Admission',
      description: '',
      cost: 0,
      currency: 'USD',
      include_fee: true
    }]
  })

  // Pre-fill date from URL parameters if provided
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      setFormData(prev => ({
        ...prev,
        start_date: dateParam
      }))
    }
  }, [searchParams])

  const handleInputChange = (field: keyof EventFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddressSelect = (address: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address_line_1: address.street,
      city: address.city,
      state: address.state,
      postal_code: address.zip
    }))
  }

  const formatDateTime = (date: string, time: string) => {
    if (!date || !time) return ''
    const datetime = new Date(`${date}T${time}`)
    return datetime.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.start_date || !formData.start_time) {
        alert('Please fill in all required fields')
        return
      }

      // Format dates with timezone
      const start_date = formatDateTime(formData.start_date, formData.start_time)
      const end_date = formatDateTime(
        formData.end_date || formData.start_date, 
        formData.end_time || formData.start_time
      )

      if (!start_date || !end_date) {
        alert('Please provide valid dates and times')
        return
      }

      // Get authenticated user
      const user = getCurrentUser()
      if (!user?.email) {
        alert('You must be logged in to create events')
        return
      }

      // Prepare event data for new API format
      const eventData = {
        coach_id: user.email,
        title: formData.title,
        description: formData.description,
        summary: formData.description.substring(0, 200),
        start_date,
        end_date,
        timezone: formData.timezone,
        venue_name: formData.venue_name,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        category: formData.category,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        registration_deadline: formData.registration_deadline 
          ? formatDateTime(formData.registration_deadline, '23:59') 
          : start_date,
        visibility: formData.visibility,
        status: 'draft', // Start as draft, coaches can publish later
        ticket_types: formData.ticket_types,
        currency: 'USD'
      }

      // Make API call to backend
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      const result = await response.json()
      console.log('Event created successfully:', result)

      // Show success message if Eventbrite sync info is available
      if (result.eventbrite_sync) {
        if (result.eventbrite_sync.success) {
          alert('Event created successfully and synced with Eventbrite!')
        } else {
          alert('Event created successfully, but Eventbrite sync failed. You can retry sync later.')
        }
      }

      // Redirect to events page
      router.push('/coach/events')
      
    } catch (error) {
      console.error('Error creating event:', error)
      alert(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Heading>Create New Event</Heading>
        <p className="mt-2 text-gray-600">Fill in the details below to create a new event.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Information */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your event..."
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select category</option>
                <option value="training">Training</option>
                <option value="competition">Competition</option>
                <option value="camp">Camp</option>
                <option value="clinic">Clinic</option>
                <option value="tournament">Tournament</option>
                <option value="social">Social Event</option>
                <option value="fundraiser">Fundraiser</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                placeholder="Same as start date if empty"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                placeholder="Same as start time if empty"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Deadline
              </label>
              <Input
                type="date"
                value={formData.registration_deadline}
                onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                placeholder="Defaults to event start date"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Name
              </label>
              <Input
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                placeholder="e.g., Sports Complex, Gym Name"
              />
            </div>

            <div>
              <AddressAutocomplete
                value={formData.address_line_1}
                onChange={(value) => handleInputChange('address_line_1', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing address..."
                label="Address Line 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <Input
                value={formData.address_line_2}
                onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Settings */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <Select
                value={formData.visibility}
                onChange={(e) => handleInputChange('visibility', e.target.value as 'public' | 'private')}
              >
                <option value="public">Public (visible on Eventbrite)</option>
                <option value="private">Private (invite only)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Ticket Types */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket Name
                </label>
                <Input
                  value={formData.ticket_types[0]?.name || ''}
                  onChange={(e) => {
                    const newTicketTypes = [...formData.ticket_types]
                    newTicketTypes[0] = { ...newTicketTypes[0], name: e.target.value }
                    handleInputChange('ticket_types', newTicketTypes)
                  }}
                  placeholder="General Admission"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ticket_types[0]?.cost || 0}
                  onChange={(e) => {
                    const newTicketTypes = [...formData.ticket_types]
                    newTicketTypes[0] = { ...newTicketTypes[0], cost: parseFloat(e.target.value) || 0 }
                    handleInputChange('ticket_types', newTicketTypes)
                  }}
                  placeholder="0.00"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (Optional)
                </label>
                <Input
                  type="number"
                  value={formData.ticket_types[0]?.quantity_total || ''}
                  onChange={(e) => {
                    const newTicketTypes = [...formData.ticket_types]
                    newTicketTypes[0] = { 
                      ...newTicketTypes[0], 
                      quantity_total: e.target.value ? parseInt(e.target.value) : undefined 
                    }
                    handleInputChange('ticket_types', newTicketTypes)
                  }}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Description (Optional)
              </label>
              <Input
                value={formData.ticket_types[0]?.description || ''}
                onChange={(e) => {
                  const newTicketTypes = [...formData.ticket_types]
                  newTicketTypes[0] = { ...newTicketTypes[0], description: e.target.value }
                  handleInputChange('ticket_types', newTicketTypes)
                }}
                placeholder="Additional information about this ticket type"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Eventbrite Integration
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This event will be automatically created on Eventbrite when you save it. 
                      Parents can register directly through Eventbrite, and attendee information 
                      will be synced back to TSA automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="button"
            outline
            onClick={() => router.back()}
            className="sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="sm:order-2 bg-[#004aad] hover:bg-[#003888] sm:ml-auto"
          >
            {loading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function CreateEvent() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="space-y-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <CreateEventContent />
    </Suspense>
  )
} 