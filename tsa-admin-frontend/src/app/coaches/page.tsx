'use client'

import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/auth'
import React from 'react'

interface Coach {
  coach_id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  school_name: string;
  school_type?: string;
  sport?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at: string;
  last_login?: string;
  invitation_id?: string;
  onboarding_completed: boolean;
  profile_completed?: boolean;
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [coachToDelete, setCoachToDelete] = useState<string | null>(null)
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const fetchCoaches = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminAPI.getCoaches()
      
      // Handle null response (from 401 logout)
      if (response !== null) {
        setCoaches(response.coaches || [])
      }
    } catch (err) {
      console.error('Failed to fetch coaches:', err)
      setError(err instanceof Error ? err.message : 'Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCoach = (coachId: string) => {
    setCoachToDelete(coachId)
    setDeleteModalOpen(true)
  }

  const confirmDeleteCoach = async () => {
    if (!coachToDelete) return

    try {
      await adminAPI.deleteCoach(coachToDelete)
      // Remove coach from local state
      setCoaches(coaches.filter(coach => coach.coach_id !== coachToDelete))
      // Also remove from selected if it was selected
      setSelectedCoaches(selectedCoaches.filter(id => id !== coachToDelete))
      setDeleteModalOpen(false)
      setCoachToDelete(null)
    } catch (err) {
      console.error('Failed to delete coach:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete coach')
    }
  }

  // Bulk actions
  const handleSelectAll = () => {
    const coachIds = filteredCoaches.map(coach => coach.coach_id)
    
    if (selectedCoaches.length === coachIds.length) {
      setSelectedCoaches([])
    } else {
      setSelectedCoaches(coachIds)
    }
  }

  const handleSelectCoach = (coachId: string) => {
    setSelectedCoaches(prev => 
      prev.includes(coachId)
        ? prev.filter(id => id !== coachId)
        : [...prev, coachId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedCoaches.length === 0) return
    
    if (!confirm(`Are you sure you want to permanently delete ${selectedCoaches.length} coach(es)? This action cannot be undone.`)) return
    
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedCoaches.map(id => adminAPI.deleteCoach(id))
      )
      // Remove deleted coaches from local state
      setCoaches(coaches.filter(coach => !selectedCoaches.includes(coach.coach_id)))
      setSelectedCoaches([])
      alert(`${selectedCoaches.length} coach(es) deleted successfully`)
    } catch (err) {
      console.error('Failed to delete coaches:', err)
      alert('Some coaches could not be deleted. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  useEffect(() => {
    fetchCoaches()
  }, [])

  const filteredCoaches = coaches.filter(coach => {
    // Status filter
    if (filter !== 'all' && (coach.status || 'unknown') !== filter) return false
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const name = coach.name || coach.first_name || coach.last_name || coach.email || ''
      const email = (coach.email || '').toLowerCase()
      const school = (coach.school_name || '').toLowerCase()
      
      return name.toLowerCase().includes(searchLower) || 
             email.includes(searchLower) || 
             school.includes(searchLower)
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={`loading-stat-${i}`} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={`loading-row-${i}`} className="h-16 bg-gray-200 rounded"></div>
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
          <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Coaches</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchCoaches} 
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
        <h1 className="text-3xl font-bold text-gray-900">Coach Management</h1>
        <p className="mt-2 text-gray-600">
          View and manage registered coaches across all schools
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Coaches</div>
          <div className="text-3xl font-bold text-gray-900">
            {coaches.length}
          </div>
          <div className="text-sm text-green-600">
            {coaches.filter(c => c.status === 'active').length} active
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Active Coaches</div>
          <div className="text-3xl font-bold text-green-600">
            {coaches.filter(c => c.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">
            {coaches.length > 0 ? Math.round((coaches.filter(c => c.status === 'active').length / coaches.length) * 100) : 0}% of total
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Onboarding Completed</div>
          <div className="text-3xl font-bold text-blue-600">
            {coaches.filter(c => c.onboarding_completed === true).length}
          </div>
          <div className="text-sm text-gray-500">
            {coaches.length > 0 ? Math.round((coaches.filter(c => c.onboarding_completed === true).length / coaches.length) * 100) : 0}% completion rate
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Pending Setup</div>
          <div className="text-3xl font-bold text-yellow-600">
            {coaches.filter(c => c.onboarding_completed !== true).length}
          </div>
          <div className="text-sm text-gray-500">
            Need attention
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Filter by status:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="ml-2 border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Coaches</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="unknown">Unknown Status</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search coaches by name, email, or school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCoaches.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-red-900">
                {selectedCoaches.length} coach(es) selected
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {bulkActionLoading ? 'Deleting...' : 'Delete Selected'}
              </button>
              <button
                onClick={() => setSelectedCoaches([])}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-1/3 mb-4 md:mb-0">
            <input
              type="text"
              placeholder="Search coaches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded-md pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center space-x-4">
            {selectedCoaches.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'Deleting...' : `Delete Selected (${selectedCoaches.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Coaches</h2>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">School Distribution</h3>
          <div className="space-y-2">
            {Array.from(new Set(coaches.filter(c => c.school_name).map(c => c.school_name)))
              .sort()
              .slice(0, 10)
              .map(school => {
                const count = coaches.filter(c => c.school_name === school).length
                return (
                  <div key={`school-${school}`} className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">{school}</span>
                    <span className="text-sm text-gray-500">{count} coach{count !== 1 ? 'es' : ''}</span>
                  </div>
                )
              })}
            {Array.from(new Set(coaches.filter(c => c.school_name).map(c => c.school_name))).length > 10 && (
              <div key="more-schools" className="text-sm text-gray-500 text-center pt-2">
                ...and {Array.from(new Set(coaches.filter(c => c.school_name).map(c => c.school_name))).length - 10} more schools
              </div>
            )}
            {coaches.filter(c => !c.school_name).length > 0 && (
              <div key="no-school" className="flex justify-between items-center">
                <span className="text-sm text-gray-900">No school specified</span>
                <span className="text-sm text-gray-500">{coaches.filter(c => !c.school_name).length} coach{coaches.filter(c => !c.school_name).length !== 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sport Distribution</h3>
          <div className="space-y-2">
            {Array.from(new Set(coaches.filter(c => c.sport).map(c => c.sport)))
              .sort()
              .map(sport => {
                const count = coaches.filter(c => c.sport === sport).length
                return (
                  <div key={`sport-${sport}`} className="flex justify-between items-center">
                    <span className="text-sm text-gray-900 capitalize">{sport}</span>
                    <span className="text-sm text-gray-500">{count} coach{count !== 1 ? 'es' : ''}</span>
                  </div>
                )
              })}
            {coaches.filter(c => !c.sport).length > 0 && (
              <div key="no-sport" className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Not specified</span>
                <span className="text-sm text-gray-500">{coaches.filter(c => !c.sport).length} coach{coaches.filter(c => !c.sport).length !== 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {deleteModalOpen && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Coach</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this coach? This action cannot be undone.
              </p>
            </div>
            <div className="items-center px-4 py-3">
              <button
                onClick={confirmDeleteCoach}
                className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                Delete Coach
              </button>
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setCoachToDelete(null)
                }}
                className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
} 