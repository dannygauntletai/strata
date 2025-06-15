'use client'

import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/auth'

interface Invitation {
  invitation_id: string;
  invitation_token: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  state: string;
  bio?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired' | 'completed';
  created_at: string;
  expires_at: number;
  created_by: string;
  accepted_at?: string;
  cancelled_at?: string;
  last_sent_at?: string;
  // Generated fields
  full_name?: string;
  location?: string;
  phone_formatted?: string;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Updated form state with COACH_ONBOARDING_INTEGRATION fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    bio: '',
    message: ''
  })

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      setError(null)
      // Always fetch ALL invitations, don't filter on backend
      const response = await adminAPI.getInvitations()
      
      // Handle null response (from 401 logout)
      if (response !== null) {
        // Filter out any malformed invitations with missing required fields
        const validInvitations = (response.invitations || []).filter((inv: Invitation) => 
          inv && 
          inv.email && 
          inv.invitation_id && 
          inv.status
        )
        
        setInvitations(validInvitations)
        
        // Log warning if any invalid invitations were filtered out
        const invalidCount = (response.invitations || []).length - validInvitations.length
        if (invalidCount > 0) {
          console.warn(`Filtered out ${invalidCount} invalid invitation(s) with missing required fields`)
        }
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  // Check for duplicate email
  const isDuplicateEmail = (email: string): boolean => {
    if (!email || email.trim() === '') return false
    return invitations.some(inv => 
      inv.email && inv.email.toLowerCase() === email.toLowerCase() && 
      inv.status === 'pending'
    )
  }

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for duplicate
    if (isDuplicateEmail(formData.email)) {
      alert('An active invitation already exists for this email address.')
      return
    }
    
    try {
      setCreating(true)
      
      // Create invitation with comprehensive coach information
      const invitationData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        bio: formData.bio.trim(),
        message: formData.message.trim() || 'Welcome to Texas Sports Academy Coach Portal! Please complete your onboarding to get started.'
      }
      
      const result = await adminAPI.createInvitation(invitationData)
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        // Reset form and refresh data
        setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        bio: '',
        message: ''
      })
      setShowCreateForm(false)
        await fetchInvitations()
      alert('Invitation sent successfully!')
      }
    } catch (err) {
      console.error('Failed to create invitation:', err)
      if (err instanceof Error && err.message.includes('Email address is not verified')) {
        alert('Invitation created but email sending is temporarily disabled. The coach will need to be contacted manually.')
        // Refresh the list anyway since invitation was created
        await fetchInvitations()
        setShowCreateForm(false)
      } else if (err instanceof Error && err.message.includes('already exists')) {
        alert('An active invitation already exists for this email address.')
      } else {
        alert(err instanceof Error ? err.message : 'Failed to create invitation')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const result = await adminAPI.resendInvitation(invitationId)
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        await fetchInvitations()
        alert('Invitation resent successfully')
      }
    } catch (err) {
      console.error('Failed to resend invitation:', err)
      if (err instanceof Error && err.message.includes('Email address is not verified')) {
        alert('Invitation would be resent but email sending is temporarily disabled.')
      } else {
        alert(err instanceof Error ? err.message : 'Failed to resend invitation')
      }
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation? The coach will no longer be able to use this invitation link.')) return

    try {
      // Use DELETE method as expected by the backend (cancel_invitation function)
      const result = await adminAPI.authenticatedRequest(`${adminAPI.getBaseUrl('admin')}/admin/invitations/${invitationId}`, {
        method: 'DELETE'
      })
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        // Update the invitation status in local state instead of removing it
        setInvitations(invitations.map(inv => 
          inv.invitation_id === invitationId 
            ? { ...inv, status: 'cancelled' as const, cancelled_at: new Date().toISOString() }
            : inv
        ))
        
        alert('Invitation cancelled successfully')
      }
    } catch (err) {
      console.error('Failed to cancel invitation:', err)
      alert(err instanceof Error ? err.message : 'Failed to cancel invitation')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Opened'
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const filteredInvitations = invitations.filter(invitation => {
    // Apply status filter (if not 'all')
    if (filter !== 'all') {
    return invitation.status === filter
    }
    
    return true
  })

  const pendingInvitations = filteredInvitations.filter(inv => inv.status === 'pending')

  if (loading && invitations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Invitations</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => fetchInvitations()} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coach Invitations</h1>
          <p className="mt-2 text-gray-600">
              Send invitations to coaches to join the Texas Sports Academy platform
          </p>
        </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send Invitation
          </button>
      </div>

        {/* Single Tab System */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
                { key: 'all', label: 'All Invitations', count: invitations.length },
              { key: 'pending', label: 'Pending', count: invitations.filter(i => i.status === 'pending').length },
              { key: 'accepted', label: 'Opened', count: invitations.filter(i => i.status === 'accepted').length },
              { key: 'cancelled', label: 'Cancelled', count: invitations.filter(i => i.status === 'cancelled').length },
              { key: 'expired', label: 'Expired', count: invitations.filter(i => i.status === 'expired').length }
            ].map((tab) => (
                          <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
                          </button>
                ))}
          </nav>
        </div>
      </div>

      {/* Simplified Create Invitation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Coach Invitation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Collect the coach's basic information to create a personalized invitation and streamline their onboarding experience.
              </p>
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                {/* First and Last Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email and Phone Row */}
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="coach@example.com"
                  />
                  {formData.email && isDuplicateEmail(formData.email) && (
                    <p className="text-red-600 text-sm mt-1">
                      An active invitation already exists for this email
                    </p>
                  )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>

                {/* City and State Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Austin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="TX"
                    />
                  </div>
                </div>

                {/* Bio - Full Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio (Optional)
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell us about your coaching experience..."
                  />
                </div>

                {/* Admin Message - Full Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Welcome to Texas Sports Academy! We're excited to have you join our coaching team..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || (!!formData.email && isDuplicateEmail(formData.email))}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-white shadow rounded-lg">
        {filteredInvitations.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-2">No invitations found</div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Send your first invitation
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coach Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvitations.map((invitation) => (
                    <tr key={invitation.invitation_id}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.full_name || `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()}
                        </div>
                        <div className="text-sm text-gray-500">{invitation.email || 'No email'}</div>
                        {invitation.phone_formatted && (
                          <div className="text-sm text-gray-500">{invitation.phone_formatted}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {invitation.location || `${invitation.city || ''}, ${invitation.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {getStatusDisplayText(invitation.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(invitation.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex space-x-2">
                          {invitation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(invitation.invitation_id)}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleCancelInvitation(invitation.invitation_id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {invitation.status !== 'pending' && invitation.status !== 'cancelled' && (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                          {invitation.status === 'cancelled' && (
                            <span className="text-gray-500 text-sm italic">Cancelled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredInvitations.map((invitation) => (
                <div key={invitation.invitation_id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.full_name || `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()}
                        </div>
                        <div className="text-sm text-gray-500">{invitation.email || 'No email'}</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {getStatusDisplayText(invitation.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500">Location & Phone</div>
                      <div className="text-sm text-gray-900">
                        {invitation.location || `${invitation.city || ''}, ${invitation.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '')}
                      </div>
                      {invitation.phone_formatted && (
                        <div className="text-sm text-gray-500">{invitation.phone_formatted}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500">Created</div>
                      <div className="text-sm text-gray-900">{formatDate(invitation.created_at)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    {invitation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResendInvitation(invitation.invitation_id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancelInvitation(invitation.invitation_id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {invitation.status !== 'pending' && invitation.status !== 'cancelled' && (
                      <span className="text-gray-400 text-sm">No actions available</span>
                    )}
                    {invitation.status === 'cancelled' && (
                      <span className="text-gray-500 text-sm italic">Cancelled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 