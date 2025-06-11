'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  DocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FolderIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect, useCallback } from 'react'
import { config } from '@/config/environments'

// API Configuration
const API_BASE_URL = config.apiEndpoints.parentApi

interface Document {
  document_id: string
  file_name: string
  document_type: string
  file_size: number
  upload_date: string
  status: 'pending' | 'approved' | 'rejected' | 'requires_attention'
  required: boolean
  description?: string
  rejection_reason?: string
  enrollment_id: string
  student_name: string
  coach_name?: string
  expiry_date?: string
  tags?: string[]
}

interface DocumentStats {
  total_documents: number
  approved_documents: number
  pending_documents: number
  rejected_documents: number
  missing_required: number
}

function DocumentsContent() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [studentFilter, setStudentFilter] = useState<string>('all')

  useEffect(() => {
    fetchDocuments()
    fetchStats()
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...documents]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter)
    }

    if (studentFilter !== 'all') {
      filtered = filtered.filter(doc => doc.student_name === studentFilter)
    }

    setFilteredDocuments(filtered)
  }, [statusFilter, searchQuery, typeFilter, studentFilter, documents])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError('')
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/admissions/documents/all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`)
      }

      const data = await response.json()
      setDocuments(data.documents || [])
      
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE_URL}/admissions/documents/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      setStats(data.stats)
      
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE_URL}/admissions/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Error downloading document:', err)
      alert('Failed to download document. Please try again.')
    }
  }

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE_URL}/admissions/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.status}`)
      }

      // Update local state
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId))
      
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete document. Please try again.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge color="green">Approved</Badge>
      case 'rejected':
        return <Badge color="red">Rejected</Badge>
      case 'requires_attention':
        return <Badge color="amber">Needs Attention</Badge>
      default:
        return <Badge color="blue">Pending Review</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      case 'requires_attention':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-blue-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getUniqueValues = (key: keyof Document) => {
    return Array.from(new Set(documents.map(doc => doc[key] as string))).filter(Boolean)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
    setStudentFilter('all')
  }

  if (loading) {
    return (
      <ParentPortalLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto mb-4"></div>
            <span className="text-gray-600">Loading documents...</span>
          </div>
        </div>
      </ParentPortalLayout>
    )
  }

  return (
    <ParentPortalLayout>
      <div className="space-y-8">
        {/* TSA Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading className="text-2xl font-bold text-gray-900">Enrollment Documents</Heading>
            <Subheading className="text-gray-600 mt-2">Submit required documents for your microschool enrollment</Subheading>
          </div>
          
          <div className="flex items-center space-x-3">
                          <Button
                onClick={() => window.location.href = '/parent/enrollment/documents'}
                className="bg-[#004aad] hover:bg-[#003888] text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-all duration-200"
              >
                <DocumentIcon className="h-4 w-4 mr-2" />
                Upload Enrollment Documents
              </Button>
          </div>
        </div>

        {/* TSA Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <span className="text-red-700 font-medium">{error}</span>
            <Button 
              onClick={fetchDocuments} 
              className="ml-4 bg-[#004aad] hover:bg-[#003888] text-white font-medium px-4 py-2 rounded-lg"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* TSA Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-4">
                  <DocumentIcon className="h-6 w-6 text-[#004aad]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                  <p className="text-sm font-semibold text-gray-600">Total Documents</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mr-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved_documents}</p>
                  <p className="text-sm font-semibold text-gray-600">Approved</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-4">
                  <ClockIcon className="h-6 w-6 text-[#004aad]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_documents}</p>
                  <p className="text-sm font-semibold text-gray-600">Pending</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mr-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected_documents}</p>
                  <p className="text-sm font-semibold text-gray-600">Rejected</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mr-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.missing_required}</p>
                  <p className="text-sm font-semibold text-gray-600">Missing Required</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TSA Filters */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mr-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-600" />
                </div>
                <Heading className="text-lg font-semibold text-gray-900">Filters</Heading>
              </div>
              <Button 
                onClick={clearFilters} 
                className="text-sm font-medium text-[#004aad] hover:text-[#003888] px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="p-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full focus:ring-[#004aad] focus:border-[#004aad]"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="requires_attention">Needs Attention</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">
              Document Type
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] bg-white"
            >
              <option value="all">All Types</option>
              {getUniqueValues('document_type').map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="student" className="block text-sm font-semibold text-gray-700 mb-2">
              Student
            </label>
            <select
              id="student"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] bg-white"
            >
              <option value="all">All Students</option>
              {getUniqueValues('student_name').map(student => (
                <option key={student} value={student}>
                  {student}
                </option>
              ))}
            </select>
          </div>
            </div>
          </div>
        </div>

        {/* TSA Documents List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mr-3">
                  <FolderIcon className="h-4 w-4 text-gray-600" />
                </div>
                <Heading className="text-lg font-semibold text-gray-900">
                  Documents ({filteredDocuments.length})
                </Heading>
              </div>
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {filteredDocuments.length} of {documents.length} documents
                </span>
              </div>
            </div>
          </div>
        
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <Heading className="text-xl text-gray-600 mb-2">No documents found</Heading>
              <p className="text-gray-500 mb-6">
                {documents.length === 0 
                  ? "You haven't uploaded any documents yet." 
                  : "No documents match your current filters."}
              </p>
              {documents.length === 0 && (
                <Button
                  onClick={() => window.location.href = '/enrollment/documents'}
                  color="blue"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <DocumentIcon className="h-4 w-4 mr-2" />
                  Upload Your First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.document_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(doc.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-gray-900 truncate">{doc.file_name}</span>
                          {getStatusBadge(doc.status)}
                          {doc.required && (
                            <Badge color="red" className="text-xs">Required</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Type:</span> {doc.document_type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span> {formatFileSize(doc.file_size)}
                          </div>
                          <div>
                            <span className="font-medium">Uploaded:</span> {formatDate(doc.upload_date)}
                          </div>
                          <div>
                            <span className="font-medium">Student:</span> {doc.student_name}
                          </div>
                          {doc.coach_name && (
                            <div>
                              <span className="font-medium">Coach:</span> {doc.coach_name}
                            </div>
                          )}
                          {doc.expiry_date && (
                            <div>
                              <span className="font-medium">Expires:</span> {formatDate(doc.expiry_date)}
                            </div>
                          )}
                        </div>

                        {doc.description && (
                          <p className="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                            {doc.description}
                          </p>
                        )}

                        {doc.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                            <span className="text-red-800 text-sm">
                              <strong>Rejection Reason:</strong> {doc.rejection_reason}
                            </span>
                          </div>
                        )}

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} color="zinc" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        color="zinc"
                        className="text-xs py-1 px-3"
                        onClick={() => downloadDocument(doc.document_id, doc.file_name)}
                      >
                        <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      
                      <Button
                        color="zinc"
                        className="text-xs py-1 px-3"
                        onClick={() => window.open(`/documents/${doc.document_id}/view`, '_blank')}
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        color="blue"
                        className="text-xs py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => window.location.href = `/enrollment/${doc.enrollment_id}`}
                      >
                        Enrollment
                      </Button>
                      
                      <Button
                        color="zinc"
                        className="text-xs py-1 px-3 text-red-600 hover:bg-red-50"
                        onClick={() => deleteDocument(doc.document_id)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </ParentPortalLayout>
  )
}

export default DocumentsContent 