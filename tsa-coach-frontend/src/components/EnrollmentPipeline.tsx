'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import ComprehensiveEnrollmentForm from '@/components/ComprehensiveEnrollmentForm'
import {
  ClipboardDocumentListIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/solid'

interface EnrollmentStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'completed' | 'current' | 'pending' | 'locked'
  actionRequired?: string
  dueDate?: string
  completedDate?: string
  optional?: boolean
}

interface EnrollmentPipelineProps {
  enrollmentId: string
  currentStepId: string
  studentName: string
  coachName: string
  isApproved?: boolean
}

export default function EnrollmentPipeline({
  enrollmentId,
  currentStepId,
  studentName,
  coachName,
  isApproved = false
}: EnrollmentPipelineProps) {
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)

  // TSA Enrollment Pipeline Steps
  const enrollmentSteps: EnrollmentStep[] = [
    {
      id: 'interest',
      title: 'Interest Form Submitted',
      description: 'Initial interest and basic information submitted',
      icon: ClipboardDocumentListIcon,
      status: 'completed',
      completedDate: '2024-01-15'
    },
    {
      id: 'dashboard_access',
      title: 'Dashboard Access Granted',
      description: 'Parent portal access provided for scheduling and communication',
      icon: UserGroupIcon,
      status: 'completed',
      completedDate: '2024-01-15'
    },
    {
      id: 'phone_consultation',
      title: 'Phone Consultation',
      description: 'Initial phone call with coaching staff',
      icon: PhoneIcon,
      status: currentStepId === 'phone_consultation' ? 'current' : 'pending',
      actionRequired: currentStepId === 'phone_consultation' ? 'Schedule your phone consultation' : undefined,
      dueDate: '2024-01-25',
      optional: true
    },
    {
      id: 'campus_tour',
      title: 'Campus Tour',
      description: 'Visit TSA facilities and meet the team',
      icon: BuildingOfficeIcon,
      status: currentStepId === 'campus_tour' ? 'current' : 'pending',
      actionRequired: currentStepId === 'campus_tour' ? 'Schedule your campus tour' : undefined,
      dueDate: '2024-02-01'
    },
    {
      id: 'shadow_day',
      title: 'Shadow Day Experience',
      description: 'Student participates in a full day of activities',
      icon: CalendarDaysIcon,
      status: currentStepId === 'shadow_day' ? 'current' : 'pending',
      actionRequired: currentStepId === 'shadow_day' ? 'Schedule shadow day experience' : undefined,
      dueDate: '2024-02-10',
      optional: true
    },
    {
      id: 'nwea_assessment',
      title: 'NWEA MAP Test',
      description: 'Academic assessment to determine placement and readiness',
      icon: ChartBarIcon,
      status: currentStepId === 'nwea_assessment' ? 'current' : 'pending',
      actionRequired: currentStepId === 'nwea_assessment' ? 'Complete NWEA MAP assessment' : undefined,
      dueDate: '2024-02-15'
    },
    {
      id: 'coach_decision',
      title: 'Coach Decision',
      description: 'Coaching staff reviews application and makes enrollment decision',
      icon: AcademicCapIcon,
      status: isApproved ? 'completed' : (currentStepId === 'coach_decision' ? 'current' : 'pending'),
      completedDate: isApproved ? '2024-02-20' : undefined
    },
    {
      id: 'enrollment_completion',
      title: 'Enrollment Completion',
      description: 'Complete comprehensive enrollment with EdFi compliance data',
      icon: DocumentTextIcon,
      status: isApproved ? (currentStepId === 'enrollment_completion' ? 'current' : 'pending') : 'locked',
      actionRequired: isApproved && currentStepId === 'enrollment_completion' ? 'Complete comprehensive enrollment form' : undefined
    }
  ]

  const getStepStatus = (step: EnrollmentStep) => {
    switch (step.status) {
      case 'completed':
        return { color: 'green' as const, text: 'Completed' }
      case 'current':
        return { color: 'blue' as const, text: 'In Progress' }
      case 'locked':
        return { color: 'red' as const, text: 'Pending Approval' }
      default:
        return { color: 'zinc' as const, text: 'Upcoming' }
    }
  }

  const getStepIcon = (step: EnrollmentStep) => {
    const IconComponent = step.icon
    
    if (step.status === 'completed') {
      return <CheckCircleIcon className="h-8 w-8 text-green-600" />
    }
    
    return (
      <div className={`p-2 rounded-lg ${
        step.status === 'current' ? 'bg-blue-100' : 
        step.status === 'locked' ? 'bg-red-100' : 'bg-gray-100'
      }`}>
        <IconComponent className={`h-4 w-4 ${
          step.status === 'current' ? 'text-blue-600' : 
          step.status === 'locked' ? 'text-red-600' : 'text-gray-600'
        }`} />
      </div>
    )
  }

  const currentStep = enrollmentSteps.find(step => step.id === currentStepId)
  const completedSteps = enrollmentSteps.filter(step => step.status === 'completed').length
  const progressPercentage = (completedSteps / enrollmentSteps.length) * 100

  if (showEnrollmentForm && isApproved && currentStepId === 'enrollment_completion') {
    return (
      <div className="space-y-6">
        {/* Back to Pipeline Button */}
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => setShowEnrollmentForm(false)}
            color="zinc"
          >
            ← Back to Pipeline
          </Button>
          <div>
            <Heading className="text-lg font-semibold">Complete Enrollment for {studentName}</Heading>
            <p className="text-sm text-gray-600">Final step: Comprehensive data collection for student records</p>
          </div>
        </div>

        {/* Comprehensive Enrollment Form */}
        <ComprehensiveEnrollmentForm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading className="text-xl font-semibold">{studentName}&apos;s Enrollment Journey</Heading>
            <p className="text-gray-600">Coach: {coachName}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{Math.round(progressPercentage)}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Current Step Info */}
        {currentStep && (
          <div className={`p-4 rounded-lg border ${
            currentStep.status === 'current' ? 'bg-blue-50 border-blue-200' :
            currentStep.status === 'locked' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              {getStepIcon(currentStep)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{currentStep.title}</h4>
                <p className="text-sm text-gray-600">{currentStep.description}</p>
                {currentStep.actionRequired && (
                  <p className="text-sm font-medium text-blue-700 mt-1">{currentStep.actionRequired}</p>
                )}
              </div>
              {currentStep.dueDate && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Due</div>
                  <div className="text-sm text-gray-600">{currentStep.dueDate}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enrollment Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Heading className="text-lg font-semibold mb-6">Enrollment Pipeline</Heading>
        
        <div className="space-y-4">
          {enrollmentSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < enrollmentSteps.length - 1 && (
                <div className="absolute left-4 top-12 w-0.5 h-12 bg-gray-200"></div>
              )}
              
              <div className="flex items-start space-x-4">
                {/* Step Icon */}
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-gray-900">
                        {step.title}
                        {step.optional && <span className="text-gray-500 font-normal"> (Optional)</span>}
                      </h4>
                      <Badge color={getStepStatus(step).color}>
                        {getStepStatus(step).text}
                      </Badge>
                    </div>
                    {step.completedDate && (
                      <span className="text-sm text-gray-500">Completed {step.completedDate}</span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-2">{step.description}</p>

                  {/* Action Required */}
                  {step.actionRequired && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                      <p className="text-blue-800 text-sm font-medium">{step.actionRequired}</p>
                      {step.dueDate && (
                        <p className="text-blue-700 text-xs">Due: {step.dueDate}</p>
                      )}
                    </div>
                  )}

                  {/* Special Actions */}
                  {step.id === 'phone_consultation' && step.status === 'current' && (
                    <Button 
                      onClick={() => window.location.href = '/schedule?type=consultation'}
                      color="blue"
                      className="mt-2"
                    >
                      Schedule Phone Consultation
                    </Button>
                  )}
                  
                  {step.id === 'campus_tour' && step.status === 'current' && (
                    <Button 
                      onClick={() => window.location.href = '/schedule?type=tour'}
                      color="blue"
                      className="mt-2"
                    >
                      Schedule Campus Tour
                    </Button>
                  )}
                  
                  {step.id === 'shadow_day' && step.status === 'current' && (
                    <Button 
                      onClick={() => window.location.href = '/schedule?type=shadow-day'}
                      color="blue"
                      className="mt-2"
                    >
                      Schedule Shadow Day
                    </Button>
                  )}
                  
                  {step.id === 'nwea_assessment' && step.status === 'current' && (
                    <Button 
                      onClick={() => window.location.href = '/assessment/nwea'}
                      color="blue"
                      className="mt-2"
                    >
                      Take NWEA MAP Test
                    </Button>
                  )}
                  
                  {step.id === 'enrollment_completion' && step.status === 'current' && isApproved && (
                    <Button 
                      onClick={() => setShowEnrollmentForm(true)}
                      color="blue"
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Complete Comprehensive Enrollment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach Decision Status */}
      {isApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">Congratulations! Enrollment Approved</h4>
              <p className="text-green-700">
                Coach {coachName} has approved {studentName}&apos;s enrollment. 
                Complete the final enrollment form to officially join TSA.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for Decision */}
      {currentStepId === 'coach_decision' && !isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-8 w-8 text-amber-600" />
            <div>
              <h4 className="font-semibold text-amber-900">Under Review</h4>
              <p className="text-amber-700">
                Coach {coachName} is reviewing {studentName}&apos;s application. 
                You&apos;ll be notified of the decision within 3-5 business days.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 