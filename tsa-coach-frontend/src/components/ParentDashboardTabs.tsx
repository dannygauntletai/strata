'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import EnrollmentPipeline from '@/components/EnrollmentPipeline'
import {
  PlayIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'

interface ParentDashboardTabsProps {
  enrollmentId: string
  currentStepId: string
  studentName: string
  coachName: string
  isApproved?: boolean
}

export default function ParentDashboardTabs({
  enrollmentId,
  currentStepId,
  studentName,
  coachName,
  isApproved = false
}: ParentDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('journey')

  const tabs = [
    {
      id: 'journey',
      name: 'Overview',
      description: 'Track enrollment progress and next steps'
    },
    {
      id: 'why-tsa',
      name: 'Why TSA',
      description: 'Learn about our programs and success stories'
    },
    {
      id: 'events',
      name: 'Events',
      description: 'Upcoming events, tours, and important dates'
    }
  ]

  const renderWhyChooseTSA = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Why Choose Texas Sports Academy?</h3>
        <p className="text-gray-600">Discover what makes TSA the premier choice for student-athlete development</p>
      </div>

      {/* Featured Video */}
      <div className="mb-8">
        <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <PlayIcon className="h-8 w-8 text-white ml-1" />
              </div>
              <h4 className="font-semibold text-gray-900">Campus Tour & Student Life</h4>
              <p className="text-sm text-gray-600">See what a day at TSA looks like</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Library Grid (3x3) */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-4">Video Library</h4>
        <div className="grid grid-cols-3 gap-4">
          {[
            'Championship Game',
            'College Signing Day', 
            'Training Highlights',
            'Student Testimonials',
            'Academic Excellence',
            'Coach Interviews',
            'Parent Reviews',
            'Graduation Ceremony',
            'Athletic Achievements'
          ].map((title, index) => (
            <div key={index} className="bg-gray-100 rounded-lg overflow-hidden aspect-video relative cursor-pointer hover:opacity-90 transition-opacity">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <PlayIcon className="h-4 w-4 text-white ml-0.5" />
                  </div>
                  <p className="text-xs font-medium text-gray-900 px-1">{title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEvents = () => (
    <div className="space-y-8">
      {/* Featured Event Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl overflow-hidden text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative px-8 py-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center bg-blue-500 bg-opacity-80 rounded-full px-4 py-2 mb-4">
              <CalendarDaysIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">This Saturday</span>
            </div>
            <h4 className="text-3xl font-bold mb-4">Coach Williams&apos; Elite Basketball Clinic</h4>
            <p className="text-lg mb-6 text-blue-100">
              Join Coach Sarah Williams for an exclusive skills clinic focusing on advanced shooting techniques and game strategy. 
              Limited to 20 prospective student-athletes.
            </p>
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-blue-200" />
                <span>TSA Performance Center</span>
              </div>
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-blue-200" />
                <span>9:00 AM - 12:00 PM</span>
              </div>
              <div className="flex items-center">
                <span className="h-5 w-5 mr-2 text-blue-200">🏀</span>
                <span>Ages 13-18</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-3">
                Reserve Your Spot
              </Button>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-3">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderJourney = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Next Steps for {studentName}</h3>
        <p className="text-gray-600">Here&apos;s what you can do to move forward in the enrollment process</p>
      </div>

      {/* Current Priority Action */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-600 rounded-lg p-3">
            <PhoneIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Phone Consultation (Optional)</h4>
            <p className="text-gray-700 mb-4">
              Schedule a call with Coach {coachName} to discuss {studentName}&apos;s goals, interests, and the TSA program.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Schedule Call
              </Button>
              <Button color="zinc" className="text-gray-600">
                Skip This Step
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campus Tour */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-3 mb-4">
            <div className="bg-green-100 rounded-lg p-2">
              <MapPinIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h5 className="font-semibold text-gray-900">Campus Tour</h5>
              <p className="text-sm text-gray-600">Visit our facilities</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-4">
            Tour our world-class athletic facilities and academic spaces.
          </p>
          <Button color="green" className="w-full bg-green-600 hover:bg-green-700 text-white">
            Schedule Tour
          </Button>
        </div>

        {/* Shadow Day */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-3 mb-4">
            <div className="bg-purple-100 rounded-lg p-2">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h5 className="font-semibold text-gray-900">Shadow Day (Optional)</h5>
              <p className="text-sm text-gray-600">Full day experience</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-4">
            {studentName} can spend a full day experiencing TSA life.
          </p>
          <Button color="purple" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Schedule Shadow Day
          </Button>
        </div>

        {/* NWEA MAP Test */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-3 mb-4">
            <div className="bg-blue-100 rounded-lg p-2">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h5 className="font-semibold text-gray-900">NWEA MAP Test</h5>
              <p className="text-sm text-gray-600">Academic assessment</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-4">
            Complete the academic assessment to determine placement.
          </p>
          <Button color="blue" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Take Assessment
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {tabs.map((tab) => {
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 inline-flex items-center justify-center py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-center">{tab.name}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'journey' && renderJourney()}
        
        {activeTab === 'why-tsa' && renderWhyChooseTSA()}
        {activeTab === 'events' && renderEvents()}
      </div>
    </div>
  )
} 