'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent } from './card'

interface FeatureCardProps {
  title: string
  icon: React.ReactNode
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  loading?: boolean
  emptyState?: {
    icon: React.ReactNode
    title: string
    description: string
    action?: React.ReactNode
  }
}

const iconColorMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
}

/**
 * Feature Card Component
 * Mobile-first responsive dashboard widget with header, content, and optional empty states
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  icon,
  iconColor = 'blue',
  action,
  children,
  className,
  loading = false,
  emptyState,
}) => {
  const iconClasses = iconColorMap[iconColor]

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader
        icon={
          <div className={cn('p-1.5 sm:p-2 rounded-md sm:rounded-lg', iconClasses.split(' ')[0])}>
            <div className={cn('h-4 w-4 sm:h-5 sm:w-5', iconClasses.split(' ')[1])}>
              {icon}
            </div>
          </div>
        }
        action={action}
      >
        {title}
      </CardHeader>
      
      <CardContent divided className="p-0 flex-1 flex flex-col">
        {loading ? (
          <div className="px-4 py-8 sm:px-6 sm:py-12 text-center flex-1 flex flex-col justify-center">
            <div className={cn(
              'animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 mx-auto',
              `border-${iconColor}-600`
            )}></div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Loading...</p>
          </div>
        ) : emptyState ? (
          <div className="px-4 py-8 sm:px-6 sm:py-12 text-center flex-1 flex flex-col justify-center">
            <div className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2 sm:mb-3">
              {emptyState.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {emptyState.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              {emptyState.description}
            </p>
            {emptyState.action}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 flex-1">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 