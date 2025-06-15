'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRightIcon } from '@heroicons/react/24/solid'

interface ListItemProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  onClick?: () => void
  href?: string
  className?: string
  variant?: 'default' | 'compact'
}

/**
 * List Item Component
 * Mobile-first responsive list item with proper touch targets
 */
export const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  icon,
  badge,
  action,
  onClick,
  href,
  className,
  variant = 'default',
}) => {
  const isInteractive = onClick || href
  const Component = href ? 'a' : 'div'

  const content = (
    <div className={cn(
      // Base mobile-first styles with proper touch targets
      'flex items-center gap-3 p-3 sm:p-4 transition-colors',
      // Ensure minimum touch target height
      'min-h-[56px]',
      // Interactive states
      {
        'hover:bg-gray-50 active:bg-gray-100 cursor-pointer': isInteractive,
        'border-b border-gray-100 last:border-b-0': variant === 'default',
      },
      className
    )}>
      {/* Icon */}
      {icon && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Right side content */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {badge && (
              <div className="flex-shrink-0">
                {badge}
              </div>
            )}
            
            {action && (
              <div className="flex-shrink-0">
                {action}
              </div>
            )}
            
            {isInteractive && !action && (
              <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Component
        href={href}
        onClick={onClick}
        className="block focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:ring-inset"
      >
        {content}
      </Component>
    )
  }

  return (
    <Component
      onClick={onClick}
      className={cn(
        isInteractive && "focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:ring-inset"
      )}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? "button" : undefined}
    >
      {content}
    </Component>
  )
} 