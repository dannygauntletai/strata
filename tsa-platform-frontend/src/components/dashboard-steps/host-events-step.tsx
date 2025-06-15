'use client'

import { Card, CardHeader, CardContent, Button, EmptyState } from '@/components/ui'
import { Badge } from '@/components/badge'
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/solid'

interface EventTemplate {
  id: string
  title: string
  description: string
  duration: string
  capacity: string
  type: 'info-session' | 'demo-day' | 'coffee-chat'
}

const eventTemplates: EventTemplate[] = [
  {
    id: 'info-session',
    title: 'Information Session',
    description: 'Comprehensive overview of TSA programs and enrollment process',
    duration: '1-2 hours',
    capacity: '20-50 people',
    type: 'info-session'
  },
  {
    id: 'demo-day',
    title: 'Sports Demo Day',
    description: 'Interactive demonstration of training methods and student activities',
    duration: '2-3 hours',
    capacity: '15-30 families',
    type: 'demo-day'
  },
  {
    id: 'coffee-chat',
    title: 'Parent Coffee Chat',
    description: 'Informal Q&A session with current and prospective parents',
    duration: '1 hour',
    capacity: '10-20 people',
    type: 'coffee-chat'
  }
]

export function HostEventsStep() {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'info-session':
        return <UserGroupIcon className="h-5 w-5 text-blue-600" />
      case 'demo-day':
        return <CalendarDaysIcon className="h-5 w-5 text-green-600" />
      case 'coffee-chat':
        return <UserGroupIcon className="h-5 w-5 text-purple-600" />
      default:
        return <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'info-session':
        return 'bg-blue-100'
      case 'demo-day':
        return 'bg-green-100'
      case 'coffee-chat':
        return 'bg-purple-100'
      default:
        return 'bg-gray-100'
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Step: Host Events</h2>
        <p className="text-gray-600">Plan and execute community events to attract prospective families</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader
            action={
              <a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors">
                Create Event
              </a>
            }
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<CalendarDaysIcon className="h-8 w-8" />}
              title="No events scheduled"
              description="Create your first community event to get started"
              action={{
                label: "Create Event",
                variant: "primary"
              }}
            />
          </CardContent>
        </Card>

        {/* Event Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Event Templates</h3>
              </div>
              <Badge color="zinc">{eventTemplates.length} templates</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventTemplates.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getEventColor(template.type)}`}>
                        {getEventIcon(template.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{template.title}</h4>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {template.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        {template.capacity}
                      </div>
                    </div>
                    <Button variant="outline">
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Ready to host your first event?</h4>
              <p className="text-sm text-gray-500">
                Start with a simple information session to introduce your school to the community.
              </p>
            </div>
            <Button>
              Create First Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 