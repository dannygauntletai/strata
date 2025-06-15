'use client'

import { useState, useEffect } from 'react'
import { adminAPI, adminAuth } from '@/lib/auth'
import React from 'react'
import CoachList from './CoachList'
import EditCoachModal from './EditCoachModal'

interface Coach {
  coach_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  sport: string | null;
  school_name: string | null;
  school_type: string | null;
  role: string | null;
  status: string | null;
  onboarding_completed: boolean;
  created_at: string;
  name?: string;
  last_login?: string;
  invitation_id?: string;
  profile_completed?: boolean;
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [coachToDelete, setCoachToDelete] = useState<number | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [coachToEdit, setCoachToEdit] = useState<Coach | null>(null)
  const [editLoading, setEditLoading] = useState(false)

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

  const handleDeleteCoach = (coachId: number) => {
    console.log('🎯 Delete coach button clicked:', {
      coachId,
      coachIdType: typeof coachId,
      coachDetails: coaches.find(c => c.coach_id === coachId)
    })
    setCoachToDelete(coachId)
    setDeleteModalOpen(true)
  }

  const confirmDeleteCoach = async () => {
    if (!coachToDelete) return

    console.log('🗑️ Starting coach deletion process:', {
      coachId: coachToDelete,
      coachIdType: typeof coachToDelete,
      coachIdString: coachToDelete.toString()
    })

    try {
      console.log('📡 Calling adminAPI.deleteCoach with ID:', coachToDelete.toString())
      const result = await adminAPI.deleteCoach(coachToDelete.toString())
      console.log('✅ Delete API call successful:', result)
      
      // Update coach status to inactive instead of removing from array
      const coachCountBefore = coaches.length
      setCoaches(coaches.map(coach => 
        coach.coach_id === coachToDelete 
          ? { ...coach, status: 'inactive' }
          : coach
      ))
      console.log('🔄 Updated coach status to inactive:', {
        coachCountBefore,
        coachCountAfter: coachCountBefore, // Same count since we're not removing
        updatedCoachId: coachToDelete
      })
      
      setDeleteModalOpen(false)
      setCoachToDelete(null)
      
      console.log('🎉 Coach deletion completed successfully')
    } catch (err) {
      console.error('❌ Failed to delete coach:', {
        error: err,
        coachId: coachToDelete,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : typeof err
      })
      setError(err instanceof Error ? err.message : 'Failed to delete coach')
    }
  }

  const handleEditCoach = (coach: Coach) => {
    console.log('🎯 Edit coach button clicked:', {
      coachId: coach.coach_id,
      coachDetails: coach
    })
    setCoachToEdit(coach)
    setEditModalOpen(true)
  }

  const confirmEditCoach = async (updatedCoach: Partial<Coach>) => {
    if (!coachToEdit) return

    console.log('✏️ Starting coach edit process:', {
      coachId: coachToEdit.coach_id,
      updatedData: updatedCoach
    })

    setEditLoading(true)
    try {
      console.log('📡 Calling adminAPI.updateCoach with ID:', coachToEdit.coach_id.toString())
      const result = await adminAPI.updateCoach(coachToEdit.coach_id.toString(), {
        first_name: updatedCoach.first_name || undefined,
        last_name: updatedCoach.last_name || undefined,
        email: updatedCoach.email || undefined,
        sport: updatedCoach.sport || undefined,
        school_name: updatedCoach.school_name || undefined,
        school_type: updatedCoach.school_type || undefined,
        role: updatedCoach.role || undefined,
        status: updatedCoach.status || undefined
      })
      console.log('✅ Update API call successful:', result)
      
      // Update coach in local state
      setCoaches(coaches.map(coach => 
        coach.coach_id === coachToEdit.coach_id 
          ? { ...coach, ...updatedCoach }
          : coach
      ))
      
      setEditModalOpen(false)
      setCoachToEdit(null)
      
      console.log('🎉 Coach update completed successfully')
    } catch (err) {
      console.error('❌ Failed to update coach:', {
        error: err,
        coachId: coachToEdit.coach_id,
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      })
      setError(err instanceof Error ? err.message : 'Failed to update coach')
    } finally {
      setEditLoading(false)
    }
  }

  useEffect(() => {
    fetchCoaches()
  }, [])

  const filteredCoaches = coaches.filter(coach => {
    const status = coach.status || 'unknown'
    
    // Apply status filter (if not 'all')
    if (filter !== 'all' && status !== filter) return false
    
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
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Coach Management</h1>
          <p className="mt-2 text-gray-600">
            View and manage registered coaches across all schools
          </p>
        </div>
          
        {/* Single Tab System */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Coaches', count: coaches.length },
              { key: 'active', label: 'Active', count: coaches.filter(c => c.status === 'active').length },
              { key: 'pending', label: 'Pending', count: coaches.filter(c => c.status === 'pending').length },
              { key: 'inactive', label: 'Inactive', count: coaches.filter(c => c.status === 'inactive').length },
              { key: 'suspended', label: 'Suspended', count: coaches.filter(c => c.status === 'suspended').length },
              { key: 'unknown', label: 'Unknown', count: coaches.filter(c => (c.status || 'unknown') === 'unknown').length }
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

        {/* Coach List Component */}
        <CoachList
          coaches={filteredCoaches}
          handleDeleteCoach={handleDeleteCoach}
          handleEditCoach={handleEditCoach}
        />

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
      
      {/* Edit Coach Modal */}
      {editModalOpen && coachToEdit && (
        <EditCoachModal
          coach={coachToEdit}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setCoachToEdit(null)
          }}
          onSave={confirmEditCoach}
          loading={editLoading}
        />
      )}
    </>
  )
} 