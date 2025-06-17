'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Checkbox } from '@/components/checkbox'
import { Heading, Subheading } from '@/components/heading'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getCoachApiUrl } from '@/lib/ssm-config'

export default function InterestForm() {
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    student_name: '',
    student_age: '',
    interests: [] as string[],
    location: '',
    additional_notes: '',
    consent_contact: false,
    consent_marketing: false
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Load API endpoint from SSM
  useEffect(() => {
    try {
      const url = getCoachApiUrl();
      setApiBaseUrl(url);
    } catch (error) {
      console.error('Failed to load API endpoint:', error);
    }
  }, [])

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiBaseUrl) {
      setError('Configuration not loaded. Please refresh the page.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Validate required fields
      const requiredFields = ['parent_name', 'parent_email', 'student_name', 'student_age']
      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`Please fill in all required fields`)
        }
      }

      if (!formData.consent_contact) {
        throw new Error('You must consent to being contacted to proceed')
      }

      // Submit to API
      const response = await fetch(`${apiBaseUrl}/interest-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          student_age: parseInt(formData.student_age),
          submitted_at: new Date().toISOString(),
          source: 'website_form'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to submit form')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Thank you for your interest!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We&apos;ve received your information and a Texas Sports Academy coach will contact you within 24-48 hours.
            </p>
          </div>
          
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">What happens next?</h3>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">1.</span>
                    A coach will review your information
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">2.</span>
                    We&apos;ll call or email to schedule a consultation
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">3.</span>
                    You&apos;ll receive an invitation to visit our campus
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">4.</span>
                    We&apos;ll discuss enrollment options for your student
                  </li>
                </ul>
              </div>
              
              <div className="text-center">
                <Button href="https://www.texassportsacademy.com" className="w-full">
                  Return to Website
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg" 
            alt="Texas Sports Academy"
            className="h-20 w-auto mx-auto mb-6"
          />
          <Heading className="text-3xl font-bold text-gray-900">
            Interested in Texas Sports Academy?
          </Heading>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Tell us about your student and we&apos;ll connect you with one of our coaches to discuss 
            how TSA can help your child excel academically and athletically.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Parent Information */}
            <div>
              <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                Parent/Guardian Information
              </Subheading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <Input
                    value={formData.parent_name}
                    onChange={(e) => handleInputChange('parent_name', e.target.value)}
                    placeholder="Your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => handleInputChange('parent_email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div>
              <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                Student Information
              </Subheading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name *
                  </label>
                  <Input
                    value={formData.student_name}
                    onChange={(e) => handleInputChange('student_name', e.target.value)}
                    placeholder="Student's name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Age *
                  </label>
                  <Select
                    value={formData.student_age}
                    onChange={(e) => handleInputChange('student_age', e.target.value)}
                    required
                  >
                    <option value="">Select age</option>
                    {Array.from({ length: 14 }, (_, i) => i + 5).map(age => (
                      <option key={age} value={age.toString()}>{age} years old</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Student's location"
                  />
                </div>
              </div>
            </div>

            {/* Sports Information */}
            <div>
              <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                Sports Information
              </Subheading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Sport of Interest *
                  </label>
                  <Select
                    value={formData.interests[0] || ''}
                    onChange={(e) => handleInputChange('interests', [e.target.value])}
                    required
                  >
                    <option value="">Select primary sport</option>
                    <option value="basketball">Basketball</option>
                    <option value="football">Football</option>
                    <option value="soccer">Soccer</option>
                    <option value="volleyball">Volleyball</option>
                    <option value="tennis">Tennis</option>
                    <option value="track">Track & Field</option>
                    <option value="cross_country">Cross Country</option>
                    <option value="golf">Golf</option>
                    <option value="baseball">Baseball</option>
                    <option value="softball">Softball</option>
                    <option value="swimming">Swimming</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Sport (Optional)
                  </label>
                  <Select
                    value={formData.interests[1] || ''}
                    onChange={(e) => handleInputChange('interests', [formData.interests[0], e.target.value])}
                  >
                    <option value="">Select secondary sport</option>
                    <option value="basketball">Basketball</option>
                    <option value="football">Football</option>
                    <option value="soccer">Soccer</option>
                    <option value="volleyball">Volleyball</option>
                    <option value="tennis">Tennis</option>
                    <option value="track">Track & Field</option>
                    <option value="cross_country">Cross Country</option>
                    <option value="golf">Golf</option>
                    <option value="baseball">Baseball</option>
                    <option value="softball">Softball</option>
                    <option value="swimming">Swimming</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <Subheading className="text-lg font-semibold text-gray-900 mb-4">
                Additional Information
              </Subheading>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <Textarea
                    value={formData.additional_notes}
                    onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                    placeholder="Tell us more about your student's goals, interests, or any questions you have..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="space-y-4">
              <div className="flex items-start">
                <Checkbox
                  checked={formData.consent_contact}
                  onChange={(checked) => handleInputChange('consent_contact', checked)}
                />
                <label className="ml-3 text-sm text-gray-700">
                  I consent to being contacted by Texas Sports Academy regarding my interest in their programs. *
                </label>
              </div>
              <div className="flex items-start">
                <Checkbox
                  checked={formData.consent_marketing}
                  onChange={(checked) => handleInputChange('consent_marketing', checked)}
                />
                <label className="ml-3 text-sm text-gray-700">
                  I would like to receive updates about Texas Sports Academy events and programs.
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                color="blue"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Interest Form'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:info@texassportsacademy.com" className="text-blue-600 hover:text-blue-800">
              info@texassportsacademy.com
            </a>{' '}
            or{' '}
            <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-800">
              (123) 456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 