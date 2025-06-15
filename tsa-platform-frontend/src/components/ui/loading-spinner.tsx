'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'purple' | 'gray'
  text?: string
  className?: string
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

const colorMap = {
  blue: 'border-blue-600',
  green: 'border-green-600',
  purple: 'border-purple-600',
  gray: 'border-gray-600',
}

/**
 * Loading Spinner Component
 * Consistent loading states with optional text
 * Following TSA design theme: proper sizing, brand colors
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-b-2',
        sizeMap[size],
        colorMap[color]
      )} />
      {text && (
        <p className="text-sm text-gray-500 mt-2">
          {text}
        </p>
      )}
    </div>
  )
} 