'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { 
  PlusIcon, 
  EyeIcon, 
  EnvelopeIcon,
  UserGroupIcon,
  TrashIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from '@heroicons/react/20/solid'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// API Configuration
// ✅ FIXED: Use proper API endpoint from SSM config
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-2.amazonaws.com/prod'

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
  student_grade?: string
  notes?: string
  grade_level?: string
  message?: string
}

interface NewInvitationForm {
  parent_email: string
  student_first_name: string
  student_last_name: string
  student_grade: string
  notes: string
}

// Student name tag component - Updated to match TSA theme
function StudentTag({ firstName, lastName, grade }: { firstName: string, lastName: string, grade?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#004aad]/10 px-2 py-1 text-xs font-medium text-[#004aad] border border-[#004aad]/20">
      {firstName} {lastName}
      {grade && <span className="ml-1 text-[#003888]">({grade})</span>}
    </span>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
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

// Invitation card component following Feature Dashboard Card design theme
function InvitationCard({ invitation, onDelete, onResend }: { 
  invitation: ParentInvitation, 
  onDelete: (id: string) => void,
  onResend: (id: string) => void 
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      {/* Card content following theme pattern */}
      <div className="px-6 py-5 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar/Icon following 40px pattern */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              invitation.status === 'accepted' ? 'bg-green-50 border border-green-200' :
              invitation.status === 'pending' ? 'bg-amber-50 border border-amber-200' :
              invitation.status === 'expired' ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              {getStatusIcon(invitation.status)}
            </div>
            
            {/* Main content following theme typography */}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{invitation.parent_email}</h4>
              <div className="flex items-center gap-2 mb-2">
                <StudentTag 
                  firstName={invitation.student_first_name} 
                  lastName={invitation.student_last_name}
                  grade={invitation.grade_level}
                />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Invited {formatDate(invitation.created_at)}
                {invitation.accepted_at && ` • Accepted ${formatDate(invitation.accepted_at)}`}
              </p>
              {invitation.message && (
                <p className="text-xs text-gray-500 italic">"{invitation.message}"</p>
              )}
            </div>
          </div>
          
          {/* Status and actions following theme pattern */}
          <div className="flex items-center gap-3 ml-4">
            <StatusBadge status={invitation.status} />
            
            {/* Action buttons with improved hover states */}
            <div className="flex items-center gap-1">
              {invitation.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onResend(invitation.invitation_id)
                  }}
                  className="p-1.5 text-gray-400 hover:text-[#004aad] hover:bg-[#004aad]/10 rounded-md transition-colors"
                  title="Resend invitation"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(invitation.invitation_id)
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete invitation"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Chevron indicator following theme */}
            <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Create invitation modal with TSA theme colors
function CreateInvitationModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (data: NewInvitationForm) => void 
}) {
  const [formData, setFormData] = useState<NewInvitationForm>({
    parent_email: '',
    student_first_name: '',
    student_last_name: '',
    student_grade: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      parent_email: '',
      student_first_name: '',
      student_last_name: '',
      student_grade: '',
      notes: ''
    })
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
              Invite Parent to Platform
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Email *
              </label>
              <input
                type="email"
                required
                value={formData.parent_email}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_email: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
                placeholder="parent@example.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_first_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
                  placeholder="Emma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_last_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
                  placeholder="Thompson"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={formData.student_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, student_grade: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
              >
                <option value="">Select grade</option>
                <option value="K">Kindergarten</option>
                <option value="1st">1st Grade</option>
                <option value="2nd">2nd Grade</option>
                <option value="3rd">3rd Grade</option>
                <option value="4th">4th Grade</option>
                <option value="5th">5th Grade</option>
                <option value="6th">6th Grade</option>
                <option value="7th">7th Grade</option>
                <option value="8th">8th Grade</option>
                <option value="9th">9th Grade</option>
                <option value="10th">10th Grade</option>
                <option value="11th">11th Grade</option>
                <option value="12th">12th Grade</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#004aad] focus:outline-none focus:ring-1 focus:ring-[#004aad]"
                placeholder="Additional information for the parent..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-[#004aad] text-white hover:bg-[#003888]">
                Send Invitation
              </Button>
              <Button type="button" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// Main content component
export function ParentInvitationsContent() {
  const [invitations, setInvitations] = useState<ParentInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Load API endpoint from SSM
  useEffect(() => {
    try {
      const url = getCoachApiUrl();
      setApiBaseUrl(url);
    } catch (error) {
      console.error('Failed to load API endpoint:', error);
    }
  }, [])

  useEffect(() => {
    if (apiBaseUrl) {
      fetchInvitations()
    }
  }, [apiBaseUrl])

  const fetchInvitations = async () => {
    if (!apiBaseUrl) return
    
    try {
      setLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }

      // ✅ FIXED: Remove coach_id parameter and use authentication headers
      const response = await fetch(`${apiBaseUrl}/parent-invitations`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user.token ? `Bearer ${user.token}` : ''
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch invitations:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvitation = async (formData: NewInvitationForm) => {
    if (!apiBaseUrl) return
    
    try {
      setSubmitting(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }
      
      // ✅ FIXED: Remove coach_id from body since backend uses auth context
      const invitationData = {
        parent_email: formData.parent_email,
        student_first_name: formData.student_first_name,
        student_last_name: formData.student_last_name,
        grade_level: formData.student_grade,
        message: formData.notes
        // ✅ REMOVED: coach_id - now extracted from auth token
      }

      const response = await fetch(`${apiBaseUrl}/parent-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.token ? `Bearer ${user.token}` : ''
        },
        body: JSON.stringify(invitationData)
      })

      if (response.ok) {
        setShowCreateModal(false)
        fetchInvitations() // Refresh the list
      } else {
        const errorData = await response.json()
        alert(`Failed to create invitation: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating invitation:', error)
      alert('Failed to create invitation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!apiBaseUrl) return
    
    const invitation = invitations.find(inv => inv.invitation_id === invitationId)
    const studentName = invitation ? `${invitation.student_first_name} ${invitation.student_last_name}` : 'this invitation'
    
    if (!confirm(`Are you sure you want to delete "${studentName}"? This action cannot be undone.`)) return

    try {
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }

      const response = await fetch(`${apiBaseUrl}/parent-invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.token ? `Bearer ${user.token}` : ''
        }
      })

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId))
      } else {
        alert('Failed to delete invitation')
      }
    } catch (error) {
      console.error('Error deleting invitation:', error)
      alert('Failed to delete invitation')
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (!apiBaseUrl) return
    
    try {
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }

      const response = await fetch(`${apiBaseUrl}/parent-invitations/${invitationId}/resend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.token ? `Bearer ${user.token}` : ''
        }
      })

      if (response.ok) {
        alert('Invitation resent successfully!')
        fetchInvitations() // Refresh to get updated timestamps
      } else {
        alert('Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation')
    }
  }

  // Filter invitations by status
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted')
  const expiredInvitations = invitations.filter(inv => inv.status === 'expired')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show loading if API URL not ready
  if (!apiBaseUrl) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading API configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header following design theme typography */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Heading>Parent Platform Invitations</Heading>
          <p className="mt-2 text-zinc-500">
            Invite parents to join your coaching platform for ongoing enrollment and communication.
            <br />
            <span className="text-sm text-amber-600">
              💡 For event-specific invitations, use the Events page → individual event → "Invite Participants"
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-white text-gray-700 border border-zinc-200 hover:bg-zinc-50 cursor-pointer" 
            href="/coach/templates/parent-invitation"
          >
            <EyeIcon className="-ml-1 mr-1 h-5 w-5" />
            View Template
          </Button>
          <Button 
            className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
            onClick={() => setShowCreateModal(true)}
            disabled={submitting}
          >
            <PlusIcon className="-ml-1.5 mr-1 h-5 w-5" />
            Invite Parent to Platform
          </Button>
        </div>
      </div>

      {/* Summary stats following Quick Action Card pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingInvitations.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-semibold text-gray-900">{acceptedInvitations.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{invitations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invitations list with proper spacing */}
      {invitations.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No platform invitations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by inviting parents to join your coaching platform for ongoing enrollment.
          </p>
          <div className="mt-6">
            <Button 
              className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
              onClick={() => setShowCreateModal(true)}
            >
              <PlusIcon className="-ml-1 mr-1 h-5 w-5" />
              Invite Parent to Platform
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.invitation_id}
              invitation={invitation}
              onDelete={handleDeleteInvitation}
              onResend={handleResendInvitation}
            />
          ))}
        </div>
      )}

      {/* Create invitation modal */}
      <CreateInvitationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateInvitation}
      />
    </>
  )
} 