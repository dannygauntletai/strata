'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { 
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid'
import { useState } from 'react'

// Based on leads table and user_org_associations from database schema
interface PendingApplication {
  id: string
  leadId: string // References leads table
  studentName: string
  parentName: string
  email: string
  phone: string
  grade: string
  submissionDate: string
  daysWaiting: number
  status: 'new' | 'contacted' | 'qualified' | 'sales_qualified' | 'requires_attention'
  priority: 'high' | 'medium' | 'low'
  program: string
  organizationId: string // References organizations table
  lastContact: string
  missingDocuments?: string[]
  leadScore: number // From leads.score
  source: string // From leads.utm_source or first_touch_source
  notes?: string
}

// Mock data based on database schema
const pendingApplications: PendingApplication[] = [
  {
    id: '1',
    leadId: 'lead_001',
    studentName: 'Emma Thompson',
    parentName: 'Sarah Thompson',
    email: 'sarah.thompson@email.com',
    phone: '(555) 123-4567',
    grade: '9th Grade',
    submissionDate: '2024-01-10',
    daysWaiting: 5,
    status: 'qualified',
    priority: 'high',
    program: 'STEM Academy',
    organizationId: 'org_001',
    lastContact: '2024-01-12',
    leadScore: 85,
    source: 'google_ads',
    notes: 'Strong academic background, excellent test scores'
  },
  {
    id: '2',
    leadId: 'lead_002',
    studentName: 'Marcus Johnson',
    parentName: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '(555) 987-6543',
    grade: '10th Grade',
    submissionDate: '2024-01-08',
    daysWaiting: 7,
    status: 'contacted',
    priority: 'medium',
    program: 'Liberal Arts',
    organizationId: 'org_001',
    lastContact: '2024-01-10',
    missingDocuments: ['Transcript', 'Recommendation Letter'],
    leadScore: 65,
    source: 'referral',
    notes: 'Follow up needed for missing documents'
  },
  {
    id: '3',
    leadId: 'lead_003',
    studentName: 'Sophia Chen',
    parentName: 'David Chen',
    email: 'david.chen@email.com',
    phone: '(555) 456-7890',
    grade: '11th Grade',
    submissionDate: '2024-01-12',
    daysWaiting: 3,
    status: 'sales_qualified',
    priority: 'high',
    program: 'Arts & Design',
    organizationId: 'org_001',
    lastContact: '2024-01-13',
    leadScore: 92,
    source: 'organic',
    notes: 'Interview scheduled for January 18th'
  },
  {
    id: '4',
    leadId: 'lead_004',
    studentName: 'Ethan Williams',
    parentName: 'Lisa Williams',
    email: 'lisa.williams@email.com',
    phone: '(555) 321-0987',
    grade: '9th Grade',
    submissionDate: '2024-01-05',
    daysWaiting: 10,
    status: 'requires_attention',
    priority: 'high',
    program: 'STEM Academy',
    organizationId: 'org_001',
    lastContact: '2024-01-08',
    missingDocuments: ['Medical Records'],
    leadScore: 78,
    source: 'facebook_ads',
    notes: 'Urgent: 10+ days pending, needs immediate review'
  }
]

const statusColors = {
  new: 'blue',
  contacted: 'yellow',
  qualified: 'green',
  sales_qualified: 'purple',
  requires_attention: 'red'
} as const

const priorityColors = {
  high: 'red',
  medium: 'yellow',
  low: 'green'
} as const

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  sales_qualified: 'Sales Qualified',
  requires_attention: 'Requires Attention'
}

export default function PendingApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<PendingApplication | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'waiting' | 'score'>('waiting')
  const [showFilters, setShowFilters] = useState(false)

  const filteredApplications = pendingApplications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case 'waiting':
        return b.daysWaiting - a.daysWaiting
      case 'score':
        return b.leadScore - a.leadScore
      default:
        return 0
    }
  })

  const stats = {
    total: pendingApplications.length,
    requiresAttention: pendingApplications.filter(app => app.status === 'requires_attention').length,
    avgWaitTime: Math.round(pendingApplications.reduce((sum, app) => sum + app.daysWaiting, 0) / pendingApplications.length),
    thisWeek: pendingApplications.filter(app => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(app.submissionDate) >= weekAgo
    }).length
  }

  return (
    <>
      {/* Mobile-first header */}
      <div className="mb-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Heading level={1} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Pending Applications
            </Heading>
            <Text className="text-zinc-600 mt-1">
              Review and process student applications awaiting decision
            </Text>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button outline className="w-full sm:w-auto">Export List</Button>
            <Button color="blue" className="w-full sm:w-auto">Bulk Actions</Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile-first grid */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-blue-200">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Total Pending</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-red-200">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Urgent</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.requiresAttention}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-yellow-200">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Avg Wait</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.avgWaitTime}d</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-green-200">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">This Week</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.thisWeek}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Mobile-first */}
      <div className="mb-6">
        <div className="border border-zinc-200 rounded-lg p-4">
          {/* Search bar */}
          <div className="mb-4">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search applications..."
              />
            </InputGroup>
          </div>

          {/* Filter toggle for mobile */}
          <div className="flex items-center justify-between mb-4 sm:hidden">
            <Text className="font-medium text-zinc-900">Filters</Text>
            <Button
              outline
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm"
            >
              {showFilters ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </Button>
          </div>

          {/* Filters */}
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-4 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Status</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="sales_qualified">Sales Qualified</option>
                <option value="requires_attention">Requires Attention</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Priority</label>
              <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Sort By</label>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'waiting' | 'score')}>
                <option value="waiting">Days Waiting</option>
                <option value="score">Lead Score</option>
                <option value="date">Submission Date</option>
                <option value="priority">Priority</option>
              </Select>
            </div>

            <div className="flex items-end">
              <Button outline className="w-full">
                <FunnelIcon className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List - Mobile-first */}
      <div className="">
        <div className="border border-zinc-200 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-200 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-900 sm:text-lg">
                Applications ({filteredApplications.length})
              </h3>
            </div>
          </div>
          
          <div className="divide-y divide-zinc-200">
            {filteredApplications.map((application) => (
              <div key={application.id} className="px-4 py-4 hover:border-zinc-300 transition-colors sm:px-6">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex-1">
                    {/* Header row */}
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-900">{application.studentName}</p>
                      <Badge color={statusColors[application.status]} className="text-xs">
                        {statusLabels[application.status]}
                      </Badge>
                      <Badge color={priorityColors[application.priority]} className="text-xs">
                        {application.priority.toUpperCase()}
                      </Badge>
                      {application.daysWaiting > 7 && (
                        <Badge color="red" className="text-xs">
                          {application.daysWaiting}d
                        </Badge>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="text-sm text-zinc-600 mb-2">
                      Parent: {application.parentName} • Grade: {application.grade} • Program: {application.program}
                    </div>
                    
                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mb-2">
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-3 w-3 mr-1" />
                        Submitted {application.submissionDate}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        Waiting {application.daysWaiting} days
                      </div>
                      <div>Score: {application.leadScore}</div>
                      <div>Source: {application.source}</div>
                    </div>
                    
                    {/* Contact info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mb-2">
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-3 w-3 mr-1" />
                        {application.email}
                      </div>
                      <div className="flex items-center">
                        <PhoneIcon className="h-3 w-3 mr-1" />
                        {application.phone}
                      </div>
                    </div>
                    
                    {/* Missing documents */}
                    {application.missingDocuments && application.missingDocuments.length > 0 && (
                      <div className="mb-2">
                        <Text className="text-xs text-red-600">
                          Missing: {application.missingDocuments.join(', ')}
                        </Text>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {application.notes && (
                      <div className="text-xs text-zinc-600 italic">
                        &ldquo;{application.notes}&rdquo;
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    <Button 
                      outline
                      onClick={() => setSelectedApplication(application)}
                      className="w-full sm:w-auto text-sm"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button outline className="w-full sm:w-auto text-sm">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button outline className="w-full sm:w-auto text-sm">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-zinc-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom border border-zinc-200 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-zinc-900">
                        Application Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge color={statusColors[selectedApplication.status]}>
                          {statusLabels[selectedApplication.status]}
                        </Badge>
                        <Badge color={priorityColors[selectedApplication.priority]}>
                          {selectedApplication.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Student Name</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.studentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Grade</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.grade}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Parent/Guardian</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.parentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Program</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.program}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Submission Date</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.submissionDate}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Days Waiting</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.daysWaiting} days</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Lead Score</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.leadScore}/100</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Source</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.source}</p>
                        </div>
                      </div>
                      
                      {selectedApplication.missingDocuments && selectedApplication.missingDocuments.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Missing Documents</label>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedApplication.missingDocuments.map((doc) => (
                              <Badge key={doc} color="red" className="text-xs">
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.notes && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Notes</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-200 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button 
                  color="green" 
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Accept Application
                </Button>
                <Button 
                  outline
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:ml-3"
                >
                  Decline Application
                </Button>
                <Button 
                  outline 
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 