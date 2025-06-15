'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  UserGroupIcon,
  TrashIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  PencilIcon
} from '@heroicons/react/20/solid'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-2.amazonaws.com/prod'

// Types
interface ParentInvitation {
  invitation_id: string
  parent_email: string
  student_first_name: string
  student_last_name: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  accepted_at?: string
  coach_id: string
  coach_name: string
  grade_level?: string
  message?: string
  invitation_url?: string
  school_name?: string
  last_sent_at?: string
}

export default function ParentInvitationViewPage() {
  const params = useParams()
  const router = useRouter()
  const invitationId = params.id as string

  const [invitation, setInvitation] = useState<ParentInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitation = useCallback(async () => {
    try {
      setLoading(true)
      // Get current user
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        setError('Authentication error')
        return
      }

      const response = await fetch(`${API_BASE_URL}/coach/invitations/${params.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user.email,
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invitation not found')
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load invitation')
        }
        return
      }

      const data = await response.json()
      setInvitation(data.invitation)
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchInvitation()
  }, [fetchInvitation])

  const handleDelete = async () => {
    if (!invitation) return

    try {
      setDeleting(true)
      const response = await fetch(`${API_BASE_URL}/parent-invitations/${invitation.invitation_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/coach/students')
      } else {
        alert('Failed to delete invitation')
      }
    } catch (error) {
      console.error('Error deleting invitation:', error)
      alert('Failed to delete invitation')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleResend = async () => {
    if (!invitation) return

    try {
      setResending(true)
      const response = await fetch(`${API_BASE_URL}/parent-invitations/${invitation.invitation_id}/resend`, {
        method: 'PUT'
      })

      if (response.ok) {
        alert('Invitation resent successfully!')
        fetchInvitation() // Refresh to get updated data
      } else {
        alert('Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation')
    } finally {
      setResending(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-amber-600" />
      case 'expired':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      default:
        return <EnvelopeIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge color="green">Accepted</Badge>
      case 'pending':
        return <Badge color="amber">Pending</Badge>
      case 'expired':
        return <Badge color="red">Expired</Badge>
      default:
        return <Badge color="zinc">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Invitation not found</h3>
          <p className="mt-1 text-sm text-gray-500">The invitation you're looking for doesn't exist.</p>
          <div className="mt-6">
            <Button href="/coach/students">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Parent Invitations
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const studentName = `${invitation.student_first_name} ${invitation.student_last_name}`.trim()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'Parent Invitations', href: '/coach/students' },
          { name: `${invitation.parent_email}` }
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            invitation.status === 'accepted' ? 'bg-green-50 border border-green-200' :
            invitation.status === 'pending' ? 'bg-amber-50 border border-amber-200' :
            invitation.status === 'expired' ? 'bg-red-50 border border-red-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            {getStatusIcon(invitation.status)}
          </div>
          <div>
            <Heading level={1} className="text-2xl font-bold text-gray-900">
              {invitation.parent_email}
            </Heading>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 border border-blue-200">
                {studentName}
                {invitation.grade_level && (
                  <span className="ml-1 text-blue-600">({invitation.grade_level})</span>
                )}
              </span>
              {getStatusBadge(invitation.status)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {invitation.status === 'pending' && (
            <Button
              onClick={handleResend}
              disabled={resending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {resending ? 'Resending...' : 'Resend'}
            </Button>
          )}
          
          <Button
            href={`/coach/students/${invitation.invitation_id}/edit`}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main invitation details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invitation Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Student Name</dt>
                <dd className="text-sm text-gray-900">{studentName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade Level</dt>
                <dd className="text-sm text-gray-900">{invitation.grade_level || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">School</dt>
                <dd className="text-sm text-gray-900">{invitation.school_name || 'Texas Sports Academy'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Coach</dt>
                <dd className="text-sm text-gray-900">{invitation.coach_name}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDateShort(invitation.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Expires</dt>
                <dd className="text-sm text-gray-900">{formatDateShort(invitation.expires_at)}</dd>
              </div>
              {invitation.last_sent_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Sent</dt>
                  <dd className="text-sm text-gray-900">{formatDateShort(invitation.last_sent_at)}</dd>
                </div>
              )}
              {invitation.accepted_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Accepted</dt>
                  <dd className="text-sm text-gray-900">{formatDateShort(invitation.accepted_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {invitation.message && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Message</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 italic">&ldquo;{invitation.message}&rdquo;</p>
            </div>
          </div>
        )}
      </div>

      {/* Status-specific information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Parent Email</p>
              <p className="text-lg font-semibold text-gray-900">{invitation.parent_email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Student</p>
              <p className="text-lg font-semibold text-gray-900">{studentName}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarDaysIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center gap-2">
                {getStatusBadge(invitation.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invitation URL (for pending invitations) */}
      {invitation.status === 'pending' && invitation.invitation_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Invitation Link</h3>
          <p className="text-sm text-blue-800 mb-3">
            This is the unique link that was sent to the parent. They can use this link to begin the enrollment process.
          </p>
          <div className="bg-white border border-blue-300 rounded-lg p-3">
            <code className="text-sm text-blue-800 break-all">{invitation.invitation_url}</code>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                Delete Invitation
              </DialogTitle>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the invitation for <strong>{invitation.parent_email}</strong>? 
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Invitation'}
              </Button>
              <Button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
} 