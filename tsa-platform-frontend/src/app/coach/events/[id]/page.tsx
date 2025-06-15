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
  PlusIcon
} from '@heroicons/react/16/solid'
import { Dialog, DialogPanel } from '@headlessui/react'
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

    if (params.id) {
      fetchRSVPs()
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
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button 
            outline 
            onClick={() => router.push(`/coach/events/${event.event_id}/edit`)}
            className="flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </Button>
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
