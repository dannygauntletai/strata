'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Checkbox } from '@/components/checkbox'
import { Heading, Subheading } from '@/components/heading'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

interface InterestFormData {
  parent_first_name: string
  parent_last_name: string
  parent_email: string
  parent_phone: string
  student_first_name: string
  student_last_name: string
  student_age: string
  student_grade: string
  primary_sport: string
  secondary_sport: string
  experience_level: string
  current_school: string
  heard_about_us: string
  additional_info: string
  consent_marketing: boolean
  consent_contact: boolean
}

export default function InterestForm() {
  const [formData, setFormData] = useState<InterestFormData>({
    parent_first_name: '',
    parent_last_name: '',
    parent_email: '',
    parent_phone: '',
    student_first_name: '',
    student_last_name: '',
    student_age: '',
    student_grade: '',
    primary_sport: '',
    secondary_sport: '',
    experience_level: '',
    current_school: '',
    heard_about_us: '',
    additional_info: '',
    consent_marketing: false,
    consent_contact: true
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field: keyof InterestFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      const requiredFields = [
        'parent_first_name', 'parent_last_name', 'parent_email', 
        'student_first_name', 'student_last_name', 'student_age', 
        'student_grade', 'primary_sport'
      ]
      
      for (const field of requiredFields) {
        if (!formData[field as keyof InterestFormData]) {
          throw new Error(`Please fill in all required fields`)
        }
      }

      if (!formData.consent_contact) {
        throw new Error('You must consent to being contacted to proceed')
      }

      // Submit to API
      const response = await fetch(`${API_BASE_URL}/interest-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          submitted_at: new Date().toISOString(),
          source: 'interest_form'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit form')
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
                    value={formData.parent_first_name}
                    onChange={(e) => handleInputChange('parent_first_name', e.target.value)}
                    placeholder="Your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <Input
                    value={formData.parent_last_name}
                    onChange={(e) => handleInputChange('parent_last_name', e.target.value)}
                    placeholder="Your last name"
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
                    Student First Name *
                  </label>
                  <Input
                    value={formData.student_first_name}
                    onChange={(e) => handleInputChange('student_first_name', e.target.value)}
                    placeholder="Student's first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Last Name *
                  </label>
                  <Input
                    value={formData.student_last_name}
                    onChange={(e) => handleInputChange('student_last_name', e.target.value)}
                    placeholder="Student's last name"
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
                    Current Grade *
                  </label>
                  <Select
                    value={formData.student_grade}
                    onChange={(e) => handleInputChange('student_grade', e.target.value)}
                    required
                  >
                    <option value="">Select grade</option>
                    <option value="K">Kindergarten</option>
                    <option value="1">1st Grade</option>
                    <option value="2">2nd Grade</option>
                    <option value="3">3rd Grade</option>
                    <option value="4">4th Grade</option>
                    <option value="5">5th Grade</option>
                    <option value="6">6th Grade</option>
                    <option value="7">7th Grade</option>
                    <option value="8">8th Grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current School
                  </label>
                  <Input
                    value={formData.current_school}
                    onChange={(e) => handleInputChange('current_school', e.target.value)}
                    placeholder="Student's current school"
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
                    value={formData.primary_sport}
                    onChange={(e) => handleInputChange('primary_sport', e.target.value)}
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
                    value={formData.secondary_sport}
                    onChange={(e) => handleInputChange('secondary_sport', e.target.value)}
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Level
                  </label>
                  <Select
                    value={formData.experience_level}
                    onChange={(e) => handleInputChange('experience_level', e.target.value)}
                  >
                    <option value="">Select experience level</option>
                    <option value="beginner">Beginner (Little to no experience)</option>
                    <option value="intermediate">Intermediate (Some recreational play)</option>
                    <option value="advanced">Advanced (Competitive play/travel teams)</option>
                    <option value="elite">Elite (High-level competition)</option>
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
                    How did you hear about us?
                  </label>
                  <Select
                    value={formData.heard_about_us}
                    onChange={(e) => handleInputChange('heard_about_us', e.target.value)}
                  >
                    <option value="">Select an option</option>
                    <option value="google_search">Google Search</option>
                    <option value="social_media">Social Media</option>
                    <option value="friend_referral">Friend/Family Referral</option>
                    <option value="school_referral">School Counselor/Coach</option>
                    <option value="community_event">Community Event</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Information
                  </label>
                  <Textarea
                    value={formData.additional_info}
                    onChange={(e) => handleInputChange('additional_info', e.target.value)}
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