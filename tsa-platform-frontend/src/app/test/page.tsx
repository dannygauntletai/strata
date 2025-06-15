'use client'

import React, { useState } from 'react'
import { Heading, Subheading } from '@/components/heading'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { FeatureCard } from '@/components/ui/feature-card'
import { Button } from '@/components/ui/button'
import { ListItem } from '@/components/ui/list-item'
import { Timeline } from '@/components/ui/timeline'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/badge'
import { 
  AcademicCapIcon,
  UserGroupIcon,
  Square2StackIcon,
  CheckCircleIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  BuildingOffice2Icon,
  DocumentIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  TrophyIcon
} from '@heroicons/react/24/solid'
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table'

export default function TestPage() {
  const [loading, setLoading] = useState(false)
  const [timelineSteps, setTimelineSteps] = useState([
    { id: 1, name: 'Onboarding', description: 'Complete coach onboarding process', status: 'completed' as const, autoDetected: true },
    { id: 2, name: 'Background Check', description: 'Submit and clear background verification', status: 'completed' as const, autoDetected: true },
    { id: 3, name: 'Review Materials', description: 'Review promotional content for your school', status: 'current' as const, autoDetected: false },
    { id: 4, name: 'Host Events', description: 'Plan and execute community events', status: 'upcoming' as const, autoDetected: false },
    { id: 5, name: 'Invite Students', description: 'Reach out to prospective families', status: 'upcoming' as const, autoDetected: false },
  ])

  const handleTimelineClick = (stepId: number) => {
    setTimelineSteps(prev => prev.map(step => 
      step.id === stepId && step.status !== 'completed' && !step.autoDetected
        ? { ...step, status: 'completed' as const }
        : step
    ))
  }

  const toggleLoading = () => {
    setLoading(!loading)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <Heading className="text-3xl">TSA UI Component Library</Heading>
        <p className="mt-2 text-zinc-500">
          Testing all components from our Texas Sports Academy design system
        </p>
      </div>

      {/* Timeline Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Timeline Component</Subheading>
        <Card>
          <CardHeader 
            action={<a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">View Details</a>}
          >
            School Opening Timeline
          </CardHeader>
          <CardContent>
            <Timeline 
              steps={timelineSteps}
              onStepClick={handleTimelineClick}
            />
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Feature Cards</Subheading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Feature Card with Content */}
          <FeatureCard
            title="Recent Applications"
            icon={<AcademicCapIcon />}
            iconColor="green"
            action={<a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">View All</a>}
          >
            <ListItem
              title="John Smith"
              description="Application submitted • 2 days ago"
              icon={<AcademicCapIcon />}
              badge={<Badge color="green">Accepted</Badge>}
              href="#"
            />
            <ListItem
              title="Sarah Johnson"
              description="Interest form • 1 week ago"
              icon={<DocumentIcon />}
              badge={<Badge color="amber">Pending</Badge>}
              href="#"
            />
          </FeatureCard>

          {/* Feature Card with Loading State */}
          <FeatureCard
            title="Event Management"
            icon={<Square2StackIcon />}
            iconColor="purple"
            loading={loading}
            action={<a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">Create Event</a>}
          >
            <ListItem
              title="Summer Camp 2024"
              description="June 15, 2024 • 25/30 participants"
              icon={<Square2StackIcon />}
              badge={<Badge color="blue">Upcoming</Badge>}
              href="#"
            />
          </FeatureCard>

          {/* Feature Card with Empty State */}
          <FeatureCard
            title="Recent Activity"
            icon={<ClipboardDocumentListIcon />}
            iconColor="gray"
            emptyState={{
              icon: <ClipboardDocumentListIcon />,
              title: "No recent activity",
              description: "Recent activity will appear here when available",
              action: <Button variant="outline" size="sm">Refresh</Button>
            }}
          >
            {/* Empty - will show empty state */}
          </FeatureCard>

          {/* Feature Card with Students */}
          <FeatureCard
            title="Student Management"
            icon={<UserGroupIcon />}
            iconColor="blue"
            action={<a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888]">View All</a>}
          >
            <ListItem
              title="Emma Wilson"
              description="Grade 5 • Active since 2023"
              icon={<UserGroupIcon />}
              badge={<Badge color="green">Active</Badge>}
              href="#"
            />
            <ListItem
              title="Michael Chen"
              description="Grade 7 • New enrollment"
              icon={<UserGroupIcon />}
              badge={<Badge color="amber">Pending</Badge>}
              href="#"
            />
          </FeatureCard>
        </div>
      </div>

      {/* Button Variants Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Button Variants</Subheading>
        <Card>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Button Variants</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="danger">Danger Button</Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Button Sizes</h4>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Button States</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" icon={<PlusIcon />}>With Icon</Button>
                  <Button variant="outline" icon={<PlusIcon />} iconPosition="right">Icon Right</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List Items Section */}
      <div className="mb-12">
        <Subheading className="mb-6">List Items</Subheading>
        <Card>
          <CardHeader>Different List Item Configurations</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ListItem
                title="Basic List Item"
                description="Simple list item with icon"
                icon={<DocumentIcon />}
                href="#"
              />
              <ListItem
                title="List Item with Badge"
                description="Includes status badge"
                icon={<UserGroupIcon />}
                badge={<Badge color="green">Active</Badge>}
                href="#"
              />
              <ListItem
                title="List Item with Action"
                description="Has custom action button"
                icon={<Cog6ToothIcon />}
                href="#"
              />
              <ListItem
                title="Marketing Campaign"
                description="Social media outreach • Started 3 days ago"
                icon={<MegaphoneIcon />}
                badge={<Badge color="blue">Running</Badge>}
                href="#"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading States Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Loading States</Subheading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>Small Spinner</CardHeader>
            <CardContent>
              <LoadingSpinner size="sm" color="blue" text="Loading..." />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>Medium Spinner</CardHeader>
            <CardContent>
              <LoadingSpinner size="md" color="green" text="Processing..." />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>Large Spinner</CardHeader>
            <CardContent>
              <LoadingSpinner size="lg" color="purple" text="Please wait..." />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Empty States Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Empty States</Subheading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>With Action Button</CardHeader>
            <CardContent className="p-0">
              <EmptyState
                icon={<BuildingOffice2Icon />}
                title="No events scheduled"
                description="Create your first event to get started"
                action={{
                  label: "Create Event",
                  href: "#",
                  variant: "primary"
                }}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>Without Action</CardHeader>
            <CardContent className="p-0">
              <EmptyState
                icon={<ClipboardDocumentListIcon />}
                title="No activity yet"
                description="Activity will appear here when available"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card Variants Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Card Variants</Subheading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>Default Card</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Standard card with default styling and border</p>
            </CardContent>
          </Card>
          
          <Card variant="elevated">
            <CardHeader>Elevated Card</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Card with shadow elevation for emphasis</p>
            </CardContent>
          </Card>
          
          <Card variant="outlined">
            <CardHeader>Outlined Card</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Card with stronger border styling</p>
            </CardContent>
            <CardFooter sticky>
              <Button variant="outline" size="sm">Footer Action</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="mb-12">
        <Subheading className="mb-6">Interactive Demo</Subheading>
        <Card>
          <CardHeader>Component State Controls</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={toggleLoading} variant="outline">
                {loading ? 'Hide Loading State' : 'Show Loading State'}
              </Button>
              <p className="text-sm text-gray-600">
                Toggle the loading state in the Event Management card above to see the loading spinner in action.
              </p>
              <p className="text-sm text-gray-600">
                Click on timeline steps above to mark them as completed and see the progress bar update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Examples */}
      <div className="mb-12">
        <Subheading className="mb-6">Badge Colors</Subheading>
        <Card>
          <CardHeader>All Available Badge Colors</CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge color="zinc">Default</Badge>
              <Badge color="red">Error</Badge>
              <Badge color="orange">Warning</Badge>
              <Badge color="amber">Pending</Badge>
              <Badge color="yellow">Caution</Badge>
              <Badge color="lime">Success</Badge>
              <Badge color="green">Active</Badge>
              <Badge color="emerald">Verified</Badge>
              <Badge color="teal">Info</Badge>
              <Badge color="cyan">New</Badge>
              <Badge color="sky">Primary</Badge>
              <Badge color="blue">Featured</Badge>
              <Badge color="indigo">Premium</Badge>
              <Badge color="violet">Special</Badge>
              <Badge color="purple">VIP</Badge>
              <Badge color="fuchsia">Highlight</Badge>
              <Badge color="pink">Popular</Badge>
              <Badge color="rose">Love</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Component Section */}
      <div className="mb-12">
        <Subheading className="mb-6">Table Component</Subheading>
        <div className="space-y-6">
          {/* Student Applications Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Sport Interest</TableHead>
                    <TableHead>Application Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">JS</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">John Smith</div>
                          <div className="text-sm text-gray-600">john.smith@email.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>8th Grade</TableCell>
                    <TableCell>Basketball</TableCell>
                    <TableCell>Jan 15, 2024</TableCell>
                    <TableCell>
                      <Badge color="green">Approved</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-700">MJ</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Maria Johnson</div>
                          <div className="text-sm text-gray-600">maria.j@email.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>7th Grade</TableCell>
                    <TableCell>Soccer</TableCell>
                    <TableCell>Jan 18, 2024</TableCell>
                    <TableCell>
                      <Badge color="amber">Under Review</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Review</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">AD</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Alex Davis</div>
                          <div className="text-sm text-gray-600">alex.davis@email.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>9th Grade</TableCell>
                    <TableCell>Tennis</TableCell>
                    <TableCell>Jan 20, 2024</TableCell>
                    <TableCell>
                      <Badge color="blue">Scheduled</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Schedule</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-orange-700">SW</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Sarah Wilson</div>
                          <div className="text-sm text-gray-600">sarah.w@email.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>6th Grade</TableCell>
                    <TableCell>Swimming</TableCell>
                    <TableCell>Jan 22, 2024</TableCell>
                    <TableCell>
                      <Badge color="red">Declined</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled>Closed</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Events Schedule Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                          <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Basketball Tryouts</div>
                          <div className="text-sm text-gray-600">Middle School Division</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">Feb 1, 2024</div>
                        <div className="text-sm text-gray-600">3:00 PM - 5:00 PM</div>
                      </div>
                    </TableCell>
                    <TableCell>Main Gymnasium</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">24</span>
                        <span className="text-sm text-gray-600">registered</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color="blue">Tryout</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color="green">Confirmed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
                          <AcademicCapIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Parent Information Session</div>
                          <div className="text-sm text-gray-600">Q&A with Coaching Staff</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">Feb 5, 2024</div>
                        <div className="text-sm text-gray-600">6:00 PM - 7:30 PM</div>
                      </div>
                    </TableCell>
                    <TableCell>Conference Room A</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">18</span>
                        <span className="text-sm text-gray-600">attending</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color="purple">Meeting</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color="amber">Planning</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                          <TrophyIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Regional Championship</div>
                          <div className="text-sm text-gray-600">Soccer Tournament</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">Feb 10, 2024</div>
                        <div className="text-sm text-gray-600">9:00 AM - 4:00 PM</div>
                      </div>
                    </TableCell>
                    <TableCell>Regional Sports Complex</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">32</span>
                        <span className="text-sm text-gray-600">competing</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color="green">Tournament</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color="blue">Registered</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Design System Info */}
      <div className="mb-12">
        <Subheading className="mb-6">Design System Guidelines</Subheading>
        <Card>
          <CardHeader>TSA Design Theme</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Primary Colors</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#004aad] rounded border"></div>
                    <span className="text-sm text-gray-600">#004aad (TSA Blue)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#003888] rounded border"></div>
                    <span className="text-sm text-gray-600">#003888 (TSA Blue Dark)</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Icon Sizes</h4>
                <p className="text-sm text-gray-600">Standard icon size: 40px (h-10 w-10) for feature cards and main UI elements</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Spacing</h4>
                <p className="text-sm text-gray-600">Consistent 24px (gap-6) spacing between major sections</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Table Design</h4>
                <p className="text-sm text-gray-600">Tables use rounded corners, subtle borders, and hover states following TSA design principles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 