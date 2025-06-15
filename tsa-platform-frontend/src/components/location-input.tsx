'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ErrorMessage } from './error-message'

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (input: HTMLInputElement, options?: {
            componentRestrictions?: { country: string | string[] }
            types?: string[]
            fields?: string[]
          }) => {
            addListener: (event: string, callback: () => void) => void
            getPlace: () => {
              formatted_address?: string
              name?: string
              geometry?: {
                location: {
                  lat: () => number
                  lng: () => number
                }
              }
            }
          }
        }
      }
    }
    initAutocomplete?: () => void
  }
}

type GoogleAutocomplete = {
  addListener: (event: string, callback: () => void) => void
  getPlace: () => {
    formatted_address?: string
    name?: string
    geometry?: {
      location: {
        lat: () => number
        lng: () => number
      }
    }
  }
}

interface LocationInputProps {
  show: boolean
  location: string
  onLocationChange: (location: string) => void
  onValidityChange: (isValid: boolean) => void
  showError: boolean
  errorMessage: string
  onErrorChange: (show: boolean, message: string) => void
}

export function LocationInput({ 
  show, 
  location, 
  onLocationChange, 
  onValidityChange,
  showError,
  errorMessage,
  onErrorChange
}: LocationInputProps) {
  const [isValidGooglePlace, setIsValidGooglePlace] = useState(false)
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Google Places Autocomplete using traditional approach
  useEffect(() => {
    if (show && window.google && inputRef.current && !autocompleteRef.current) {
      try {
        // Create autocomplete with traditional approach
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          types: ['(cities)'],
          fields: ['formatted_address', 'name', 'geometry']
        })

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace()
          if (place && (place.formatted_address || place.name)) {
            const address = place.formatted_address || place.name || ''
            onLocationChange(address)
            setIsValidGooglePlace(true)
            onValidityChange(true)
            onErrorChange(false, '')
          }
        })

      } catch (error) {
        console.error('Error initializing Places Autocomplete:', error)
      }
    }
  }, [show, onLocationChange, onValidityChange, onErrorChange])

  // Load Google Maps API with traditional approach
  useEffect(() => {
    if (show && !window.google) {
      // Inject CSS to clean up Google's styling and limit results to 3
      const existingStyle = document.querySelector('#google-places-override')
      if (!existingStyle) {
        const style = document.createElement('style')
        style.id = 'google-places-override'
        style.textContent = `
          .pac-container {
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #d1d5db;
            margin-top: 4px;
            max-height: 144px;
            overflow: hidden;
          }
          .pac-item {
            padding: 8px 12px;
            font-family: Poppins, sans-serif;
            font-size: 16px;
            border-bottom: 1px solid #e5e7eb;
            height: 48px;
            box-sizing: border-box;
          }
          .pac-item:hover {
            background-color: #f3f4f6;
          }
          .pac-item-selected {
            background-color: #eff6ff;
          }
          .pac-item:nth-child(n+4) {
            display: none !important;
          }
        `
        document.head.appendChild(style)
      }

      // Set up initialization function
      window.initAutocomplete = () => {
        if (inputRef.current && !autocompleteRef.current) {
          try {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
              componentRestrictions: { country: 'us' },
              types: ['(cities)'],
              fields: ['formatted_address', 'name', 'geometry']
            })

            autocompleteRef.current.addListener('place_changed', () => {
              const place = autocompleteRef.current?.getPlace()
              if (place && (place.formatted_address || place.name)) {
                const address = place.formatted_address || place.name || ''
                onLocationChange(address)
                setIsValidGooglePlace(true)
                onValidityChange(true)
                onErrorChange(false, '')
              }
            })

          } catch (error) {
            console.error('Error initializing Places Autocomplete:', error)
          }
        }
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }, [show, onLocationChange, onValidityChange, onErrorChange])

  const handleLocationChange = (value: string) => {
    onLocationChange(value)
    // Only mark as invalid if user is manually typing (not from Google selection)
    if (!isValidGooglePlace) {
      setIsValidGooglePlace(false)
      onValidityChange(false)
    }
    onErrorChange(false, '')
  }

  // Update internal state when external validity changes
  useEffect(() => {
    if (!showError) {
      setIsValidGooglePlace(true)
    }
  }, [showError])

  return (
    <div className="mt-8 max-w-xl mx-auto" style={{ minHeight: '120px' }}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Enter your location
          </label>
          <div className="w-full border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-[#004aad] focus-within:border-[#004aad] transition-all">
            <input
              ref={inputRef}
              type="text"
              id="location"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full px-4 py-3 border-none rounded-lg text-lg outline-none"
              placeholder="Enter city or address"
            />
          </div>
          <ErrorMessage 
            message={errorMessage} 
            show={showError} 
          />
        </motion.div>
      )}
    </div>
  )
} 