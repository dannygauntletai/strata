'use client'

import { useState, useEffect, Suspense } from 'react'

import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Label } from '@/components/fieldset'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { getEvents } from '@/data'
import { Address } from './address'
import Link from 'next/link'
import { useRef } from 'react'
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CalendarDaysIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { useSearchParams } from 'next/navigation'
import { getCoachApiUrl } from '@/lib/ssm-config'

// API Configuration
// API endpoint loaded from SSM - TODO: implement API integration

function SettingsContent() {
  const searchParams = useSearchParams()
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')
  
  // Google Calendar integration state
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null)
  const [googleCalendarSuccess, setGoogleCalendarSuccess] = useState<string | null>(null)

  // Load API endpoint from SSM
  useEffect(() => {
    getCoachApiUrl().then(setApiBaseUrl).catch(error => {
      console.error('Failed to load API endpoint:', error)
    })
  }, [])

  // Load profile photo on component mount
  useEffect(() => {
    if (apiBaseUrl) {
      fetchProfile()
      checkGoogleCalendarStatus()
    }
  }, [apiBaseUrl])

  const fetchProfile = async () => {
    if (!apiBaseUrl) return

    try {
      // Get current user email from localStorage
      const userRole = localStorage.getItem('invitation_context')
      let email = ''
      
      if (userRole) {
        const roleData = JSON.parse(userRole)
        email = roleData.email || ''
      }

      if (!email) {
        console.log('No email found in localStorage')
        return
      }

      const response = await fetch(`${apiBaseUrl}/coach/profile?email=${encodeURIComponent(email)}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.profile && data.profile.profile_photo_url) {
          setProfilePhoto(data.profile.profile_photo_url)
        }
      } else {
        console.log('Profile not found or error fetching profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string
        await uploadPhotoToAPI(base64Data, file.name)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading photo:', error)
      setUploadError('Failed to upload photo')
      setIsUploading(false)
    }
  }

  const uploadPhotoToAPI = async (base64Data: string, filename: string) => {
    if (!apiBaseUrl) return

    try {
      // Get current user email
      const userRole = localStorage.getItem('invitation_context')
      let email = ''
      
      if (userRole) {
        const roleData = JSON.parse(userRole)
        email = roleData.email || ''
      }

      if (!email) {
        setUploadError('User email not found')
        setIsUploading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/coach/profile/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          photo_data: base64Data,
          filename: filename
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfilePhoto(data.photo_url)
        console.log('Photo uploaded successfully')
      } else {
        const errorData = await response.json()
        setUploadError(errorData.error || 'Failed to upload photo')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      setUploadError('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setProfilePhoto(null)
    // TODO: Call API to remove photo from backend
    console.log('Photo removed')
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleConnectGoogleCalendar = () => {
    setIsConnecting(true)
    setGoogleCalendarError(null)
    setGoogleCalendarSuccess(null)
    
    // Get current user email
    const userRole = localStorage.getItem('invitation_context')
    let email = ''
    
    if (userRole) {
      const roleData = JSON.parse(userRole)
      email = roleData.email || ''
    }

    // Redirect to Google OAuth with coach email
    const authUrl = `/api/google-calendar/auth?coach_email=${encodeURIComponent(email)}`
    window.location.href = authUrl
  }

  const handleDisconnectGoogleCalendar = async () => {
    setIsDisconnecting(true)
    setGoogleCalendarError(null)
    setGoogleCalendarSuccess(null)

    try {
      const response = await fetch(`${apiBaseUrl}/coach/google-calendar/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coach_email: googleCalendarEmail // Use the connected Google email
        }),
      })

      if (response.ok) {
        setGoogleCalendarConnected(false)
        setGoogleCalendarEmail(null)
        setGoogleCalendarSuccess('Google Calendar disconnected successfully')
      } else {
        const error = await response.json()
        setGoogleCalendarError(error.error || 'Failed to disconnect Google Calendar')
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      setGoogleCalendarError('Failed to disconnect Google Calendar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const checkGoogleCalendarStatus = async () => {
    if (!apiBaseUrl) return

    try {
      // Get current user email
      const userRole = localStorage.getItem('invitation_context')
      let email = ''
      
      if (userRole) {
        const roleData = JSON.parse(userRole)
        email = roleData.email || ''
      }

      const response = await fetch(`${apiBaseUrl}/coach/google-calendar/status?coach_email=${encodeURIComponent(email)}`)
      
      if (response.ok) {
        const data = await response.json()
        setGoogleCalendarConnected(data.connected)
        setGoogleCalendarEmail(data.google_email)
      }
    } catch (error) {
      console.error('Error checking Google Calendar status:', error)
    }
  }

  return (
    <form method="post" className="mx-auto max-w-4xl">
      <Heading>Settings</Heading>
      <Divider className="my-10 mt-6" />

      {/* Profile Photo Section */}
      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Profile Photo</Subheading>
          <Text>This will be displayed in your sidebar and profile.</Text>
          {uploadError && (
            <Text className="text-red-600 text-sm">{uploadError}</Text>
          )}
        </div>
        <div className="flex items-center gap-6">
          <Avatar 
            src={profilePhoto} 
            className="size-20" 
            square 
            alt="Profile photo"
            initials={profilePhoto ? undefined : "C"}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={triggerFileUpload}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <PhotoIcon className="w-4 h-4" />
              {isUploading ? 'Uploading...' : (profilePhoto ? 'Change Photo' : 'Upload Photo')}
            </Button>
            {profilePhoto && !isUploading && (
              <Button
                type="button"
                onClick={handleRemovePhoto}
                color="red"
                className="flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Remove Photo
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>
      </section>

      <Divider className="my-10" soft />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Organization Name</Subheading>
          <Text>This will be displayed on your public profile.</Text>
        </div>
        <div>
          <Input aria-label="Organization Name" name="name" defaultValue="Catalyst" />
        </div>
      </section>

      <Divider className="my-10" soft />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Organization Bio</Subheading>
          <Text>This will be displayed on your public profile. Maximum 240 characters.</Text>
        </div>
        <div>
          <Textarea aria-label="Organization Bio" name="bio" />
        </div>
      </section>

      <Divider className="my-10" soft />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Organization Email</Subheading>
          <Text>This is how customers can contact you for support.</Text>
        </div>
        <div className="space-y-4">
          <Input type="email" aria-label="Organization Email" name="email" defaultValue="info@example.com" />
          <CheckboxField>
            <Checkbox name="email_is_public" defaultChecked />
            <Label>Show email on public profile</Label>
          </CheckboxField>
        </div>
      </section>

      <Divider className="my-10" soft />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Address</Subheading>
          <Text>This is where your organization is registered.</Text>
        </div>
        <Address />
      </section>

      <Divider className="my-10" soft />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Currency</Subheading>
          <Text>The currency that your organization will be collecting.</Text>
        </div>
        <div>
          <Select aria-label="Currency" name="currency" defaultValue="cad">
            <option value="cad">CAD - Canadian Dollar</option>
            <option value="usd">USD - United States Dollar</option>
          </Select>
        </div>
      </section>

      <Divider className="my-10" soft />

      {/* Google Calendar Integration Section */}
      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Google Calendar Integration</Subheading>
          <Text>Connect your Google Calendar to automatically sync TSA events and enable easy scheduling.</Text>
          {googleCalendarError && (
            <Text className="text-red-600 text-sm">{googleCalendarError}</Text>
          )}
          {googleCalendarSuccess && (
            <Text className="text-green-600 text-sm">{googleCalendarSuccess}</Text>
          )}
        </div>
        <div className="space-y-4">
          {googleCalendarConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-green-900">Connected to Google Calendar</Text>
                  <Text className="text-sm text-green-700">{googleCalendarEmail}</Text>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleDisconnectGoogleCalendar}
                disabled={isDisconnecting}
                color="red"
                className="flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Google Calendar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-gray-900">Google Calendar Not Connected</Text>
                  <Text className="text-sm text-gray-600">Connect to sync events and enable scheduling features</Text>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleConnectGoogleCalendar}
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <CalendarDaysIcon className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            </div>
          )}
        </div>
      </section>

      <Divider className="my-10" soft />

      {/* Dashboard Tour Section */}
      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Dashboard Tour</Subheading>
          <Text>Take a guided tour of your coaching dashboard to learn about all available features and shortcuts.</Text>
        </div>
        <div className="space-y-4">
          <Button
            type="button"
            onClick={() => {
              // Trigger tour restart
              const event = new CustomEvent('restartTour', { detail: { forceRestart: true } })
              window.dispatchEvent(event)
            }}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Restart Dashboard Tour
          </Button>
          <Text className="text-sm text-gray-600">
            This will show you all the key features and navigation of your coaching dashboard.
          </Text>
        </div>
      </section>

      <Divider className="my-10" soft />

      <div className="flex justify-end gap-4">
        <Button type="reset" plain>
          Reset
        </Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  )
}

export default function Settings() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-4xl">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6 animate-pulse"></div>
        <div className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}

