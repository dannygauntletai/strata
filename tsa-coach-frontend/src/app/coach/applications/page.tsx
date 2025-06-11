'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { 
  DocumentIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BanknotesIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/20/solid'
import Link from 'next/link'

// Mock data based on database schema
const applicationStats = {
  pending: {
    count: 12,
    urgent: 3,
    avgWaitDays: 5
  },
  accepted: {
    count: 8,
    enrolled: 5,
    pendingEnrollment: 3
  },
  tuitionDeposits: {
    total: 8500,
    pending: 1500,
    refundEligible: 1
  },
  tuition: {
    totalRevenue: 45200,
    outstanding: 12800,
    overdueAccounts: 2
  }
}

const recentActivity = [
  {
    id: '1',
    type: 'application_submitted',
    studentName: 'Emma Thompson',
    parentName: 'Sarah Thompson',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'pending'
  },
  {
    id: '2',
    type: 'deposit_paid',
    studentName: 'Marcus Johnson',
    amount: 500,
    timestamp: '2024-01-15T09:15:00Z',
    status: 'paid'
  },
  {
    id: '3',
    type: 'application_accepted',
    studentName: 'Sophia Chen',
    timestamp: '2024-01-14T16:45:00Z',
    status: 'accepted'
  },
  {
    id: '4',
    type: 'tuition_payment',
    studentName: 'Ethan Williams',
    amount: 1200,
    timestamp: '2024-01-14T14:20:00Z',
    status: 'current'
  }
]

const applicationSections = [
  {
    title: 'Pending Applications',
    description: 'Review and process new student applications',
    href: '/coach/applications/pending',
    icon: DocumentIcon,
    stats: `${applicationStats.pending.count} applications`,
    urgentCount: applicationStats.pending.urgent,
    color: 'blue'
  },
  {
    title: 'Accepted Applications',
    description: 'Manage accepted students and enrollment progress',
    href: '/coach/applications/accepted',
    icon: CheckCircleIcon,
    stats: `${applicationStats.accepted.count} accepted`,
    urgentCount: applicationStats.accepted.pendingEnrollment,
    color: 'green'
  },
  {
    title: 'Tuition Deposits',
    description: 'Manage enrollment and security deposits',
    href: '/coach/applications/tuition-deposit',
    icon: BanknotesIcon,
    stats: `$${applicationStats.tuitionDeposits.total.toLocaleString()} collected`,
    urgentCount: applicationStats.tuitionDeposits.refundEligible,
    color: 'indigo'
  },
  {
    title: 'Tuition Management',
    description: 'Track ongoing tuition payments and accounts',
    href: '/coach/applications/tuition',
    icon: AcademicCapIcon,
    stats: `$${applicationStats.tuition.totalRevenue.toLocaleString()} revenue`,
    urgentCount: applicationStats.tuition.overdueAccounts,
    color: 'orange'
  }
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'application_submitted':
      return DocumentIcon
    case 'application_accepted':
      return CheckCircleIcon
    case 'deposit_paid':
      return CreditCardIcon
    case 'tuition_payment':
      return BanknotesIcon
    default:
      return DocumentIcon
  }
}

const getActivityDescription = (activity: any) => {
  switch (activity.type) {
    case 'application_submitted':
      return `${activity.studentName} submitted application`
    case 'application_accepted':
      return `${activity.studentName} application accepted`
    case 'deposit_paid':
      return `${activity.studentName} paid $${activity.amount} deposit`
    case 'tuition_payment':
      return `${activity.studentName} paid $${activity.amount} tuition`
    default:
      return 'Unknown activity'
  }
}

const formatTimeAgo = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  return `${Math.floor(diffInHours / 24)}d ago`
}

export default function ApplicationsOverviewPage() {
  return (
    <>
      {/* Mobile-first header */}
      <div className="mb-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Heading level={1} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Applications
            </Heading>
            <Text className="text-zinc-600 mt-1">
              Manage student applications, enrollments, and payments
            </Text>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button outline className="w-full sm:w-auto">
              Export Data
            </Button>
            <Button color="blue" className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>
      </div>

      {/* Quick stats - Mobile-first grid */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-blue-200">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-zinc-500">Total Students</p>
                <p className="text-lg font-semibold text-zinc-900">
                  {applicationStats.pending.count + applicationStats.accepted.count}
                </p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-yellow-200">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-zinc-500">Avg Wait</p>
                <p className="text-lg font-semibold text-zinc-900">
                  {applicationStats.pending.avgWaitDays}d
                </p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-green-200">
                <BanknotesIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-zinc-500">Revenue</p>
                <p className="text-lg font-semibold text-zinc-900">
                  ${(applicationStats.tuition.totalRevenue / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-md border border-red-200">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-zinc-500">Urgent</p>
                <p className="text-lg font-semibold text-zinc-900">
                  {applicationStats.pending.urgent}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Application sections - Mobile-first */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Heading level={2} className="text-lg font-semibold text-zinc-900 mb-4">
                Application Management
              </Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {applicationSections.map((section) => {
                  const IconComponent = section.icon
                  return (
                    <Link
                      key={section.href}
                      href={section.href}
                      className="group border border-zinc-200 rounded-lg p-6 hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <div className={`p-3 rounded-lg border border-${section.color}-200`}>
                            <IconComponent className={`h-6 w-6 text-${section.color}-600`} />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-base font-medium text-zinc-900 group-hover:text-zinc-700">
                              {section.title}
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600" />
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <Text className="text-sm text-zinc-600">
                          {section.stats}
                        </Text>
                        {section.urgentCount > 0 && (
                          <Badge color="red" className="text-xs">
                            {section.urgentCount} urgent
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent activity - Mobile-first */}
          <div className="lg:col-span-1">
            <div className="border border-zinc-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={2} className="text-lg font-semibold text-zinc-900">
                  Recent Activity
                </Heading>
                <Link 
                  href="/coach/applications/activity" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg border border-zinc-200">
                        <IconComponent className="h-4 w-4 text-zinc-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {getActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 