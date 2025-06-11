'use client'

import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/auth'

interface Invitation {
  invitation_id: string;
  invitation_token: string;
  email: string;
  role: string;
  school_name: string;
  school_type?: string;
  sport?: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  message?: string;
  created_at: string;
  expires_at: number;
  created_by: string;
  accepted_at?: string;
  cancelled_at?: string;
  last_sent_at?: string;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Simplified form state - only email and message
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  })

  const fetchInvitations = async (statusFilter?: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminAPI.getInvitations(statusFilter === 'all' ? undefined : statusFilter)
      
      // Handle null response (from 401 logout)
      if (response !== null) {
        setInvitations(response.invitations || [])
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations(filter)
  }, [filter])

  // Check for duplicate email
  const isDuplicateEmail = (email: string): boolean => {
    if (!email || email.trim() === '') return false
    return invitations.some(inv => 
      inv.email.toLowerCase() === email.toLowerCase() && 
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
      
      // Create invitation with ONLY email and message - no complex fields
      const invitationData = {
        email: formData.email,
        message: formData.message || 'Welcome to Texas Sports Academy Coach Portal! Please complete your application to get started.'
      }
      
      const result = await adminAPI.createInvitation(invitationData)
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        // Reset form and refresh data
        setFormData({
        email: '',
        message: ''
      })
      setShowCreateForm(false)
        await fetchInvitations(filter)
      alert('Invitation sent successfully!')
      }
    } catch (err) {
      console.error('Failed to create invitation:', err)
      if (err instanceof Error && err.message.includes('Email address is not verified')) {
        alert('Invitation created but email sending is temporarily disabled. The coach will need to be contacted manually.')
        // Refresh the list anyway since invitation was created
        await fetchInvitations(filter)
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
        await fetchInvitations(filter)
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

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to permanently delete this invitation? This action cannot be undone.')) return

    try {
      const result = await adminAPI.deleteInvitation(invitationId)
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        // Remove invitation from local state
        setInvitations(invitations.filter(inv => inv.invitation_id !== invitationId))
        // Also remove from selected if it was selected
        setSelectedInvitations(selectedInvitations.filter(id => id !== invitationId))
      }
    } catch (err) {
      console.error('Failed to delete invitation:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete invitation')
    }
  }

  // Bulk actions
  const handleSelectAll = () => {
    const pendingInvitations = filteredInvitations
      .filter(inv => inv.status === 'pending')
      .map(inv => inv.invitation_id)
    
    if (selectedInvitations.length === pendingInvitations.length) {
      setSelectedInvitations([])
    } else {
      setSelectedInvitations(pendingInvitations)
    }
  }

  const handleSelectInvitation = (invitationId: string) => {
    setSelectedInvitations(prev => 
      prev.includes(invitationId)
        ? prev.filter(id => id !== invitationId)
        : [...prev, invitationId]
    )
  }

  const handleBulkResend = async () => {
    if (selectedInvitations.length === 0) return
    
    if (!confirm(`Are you sure you want to resend ${selectedInvitations.length} invitation(s)?`)) return
    
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedInvitations.map(id => adminAPI.resendInvitation(id))
      )
      setSelectedInvitations([])
      await fetchInvitations(filter)
      alert(`${selectedInvitations.length} invitation(s) resent successfully`)
    } catch (err) {
      console.error('Failed to resend invitations:', err)
      alert('Some invitations could not be resent. Please try again.')
    } finally {
      setBulkActionLoading(false)
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

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const filteredInvitations = invitations.filter(invitation => {
    if (filter === 'all') return true
    return invitation.status === filter
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
            onClick={() => fetchInvitations(filter)} 
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

        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', count: invitations.length },
              { key: 'pending', label: 'Pending', count: invitations.filter(i => i.status === 'pending').length },
              { key: 'accepted', label: 'Accepted', count: invitations.filter(i => i.status === 'accepted').length },
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Coach Invitation</h3>
              <p className="text-sm text-gray-600 mb-4">
                The coach will receive an email invitation to join Texas Sports Academy and complete their application.
              </p>
              <form onSubmit={handleCreateInvitation} className="space-y-4">
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
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Welcome to Texas Sports Academy! We're excited to have you join our coaching team..."
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> The coach will complete their profile (name, phone, location) and school setup during the onboarding process.
                  </p>
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

      {/* Bulk Actions Bar */}
      {selectedInvitations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedInvitations.length} invitation(s) selected
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkResend}
                disabled={bulkActionLoading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkActionLoading ? 'Processing...' : 'Resend Selected'}
              </button>
              <button
                onClick={() => setSelectedInvitations([])}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {filter === 'all' ? 'All Invitations' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Invitations`}
              <span className="text-gray-500 text-sm ml-2">({filteredInvitations.length})</span>
            </h2>
            {pendingInvitations.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedInvitations.length === pendingInvitations.length ? 'Deselect All' : 'Select All Pending'}
              </button>
            )}
          </div>
        </div>

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
                      <input
                        type="checkbox"
                        checked={selectedInvitations.length === pendingInvitations.length && pendingInvitations.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coach Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
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
                        <input
                          type="checkbox"
                          checked={selectedInvitations.includes(invitation.invitation_id)}
                          onChange={() => handleSelectInvitation(invitation.invitation_id)}
                          disabled={invitation.status !== 'pending'}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                        {invitation.sport && invitation.sport !== 'general' && (
                          <div className="text-sm text-gray-500">{invitation.sport}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{invitation.school_name}</div>
                        {invitation.school_type && invitation.school_type !== 'combined' && (
                          <div className="text-sm text-gray-500">{invitation.school_type}</div>
                        )}
                        <div className="text-sm text-gray-500">{invitation.role ? invitation.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
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
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteInvitation(invitation.invitation_id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
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
                      <input
                        type="checkbox"
                        checked={selectedInvitations.includes(invitation.invitation_id)}
                        onChange={() => handleSelectInvitation(invitation.invitation_id)}
                        disabled={invitation.status !== 'pending'}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500">School & Role</div>
                      <div className="text-sm text-gray-900">{invitation.school_name}</div>
                      <div className="text-sm text-gray-500">{invitation.role ? invitation.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</div>
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
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteInvitation(invitation.invitation_id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
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