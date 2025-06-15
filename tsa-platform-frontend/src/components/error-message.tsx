'use client'

import React from 'react'

interface ErrorMessageProps {
  message?: string
  show?: boolean
  className?: string
}

export function ErrorMessage({ message, show = false, className = '' }: ErrorMessageProps) {
  return (
    <div className={`h-6 mt-2 ${className}`}>
      {show && message && (
        <p className="text-red-500 text-center text-sm leading-6">
          {message}
        </p>
      )}
    </div>
  )
} 