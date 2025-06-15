'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  className?: string
}

/**
 * Empty State Component
 * Mobile-first responsive empty states with icon, title, description, and optional action
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('px-4 py-8 sm:px-6 sm:py-12 text-center', className)}>
      <div className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2 sm:mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        action.href ? (
          <a href={action.href}>
            <Button variant={action.variant || 'outline'} size="sm">
              {action.label}
            </Button>
          </a>
        ) : (
          <Button 
            variant={action.variant || 'outline'} 
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      )}
    </div>
  )
} 