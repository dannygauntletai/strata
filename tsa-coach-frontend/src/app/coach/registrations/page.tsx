'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Input, InputGroup } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  UsersIcon,
  PhoneIcon,
  EyeIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import { useState } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  type: 'parent'
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: 'new' | 'contacted' | 'qualified' | 'sales_qualified' | 'converted' | 'lost' | 'inactive'
  score: number
  source: string
  lastTouch: string
  nextAction: string
  createdAt: string
}

const recentLeads: Lead[] = [
  {
    id: '1',
    type: 'parent',
    firstName: 'Jennifer',
    lastName: 'Chen',
    email: 'jennifer.chen@email.com',
    phone: '(555) 123-4567',
    status: 'qualified',
    score: 85,
    source: 'Google Ads',
    lastTouch: '2 hours ago',
    nextAction: 'Schedule call',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    type: 'parent',
    firstName: 'Marcus',
    lastName: 'Williams',
    email: 'marcus.williams@email.com',
    phone: '(555) 987-6543',
    status: 'new',
    score: 60,
    source: 'Organic',
    lastTouch: '1 day ago',
    nextAction: 'Initial contact',
    createdAt: '2024-01-14'
  },
  {
    id: '3',
    type: 'parent',
    firstName: 'David',
    lastName: 'Park',
    email: 'david.park@email.com',
    phone: '(555) 456-7890',
    status: 'contacted',
    score: 75,
    source: 'Facebook Ads',
    lastTouch: '5 hours ago',
    nextAction: 'Follow up call',
    createdAt: '2024-01-12'
  }
]

const statusColors = {
  new: 'zinc',
  contacted: 'blue',
  qualified: 'amber',
  sales_qualified: 'emerald',
  converted: 'green',
  lost: 'red',
  inactive: 'zinc'
} as const

export default function RegistrationsOverviewPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredLeads = recentLeads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false
    return true
  })

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Registration Pipeline
        </Heading>
        <Text className="text-zinc-600 dark:text-zinc-400 mt-1">
          Track and manage incoming leads from families
        </Text>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center">
            <UsersIcon className="h-5 w-5 text-zinc-400" />
            <Text className="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Leads</Text>
          </div>
          <Text className="text-2xl font-semibold text-zinc-900 dark:text-white mt-2">156</Text>
          <div className="flex items-center mt-1">
            <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500" />
            <Text className="text-xs text-emerald-600 ml-1">+12% from last month</Text>
          </div>
        </div>
        
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center">
            <PhoneIcon className="h-5 w-5 text-zinc-400" />
            <Text className="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Calls Scheduled</Text>
          </div>
          <Text className="text-2xl font-semibold text-zinc-900 dark:text-white mt-2">28</Text>
          <div className="flex items-center mt-1">
            <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500" />
            <Text className="text-xs text-emerald-600 ml-1">+8% this week</Text>
          </div>
        </div>
        
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center">
            <EyeIcon className="h-5 w-5 text-zinc-400" />
            <Text className="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Tours Booked</Text>
          </div>
          <Text className="text-2xl font-semibold text-zinc-900 dark:text-white mt-2">14</Text>
          <div className="flex items-center mt-1">
            <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500" />
            <Text className="text-xs text-emerald-600 ml-1">+25% this week</Text>
          </div>
        </div>
        
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-5 w-5 text-zinc-400" />
            <Text className="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Conversion Rate</Text>
          </div>
          <Text className="text-2xl font-semibold text-zinc-900 dark:text-white mt-2">34%</Text>
          <div className="flex items-center mt-1">
            <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500" />
            <Text className="text-xs text-emerald-600 ml-1">+5% improvement</Text>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Link href="/coach/registrations/book-call" className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <PhoneIcon className="h-5 w-5 text-zinc-400" />
              <div className="ml-3">
                <Text className="font-medium text-zinc-900 dark:text-white">Consultation Calls</Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">Manage call scheduling</Text>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
          </div>
        </Link>
        
                    <Link href="/coach/registrations/book-tour" className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-zinc-400" />
              <div className="ml-3">
                <Text className="font-medium text-zinc-900 dark:text-white">Campus Tours</Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">Tour bookings & logistics</Text>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
          </div>
        </Link>
        
                    <Link href="/coach/registrations/shadow-day" className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-5 w-5 text-zinc-400" />
              <div className="ml-3">
                <Text className="font-medium text-zinc-900 dark:text-white">Shadow Days</Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">Full-day experiences</Text>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" />
          <Input
            type="text"
            placeholder="Search leads..."
            className="min-w-[200px]"
          />
        </InputGroup>

        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-zinc-400" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="sales_qualified">Sales Qualified</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Lead</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Score</TableHeader>
              <TableHeader>Source</TableHeader>
              <TableHeader>Last Touch</TableHeader>
              <TableHeader>Next Action</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div>
                    <Text className="font-medium text-zinc-900 dark:text-white">
                      {lead.firstName} {lead.lastName}
                    </Text>
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{lead.email}</Text>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color="blue">
                    {lead.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge color={statusColors[lead.status]}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Text className="font-medium text-zinc-900 dark:text-white">{lead.score}</Text>
                    <div className="ml-2 w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">{lead.source}</Text>
                </TableCell>
                <TableCell>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">{lead.lastTouch}</Text>
                </TableCell>
                <TableCell>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">{lead.nextAction}</Text>
                </TableCell>
                <TableCell>
                  <Link href={`/coach/registrations/${lead.id}`}>
                    <Button outline>View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
} 