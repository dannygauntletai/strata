'use client'

import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { EnvelopeIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/20/solid'

export default function CoachParentsPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Heading level={1} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Parent Management
            </Heading>
            <Text className="text-zinc-600 mt-1">
              Manage parent invitations and connections
            </Text>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button color="blue" className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              Send New Invitation
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <UserGroupIcon className="w-6 h-6 text-blue-600" />
          </div>
          <Heading level={2} className="text-lg font-semibold text-zinc-900 mb-2">
            Parent Management Coming Soon
          </Heading>
          <Text className="text-zinc-600 mb-6 max-w-md mx-auto">
            This page will allow you to manage parent invitations, track responses, and communicate with families in your program.
          </Text>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button outline className="w-full sm:w-auto">
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              View Recent Invitations
            </Button>
            <Button color="blue" className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 