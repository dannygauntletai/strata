'use client'

import React, { useState, useEffect, useRef } from 'react'

interface AddressData {
  street: string
  city: string
  state: string
  zip: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressData) => void
  placeholder?: string
  className?: string
  label?: string
}

interface Suggestion {
  description: string
  place_id: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

export function AddressAutocomplete({ 
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address",
  className = "",
  label
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [autocompleteService, setAutocompleteService] = useState<any>(null)
  const [placesService, setPlacesService] = useState<any>(null)

  // Initialize Google Places Services
  useEffect(() => {
    if ((window as any).google?.maps?.places && !autocompleteService) {
      try {
        const autoCompleteService = new (window as any).google.maps.places.AutocompleteService()
        setAutocompleteService(autoCompleteService)

        const map = new (window as any).google.maps.Map(document.createElement('div'))
        const placesServiceInstance = new (window as any).google.maps.places.PlacesService(map)
        setPlacesService(placesServiceInstance)

      } catch (error) {
        console.error('❌ Error initializing Google Places services:', error)
      }
    }
  }, [autocompleteService, placesService])

  // Handle input changes and fetch suggestions
  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue)

    // Fallback: Try to initialize services if Google API is loaded but services aren't
    if (!autocompleteService && (window as any).google?.maps?.places) {
      try {
        const autoCompleteService = new (window as any).google.maps.places.AutocompleteService()
        setAutocompleteService(autoCompleteService)

        const map = new (window as any).google.maps.Map(document.createElement('div'))
        const placesServiceInstance = new (window as any).google.maps.places.PlacesService(map)
        setPlacesService(placesServiceInstance)

        // Use the newly created service immediately
        if (inputValue.length >= 2) {
          setIsLoading(true)
          
          const request = {
            input: inputValue,
            componentRestrictions: { country: 'us' },
            types: ['address']
          }

          autoCompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
            setIsLoading(false)

            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedSuggestions = predictions.map((prediction: any) => ({
                description: prediction.description,
                place_id: prediction.place_id,
                structured_formatting: prediction.structured_formatting
              }))
              
              setSuggestions(formattedSuggestions)
              setShowSuggestions(true)
            } else {
              setSuggestions([])
              setShowSuggestions(false)
            }
          })
        }
        return

      } catch (error) {
        console.error('❌ Error in fallback service initialization:', error)
      }
    }

    if (!autocompleteService) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (inputValue.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    
    try {
      const request = {
        input: inputValue,
        componentRestrictions: { country: 'us' },
        types: ['address']
      }

      autocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
        setIsLoading(false)

        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
          const formattedSuggestions = predictions.map((prediction: any) => ({
            description: prediction.description,
            place_id: prediction.place_id,
            structured_formatting: prediction.structured_formatting
          }))
          
          setSuggestions(formattedSuggestions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      })
    } catch (error) {
      console.error('❌ Error fetching suggestions:', error)
      setIsLoading(false)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    if (!placesService) {
      console.error('❌ PlacesService not available')
      return
    }

    // Update input with selected suggestion
    onChange(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])

    // Get detailed place information
    const request = {
      placeId: suggestion.place_id,
      fields: ['address_components', 'formatted_address', 'geometry']
    }

    placesService.getDetails(request, (place: any, status: string) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place) {
        const addressData: AddressData = {
          street: '',
          city: '',
          state: '',
          zip: ''
        }

        if (place.address_components) {
          for (const component of place.address_components) {
            const componentType = component.types[0]
            
            switch (componentType) {
              case "street_number": {
                addressData.street = `${component.long_name} ${addressData.street}`
                break
              }
              case "route": {
                addressData.street += component.short_name
                break
              }
              case "locality": {
                addressData.city = component.long_name
                break
              }
              case "administrative_area_level_1": {
                addressData.state = component.short_name
                break
              }
              case "postal_code": {
                addressData.zip = component.long_name
                break
              }
              case "postal_code_suffix": {
                addressData.zip = `${addressData.zip}-${component.long_name}`
                break
              }
            }
          }
        }

        onAddressSelect(addressData)
      } else {
        console.error('❌ Error getting place details:', status)
      }
    })
  }

  // Load Google Maps API (only once)
  useEffect(() => {
    // Check if Google API is already loaded
    if ((window as any).google) {
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      return
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set!')
      return
    }

    // Enhanced CSS for custom dropdown
    const existingStyle = document.querySelector('#address-autocomplete-styles')
    if (!existingStyle) {
      const style = document.createElement('style')
      style.id = 'address-autocomplete-styles'
      style.textContent = `
        .address-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          z-index: 99999;
          max-height: 300px;
          overflow-y: auto;
          margin-top: 2px;
        }
        .address-suggestion-item {
          padding: 12px 16px;
          font-family: Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.4;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          color: #374151;
        }
        .address-suggestion-item:hover {
          background-color: #f3f4f6;
        }
        .address-suggestion-item:last-child {
          border-bottom: none;
        }
        .address-suggestion-main {
          font-weight: 600;
          color: #111827;
        }
        .address-suggestion-secondary {
          color: #6b7280;
          font-size: 12px;
        }
        .address-suggestion-loading {
          padding: 12px 16px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }
      `
      document.head.appendChild(style)
    }

    // Global callback function
    ;(window as any).initAddressAutocomplete = () => {
      // Immediately try to initialize services when callback fires
      if ((window as any).google?.maps?.places) {
        try {
          const autoCompleteService = new (window as any).google.maps.places.AutocompleteService()
          setAutocompleteService(autoCompleteService)

          const map = new (window as any).google.maps.Map(document.createElement('div'))
          const placesServiceInstance = new (window as any).google.maps.places.PlacesService(map)
          setPlacesService(placesServiceInstance)

        } catch (error) {
          console.error('❌ Callback: Error initializing services:', error)
        }
      }
    }

    // Load script with proper parameters
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAddressAutocomplete`

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.defer = true
    
    script.onerror = (error) => {
      console.error('❌ Error loading Google Maps script:', error)
    }
    
    document.head.appendChild(script)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true)
          }
        }}
        onBlur={() => {
          // Delay hiding suggestions to allow for clicks
          setTimeout(() => {
            setShowSuggestions(false)
          }, 200)
        }}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      
      {showSuggestions && (
        <div className="address-autocomplete-dropdown">
          {isLoading ? (
            <div className="address-suggestion-loading">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id}
                className="address-suggestion-item"
                onClick={() => handleSuggestionSelect(suggestion)}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
              >
                {suggestion.structured_formatting ? (
                  <>
                    <div className="address-suggestion-main">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    <div className="address-suggestion-secondary">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  </>
                ) : (
                  <div className="address-suggestion-main">
                    {suggestion.description}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="address-suggestion-loading">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  )
} 