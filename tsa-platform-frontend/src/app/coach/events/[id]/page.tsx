'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/button'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { Heading, Subheading } from '@/components/heading'
import { Link as CustomLink } from '@/components/link'
import { Badge } from '@/components/badge'
import { Avatar } from '@/components/avatar'
import { 
  ChevronLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon, 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  PlusIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/16/solid'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

interface RSVP {
  rsvp_id: string
  event_id: string
  parent_name: string
  parent_email: string
  parent_phone?: string
  student_name: string
  student_age?: number
  rsvp_status: 'confirmed' | 'pending' | 'declined' | 'waitlist'
  rsvp_date: string
  special_requirements?: string
  emergency_contact?: string
  emergency_phone?: string
  additional_notes?: string
  created_at: string
  updated_at: string
}

interface EventInvitation {
  invitation_id: string
  event_id: string
  invitee_email: string
  invitee_name?: string
  status: 'pending' | 'sent' | 'accepted' | 'declined'
  sent_at?: string
  responded_at?: string
  created_at: string
  message?: string
}

interface InvitationForm {
  invitee_email: string
  invitee_name: string
  message: string
}

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
  photos: Array<{
    url: string
    filename: string
    uploaded_at: string
  }>
  created_by: string
  created_at: string
  updated_at: string
  
  // Eventbrite integration fields
  eventbrite_event_id?: string
  eventbrite_url?: string
  eventbrite_status?: string
  last_synced?: string
}

export default function EventView({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [rsvps, setRSVPs] = useState<RSVP[]>([])
  const [filteredRSVPs, setFilteredRSVPs] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showRSVPs, setShowRSVPs] = useState(false)
  const [publishingToEventbrite, setPublishingToEventbrite] = useState(false)
  const [syncingAttendees, setSyncingAttendees] = useState(false)
  
  // Event invitations state
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [invitationForm, setInvitationForm] = useState<InvitationForm>({
    invitee_email: '',
    invitee_name: '',
    message: ''
  })
  const [sendingInvitation, setSendingInvitation] = useState(false)
  
  const router = useRouter()

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true)
      // Call Lambda API directly
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }
      
      const data = await response.json()
      setEvent(data.event)
    } catch (error) {
      console.error('Error fetching event:', error)
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    const fetchRSVPs = async () => {
      try {
        setRsvpLoading(true)
        const apiUrl = await getCoachApiUrl()
        const response = await fetch(`${apiUrl}/events/${params.id}/rsvp`)
        if (response.ok) {
          const data = await response.json()
          setRSVPs(data.rsvps || [])
        }
      } catch (error) {
        console.error('Error fetching RSVPs:', error)
      } finally {
        setRsvpLoading(false)
      }
    }

    const fetchInvitations = async () => {
      try {
        const apiUrl = await getCoachApiUrl()
        const response = await fetch(`${apiUrl}/invitations?event_id=${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setInvitations(data.invitations || [])
        }
      } catch (error) {
        console.error('Error fetching invitations:', error)
      }
    }

    if (params.id) {
      fetchRSVPs()
      fetchInvitations()
    }
  }, [params.id])

  useEffect(() => {
    // Filter RSVPs based on search term and status
    let filtered = rsvps

    if (searchTerm) {
      filtered = filtered.filter(rsvp =>
        rsvp.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rsvp.parent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rsvp.student_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(rsvp => rsvp.rsvp_status === statusFilter)
    }

    setFilteredRSVPs(filtered)
  }, [rsvps, searchTerm, statusFilter])

  const updateRSVPStatus = async (rsvpId: string, newStatus: string) => {
    try {
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/rsvp/${rsvpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update the RSVP in the local state
        setRSVPs(rsvps.map(rsvp => 
          rsvp.rsvp_id === rsvpId ? { ...rsvp, rsvp_status: newStatus as any } : rsvp
        ))
      } else {
        alert('Failed to update RSVP status')
      }
    } catch (error) {
      console.error('Error updating RSVP status:', error)
      alert('Failed to update RSVP status')
    }
  }

  const updateEventParticipantCount = async (eventId: string, participantCount: number) => {
    try {
      const apiUrl = await getCoachApiUrl()
      await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_participants: participantCount }),
      })
    } catch (error) {
      console.error('Error updating participant count:', error)
    }
  }

  // Recalculate participant count whenever RSVPs change
  useEffect(() => {
    if (event && rsvps.length > 0) {
      const confirmedCount = rsvps.filter(rsvp => rsvp.rsvp_status === 'confirmed').length
      if (event.current_participants !== confirmedCount) {
        setEvent(prev => prev ? { ...prev, current_participants: confirmedCount } : null)
        updateEventParticipantCount(event.event_id, confirmedCount)
      }
    }
  }, [rsvps, event])

  const handleDeleteEvent = async () => {
    if (!event) return
    
    try {
      setDeleteLoading(true)
      // Call Lambda API directly
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events/${event.event_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/coach/events')
      } else {
        alert('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePublishToEventbrite = async () => {
    if (!event) return
    
    try {
      setPublishingToEventbrite(true)
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events/${event.event_id}/publish`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert('Event published to Eventbrite successfully!')
        
        // Refresh event data to get Eventbrite details
        fetchEvent()
      } else {
        const errorData = await response.json()
        alert(`Failed to publish to Eventbrite: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error publishing to Eventbrite:', error)
      alert('Failed to publish to Eventbrite')
    } finally {
      setPublishingToEventbrite(false)
    }
  }

  const handleSyncAttendees = async () => {
    if (!event) return
    
    try {
      setSyncingAttendees(true)
      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/events/${event.event_id}/sync`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully synced ${result.result.synced_count} attendees from Eventbrite!`)
        
        // Refresh event data and RSVPs
        fetchEvent()
        // Trigger RSVP refresh
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(`Failed to sync attendees: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error syncing attendees:', error)
      alert('Failed to sync attendees')
    } finally {
      setSyncingAttendees(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!event) return
    
    try {
      setSendingInvitation(true)
      const user = getCurrentUser()
      
      const invitationData = {
        event_id: event.event_id,
        invitee_email: invitationForm.invitee_email,
        invitee_name: invitationForm.invitee_name,
        inviter_id: user?.email || 'unknown',
        message: invitationForm.message,
        send_immediately: true
      }

      const apiUrl = await getCoachApiUrl()
      const response = await fetch(`${apiUrl}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      })

      if (response.ok) {
        alert('Event invitation sent successfully!')
        setShowInviteModal(false)
        setInvitationForm({
          invitee_email: '',
          invitee_name: '',
          message: ''
        })
        
        // Refresh invitations list
        const refreshResponse = await fetch(`${apiUrl}/invitations?event_id=${params.id}`)
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setInvitations(data.invitations || [])
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to send invitation: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation')
    } finally {
      setSendingInvitation(false)
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'lime'
      case 'in_progress': return 'blue'
      case 'completed': return 'zinc'
      case 'cancelled': return 'red'
      default: return 'zinc'
    }
  }

  const getFullAddress = () => {
    if (!event) return ''
    const parts = [event.street, event.city, event.state, event.zip].filter(Boolean)
    return parts.join(', ')
  }

  const getRSVPStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge color="green">Confirmed</Badge>
      case 'pending':
        return <Badge color="yellow">Pending</Badge>
      case 'declined':
        return <Badge color="red">Declined</Badge>
      case 'waitlist':
        return <Badge color="blue">Waitlist</Badge>
      default:
        return <Badge color="zinc">Unknown</Badge>
    }
  }

  const getRSVPStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
      case 'declined':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'waitlist':
        return <UsersIcon className="h-5 w-5 text-blue-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getRSVPStats = () => {
    const confirmed = rsvps.filter(r => r.rsvp_status === 'confirmed').length
    const pending = rsvps.filter(r => r.rsvp_status === 'pending').length
    const declined = rsvps.filter(r => r.rsvp_status === 'declined').length
    const waitlist = rsvps.filter(r => r.rsvp_status === 'waitlist').length

    return { confirmed, pending, declined, waitlist, total: rsvps.length }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Event not found'}
        </h3>
        <CustomLink href="/coach/events" className="text-blue-600 hover:text-blue-800">
          ← Back to Events
        </CustomLink>
      </div>
    )
  }

  const rsvpStats = getRSVPStats()

  return (
    <>
      {/* Header with back link */}
      <div className="max-lg:hidden">
        <CustomLink href="/coach/events" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
          <ChevronLeftIcon className="size-4 fill-zinc-400 dark:fill-zinc-500" />
          Events
        </CustomLink>
      </div>

      {/* Event header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
            <Heading className="truncate">{event.title}</Heading>
            <Badge color={getStatusColor(event.status)}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
            {!event.is_public && (
              <Badge color="zinc">Private</Badge>
            )}
          </div>
          
          <div className="text-sm text-zinc-500 space-y-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>
                {formatDate(event.start_date)} at {formatTime(event.start_date)}
                {event.end_date !== event.start_date && (
                  <> - {formatDate(event.end_date)} at {formatTime(event.end_date)}</>
                )}
              </span>
            </div>
            
            {(event.location || getFullAddress()) && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                <span>
                  {event.location && <>{event.location}<br /></>}
                  {getFullAddress()}
                </span>
              </div>
            )}
            
            {event.category && (
              <div className="text-sm">
                <span className="font-medium">Category:</span> {event.category}
                {event.subcategory && ` • ${event.subcategory}`}
              </div>
            )}
            
            {/* Eventbrite Sync Status */}
            {event.eventbrite_event_id && (
              <div className="text-sm">
                <span className="font-medium text-green-600">✅ Synced with Eventbrite</span>
                {event.last_synced && (
                  <span className="text-gray-500 ml-2">
                    • Last synced: {formatDateTime(event.last_synced)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            outline 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Invite Participants
          </Button>
          
          <Button 
            outline 
            onClick={() => router.push(`/coach/events/${event.event_id}/edit`)}
            className="flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </Button>
          
          {/* Eventbrite Actions */}
          {!event.eventbrite_event_id ? (
            <Button 
              color="green"
              onClick={handlePublishToEventbrite}
              disabled={publishingToEventbrite}
              className="flex items-center gap-2"
            >
              {publishingToEventbrite ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Publishing...
                </>
              ) : (
                <>
                  📅 Publish to Eventbrite
                </>
              )}
            </Button>
          ) : (
            <>
              <Button 
                outline
                href={event.eventbrite_url}
                target="_blank"
                className="flex items-center gap-2"
              >
                🎟️ View on Eventbrite
              </Button>
              <Button 
                outline
                onClick={handleSyncAttendees}
                disabled={syncingAttendees}
                className="flex items-center gap-2"
              >
                {syncingAttendees ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    🔄 Sync Attendees
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button 
            color="red" 
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Event photos */}
      {event.photos && event.photos.length > 0 && (
        <div className="mt-6">
          <Subheading>Photos</Subheading>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {event.photos.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={photo.url} 
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event details grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Participants */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Participants</p>
              <p className="text-2xl font-semibold text-gray-900">
                {event.current_participants}
                {event.max_participants && `/${event.max_participants}`}
              </p>
              {event.max_participants && (
                <p className="text-xs text-gray-500">
                  {Math.round((event.current_participants / event.max_participants) * 100)}% full
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cost */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Cost</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(() => {
                  const cost = typeof event.cost === 'string' ? parseFloat(event.cost) : event.cost
                  return isNaN(cost) || cost === 0 ? 'Free' : `$${cost.toFixed(2)}`
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Deadline */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Registration Deadline</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(event.registration_deadline)}
              </p>
              <p className="text-xs text-gray-500">
                {formatTime(event.registration_deadline)}
              </p>
            </div>
          </div>
        </div>

        {/* Event ID */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Event ID</p>
            <p className="text-sm font-mono text-gray-900 mt-1">{event.event_id}</p>
            <p className="text-xs text-gray-500 mt-1">
              Created {formatDate(event.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8">
        <Subheading>Description</Subheading>
        <div className="mt-4 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
        </div>
      </div>

      {/* Tags and Requirements */}
      {(event.tags.length > 0 || event.requirements.length > 0) && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Tags */}
          {event.tags.length > 0 && (
            <div>
              <Subheading>Tags</Subheading>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <Badge key={index} color="blue">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          {event.requirements.length > 0 && (
            <div>
              <Subheading>Requirements</Subheading>
              <div className="mt-4 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
                <ul className="space-y-2">
                  {event.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RSVPs Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <Subheading>RSVPs ({rsvpStats.total})</Subheading>
          <Button
            outline
            onClick={() => setShowRSVPs(!showRSVPs)}
            className="flex items-center gap-2"
          >
            <UserIcon className="w-4 h-4" />
            {showRSVPs ? 'Hide RSVPs' : 'Show RSVPs'}
          </Button>
        </div>

        {/* RSVP Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-xl font-semibold text-gray-900">{rsvpStats.confirmed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl font-semibold text-gray-900">{rsvpStats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Waitlist</p>
                <p className="text-xl font-semibold text-gray-900">{rsvpStats.waitlist}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
            <div className="flex items-center gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Declined</p>
                <p className="text-xl font-semibold text-gray-900">{rsvpStats.declined}</p>
              </div>
            </div>
          </div>
        </div>

        {showRSVPs && (
          <>
            {/* RSVP Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <InputGroup>
                  <MagnifyingGlassIcon data-slot="icon" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by parent, student, or email..."
                  />
                </InputGroup>
              </div>
              <div className="sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="waitlist">Waitlist</option>
                  <option value="declined">Declined</option>
                </Select>
              </div>
            </div>

            {/* RSVP List */}
            <div>
              {rsvpLoading ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading RSVPs...</p>
                </div>
              ) : filteredRSVPs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {rsvps.length === 0 ? 'No RSVPs yet' : 'No RSVPs match your filters'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {rsvps.length === 0 
                      ? 'RSVPs will appear here when parents sign up for your event.' 
                      : 'Try adjusting your search or filter criteria.'
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {filteredRSVPs.map((rsvp) => (
                      <div key={rsvp.rsvp_id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {getRSVPStatusIcon(rsvp.rsvp_status)}
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  {rsvp.student_name}
                                  {rsvp.student_age && ` (${rsvp.student_age} years old)`}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Parent: {rsvp.parent_name}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                  <a href={`mailto:${rsvp.parent_email}`} className="text-blue-600 hover:text-blue-800">
                                    {rsvp.parent_email}
                                  </a>
                                </div>
                                {rsvp.parent_phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                                    <a href={`tel:${rsvp.parent_phone}`} className="text-blue-600 hover:text-blue-800">
                                      {rsvp.parent_phone}
                                    </a>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>RSVP'd {formatDateTime(rsvp.rsvp_date)}</span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {rsvp.special_requirements && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Special Requirements:</p>
                                    <p className="text-sm text-gray-600">{rsvp.special_requirements}</p>
                                  </div>
                                )}
                                {rsvp.emergency_contact && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Emergency Contact:</p>
                                    <p className="text-sm text-gray-600">
                                      {rsvp.emergency_contact}
                                      {rsvp.emergency_phone && ` - ${rsvp.emergency_phone}`}
                                    </p>
                                  </div>
                                )}
                                {rsvp.additional_notes && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Notes:</p>
                                    <p className="text-sm text-gray-600">{rsvp.additional_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3 ml-6">
                            {getRSVPStatusBadge(rsvp.rsvp_status)}
                            
                            <Select
                              value={rsvp.rsvp_status}
                              onChange={(e) => updateRSVPStatus(rsvp.rsvp_id, e.target.value)}
                              className="text-xs"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="waitlist">Waitlist</option>
                              <option value="declined">Declined</option>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Event Invitation Modal */}
      <Dialog open={showInviteModal} onClose={() => setShowInviteModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                Invite Participants to Event
              </DialogTitle>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Event:</strong> {event?.title}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {event && formatDate(event.start_date)} at {event && formatTime(event.start_date)}
              </p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSendInvitation(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant Email *
                </label>
                <Input
                  type="email"
                  required
                  value={invitationForm.invitee_email}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, invitee_email: e.target.value }))}
                  placeholder="participant@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant Name
                </label>
                <Input
                  type="text"
                  value={invitationForm.invitee_name}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, invitee_name: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={invitationForm.message}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
                  placeholder="I'd love to have you join us for this event..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#004aad] text-white hover:bg-[#003888]"
                  disabled={sendingInvitation}
                >
                  {sendingInvitation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  outline 
                  onClick={() => setShowInviteModal(false)} 
                  className="flex-1"
                  disabled={sendingInvitation}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

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
              Are you sure you want to delete &ldquo;{event.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button outline onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                color="red" 
                onClick={handleDeleteEvent}
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
