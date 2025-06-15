'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined'
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  divided?: boolean
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  sticky?: boolean
}

/**
 * Base Card Component
 * Mobile-first responsive design following TSA theme
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base mobile-first styles
          'bg-white rounded-lg sm:rounded-xl border overflow-hidden w-full',
          // Variant styles
          {
            'border-gray-200': variant === 'default',
            'border-gray-200 shadow-sm sm:shadow-md': variant === 'elevated',
            'border-gray-300': variant === 'outlined',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

/**
 * Card Header Component
 * Mobile-first responsive header with proper touch targets
 */
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, icon, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 bg-gray-50/50',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {icon && (
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-md sm:rounded-lg flex-shrink-0">
                <div className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600">
                  {icon}
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {children}
              </div>
            </div>
          </div>
          {action && (
            <div className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors flex-shrink-0 min-h-[44px] flex items-center">
              {action}
            </div>
          )}
        </div>
      </div>
    )
  }
)
CardHeader.displayName = 'CardHeader'

/**
 * Card Content Component
 * Mobile-first responsive content area
 */
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, divided = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-4 sm:px-6 sm:py-6',
          {
            'divide-y divide-gray-100': divided,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardContent.displayName = 'CardContent'

/**
 * Card Footer Component
 * Mobile-first responsive footer with proper touch targets
 */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, sticky = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/50',
          {
            'sticky bottom-0': sticky,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardFooter.displayName = 'CardFooter' 