'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { 
  DocumentCheckIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid'
import { useState } from 'react'

// Based on user_org_associations and organizations tables from database schema
interface AcceptedApplication {
  id: string
  userId: string // References users table
  orgId: string // References organizations table
  studentName: string
  parentName: string
  email: string
  phone: string
  grade: string
  acceptedDate: string
  enrollmentStatus: 'pending' | 'enrolled' | 'deposit_pending' | 'documents_pending'
  program: string
  startDate: string
  tuitionPlan: 'full' | 'monthly' | 'semester'
  depositAmount: number
  depositPaid: boolean
  nextSteps: string[]
  assignedCoach?: string
  role: string // From user_org_associations.role
  notes?: string
}

// Mock data based on database schema
const acceptedApplications: AcceptedApplication[] = [
  {
    id: '1',
    userId: 'user_001',
    orgId: 'org_001',
    studentName: 'Emma Thompson',
    parentName: 'Sarah Thompson',
    email: 'sarah.thompson@email.com',
    phone: '(555) 123-4567',
    grade: '9th Grade',
    acceptedDate: '2024-01-15',
    enrollmentStatus: 'enrolled',
    program: 'STEM Academy',
    startDate: '2024-02-01',
    tuitionPlan: 'monthly',
    depositAmount: 500,
    depositPaid: true,
    nextSteps: ['Schedule orientation', 'Meet assigned coach'],
    assignedCoach: 'Dr. Johnson',
    role: 'student',
    notes: 'High-achieving student, excited to start'
  },
  {
    id: '2',
    userId: 'user_002',
    orgId: 'org_001',
    studentName: 'Marcus Johnson',
    parentName: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '(555) 987-6543',
    grade: '10th Grade',
    acceptedDate: '2024-01-12',
    enrollmentStatus: 'deposit_pending',
    program: 'Liberal Arts',
    startDate: '2024-02-01',
    tuitionPlan: 'semester',
    depositAmount: 750,
    depositPaid: false,
    nextSteps: ['Pay enrollment deposit', 'Submit health records'],
    role: 'student',
    notes: 'Deposit deadline: January 25th'
  },
  {
    id: '3',
    userId: 'user_003',
    orgId: 'org_001',
    studentName: 'Sophia Chen',
    parentName: 'David Chen',
    email: 'david.chen@email.com',
    phone: '(555) 456-7890',
    grade: '11th Grade',
    acceptedDate: '2024-01-18',
    enrollmentStatus: 'documents_pending',
    program: 'Arts & Design',
    startDate: '2024-02-05',
    tuitionPlan: 'full',
    depositAmount: 1000,
    depositPaid: true,
    nextSteps: ['Submit immunization records', 'Complete placement tests'],
    assignedCoach: 'Ms. Rivera',
    role: 'student'
  },
  {
    id: '4',
    userId: 'user_004',
    orgId: 'org_001',
    studentName: 'Ethan Williams',
    parentName: 'Lisa Williams',
    email: 'lisa.williams@email.com',
    phone: '(555) 321-0987',
    grade: '9th Grade',
    acceptedDate: '2024-01-20',
    enrollmentStatus: 'pending',
    program: 'STEM Academy',
    startDate: '2024-02-08',
    tuitionPlan: 'monthly',
    depositAmount: 500,
    depositPaid: false,
    nextSteps: ['Complete enrollment packet', 'Schedule parent meeting'],
    role: 'student',
    notes: 'Parent wants to discuss tuition options'
  }
]

const statusColors = {
  pending: 'yellow',
  enrolled: 'green',
  deposit_pending: 'red',
  documents_pending: 'blue'
} as const

const statusLabels = {
  pending: 'Pending Enrollment',
  enrolled: 'Enrolled',
  deposit_pending: 'Deposit Pending',
  documents_pending: 'Documents Pending'
}

export default function AcceptedApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<AcceptedApplication | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'start-date' | 'name'>('date')
  const [showFilters, setShowFilters] = useState(false)

  const filteredApplications = acceptedApplications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || app.enrollmentStatus === statusFilter
    const matchesProgram = programFilter === 'all' || app.program === programFilter
    
    return matchesSearch && matchesStatus && matchesProgram
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.acceptedDate).getTime() - new Date(a.acceptedDate).getTime()
      case 'start-date':
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      case 'name':
        return a.studentName.localeCompare(b.studentName)
      default:
        return 0
    }
  })

  const stats = {
    total: acceptedApplications.length,
    enrolled: acceptedApplications.filter(app => app.enrollmentStatus === 'enrolled').length,
    pending: acceptedApplications.filter(app => app.enrollmentStatus !== 'enrolled').length,
    depositsPending: acceptedApplications.filter(app => !app.depositPaid).length
  }

  return (
    <>
      {/* Mobile-first header */}
      <div className="mb-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Heading level={1} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Accepted Applications
            </Heading>
            <Text className="text-zinc-600 mt-1">
              Manage enrolled students and track enrollment progress
            </Text>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button outline className="w-full sm:w-auto">Export List</Button>
            <Button outline className="w-full sm:w-auto">Send Reminders</Button>
            <Button color="blue" className="w-full sm:w-auto">Bulk Enroll</Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile-first grid */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-green-200">
                <DocumentCheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Total Accepted</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-blue-200">
                <AcademicCapIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Enrolled</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.enrolled}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-yellow-200">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Pending</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-red-200">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-zinc-500 sm:text-sm">Deposits Due</p>
                <p className="text-lg font-semibold text-zinc-900 sm:text-2xl">{stats.depositsPending}</p>
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
                placeholder="Search students..."
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
              <label className="block text-sm font-medium text-zinc-700 mb-2">Enrollment Status</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="enrolled">Fully Enrolled</option>
                <option value="pending">Pending Enrollment</option>
                <option value="deposit_pending">Deposit Pending</option>
                <option value="documents_pending">Documents Pending</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Program</label>
              <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="all">All Programs</option>
                <option value="STEM Academy">STEM Academy</option>
                <option value="Liberal Arts">Liberal Arts</option>
                <option value="Arts & Design">Arts & Design</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Sort By</label>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'start-date' | 'name')}>
                <option value="date">Acceptance Date</option>
                <option value="start-date">Start Date</option>
                <option value="name">Student Name</option>
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
                Students ({filteredApplications.length})
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
                      <Badge color={statusColors[application.enrollmentStatus]} className="text-xs">
                        {statusLabels[application.enrollmentStatus]}
                      </Badge>
                      {!application.depositPaid && (
                        <Badge color="red" className="text-xs">
                          DEPOSIT DUE
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
                        Accepted {application.acceptedDate}
                      </div>
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-3 w-3 mr-1" />
                        Starts {application.startDate}
                      </div>
                      <div className="flex items-center">
                        <CreditCardIcon className="h-3 w-3 mr-1" />
                        ${application.depositAmount} deposit
                      </div>
                      {application.assignedCoach && (
                        <div className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          Coach: {application.assignedCoach}
                        </div>
                      )}
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
                    
                    {/* Next steps */}
                    {application.nextSteps.length > 0 && (
                      <div className="mb-2">
                        <Text className="text-xs font-medium text-zinc-700">Next Steps:</Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {application.nextSteps.map((step, index) => (
                            <Badge key={index} color="blue" className="text-xs">
                              {step}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {application.notes && (
                      <div className="text-xs text-zinc-600 italic">
                        &quot;{application.notes}&quot;
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
                      View Details
                    </Button>
                    {application.enrollmentStatus !== 'enrolled' && (
                      <Button outline className="w-full sm:w-auto text-sm">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Complete Enrollment
                      </Button>
                    )}
                    <Button outline className="w-full sm:w-auto text-sm">
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      Send Documents
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

            <div className="inline-block align-bottom border border-zinc-200 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-zinc-900">
                        Student Enrollment Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge color={statusColors[selectedApplication.enrollmentStatus]}>
                          {statusLabels[selectedApplication.enrollmentStatus]}
                        </Badge>
                        {selectedApplication.depositPaid ? (
                          <Badge color="green">DEPOSIT PAID</Badge>
                        ) : (
                          <Badge color="red">DEPOSIT PENDING</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
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
                          <label className="block text-sm font-medium text-zinc-700">Acceptance Date</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.acceptedDate}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Start Date</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.startDate}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Tuition Plan</label>
                          <p className="mt-1 text-sm text-zinc-900 capitalize">{selectedApplication.tuitionPlan}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Deposit Amount</label>
                          <p className="mt-1 text-sm text-zinc-900">${selectedApplication.depositAmount}</p>
                        </div>
                      </div>
                      
                      {selectedApplication.assignedCoach && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Assigned Coach</label>
                          <p className="mt-1 text-sm text-zinc-900">{selectedApplication.assignedCoach}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Contact Information</label>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-zinc-900">{selectedApplication.email}</p>
                          <p className="text-sm text-zinc-900">{selectedApplication.phone}</p>
                        </div>
                      </div>
                      
                      {selectedApplication.nextSteps.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700">Outstanding Next Steps</label>
                          <div className="mt-1 space-y-1">
                            {selectedApplication.nextSteps.map((step, index) => (
                              <div key={index} className="flex items-center">
                                <input type="checkbox" className="mr-2" />
                                <span className="text-sm text-zinc-900">{step}</span>
                              </div>
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
                  color="blue" 
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Update Status
                </Button>
                <Button 
                  outline
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:ml-3"
                >
                  Send Message
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