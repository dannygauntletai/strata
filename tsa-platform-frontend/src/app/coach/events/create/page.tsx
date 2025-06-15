'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Checkbox } from '@/components/checkbox'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { PhotoIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
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

interface EventFormData {
  title: string
  description: string
  location: string
  street: string
  city: string
  state: string
  zip: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  category: string
  subcategory: string
  max_participants: string
  cost: string
  registration_deadline: string
  is_public: boolean
  tags: string[]
  requirements: string[]
}

function CreateEventContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [currentRequirement, setCurrentRequirement] = useState('')
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    category: '',
    subcategory: '',
    max_participants: '',
    cost: '0',
    registration_deadline: '',
    is_public: true,
    tags: [],
    requirements: []
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
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip
    }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`${file.name} is too large. Maximum size is 5MB`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      setPhotos(prev => [...prev, ...validFiles])
      
      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPhotoPreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tag: string) => {
    handleInputChange('tags', formData.tags.filter(t => t !== tag))
  }

  const addRequirement = () => {
    if (currentRequirement.trim() && !formData.requirements.includes(currentRequirement.trim())) {
      handleInputChange('requirements', [...formData.requirements, currentRequirement.trim()])
      setCurrentRequirement('')
    }
  }

  const removeRequirement = (requirement: string) => {
    handleInputChange('requirements', formData.requirements.filter(r => r !== requirement))
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

      // Format dates
      const start_date = formatDateTime(formData.start_date, formData.start_time)
      const end_date = formatDateTime(
        formData.end_date || formData.start_date, 
        formData.end_time || formData.start_time
      )

      if (!start_date || !end_date) {
        alert('Please provide valid dates and times')
        return
      }

      // Create FormData for multipart upload
      const submitData = new FormData()

      // Get authenticated user
      const user = getCurrentUser()
      if (!user?.email) {
        alert('You must be logged in to create events')
        return
      }

      // Add event data as JSON
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        start_date,
        end_date,
        category: formData.category,
        subcategory: formData.subcategory,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        cost: parseFloat(formData.cost),
        registration_deadline: formData.registration_deadline 
          ? formatDateTime(formData.registration_deadline, '23:59') 
          : start_date,
        is_public: formData.is_public,
        tags: formData.tags,
        requirements: formData.requirements,
        created_by: user.email
      }

      submitData.append('event_data', JSON.stringify(eventData))

      // Add photos
      photos.forEach((photo, index) => {
        submitData.append(`photo_${index}`, photo)
      })

      // Make API call to backend - Call Lambda directly
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        body: submitData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      const result = await response.json()
      console.log('Event created successfully:', result)

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
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory
                </label>
                <Input
                  value={formData.subcategory}
                  onChange={(e) => handleInputChange('subcategory', e.target.value)}
                  placeholder="e.g., Basketball, Soccer"
                />
              </div>
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
                Location Name
              </label>
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Sports Complex, Gym Name"
              />
            </div>

            <div>
              <AddressAutocomplete
                value={formData.street}
                onChange={(value) => handleInputChange('street', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing address..."
                label="Address"
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
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants
              </label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => handleInputChange('max_participants', e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                placeholder="0.00"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_public}
                  onChange={(checked) => handleInputChange('is_public', checked)}
                />
                <label className="text-sm font-medium text-gray-700">
                  Make this event public (visible to parents)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Tags & Requirements */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags & Requirements</h3>
          
          <div className="space-y-6">
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} outline>
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#004aad] text-white text-sm rounded-md"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-[#003888] rounded-sm p-0.5"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentRequirement}
                  onChange={(e) => setCurrentRequirement(e.target.value)}
                  placeholder="Add a requirement"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                />
                <Button type="button" onClick={addRequirement} outline>
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.requirements.map((requirement, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm">{requirement}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(requirement)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Photos</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Photos (Max 5MB each)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          {[...Array(3)].map((_, i) => (
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