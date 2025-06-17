'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { 
  ShieldCheckIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CreditCardIcon,
  AcademicCapIcon,
} from '@heroicons/react/20/solid'
import { useState } from 'react'

interface TuitionDeposit {
  id: string
  studentName: string
  parentName: string
  email: string
  phone: string
  grade: string
  program: string
  enrollmentDate: string
  depositType: 'enrollment' | 'security' | 'early-enrollment' | 'seat-hold'
  depositAmount: number
  amountPaid: number
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded'
  dueDate: string
  paymentMethod?: 'credit-card' | 'bank-transfer' | 'check' | 'cash'
  refundEligible: boolean
  refundDate?: string
  lastPaymentDate?: string
  transactionId?: string
  assignedCoach?: string
  notes?: string
}

const tuitionDeposits: TuitionDeposit[] = [
  {
    id: '1',
    studentName: 'Emma Thompson',
    parentName: 'Sarah Thompson',
    email: 'sarah.thompson@email.com',
    phone: '(555) 123-4567',
    grade: '9th Grade',
    program: 'STEM Academy',
    enrollmentDate: '2024-02-01',
    depositType: 'enrollment',
    depositAmount: 1000,
    amountPaid: 1000,
    paymentStatus: 'paid',
    dueDate: '2024-01-15',
    paymentMethod: 'credit-card',
    refundEligible: false,
    lastPaymentDate: '2024-01-10',
    transactionId: 'TXN-ED-001',
    assignedCoach: 'Dr. Johnson',
    notes: 'Enrollment deposit paid in full, seat secured'
  },
  {
    id: '2',
    studentName: 'Marcus Johnson',
    parentName: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '(555) 987-6543',
    grade: '10th Grade',
    program: 'Liberal Arts',
    enrollmentDate: '2024-02-01',
    depositType: 'security',
    depositAmount: 500,
    amountPaid: 250,
    paymentStatus: 'partial',
    dueDate: '2024-01-25',
    paymentMethod: 'bank-transfer',
    refundEligible: true,
    lastPaymentDate: '2024-01-15',
    transactionId: 'TXN-SD-002',
    notes: 'Partial security deposit payment, $250 remaining'
  },
  {
    id: '3',
    studentName: 'Sophia Chen',
    parentName: 'David Chen',
    email: 'david.chen@email.com',
    phone: '(555) 456-7890',
    grade: '11th Grade',
    program: 'Arts & Design',
    enrollmentDate: '2024-02-05',
    depositType: 'early-enrollment',
    depositAmount: 750,
    amountPaid: 0,
    paymentStatus: 'pending',
    dueDate: '2024-01-30',
    refundEligible: true,
    assignedCoach: 'Ms. Rivera',
    notes: 'Early enrollment bonus deposit, awaiting payment'
  },
  {
    id: '4',
    studentName: 'Ethan Williams',
    parentName: 'Lisa Williams',
    email: 'lisa.williams@email.com',
    phone: '(555) 321-0987',
    grade: '9th Grade',
    program: 'STEM Academy',
    enrollmentDate: '2024-02-08',
    depositType: 'seat-hold',
    depositAmount: 300,
    amountPaid: 0,
    paymentStatus: 'overdue',
    dueDate: '2024-01-20',
    refundEligible: false,
    notes: 'Seat hold deposit overdue, spot may be released'
  },
  {
    id: '5',
    studentName: 'Olivia Brown',
    parentName: 'Michelle Brown',
    email: 'michelle.brown@email.com',
    phone: '(555) 654-3210',
    grade: '10th Grade',
    program: 'Liberal Arts',
    enrollmentDate: '2024-01-15',
    depositType: 'enrollment',
    depositAmount: 1000,
    amountPaid: 1000,
    paymentStatus: 'refunded',
    dueDate: '2024-01-01',
    paymentMethod: 'check',
    refundEligible: false,
    refundDate: '2024-01-25',
    lastPaymentDate: '2023-12-28',
    transactionId: 'TXN-ED-003',
    notes: 'Student withdrew before start date, deposit refunded'
  }
]

const statusColors = {
  pending: 'yellow',
  partial: 'blue',
  paid: 'green',
  overdue: 'red',
  refunded: 'zinc'
} as const

const depositTypeLabels = {
  enrollment: 'Enrollment Deposit',
  security: 'Security Deposit',
  'early-enrollment': 'Early Enrollment',
  'seat-hold': 'Seat Hold'
}

const paymentMethodLabels = {
  'credit-card': 'Credit Card',
  'bank-transfer': 'Bank Transfer',
  'check': 'Check',
  'cash': 'Cash'
}

export default function TuitionDepositPage() {
  const [selectedDeposit, setSelectedDeposit] = useState<TuitionDeposit | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'due-date' | 'amount' | 'date'>('due-date')

  const filteredDeposits = tuitionDeposits.filter(deposit => {
    const matchesSearch = deposit.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deposit.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deposit.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || deposit.paymentStatus === statusFilter
    const matchesType = typeFilter === 'all' || deposit.depositType === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  }).sort((a, b) => {
    switch (sortBy) {
      case 'due-date':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      case 'amount':
        return b.depositAmount - a.depositAmount
      case 'date':
        return new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()
      default:
        return 0
    }
  })

  const totalCollected = tuitionDeposits.reduce((sum, deposit) => sum + deposit.amountPaid, 0)
  const totalPending = tuitionDeposits.reduce((sum, deposit) => sum + (deposit.depositAmount - deposit.amountPaid), 0)
  const overdueCount = tuitionDeposits.filter(deposit => deposit.paymentStatus === 'overdue').length
  const refundEligibleCount = tuitionDeposits.filter(deposit => deposit.refundEligible && deposit.paymentStatus === 'paid').length

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1} className="text-3xl font-bold text-gray-900">
              Tuition Deposits
            </Heading>
            <Text className="text-gray-600 mt-2">
              Manage enrollment and security deposits for students
            </Text>
          </div>
          <div className="flex items-center space-x-3">
            <Button outline>Export Report</Button>
            <Button outline>Process Refunds</Button>
            <Button color="blue">Record Deposit</Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-50">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Collected</p>
              <p className="text-2xl font-semibold text-gray-900">${totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-yellow-50">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Amount</p>
              <p className="text-2xl font-semibold text-gray-900">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-red-50">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{overdueCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-50">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Refund Eligible</p>
              <p className="text-2xl font-semibold text-gray-900">{refundEligibleCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search deposits..."
              />
            </InputGroup>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="refunded">Refunded</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Type</label>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="enrollment">Enrollment Deposit</option>
              <option value="security">Security Deposit</option>
              <option value="early-enrollment">Early Enrollment</option>
              <option value="seat-hold">Seat Hold</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'due-date' | 'amount' | 'date')}>
              <option value="due-date">Due Date</option>
              <option value="amount">Deposit Amount</option>
              <option value="date">Enrollment Date</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Deposits List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Tuition Deposits ({filteredDeposits.length})
            </h3>
            <Button outline>
              <FunnelIcon className="h-4 w-4 mr-1" />
              Advanced Filters
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredDeposits.map((deposit) => {
            const daysUntilDue = getDaysUntilDue(deposit.dueDate)
            const remainingAmount = deposit.depositAmount - deposit.amountPaid
            
            return (
              <div key={deposit.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{deposit.studentName}</p>
                        <Badge color={statusColors[deposit.paymentStatus]}>
                          {deposit.paymentStatus.toUpperCase()}
                        </Badge>
                        <Badge color="blue">
                          {depositTypeLabels[deposit.depositType]}
                        </Badge>
                        {deposit.refundEligible && deposit.paymentStatus === 'paid' && (
                          <Badge color="green">
                            REFUND ELIGIBLE
                          </Badge>
                        )}
                        {deposit.paymentStatus === 'overdue' && (
                          <Badge color="red">
                            {Math.abs(daysUntilDue)} DAYS OVERDUE
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Parent: {deposit.parentName} • Grade: {deposit.grade} • Program: {deposit.program}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          Enrolls {deposit.enrollmentDate}
                        </div>
                        <div className="flex items-center">
                          <CreditCardIcon className="h-4 w-4 mr-1" />
                          ${deposit.amountPaid} / ${deposit.depositAmount}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Due {deposit.dueDate}
                        </div>
                        {deposit.assignedCoach && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            Coach: {deposit.assignedCoach}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {deposit.email}
                        </div>
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {deposit.phone}
                        </div>
                        {deposit.paymentMethod && (
                          <div className="flex items-center">
                            <BanknotesIcon className="h-4 w-4 mr-1" />
                            {paymentMethodLabels[deposit.paymentMethod]}
                          </div>
                        )}
                        {deposit.transactionId && (
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            {deposit.transactionId}
                          </div>
                        )}
                      </div>
                      
                      {remainingAmount > 0 && deposit.paymentStatus !== 'refunded' && (
                        <div className="mt-2">
                          <Text className="text-sm font-medium text-red-600">
                            Remaining Balance: ${remainingAmount}
                          </Text>
                        </div>
                      )}
                      
                      {deposit.refundDate && (
                        <div className="mt-2">
                          <Text className="text-sm font-medium text-gray-600">
                            Refunded on: {deposit.refundDate}
                          </Text>
                        </div>
                      )}
                      
                      {deposit.notes && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          &ldquo;{deposit.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      outline
                      onClick={() => setSelectedDeposit(deposit)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {deposit.paymentStatus !== 'paid' && deposit.paymentStatus !== 'refunded' && (
                      <Button outline>
                        <CreditCardIcon className="h-4 w-4 mr-1" />
                        Record Payment
                      </Button>
                    )}
                    {deposit.refundEligible && deposit.paymentStatus === 'paid' && (
                      <Button outline>
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Process Refund
                      </Button>
                    )}
                    {deposit.paymentStatus === 'overdue' && (
                      <Button outline>
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        Send Notice
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deposit Details Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Tuition Deposit Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge color={statusColors[selectedDeposit.paymentStatus]}>
                          {selectedDeposit.paymentStatus.toUpperCase()}
                        </Badge>
                        <Badge color="blue">
                          {depositTypeLabels[selectedDeposit.depositType]}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student Name</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.studentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Grade</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.grade}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parent/Guardian</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.parentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Program</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.program}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.enrollmentDate}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Due Date</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.dueDate}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Deposit Amount</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedDeposit.depositAmount}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedDeposit.amountPaid}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Remaining</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedDeposit.depositAmount - selectedDeposit.amountPaid}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Deposit Type</label>
                          <p className="mt-1 text-sm text-gray-900">{depositTypeLabels[selectedDeposit.depositType]}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Refund Eligible</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedDeposit.refundEligible ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                      
                      {selectedDeposit.paymentMethod && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <p className="mt-1 text-sm text-gray-900">{paymentMethodLabels[selectedDeposit.paymentMethod]}</p>
                          </div>
                          {selectedDeposit.lastPaymentDate && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Last Payment Date</label>
                              <p className="mt-1 text-sm text-gray-900">{selectedDeposit.lastPaymentDate}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {selectedDeposit.refundDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Refund Date</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.refundDate}</p>
                        </div>
                      )}
                      
                      {selectedDeposit.transactionId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.transactionId}</p>
                        </div>
                      )}
                      
                      {selectedDeposit.assignedCoach && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assigned Coach</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.assignedCoach}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-900">{selectedDeposit.email}</p>
                          <p className="text-sm text-gray-900">{selectedDeposit.phone}</p>
                        </div>
                      </div>
                      
                      {selectedDeposit.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notes</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeposit.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedDeposit.paymentStatus !== 'paid' && selectedDeposit.paymentStatus !== 'refunded' && (
                  <Button 
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    Record Payment
                  </Button>
                )}
                {selectedDeposit.refundEligible && selectedDeposit.paymentStatus === 'paid' && (
                  <Button 
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    Process Refund
                  </Button>
                )}
                <Button 
                  outline
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:ml-3"
                >
                  Send Receipt
                </Button>
                <Button 
                  outline 
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                  onClick={() => setSelectedDeposit(null)}
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