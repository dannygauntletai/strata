'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { 
  AcademicCapIcon,
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
} from '@heroicons/react/20/solid'
import { useState } from 'react'

interface TuitionAccount {
  id: string
  studentName: string
  parentName: string
  email: string
  phone: string
  grade: string
  program: string
  enrollmentDate: string
  tuitionPlan: 'monthly' | 'semester' | 'annual'
  totalTuition: number
  amountPaid: number
  balance: number
  nextPaymentDue: string
  lastPaymentDate?: string
  lastPaymentAmount?: number
  paymentStatus: 'current' | 'overdue' | 'partial' | 'paid-in-full'
  autoPayEnabled: boolean
  paymentMethod?: 'credit-card' | 'bank-transfer' | 'check'
  assignedCoach?: string
  scholarshipAmount?: number
  notes?: string
}

const tuitionAccounts: TuitionAccount[] = [
  {
    id: '1',
    studentName: 'Emma Thompson',
    parentName: 'Sarah Thompson',
    email: 'sarah.thompson@email.com',
    phone: '(555) 123-4567',
    grade: '9th Grade',
    program: 'STEM Academy',
    enrollmentDate: '2024-02-01',
    tuitionPlan: 'monthly',
    totalTuition: 12000,
    amountPaid: 2000,
    balance: 10000,
    nextPaymentDue: '2024-03-01',
    lastPaymentDate: '2024-02-01',
    lastPaymentAmount: 1000,
    paymentStatus: 'current',
    autoPayEnabled: true,
    paymentMethod: 'credit-card',
    assignedCoach: 'Dr. Johnson',
    notes: 'Excellent student, payment always on time'
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
    tuitionPlan: 'semester',
    totalTuition: 11000,
    amountPaid: 5000,
    balance: 6000,
    nextPaymentDue: '2024-02-15',
    lastPaymentDate: '2024-01-15',
    lastPaymentAmount: 5000,
    paymentStatus: 'overdue',
    autoPayEnabled: false,
    paymentMethod: 'bank-transfer',
    scholarshipAmount: 1000,
    notes: 'Payment overdue by 10 days, family experiencing financial hardship'
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
    tuitionPlan: 'annual',
    totalTuition: 13500,
    amountPaid: 13500,
    balance: 0,
    nextPaymentDue: '2025-02-05',
    lastPaymentDate: '2024-02-05',
    lastPaymentAmount: 13500,
    paymentStatus: 'paid-in-full',
    autoPayEnabled: false,
    paymentMethod: 'check',
    assignedCoach: 'Ms. Rivera',
    notes: 'Paid in full for the year'
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
    tuitionPlan: 'monthly',
    totalTuition: 12000,
    amountPaid: 800,
    balance: 11200,
    nextPaymentDue: '2024-02-28',
    lastPaymentDate: '2024-02-08',
    lastPaymentAmount: 800,
    paymentStatus: 'partial',
    autoPayEnabled: false,
    scholarshipAmount: 2000,
    notes: 'Partial payment plan due to scholarship'
  }
]

const statusColors = {
  current: 'green',
  overdue: 'red',
  partial: 'yellow',
  'paid-in-full': 'blue'
} as const

const planLabels = {
  monthly: 'Monthly',
  semester: 'Semester',
  annual: 'Annual'
}

const paymentMethodLabels = {
  'credit-card': 'Credit Card',
  'bank-transfer': 'Bank Transfer',
  'check': 'Check'
}

export default function TuitionPage() {
  const [selectedAccount, setSelectedAccount] = useState<TuitionAccount | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'due-date' | 'balance' | 'name'>('due-date')

  const filteredAccounts = tuitionAccounts.filter(account => {
    const matchesSearch = account.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || account.paymentStatus === statusFilter
    const matchesPlan = planFilter === 'all' || account.tuitionPlan === planFilter
    
    return matchesSearch && matchesStatus && matchesPlan
  }).sort((a, b) => {
    switch (sortBy) {
      case 'due-date':
        return new Date(a.nextPaymentDue).getTime() - new Date(b.nextPaymentDue).getTime()
      case 'balance':
        return b.balance - a.balance
      case 'name':
        return a.studentName.localeCompare(b.studentName)
      default:
        return 0
    }
  })

  const totalRevenue = tuitionAccounts.reduce((sum, account) => sum + account.amountPaid, 0)
  const totalOutstanding = tuitionAccounts.reduce((sum, account) => sum + account.balance, 0)
  const overdueCount = tuitionAccounts.filter(account => account.paymentStatus === 'overdue').length
  const autoPayCount = tuitionAccounts.filter(account => account.autoPayEnabled).length

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
              Tuition Management
            </Heading>
            <Text className="text-gray-600 mt-2">
              Track tuition payments and manage student accounts
            </Text>
          </div>
          <div className="flex items-center space-x-3">
            <Button outline>Export Report</Button>
            <Button outline>Send Statements</Button>
            <Button color="blue">Record Payment</Button>
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
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-yellow-50">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="text-2xl font-semibold text-gray-900">${totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-red-50">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue Accounts</p>
              <p className="text-2xl font-semibold text-gray-900">{overdueCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-50">
              <CheckCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Auto-Pay Enabled</p>
              <p className="text-2xl font-semibold text-gray-900">{autoPayCount}</p>
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
                placeholder="Search accounts..."
              />
            </InputGroup>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="current">Current</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial Payment</option>
              <option value="paid-in-full">Paid in Full</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Plan</label>
            <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="all">All Plans</option>
              <option value="monthly">Monthly</option>
              <option value="semester">Semester</option>
              <option value="annual">Annual</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'due-date' | 'balance' | 'name')}>
              <option value="due-date">Next Due Date</option>
              <option value="balance">Outstanding Balance</option>
              <option value="name">Student Name</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Student Accounts ({filteredAccounts.length})
            </h3>
            <Button outline>
              <FunnelIcon className="h-4 w-4 mr-1" />
              Advanced Filters
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredAccounts.map((account) => {
            const daysUntilDue = getDaysUntilDue(account.nextPaymentDue)
            const paymentPercentage = Math.round((account.amountPaid / account.totalTuition) * 100)
            
            return (
              <div key={account.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{account.studentName}</p>
                        <Badge color={statusColors[account.paymentStatus]}>
                          {account.paymentStatus.replace('-', ' ').toUpperCase()}
                        </Badge>
                        {account.autoPayEnabled && (
                          <Badge color="blue">
                            AUTO-PAY
                          </Badge>
                        )}
                        {account.scholarshipAmount && (
                          <Badge color="green">
                            SCHOLARSHIP
                          </Badge>
                        )}
                        {account.paymentStatus === 'overdue' && (
                          <Badge color="red">
                            {Math.abs(daysUntilDue)} DAYS OVERDUE
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Parent: {account.parentName} • Grade: {account.grade} • Program: {account.program}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          Enrolled {account.enrollmentDate}
                        </div>
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-4 w-4 mr-1" />
                          {planLabels[account.tuitionPlan]} Plan
                        </div>
                        <div className="flex items-center">
                          <BanknotesIcon className="h-4 w-4 mr-1" />
                          ${account.amountPaid.toLocaleString()} / ${account.totalTuition.toLocaleString()} ({paymentPercentage}%)
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Next due {account.nextPaymentDue}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {account.email}
                        </div>
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {account.phone}
                        </div>
                        {account.assignedCoach && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            Coach: {account.assignedCoach}
                          </div>
                        )}
                        {account.paymentMethod && (
                          <div className="flex items-center">
                            <CreditCardIcon className="h-4 w-4 mr-1" />
                            {paymentMethodLabels[account.paymentMethod]}
                          </div>
                        )}
                      </div>
                      
                      {account.balance > 0 && (
                        <div className="mt-2">
                          <Text className="text-sm font-medium text-red-600">
                            Outstanding Balance: ${account.balance.toLocaleString()}
                          </Text>
                          {account.scholarshipAmount && (
                            <Text className="text-sm text-green-600">
                              Scholarship Applied: ${account.scholarshipAmount.toLocaleString()}
                            </Text>
                          )}
                        </div>
                      )}
                      
                      {account.notes && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          &ldquo;{account.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      outline
                      onClick={() => setSelectedAccount(account)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Account
                    </Button>
                    {account.balance > 0 && (
                      <Button outline>
                        <CreditCardIcon className="h-4 w-4 mr-1" />
                        Record Payment
                      </Button>
                    )}
                    {account.paymentStatus === 'overdue' && (
                      <Button outline>
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
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

      {/* Account Details Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Tuition Account Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge color={statusColors[selectedAccount.paymentStatus]}>
                          {selectedAccount.paymentStatus.replace('-', ' ').toUpperCase()}
                        </Badge>
                        {selectedAccount.autoPayEnabled && (
                          <Badge color="blue">AUTO-PAY ENABLED</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student Name</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.studentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Grade</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.grade}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Program</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.program}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parent/Guardian</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.parentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.enrollmentDate}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Tuition</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedAccount.totalTuition.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedAccount.amountPaid.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Outstanding Balance</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedAccount.balance.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Payment Plan</label>
                          <p className="mt-1 text-sm text-gray-900">{planLabels[selectedAccount.tuitionPlan]}</p>
                        </div>
                      </div>
                      
                      {selectedAccount.scholarshipAmount && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Scholarship Amount</label>
                          <p className="mt-1 text-sm text-gray-900">${selectedAccount.scholarshipAmount.toLocaleString()}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Next Payment Due</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.nextPaymentDue}</p>
                        </div>
                        {selectedAccount.lastPaymentDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Last Payment</label>
                            <p className="mt-1 text-sm text-gray-900">
                              ${selectedAccount.lastPaymentAmount?.toLocaleString()} on {selectedAccount.lastPaymentDate}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {selectedAccount.paymentMethod && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <p className="mt-1 text-sm text-gray-900">{paymentMethodLabels[selectedAccount.paymentMethod]}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Auto-Pay Status</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedAccount.autoPayEnabled ? 'Enabled' : 'Disabled'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedAccount.assignedCoach && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assigned Coach</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.assignedCoach}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-900">{selectedAccount.email}</p>
                          <p className="text-sm text-gray-900">{selectedAccount.phone}</p>
                        </div>
                      </div>
                      
                      {selectedAccount.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notes</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedAccount.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button 
                  color="blue" 
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Record Payment
                </Button>
                <Button 
                  outline
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:ml-3"
                >
                  Send Statement
                </Button>
                <Button 
                  outline
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:ml-3"
                >
                  Setup Auto-Pay
                </Button>
                <Button 
                  outline 
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                  onClick={() => setSelectedAccount(null)}
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