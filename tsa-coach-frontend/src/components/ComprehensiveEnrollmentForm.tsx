'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Badge } from '@/components/badge'
import {
  UserIcon,
  DocumentIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'

interface StudentDemographics {
  // Basic Information (EdFi required)
  first_name: string
  last_name: string
  middle_name?: string
  generation_code_suffix?: string // Jr., Sr., III, etc.
  maiden_name?: string
  
  // Birth Information (EdFi required)
  birth_date: string
  birth_city?: string
  birth_state_abbreviation_descriptor?: string
  birth_country_descriptor?: string
  birth_sex_descriptor?: string
  multiplebirth_status?: boolean
  
  // Immigration Information (EdFi)
  date_entered_us?: string
  
  // Ethnicity and Race (EdFi required for federal reporting)
  hispanic_latino_ethnicity?: boolean
  races?: string[]
  
  // Academic Information
  grade_level: string
  sport_interest: string
  previous_schools?: string[]
  
  // OneRoster Information
  person_id?: string
  source_system_descriptor?: string
}

interface ParentGuardianInfo {
  // OneRoster User Information
  role: 'parent' | 'guardian'
  first_name: string
  last_name: string
  middle_name?: string
  email: string
  phone?: string
  sms?: string
  
  // Address Information
  address_line_1: string
  address_line_2?: string
  city: string
  state_abbreviation: string
  postal_code: string
  county?: string
  
  // Emergency Contact
  is_emergency_contact: boolean
  relationship_to_student: string
}

interface FormState {
  student: StudentDemographics
  parent_guardian: ParentGuardianInfo
  academic_history: {
    current_school?: string
    current_gpa?: string
    special_education_services?: boolean
    special_accommodations?: string
  }
  medical_information: {
    medical_conditions?: string
    medications?: string
    allergies?: string
    dietary_restrictions?: string
    emergency_medical_contact?: string
  }
}

export default function ComprehensiveEnrollmentForm() {
  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState<FormState>({
    student: {
      first_name: '',
      last_name: '',
      birth_date: '',
      grade_level: '',
      sport_interest: '',
      hispanic_latino_ethnicity: false,
      races: []
    },
    parent_guardian: {
      role: 'parent',
      first_name: '',
      last_name: '',
      email: '',
      address_line_1: '',
      city: '',
      state_abbreviation: '',
      postal_code: '',
      is_emergency_contact: true,
      relationship_to_student: 'Parent'
    },
    academic_history: {},
    medical_information: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sections = [
    {
      title: 'Student Demographics',
      description: 'Basic student information required for enrollment and federal reporting',
      icon: UserIcon,
      fields: 'student'
    },
    {
      title: 'Birth & Immigration Information', 
      description: 'Birthplace and immigration details for EdFi compliance',
      icon: MapPinIcon,
      fields: 'birth_immigration'
    },
    {
      title: 'Ethnicity & Race Information',
      description: 'Federal reporting requirements (optional but recommended)',
      icon: DocumentIcon,
      fields: 'ethnicity_race'
    },
    {
      title: 'Parent/Guardian Information',
      description: 'Primary contact and address information',
      icon: UserIcon,
      fields: 'parent_guardian'
    },
    {
      title: 'Academic History',
      description: 'Previous school and academic information',
      icon: CalendarDaysIcon,
      fields: 'academic_history'
    },
    {
      title: 'Medical Information',
      description: 'Health and medical information for school records',
      icon: DocumentIcon,
      fields: 'medical_information'
    }
  ]

  // EdFi Standard Descriptors
  const stateAbbreviations = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  const raceDescriptors = [
    'American Indian - Alaska Native',
    'Asian',
    'Black - African American', 
    'Native Hawaiian - Pacific Islander',
    'White',
    'Two or more races'
  ]

  const birthSexDescriptors = [
    'Male',
    'Female'
  ]

  const gradeDescriptors = [
    'Kindergarten',
    'First grade',
    'Second grade', 
    'Third grade',
    'Fourth grade',
    'Fifth grade',
    'Sixth grade',
    'Seventh grade',
    'Eighth grade',
    'Ninth grade',
    'Tenth grade',
    'Eleventh grade',
    'Twelfth grade'
  ]

  const handleInputChange = (section: keyof FormState, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    
    // Clear error when user starts typing
    const errorKey = `${section}.${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const handleRaceChange = (race: string, checked: boolean) => {
    const currentRaces = formData.student.races || []
    const newRaces = checked 
      ? [...currentRaces, race]
      : currentRaces.filter(r => r !== race)
    
    handleInputChange('student', 'races', newRaces)
  }

  const validateCurrentSection = () => {
    const newErrors: Record<string, string> = {}
    
    switch (currentSection) {
      case 0: // Student Demographics
        if (!formData.student.first_name) newErrors['student.first_name'] = 'First name is required'
        if (!formData.student.last_name) newErrors['student.last_name'] = 'Last name is required'
        if (!formData.student.birth_date) newErrors['student.birth_date'] = 'Birth date is required'
        if (!formData.student.grade_level) newErrors['student.grade_level'] = 'Grade level is required'
        if (!formData.student.sport_interest) newErrors['student.sport_interest'] = 'Sport interest is required'
        break
        
      case 3: // Parent/Guardian Information
        if (!formData.parent_guardian.first_name) newErrors['parent_guardian.first_name'] = 'First name is required'
        if (!formData.parent_guardian.last_name) newErrors['parent_guardian.last_name'] = 'Last name is required'
        if (!formData.parent_guardian.email) newErrors['parent_guardian.email'] = 'Email is required'
        if (!formData.parent_guardian.address_line_1) newErrors['parent_guardian.address_line_1'] = 'Address is required'
        if (!formData.parent_guardian.city) newErrors['parent_guardian.city'] = 'City is required'
        if (!formData.parent_guardian.state_abbreviation) newErrors['parent_guardian.state_abbreviation'] = 'State is required'
        if (!formData.parent_guardian.postal_code) newErrors['parent_guardian.postal_code'] = 'Postal code is required'
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextSection = () => {
    if (validateCurrentSection()) {
      setCurrentSection(prev => Math.min(prev + 1, sections.length - 1))
    }
  }

  const prevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0))
  }

  const submitForm = async () => {
    if (validateCurrentSection()) {
      // Submit comprehensive enrollment data
      console.log('Submitting comprehensive enrollment:', formData)
      // TODO: Call API with complete EdFi/OneRoster compliant data
    }
  }

  const renderSectionIcon = (IconComponent: React.ComponentType<{ className?: string }>) => {
    return <IconComponent className="h-6 w-6 text-blue-600 mr-3" />
  }

  const renderStudentDemographics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <Input
            value={formData.student.first_name}
            onChange={(e) => handleInputChange('student', 'first_name', e.target.value)}
            placeholder="Enter first name"
            className={errors['student.first_name'] ? 'border-red-500' : ''}
          />
          {errors['student.first_name'] && (
            <p className="text-red-500 text-sm mt-1">{errors['student.first_name']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <Input
            value={formData.student.last_name}
            onChange={(e) => handleInputChange('student', 'last_name', e.target.value)}
            placeholder="Enter last name"
            className={errors['student.last_name'] ? 'border-red-500' : ''}
          />
          {errors['student.last_name'] && (
            <p className="text-red-500 text-sm mt-1">{errors['student.last_name']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Middle Name
          </label>
          <Input
            value={formData.student.middle_name || ''}
            onChange={(e) => handleInputChange('student', 'middle_name', e.target.value)}
            placeholder="Enter middle name (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Suffix
          </label>
          <select
            value={formData.student.generation_code_suffix || ''}
            onChange={(e) => handleInputChange('student', 'generation_code_suffix', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select suffix (optional)</option>
            <option value="Jr.">Jr.</option>
            <option value="Sr.">Sr.</option>
            <option value="II">II</option>
            <option value="III">III</option>
            <option value="IV">IV</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birth Date *
          </label>
          <Input
            type="date"
            value={formData.student.birth_date}
            onChange={(e) => handleInputChange('student', 'birth_date', e.target.value)}
            className={errors['student.birth_date'] ? 'border-red-500' : ''}
          />
          {errors['student.birth_date'] && (
            <p className="text-red-500 text-sm mt-1">{errors['student.birth_date']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grade Level *
          </label>
          <select
            value={formData.student.grade_level}
            onChange={(e) => handleInputChange('student', 'grade_level', e.target.value)}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['student.grade_level'] ? 'border-red-500' : ''}`}
          >
            <option value="">Select grade level</option>
            {gradeDescriptors.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          {errors['student.grade_level'] && (
            <p className="text-red-500 text-sm mt-1">{errors['student.grade_level']}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sport Interest *
          </label>
          <Input
            value={formData.student.sport_interest}
            onChange={(e) => handleInputChange('student', 'sport_interest', e.target.value)}
            placeholder="Primary sport interest"
            className={errors['student.sport_interest'] ? 'border-red-500' : ''}
          />
          {errors['student.sport_interest'] && (
            <p className="text-red-500 text-sm mt-1">{errors['student.sport_interest']}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderBirthImmigrationInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-blue-900 font-medium">EdFi Compliance Information</h4>
            <p className="text-blue-700 text-sm mt-1">
              This information is required for federal reporting and state compliance. All data is kept confidential.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birth City
          </label>
          <Input
            value={formData.student.birth_city || ''}
            onChange={(e) => handleInputChange('student', 'birth_city', e.target.value)}
            placeholder="City where student was born"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birth State/Province
          </label>
          <select
            value={formData.student.birth_state_abbreviation_descriptor || ''}
            onChange={(e) => handleInputChange('student', 'birth_state_abbreviation_descriptor', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select state (if born in US)</option>
            {stateAbbreviations.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birth Country
          </label>
          <Input
            value={formData.student.birth_country_descriptor || ''}
            onChange={(e) => handleInputChange('student', 'birth_country_descriptor', e.target.value)}
            placeholder="Country where student was born"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birth Sex (for records)
          </label>
          <select
            value={formData.student.birth_sex_descriptor || ''}
            onChange={(e) => handleInputChange('student', 'birth_sex_descriptor', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select birth sex</option>
            {birthSexDescriptors.map(sex => (
              <option key={sex} value={sex}>{sex}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Entered United States (if applicable)
          </label>
          <Input
            type="date"
            value={formData.student.date_entered_us || ''}
            onChange={(e) => handleInputChange('student', 'date_entered_us', e.target.value)}
            placeholder="Leave blank if born in US"
          />
          <p className="text-sm text-gray-500 mt-1">Only fill if student was born outside the United States</p>
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.student.multiplebirth_status || false}
              onChange={(e) => handleInputChange('student', 'multiplebirth_status', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Student is part of multiple birth (twin, triplet, etc.)</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderEthnicityRaceInfo = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-amber-900 font-medium">Federal Reporting Requirements</h4>
            <p className="text-amber-700 text-sm mt-1">
              This information is used for federal reporting and statistical purposes only. 
              Providing this information is voluntary but helps ensure proper resource allocation.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Hispanic or Latino Ethnicity
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="hispanic_latino"
                checked={formData.student.hispanic_latino_ethnicity === true}
                onChange={() => handleInputChange('student', 'hispanic_latino_ethnicity', true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Yes, Hispanic or Latino</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="hispanic_latino"
                checked={formData.student.hispanic_latino_ethnicity === false}
                onChange={() => handleInputChange('student', 'hispanic_latino_ethnicity', false)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">No, not Hispanic or Latino</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Race (Select all that apply)
          </label>
          <div className="space-y-2">
            {raceDescriptors.map(race => (
              <label key={race} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(formData.student.races || []).includes(race)}
                  onChange={(e) => handleRaceChange(race, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{race}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <Heading className="text-2xl font-bold text-gray-900 mb-2">
          Student Enrollment Application
        </Heading>
        <p className="text-gray-600">
          Complete enrollment form with EdFi and OneRoster compliance data collection
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`flex items-center ${index < sections.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index <= currentSection
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {index < currentSection ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < sections.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentSection ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Step {currentSection + 1} of {sections.length}: {sections[currentSection].title}
          </p>
        </div>
      </div>

      {/* Current Section Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          {renderSectionIcon(sections[currentSection].icon)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {sections[currentSection].title}
            </h3>
            <p className="text-sm text-gray-600">
              {sections[currentSection].description}
            </p>
          </div>
        </div>

        {currentSection === 0 && renderStudentDemographics()}
        {currentSection === 1 && renderBirthImmigrationInfo()}
        {currentSection === 2 && renderEthnicityRaceInfo()}
        {/* Additional sections would be implemented similarly */}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          onClick={prevSection}
          disabled={currentSection === 0}
          color="zinc"
        >
          Previous
        </Button>
        
        {currentSection === sections.length - 1 ? (
          <Button onClick={submitForm} color="blue">
            Submit Application
          </Button>
        ) : (
          <Button onClick={nextSection} color="blue">
            Next
          </Button>
        )}
      </div>

      {/* Data Preview (for development) */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <details>
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            Preview Collected Data (Development)
          </summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
} 