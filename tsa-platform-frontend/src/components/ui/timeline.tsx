'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TimelineStep } from './timeline-step'

interface TimelineProps {
  steps: Array<{
    id: number
    name: string
    description: string
    status: 'completed' | 'current' | 'upcoming'
    autoDetected?: boolean
  }>
  onStepClick?: (stepId: number) => void
  className?: string
}

/**
 * Timeline Component
 * Mobile-first responsive timeline with horizontal scrolling on mobile
 */
export const Timeline: React.FC<TimelineProps> = ({
  steps,
  onStepClick,
  className,
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <div className={cn('relative w-full', className)}>
      {/* Mobile: Horizontal scrolling container */}
      <div className="block lg:hidden">
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-4">
            {steps.map((step) => (
              <div key={step.id} className="flex-shrink-0">
                <TimelineStep
                  id={step.id}
                  name={step.name}
                  description={step.description}
                  status={step.status}
                  autoDetected={step.autoDetected}
                  onClick={onStepClick ? () => onStepClick(step.id) : undefined}
                  isMobile={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: Full timeline with progress line */}
      <div className="hidden lg:block">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" aria-hidden="true">
          <div 
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Timeline Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => (
            <TimelineStep
              key={step.id}
              id={step.id}
              name={step.name}
              description={step.description}
              status={step.status}
              autoDetected={step.autoDetected}
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
              isMobile={false}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 