'use client'

import React from 'react'
import { Link } from '@/components/link'

type ProgressFooterProps = {
  progressPercent?: number
  nextButtonText?: string
  nextButtonHref?: string
  backButtonHref?: string
  buttonClassName?: string
  nextButtonClassName?: string
  buttonAction?: () => void
  showBackButton?: boolean
  disabled?: boolean
}

export function ProgressFooter({
  progressPercent = 0,
  nextButtonText = 'Get started',
  nextButtonHref,
  backButtonHref,
  buttonClassName = '',
  nextButtonClassName = 'bg-gradient-to-r from-[#FF385C] to-[#E01C45] hover:from-[#E01C45] hover:to-[#C11B3D] text-white',
  buttonAction,
  showBackButton = false,
  disabled = false
}: ProgressFooterProps) {
  return (
    <footer className="w-full border-t border-gray-200 fixed bottom-0 left-0 right-0 bg-white z-[100]">
      {/* Progress bar - blue gradient to match button */}
      <div className="w-full h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-[#3B82F6] to-[#38BDF8] transition-all duration-300 ease-in-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Button container */}
      <div className="w-full px-8 py-4 flex justify-between">
        {/* Back button */}
        <div>
          {showBackButton && backButtonHref && (
            <Link href={backButtonHref}>
              <button 
                type="button"
                className="text-base font-medium py-3.5 px-7 rounded-lg transition-all border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
            </Link>
          )}
        </div>

        {/* Next/Continue button */}
        <div>
          {nextButtonHref && !disabled ? (
            <Link href={nextButtonHref} className="inline-block">
              <button 
                type="button"
                className={`text-base font-medium py-3.5 px-7 rounded-lg transition-all ${nextButtonClassName} ${buttonClassName}`}
              >
                {nextButtonText}
              </button>
            </Link>
          ) : (
            <button 
              type="button"
              onClick={disabled ? undefined : buttonAction}
              disabled={disabled}
              className={`text-base font-medium py-3.5 px-7 rounded-lg transition-all ${nextButtonClassName} ${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {nextButtonText}
            </button>
          )}
        </div>
      </div>
    </footer>
  )
} 