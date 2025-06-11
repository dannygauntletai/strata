'use client'

import { useState, useEffect, useRef } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Input } from '@/components/input'
import { io, Socket } from 'socket.io-client'
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  IdentificationIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  HomeIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  BookOpenIcon,
  BeakerIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  InformationCircleIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  PlayIcon,
} from '@heroicons/react/24/solid'

// Interface for incorporation form data
interface IncorporationFormData {
  client_id: string
  password: string
  exp_month: string
  exp_year: string
  cvv: string
  cc_number: string
  company_name: string
  address1: string
  address2?: string
  city: string
  state: string
  zip_code: string
  agent_last_name: string
  agent_first_name: string
  agent_address1: string
  agent_address2?: string
  agent_city: string
  agent_zip_code: string
  business_purpose_name: string
  business_address1: string
  business_city: string
  business_zip_code: string
  org_applicant: string
  org_applicant_address: string
}

// Legal requirements data
const legalRequirements = [
  {
    id: 1,
    title: 'LLC Incorporation',
    status: 'not_started',
    priority: 'high',
    description: 'Form a legal entity to separate the microschool from personal liability',
    timeline: '1-2 weeks',
    category: 'Business Formation',
    icon: BuildingOffice2Icon,
    documents: ['Articles of Organization', 'Operating Agreement', 'State Filing'],
  },
  {
    id: 2,
    title: 'EIN Registration',
    status: 'not_started',
    priority: 'high',
    description: 'Obtain federal Employer Identification Number from the IRS',
    timeline: '1 day',
    category: 'Tax Registration',
    icon: IdentificationIcon,
    documents: ['IRS Form SS-4', 'EIN Confirmation Letter'],
  },
  {
    id: 3,
    title: 'State School Registration',
    status: 'not_started',
    priority: 'high',
    description: 'Register as a private school with state department of education',
    timeline: '2-4 weeks',
    category: 'Education Compliance',
    icon: AcademicCapIcon,
    documents: ['Private School Affidavit', 'School Information Form', 'Compliance Checklist'],
  },

  {
    id: 5,
    title: 'Health & Safety Compliance',
    status: 'not_started',
    priority: 'high',
    description: 'Meet fire safety, health, and emergency preparedness requirements',
    timeline: '2-3 weeks',
    category: 'Health & Safety',
    icon: ShieldCheckIcon,
    documents: ['Fire Inspection Certificate', 'Health Department Approval', 'Emergency Plan'],
  },
  {
    id: 6,
    title: 'Zoning & Facility Compliance',
    status: 'not_started',
    priority: 'medium',
    description: 'Ensure facility meets zoning and child care facility requirements',
    timeline: '3-4 weeks',
    category: 'Facility Requirements',
    icon: HomeIcon,
    documents: ['Zoning Permit', 'Occupancy Certificate', 'ADA Compliance Checklist'],
  },
  {
    id: 7,
    title: 'General Liability Insurance',
    status: 'not_started',
    priority: 'high',
    description: 'Protect against financial loss from bodily injury, property damage, and lawsuits involving students',
    timeline: '1 week',
    category: 'Insurance Coverage',
    icon: ShieldCheckIcon,
    documents: ['General Liability Policy', 'Certificate of Insurance', 'Coverage Summary'],
  },
  {
    id: 8,
    title: 'Professional Liability Insurance',
    status: 'not_started',
    priority: 'high',
    description: 'Protect against claims of educational malpractice, errors, and negligence in teaching',
    timeline: '1 week',
    category: 'Insurance Coverage',
    icon: AcademicCapIcon,
    documents: ['Professional Liability Policy', 'Errors & Omissions Coverage', 'Educational Malpractice Protection'],
  },
  {
    id: 9,
    title: 'Commercial Property Insurance',
    status: 'not_started',
    priority: 'medium',
    description: 'Protect educational equipment, materials, and facility against fire, theft, and damage',
    timeline: '1 week',
    category: 'Insurance Coverage',
    icon: HomeIcon,
    documents: ['Property Insurance Policy', 'Equipment Coverage', 'Business Personal Property Coverage'],
  },

]

export default function Legal() {
  const [selectedRequirement, setSelectedRequirement] = useState<typeof legalRequirements[0] | null>(null)
  const [showIncorporationForm, setShowIncorporationForm] = useState(false)
  const [showIncorporationChoice, setShowIncorporationChoice] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)
  const [showSosSignup, setShowSosSignup] = useState(false)
  const [incorporationStatus, setIncorporationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [incorporationMessage, setIncorporationMessage] = useState('')
  const [incorporationSteps, setIncorporationSteps] = useState<string[]>([])
  const [incorporationFilingNumber, setIncorporationFilingNumber] = useState('')
  const [requirements, setRequirements] = useState(legalRequirements)
  
  // Live view state
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showLiveView, setShowLiveView] = useState(false)
  const [liveViewAvailable, setLiveViewAvailable] = useState(false)
  
  // Real-time progress state - Simplified to just append messages
  const [realTimeUpdates, setRealTimeUpdates] = useState<Array<{step: string, message: string, status: string, timestamp: string}>>([])
  const [currentStep, setCurrentStep] = useState<string>('')
  const socketRef = useRef<Socket | null>(null)
  
  // Screenshot streaming state - Simplified approach
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null)
  const [screenshotDescription, setScreenshotDescription] = useState<string>('')
  const [screenshots, setScreenshots] = useState<string[]>([]) // Simple array of base64 images
  const [screenshotDescriptions, setScreenshotDescriptions] = useState<string[]>([]) // Parallel array for descriptions
  
  // Minimize state for progress sections
  const [isProgressMinimized, setIsProgressMinimized] = useState(false)
  const [isScreenshotMinimized, setIsScreenshotMinimized] = useState(false)
  
  // Screenshot slideshow state - Simplified
  const [showScreenshotSlideshow, setShowScreenshotSlideshow] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  
  // SOS account signup form data
  const [sosSignupFormData, setSosSignupFormData] = useState({
    businessName: '',
    address1: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
    billingBusinessName: ''
  })

  // SOS signup state
  const [sosSignupStatus, setSosSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [sosSignupMessage, setSosSignupMessage] = useState('')

  // Enhanced form state for complete incorporation data
  const [incorporationFormData, setIncorporationFormData] = useState({
    // Business Information (User Input)
    businessName: '',
    businessPurpose: 'Sports training and educational services',
    
    // Company Address (User Input)
    companyAddress1: '',
    companyAddress2: '',
    companyCity: '',
    companyState: 'TX',
    companyZipCode: '',
    
    // Texas SOS Account Credentials (User Input)
    sosClientId: '',
    sosPassword: '',
    
    // Payment Information (User Input)
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
    
    // Registered Agent Information (User Input)
    agentFirstName: '',
    agentLastName: '',
    agentAddress1: '',
    agentAddress2: '',
    agentCity: '',
    agentState: 'TX',
    agentZipCode: '',
    
    // Static/Locked Fields (Cannot be changed)
    managingEntity: {
      name: 'Texas Sports Academy',
      address1: '4402 Hudson Bend Rd',
      city: 'Austin',
      state: 'TX',
      zipCode: '78734'
    },
    filingParty: {
      name: 'Strata Schools LLC',
      address: '1705 Guadalupe St, Austin, TX, 78701'
    }
  })

  // Simplified form state for our EC2 automation (keeping for backward compatibility)
  const [simpleFormData, setSimpleFormData] = useState({
    businessName: '',
    businessPurpose: 'Sports training and educational services'
  })

  // Form state for incorporation data (legacy - keeping for manual option)
  const [formData, setFormData] = useState<IncorporationFormData>({
    client_id: '',
    password: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
    cc_number: '',
    company_name: '',
    address1: '',
    address2: '',
    city: '',
    state: 'TX',
    zip_code: '',
    agent_last_name: '',
    agent_first_name: '',
    agent_address1: '',
    agent_address2: '',
    agent_city: '',
    agent_zip_code: '',
    business_purpose_name: 'Texas Sports Academy',
    business_address1: '4402 Hudson Bend Rd',
    business_city: 'Austin',
    business_zip_code: '78734',
    org_applicant: 'Strata Schools LLC',
    org_applicant_address: '1705 Guadalupe St, Austin, TX, 78701'
  })

  // Load saved completion state from localStorage
  useEffect(() => {
    const savedCompletionState = localStorage.getItem('legalRequirementsCompletion')
    if (savedCompletionState) {
      try {
        const completionState = JSON.parse(savedCompletionState)
        setRequirements(prev => prev.map(req => ({
          ...req,
          status: completionState[req.id] || req.status
        })))
      } catch (error) {
        console.error('Failed to load completion state:', error)
      }
    }
  }, [])

  // Socket.IO connection setup
  useEffect(() => {
    // Connect to WebSocket when component mounts
    const initializeSocket = () => {
      if (!socketRef.current) {
        socketRef.current = io('http://52.14.241.41', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        })

        socketRef.current.on('connect', () => {
          console.log('🔌 Connected to automation WebSocket')
          setCurrentStep('Connected to automation system')
        })

        socketRef.current.on('progress', (data) => {
          console.log('📡 Progress update:', data)
          // Simply append all messages as they come in
          setRealTimeUpdates(prev => [...prev, data])
          setCurrentStep(data.message)
          
          if (data.session_id) {
            setSessionId(data.session_id)
            setLiveViewUrl(`https://www.browserbase.com/sessions/${data.session_id}`)
            setLiveViewAvailable(true)
          }
        })

        socketRef.current.on('screenshot_stream', (data) => {
          console.log('📸 Screenshot update:', data.description)
          console.log('Screenshot data received:', {
            hasImage: !!data.image,
            imageType: typeof data.image,
            imageLength: data.image?.length,
            description: data.description,
            timestamp: data.timestamp,
            startsWithData: data.image?.startsWith('data:')
          })
          setCurrentScreenshot(data.image)
          setScreenshotDescription(data.description)
          
          // Add to history
          setScreenshots(prev => {
            const newArray = [...prev, data.image]
            console.log('📷 Screenshots array updated, now has:', newArray.length, 'items')
            return newArray
          })
          setScreenshotDescriptions(prev => [...prev, data.description])
        })

        socketRef.current.on('final_result', (data) => {
          console.log('✅ Final result:', data)
          if (data.success) {
            setIncorporationStatus('success')
            setIncorporationMessage('🎉 LLC incorporation completed successfully!')
            setIncorporationFilingNumber(data.filing_number || '')
            
            // Handle live view data
            if (data.debug_url) {
              setLiveViewUrl(data.debug_url)
              setSessionId(data.session_id)
              setLiveViewAvailable(data.live_view_available || false)
            }
            
            updateRequirementStatus(1, 'completed')
            
            // Close the form after a delay
            setTimeout(() => {
              setShowIncorporationForm(false)
              setSelectedRequirement(null)
              // Clear states
              setRealTimeUpdates([])
              setCurrentStep('')
              setLiveViewUrl(null)
              setSessionId(null)
              setLiveViewAvailable(false)
              // Clear screenshot states
              setCurrentScreenshot(null)
              setScreenshotDescription('')
              setScreenshots([])
              setScreenshotDescriptions([])
            }, 5000)
          } else {
            setIncorporationStatus('error')
            setIncorporationMessage(data.error || 'Automation failed')
            updateRequirementStatus(1, 'not_started')
          }
        })

        socketRef.current.on('disconnect', () => {
          console.log('🔌 Disconnected from automation WebSocket')
        })

        socketRef.current.on('connect_error', (error) => {
          console.error('🔌 WebSocket connection error:', error)
        })
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [showScreenshotSlideshow])

  // Scroll lock effect for modals
  useEffect(() => {
    const isAnyModalOpen = showIncorporationForm || showIncorporationChoice || showManualInstructions || showLiveView || selectedRequirement || showSosSignup
    
    if (isAnyModalOpen) {
      // Lock scroll
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = '0px' // Prevent layout shift
    } else {
      // Unlock scroll
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }
  }, [showIncorporationForm, showIncorporationChoice, showManualInstructions, showLiveView, selectedRequirement, showSosSignup])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-amber-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge color="red">High</Badge>
      case 'medium':
        return <Badge color="amber">Medium</Badge>
      case 'low':
        return <Badge color="green">Low</Badge>
      default:
        return null
    }
  }

  const updateRequirementStatus = (id: number, status: string) => {
    setRequirements(prev => {
      const updated = prev.map(req => 
        req.id === id ? { ...req, status } : req
      )
      
      // Save to localStorage
      const completionState = updated.reduce((acc, req) => {
        acc[req.id] = req.status
        return acc
      }, {} as Record<number, string>)
      localStorage.setItem('legalRequirementsCompletion', JSON.stringify(completionState))
      
      return updated
    })
  }

  const handleMarkAsStarted = () => {
    // For non-LLC requirements, just mark as started
    updateRequirementStatus(selectedRequirement!.id, 'in_progress')
    setSelectedRequirement(null)
  }

  const handleMarkAsComplete = () => {
    // Mark requirement as completed
    updateRequirementStatus(selectedRequirement!.id, 'completed')
    setSelectedRequirement(null)
  }

  const handleInputChange = (field: keyof IncorporationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string[] => {
    const errors: string[] = []
    const requiredFields: (keyof IncorporationFormData)[] = [
      'client_id', 'password', 'exp_month', 'exp_year', 'cvv', 'cc_number',
      'company_name', 'address1', 'city', 'state', 'zip_code',
      'agent_last_name', 'agent_first_name', 'agent_address1', 'agent_city', 'agent_zip_code',
      'business_purpose_name', 'business_address1', 'business_city', 'business_zip_code',
      'org_applicant', 'org_applicant_address'
    ]

    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors.push(`${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`)
      }
    })

    return errors
  }

  const startIncorporationRealTime = async () => {
    if (!simpleFormData.businessName.trim()) {
      setIncorporationMessage('Business name is required')
      setIncorporationStatus('error')
      return
    }

    try {
      setIncorporationStatus('loading')
      setIncorporationMessage('Starting automation with real-time updates...')
      setRealTimeUpdates([])
      setCurrentStep('Initializing...')
      setIncorporationFilingNumber('')
      
      // Clear screenshot states for new automation
      setCurrentScreenshot(null)
      setScreenshotDescription('')
      setScreenshots([])
      setScreenshotDescriptions([])
      
      // Update status to in_progress immediately
      updateRequirementStatus(1, 'in_progress')

      // Initialize Socket.IO connection if not already connected
      if (!socketRef.current || !socketRef.current.connected) {
        socketRef.current = io('http://52.14.241.41', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        })
      }

      // Set up event listeners
      socketRef.current.on('connect', () => {
        console.log('🔌 Connected for automation')
      })

      socketRef.current.on('progress', (data) => {
        setRealTimeUpdates(prev => [...prev, data])
        setCurrentStep(data.message)
        
        if (data.session_id) {
          setSessionId(data.session_id)
          setLiveViewUrl(`https://www.browserbase.com/sessions/${data.session_id}`)
          setLiveViewAvailable(true)
        }
      })

      socketRef.current.on('screenshot_stream', (data) => {
        console.log('📸 Screenshot update:', data.description)
        console.log('Screenshot data received:', {
          hasImage: !!data.image,
          imageType: typeof data.image,
          imageLength: data.image?.length,
          description: data.description,
          timestamp: data.timestamp,
          startsWithData: data.image?.startsWith('data:')
        })
        setCurrentScreenshot(data.image)
        setScreenshotDescription(data.description)
        
        // Add to history
        setScreenshots(prev => {
          const newArray = [...prev, data.image]
          console.log('📷 Screenshots array updated, now has:', newArray.length, 'items')
          return newArray
        })
        setScreenshotDescriptions(prev => [...prev, data.description])
      })

      socketRef.current.on('final_result', (data) => {
        if (data.success) {
          setIncorporationStatus('success')
          setIncorporationMessage('🎉 LLC incorporation completed successfully!')
          setIncorporationFilingNumber(data.filing_number || '')
          updateRequirementStatus(1, 'completed')
        } else {
          setIncorporationStatus('error')
          setIncorporationMessage(data.error || 'Automation failed')
          updateRequirementStatus(1, 'not_started')
        }
      })

      // Start the real-time automation
      const response = await fetch('http://52.14.241.41/incorporate-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: simpleFormData.businessName,
          businessPurpose: simpleFormData.businessPurpose
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to start automation')
      }

      // setIncorporationMessage('🚀 Automation started! Watch real-time progress below...')
      
      // Add initial connection logs
      setRealTimeUpdates(prev => [...prev, {
        step: 'connecting',
        message: 'Connecting to automation server...',
        status: 'loading',
        timestamp: new Date().toISOString()
      }])

      setTimeout(() => {
        setRealTimeUpdates(prev => [...prev, {
          step: 'initializing',
          message: 'Initializing LLC automation...',
          status: 'loading',
          timestamp: new Date().toISOString()
        }])
      }, 500)
      
    } catch (error) {
      console.error('Automation start error:', error)
      setIncorporationStatus('error')
      setIncorporationMessage(error instanceof Error ? error.message : 'Failed to start automation')
      updateRequirementStatus(1, 'not_started')
    }
  }

  const fillTestData = () => {
    // Fill the new comprehensive form with test data
    setIncorporationFormData({
      // Business Information
      businessName: 'Austin Elite Sports Academy LLC',
      businessPurpose: 'Sports training and educational services for youth athletes',
      
      // Company Address
      companyAddress1: '1705 Guadalupe St',
      companyAddress2: 'Floor 5',
      companyCity: 'Austin',
      companyState: 'TX',
      companyZipCode: '78701',
      
      // Texas SOS Account Credentials
      sosClientId: '1065052110',
      sosPassword: 'gartez712!!',
      
      // Payment Information
      cardNumber: '5439300651668869',
      expirationMonth: '5',
      expirationYear: '2031',
      cvv: '995',
      
      // Registered Agent Information
      agentFirstName: 'Danny',
      agentLastName: 'Mota',
      agentAddress1: '1705 Guadalupe St',
      agentAddress2: 'Floor 5',
      agentCity: 'Austin',
      agentState: 'TX',
      agentZipCode: '78701',
      
      // Static/Locked Fields (Cannot be changed)
      managingEntity: {
        name: 'Texas Sports Academy',
        address1: '4402 Hudson Bend Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78734'
      },
      filingParty: {
        name: 'Strata Schools LLC',
        address: '1705 Guadalupe St, Austin, TX, 78701'
      }
    })
    
    setIncorporationMessage('✅ Test data filled! All form fields populated for automation testing.')
    setIncorporationStatus('idle')
  }

  const isFormValid = () => {
    const requiredFields = [
      'businessName',
      'companyAddress1',
      'companyCity',
      'companyZipCode',
      'sosClientId',
      'sosPassword',
      'cardNumber',
      'expirationMonth',
      'expirationYear',
      'cvv',
      'agentFirstName',
      'agentLastName',
      'agentAddress1',
      'agentCity',
      'agentZipCode'
    ]
    
    return requiredFields.every(field => {
      const value = incorporationFormData[field as keyof typeof incorporationFormData]
      return value && value.toString().trim().length > 0
    })
  }

  const startIncorporationWithFormData = async () => {
    if (!isFormValid()) {
      setIncorporationMessage('Please fill in all required fields before starting automation.')
      setIncorporationStatus('error')
      return
    }

    try {
      setIncorporationStatus('loading')
      setIncorporationMessage('Starting automation with your form data...')
      setRealTimeUpdates([])
      setCurrentStep('Initializing with form data...')
      setIncorporationFilingNumber('')
      
      // Clear screenshot states for new automation
      setCurrentScreenshot(null)
      setScreenshotDescription('')
      setScreenshots([])
      setScreenshotDescriptions([])
      
      // Update status to in_progress immediately
      updateRequirementStatus(1, 'in_progress')

      // Initialize Socket.IO connection if not already connected
      if (!socketRef.current || !socketRef.current.connected) {
        socketRef.current = io('http://52.14.241.41', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        })
      }

      // Set up event listeners
      socketRef.current.on('connect', () => {
        console.log('🔌 Connected for form-data automation')
      })

      socketRef.current.on('progress', (data) => {
        setRealTimeUpdates(prev => [...prev, data])
        setCurrentStep(data.message)
        
        if (data.session_id) {
          setSessionId(data.session_id)
          setLiveViewUrl(`https://www.browserbase.com/sessions/${data.session_id}`)
          setLiveViewAvailable(true)
        }
      })

      socketRef.current.on('screenshot_stream', (data) => {
        console.log('📸 Screenshot update (form data):', data.description)
        console.log('Screenshot data received (form data):', {
          hasImage: !!data.image,
          imageType: typeof data.image,
          imageLength: data.image?.length,
          description: data.description,
          timestamp: data.timestamp,
          startsWithData: data.image?.startsWith('data:')
        })
        setCurrentScreenshot(data.image)
        setScreenshotDescription(data.description)
        
        // Add to history
        setScreenshots(prev => {
          const newArray = [...prev, data.image]
          console.log('📷 Screenshots array (form data) updated, now has:', newArray.length, 'items')
          return newArray
        })
        setScreenshotDescriptions(prev => [...prev, data.description])
      })

      socketRef.current.on('final_result', (data) => {
        if (data.success) {
          setIncorporationStatus('success')
          setIncorporationMessage('🎉 LLC incorporation completed successfully!')
          setIncorporationFilingNumber(data.filing_number || '')
          updateRequirementStatus(1, 'completed')
        } else {
          setIncorporationStatus('error')
          setIncorporationMessage(data.error || 'Automation failed')
          updateRequirementStatus(1, 'not_started')
        }
      })

      // Initialize Socket.IO connection if not already connected
      if (!socketRef.current || !socketRef.current.connected) {
        socketRef.current = io('http://52.14.241.41', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        })
      }

      // Add initial connection logs
      setRealTimeUpdates(prev => [...prev, {
        step: 'connecting',
        message: 'Connecting to automation server...',
        status: 'loading',
        timestamp: new Date().toISOString()
      }])

      setTimeout(() => {
        setRealTimeUpdates(prev => [...prev, {
          step: 'initializing',
          message: 'Initializing LLC automation...',
          status: 'loading',
          timestamp: new Date().toISOString()
        }])
      }, 500)

      // Start the real-time automation with complete form data
      const response = await fetch('http://52.14.241.41/incorporate-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Basic business info
          businessName: incorporationFormData.businessName,
          businessPurpose: incorporationFormData.businessPurpose,
          
          // Company address
          companyAddress1: incorporationFormData.companyAddress1,
          companyAddress2: incorporationFormData.companyAddress2,
          companyCity: incorporationFormData.companyCity,
          companyState: incorporationFormData.companyState,
          companyZipCode: incorporationFormData.companyZipCode,
          
          // SOS credentials
          sosClientId: incorporationFormData.sosClientId,
          sosPassword: incorporationFormData.sosPassword,
          
          // Payment info
          cardNumber: incorporationFormData.cardNumber,
          expirationMonth: incorporationFormData.expirationMonth,
          expirationYear: incorporationFormData.expirationYear,
          cvv: incorporationFormData.cvv,
          
          // Registered agent
          agentFirstName: incorporationFormData.agentFirstName,
          agentLastName: incorporationFormData.agentLastName,
          agentAddress1: incorporationFormData.agentAddress1,
          agentAddress2: incorporationFormData.agentAddress2,
          agentCity: incorporationFormData.agentCity,
          agentState: incorporationFormData.agentState,
          agentZipCode: incorporationFormData.agentZipCode,
          
          // Static fields (for backend reference)
          managingEntity: incorporationFormData.managingEntity,
          filingParty: incorporationFormData.filingParty
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to start automation')
      }

      // TODO: Remove this message as requested by user
      
    } catch (error) {
      console.error('Form automation start error:', error)
      setIncorporationStatus('error')
      setIncorporationMessage(error instanceof Error ? error.message : 'Failed to start automation')
      updateRequirementStatus(1, 'not_started')
    }
  }

  // Screenshot slideshow functions
  const openScreenshotSlideshow = (index: number = screenshots.length - 1) => {
    const targetIndex = Math.max(0, index)
    console.log('🖼️ Opening screenshot slideshow:', {
      totalScreenshots: screenshots.length,
      requestedIndex: index,
      targetIndex,
      currentScreenshot: !!currentScreenshot,
      screenshots: screenshots.map((s, i) => ({
        index: i,
        hasImage: !!s,
        imageType: typeof s,
        imageLength: s?.length,
        startsWithData: s?.startsWith('data:'),
        description: screenshotDescriptions[i]
      }))
    })
    
    // Log the specific screenshot we're trying to show
    console.log('Current screenshot to display:', screenshots[targetIndex]?.substring(0, 100))
    
    setCurrentSlideIndex(targetIndex)
    setShowScreenshotSlideshow(true)
  }

  const nextSlide = () => {
    setCurrentSlideIndex(prev => 
      prev < screenshots.length - 1 ? prev + 1 : prev
    )
  }

  const prevSlide = () => {
    setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : prev)
  }

  // SOS Signup functions
  const isSosSignupFormValid = () => {
    const requiredFields = [
      'businessName', 'address1', 'city', 'zipCode', 'phone', 'email',
      'password', 'confirmPassword', 'cardNumber', 'expirationMonth',
      'expirationYear', 'cvv', 'billingBusinessName'
    ]
    
    return requiredFields.every(field => {
      const value = sosSignupFormData[field as keyof typeof sosSignupFormData]
      return value && value.toString().trim().length > 0
    }) && sosSignupFormData.password === sosSignupFormData.confirmPassword
  }

  const startSosSignupAutomation = async () => {
    if (!isSosSignupFormValid()) {
      setSosSignupMessage('Please fill in all required fields and ensure passwords match.')
      setSosSignupStatus('error')
      return
    }

    try {
      setSosSignupStatus('loading')
      setSosSignupMessage('Starting SOS account signup automation...')
      
      const response = await fetch('http://52.14.241.41/sos-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: sosSignupFormData.businessName,
          address1: sosSignupFormData.address1,
          city: sosSignupFormData.city,
          zip_code: sosSignupFormData.zipCode,
          phone: sosSignupFormData.phone,
          email: sosSignupFormData.email,
          web_password: sosSignupFormData.password,
          web_password2: sosSignupFormData.confirmPassword,
          cc_number: sosSignupFormData.cardNumber,
          expiration_month: sosSignupFormData.expirationMonth,
          expiration_year: sosSignupFormData.expirationYear,
          cvv2: sosSignupFormData.cvv,
          c_business_name: sosSignupFormData.billingBusinessName
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create SOS account')
      }

      setSosSignupStatus('success')
      setSosSignupMessage('🎉 SOS account created successfully! You can now use these credentials for LLC incorporation.')
      
      // Auto-fill the incorporation form with the new credentials
      setIncorporationFormData(prev => ({
        ...prev,
        sosClientId: result.client_id || sosSignupFormData.email,
        sosPassword: sosSignupFormData.password
      }))

      // Close the SOS signup modal after a delay
      setTimeout(() => {
        setShowSosSignup(false)
        setSosSignupStatus('idle')
        setSosSignupMessage('')
      }, 3000)

    } catch (error) {
      console.error('SOS signup error:', error)
      setSosSignupStatus('error')
      setSosSignupMessage(error instanceof Error ? error.message : 'Failed to create SOS account')
    }
  }

  const fillSosTestData = () => {
    setSosSignupFormData({
      businessName: 'ACME School',
      address1: '123 acme st',
      city: 'Austin',
      zipCode: '78701',
      phone: '5555555555',
      email: 'info@example.com',
      password: 'm_B9uMX#d3b#??#',
      confirmPassword: 'm_B9uMX#d3b#??#',
      cardNumber: '2221327646280673',
      expirationMonth: '9',
      expirationYear: '2036',
      cvv: '555',
      billingBusinessName: 'ACME School'
    })
    setSosSignupMessage('✅ Test data filled for SOS account signup!')
    setSosSignupStatus('idle')
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Heading className="text-2xl sm:text-3xl">Legal & Compliance</Heading>
        <p className="mt-2 text-zinc-500">
          Complete all legal requirements to establish your school
        </p>
      </div>

      {/* Requirements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {requirements.map((requirement) => {
          const Icon = requirement.icon
          return (
            <div
              key={requirement.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              onClick={() => {
                if (requirement.id === 1) { // LLC Incorporation
                  setShowIncorporationChoice(true)
                } else {
                  setSelectedRequirement(requirement)
                }
              }}
            >
              <div className="flex items-start justify-between mb-4 flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-zinc-900">{requirement.title}</h3>
                    <p className="text-sm text-zinc-600 mt-1">{requirement.description}</p>
                  </div>
                </div>
                {getStatusIcon(requirement.status)}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  {getPriorityBadge(requirement.priority)}
                  <span className="text-sm text-zinc-500 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {requirement.timeline}
                  </span>
                  <span className="text-sm text-zinc-500">• {requirement.category}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Requirement Detail Modal - Rebuilt */}
      {selectedRequirement && !showIncorporationForm && !showIncorporationChoice && !showManualInstructions && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setSelectedRequirement(null)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-600 to-slate-700 rounded-t-xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <selectedRequirement.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedRequirement.title}</h2>
                      <p className="text-gray-100 text-sm">{selectedRequirement.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequirement(null)}
                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Overview</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedRequirement.description}</p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority</span>
                    <div className="mt-1">{getPriorityBadge(selectedRequirement.priority)}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Timeline</span>
                    <div className="mt-1 font-medium text-gray-900">{selectedRequirement.timeline}</div>
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Required Documents</h3>
                  <div className="space-y-2">
                    {selectedRequirement.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium">{doc}</span>
                        </div>
                        <Button className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-gray-200 p-4 rounded-b-xl">
                <div className="flex gap-3">
                  <Button
                    onClick={() => setSelectedRequirement(null)}
                    className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleMarkAsStarted}
                  >
                    Mark as Started
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkAsComplete}
                  >
                    Mark as Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LLC Incorporation Form Modal - Rebuilt */}
      {showIncorporationForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowIncorporationForm(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BuildingOffice2Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Automated LLC Incorporation</h2>
                      <p className="text-blue-100 text-sm">Complete your LLC formation with automation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {liveViewAvailable && liveViewUrl && (
                      <Button
                        onClick={() => setShowLiveView(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm"
                      >
                        <ComputerDesktopIcon className="h-4 w-4" />
                        Watch Live
                      </Button>
                    )}
                    <button
                      onClick={() => {
                        setShowIncorporationForm(false)
                        setShowIncorporationChoice(true)
                      }}
                      className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-6">
                  {/* Status Message */}
                  {incorporationMessage && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${
                      incorporationStatus === 'success' ? 'bg-green-50 border border-green-200' :
                      incorporationStatus === 'error' ? 'bg-red-50 border border-red-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      {incorporationStatus === 'loading' ? (
                        <div className="h-5 w-5 mt-0.5 flex-shrink-0">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      ) : incorporationStatus === 'success' ? (
                        <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                      ) : (
                        <InformationCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">{incorporationMessage}</span>
                    </div>
                  )}

                  {/* Real-Time Progress */}
                  {(realTimeUpdates.length > 0 || currentStep) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <SparklesIcon className="h-5 w-5 text-blue-600" />
                          Automation Progress
                        </h4>
                        <button
                          onClick={() => setIsProgressMinimized(!isProgressMinimized)}
                          className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                          title={isProgressMinimized ? "Expand" : "Minimize"}
                        >
                          {isProgressMinimized ? (
                            <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                      
                      {!isProgressMinimized && (
                        <>
                          {realTimeUpdates.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {realTimeUpdates.slice().reverse().map((update, index) => (
                                <div key={`${update.step}-${index}`} className="flex items-start gap-2 text-sm">
                                  {update.status === 'completed' ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <div className="h-4 w-4 flex-shrink-0 mt-0.5"></div>
                                  )}
                                  <span className="text-gray-700">{update.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {incorporationFilingNumber && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                                <DocumentTextIcon className="h-4 w-4" />
                                Filing Number: {incorporationFilingNumber}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Live Screenshot */}
                  {currentScreenshot && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                          <ComputerDesktopIcon className="h-5 w-5 text-purple-600" />
                          Live Browser View
                        </h4>
                        <button
                          onClick={() => setIsScreenshotMinimized(!isScreenshotMinimized)}
                          className="p-1 hover:bg-purple-200 rounded-lg transition-colors"
                          title={isScreenshotMinimized ? "Expand" : "Minimize"}
                        >
                          {isScreenshotMinimized ? (
                            <ChevronDownIcon className="h-4 w-4 text-purple-600" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4 text-purple-600" />
                          )}
                        </button>
                      </div>
                      
                      {!isScreenshotMinimized && (
                        <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                          <div className="bg-purple-100 px-3 py-2 border-b border-purple-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-purple-800">Texas Secretary of State</span>
                              <div className="flex items-center gap-1 text-xs text-purple-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                LIVE
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <img 
                              src={currentScreenshot} 
                              alt="Live automation"
                              className="w-full h-auto max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                console.log('🔎 Screenshot clicked, opening slideshow')
                                console.log('Current screenshot history:', screenshots.length, 'items')
                                openScreenshotSlideshow()
                              }}
                            />
                            {screenshotDescription && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                                <p className="text-white text-sm">{screenshotDescription}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Introduction */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">🚀 Automated LLC Formation</h4>
                    <p className="text-blue-800 text-sm mb-3">
                      Our automation system will complete your Texas LLC incorporation process. 
                      Watch live as we navigate the Secretary of State portal and secure your registration.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-blue-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Automated SOS login
                      </div>
                      <div className="flex items-center gap-1 text-blue-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Real-time tracking
                      </div>
                      <div className="flex items-center gap-1 text-blue-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Secure payment
                      </div>
                      <div className="flex items-center gap-1 text-blue-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Complete filing
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-800 font-medium">
                      ⚡ Expected time: 2-5 minutes
                    </div>
                  </div>

                  {/* Form Sections */}
                  <div className="space-y-4">
                    {/* Business Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <BuildingOffice2Icon className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Business Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.businessName}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="Austin Sports Academy LLC"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Purpose
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.businessPurpose}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, businessPurpose: e.target.value }))}
                            placeholder="Sports training and educational services"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company Address */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <HomeIcon className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Company Address</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.companyAddress1}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, companyAddress1: e.target.value }))}
                            placeholder="123 Main Street"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apartment/Suite
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.companyAddress2}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, companyAddress2: e.target.value }))}
                            placeholder="Apt 100"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.companyCity}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                            placeholder="Austin"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.companyZipCode}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, companyZipCode: e.target.value }))}
                            placeholder="78701"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Texas SOS Account */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <LockClosedIcon className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Texas Secretary of State Account</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.sosClientId}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, sosClientId: e.target.value }))}
                            placeholder="Your SOS client ID"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="password"
                            value={incorporationFormData.sosPassword}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, sosPassword: e.target.value }))}
                            placeholder="Your SOS password"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800 mb-2">
                          🔒 Your credentials are used only for this filing and are not stored.
                        </p>
                        <p className="text-sm text-purple-700">
                          Don't have a SOS Account?{' '}
                          <button
                            onClick={() => setShowSosSignup(true)}
                            className="text-purple-600 hover:text-purple-800 underline font-medium"
                          >
                            We can help with that. Click here to get an automated registration.
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Payment Information</h3>
                        <span className="text-sm text-gray-500">(~$300 filing fee)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Credit Card Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.cardNumber}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                            placeholder="1234 5678 9012 3456"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Month <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={incorporationFormData.expirationMonth}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, expirationMonth: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            disabled={incorporationStatus === 'loading'}
                          >
                            <option value="">Month</option>
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Year <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={incorporationFormData.expirationYear}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, expirationYear: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            disabled={incorporationStatus === 'loading'}
                          >
                            <option value="">Year</option>
                            {Array.from({length: 15}, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.cvv}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, cvv: e.target.value }))}
                            placeholder="123"
                            maxLength={4}
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Registered Agent */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <IdentificationIcon className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Registered Agent</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.agentFirstName}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, agentFirstName: e.target.value }))}
                            placeholder="John"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.agentLastName}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, agentLastName: e.target.value }))}
                            placeholder="Smith"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.agentAddress1}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, agentAddress1: e.target.value }))}
                            placeholder="123 Agent Street"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.agentCity}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, agentCity: e.target.value }))}
                            placeholder="Austin"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={incorporationFormData.agentZipCode}
                            onChange={(e) => setIncorporationFormData(prev => ({ ...prev, agentZipCode: e.target.value }))}
                            placeholder="78701"
                            className="w-full"
                            disabled={incorporationStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Locked Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <LockClosedIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Pre-configured Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">Managing Entity</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Name:</strong> {incorporationFormData.managingEntity.name}</p>
                            <p><strong>Address:</strong> {incorporationFormData.managingEntity.address1}</p>
                            <p><strong>City:</strong> {incorporationFormData.managingEntity.city}, {incorporationFormData.managingEntity.state} {incorporationFormData.managingEntity.zipCode}</p>
                          </div>
                        </div>
                        <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">Filing Party</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Entity:</strong> {incorporationFormData.filingParty.name}</p>
                            <p><strong>Address:</strong> {incorporationFormData.filingParty.address}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-blue-800">
                        🔒 These fields are locked for consistency across all microschools
                      </div>
                    </div>

                    {/* Development Test Button */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-yellow-800 mb-1">Development Mode</h4>
                            <p className="text-sm text-yellow-700">Fill form with test data for faster testing</p>
                          </div>
                          <Button
                            onClick={fillTestData}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
                          >
                            Fill Test Data
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 rounded-b-xl">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowIncorporationForm(false)
                      setShowIncorporationChoice(true)
                    }}
                    className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    disabled={incorporationStatus === 'loading'}
                  >
                    Back to Options
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:bg-gray-400"
                    onClick={startIncorporationWithFormData}
                    disabled={incorporationStatus === 'loading' || !isFormValid()}
                  >
                    {incorporationStatus === 'loading' ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" />
                        Start
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LLC Incorporation Choice Modal - Rebuilt */}
      {showIncorporationChoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowIncorporationChoice(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full transform transition-all">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BuildingOffice2Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">LLC Incorporation</h2>
                      <p className="text-blue-100 text-sm">Choose your preferred method</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIncorporationChoice(false)}
                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Automated Option */}
                  <div 
                    className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => {
                      setShowIncorporationChoice(false)
                      setShowIncorporationForm(true)
                    }}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all">
                        <SparklesIcon className="h-8 w-8 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Automated Filing</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        Automated system handles your LLC incorporation directly with Texas Secretary of State.
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                          Complete automation
                        </div>
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                          Real-time progress
                        </div>
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                          2-5 minute completion
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          <SparklesIcon className="h-3 w-3" />
                          Recommended
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Option */}
                  <div 
                    className="group relative bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:border-gray-400 hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => {
                      setShowIncorporationChoice(false)
                      setShowManualInstructions(true)
                    }}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all">
                        <DocumentTextIcon className="h-8 w-8 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Manual Filing</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        Follow our step-by-step guide to file your LLC incorporation yourself.
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-center gap-2 text-gray-700">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          Complete control
                        </div>
                        <div className="flex items-center justify-center gap-2 text-gray-700">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          Step-by-step guide
                        </div>
                        <div className="flex items-center justify-center gap-2 text-gray-700">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          Learn the process
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                          <DocumentTextIcon className="h-3 w-3" />
                          Educational
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 text-center hidden"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Instructions Modal - Rebuilt */}
      {showManualInstructions && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowManualInstructions(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-600 to-slate-700 rounded-t-xl px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Manual LLC Incorporation Guide</h2>
                      <p className="text-gray-100 text-sm">Step-by-step instructions for Texas SOS filing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowManualInstructions(false)
                      setShowIncorporationChoice(true)
                    }}
                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-6">
                  {/* Introduction */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">Before You Begin</h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Make sure you have the following information ready:
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Texas Secretary of State account credentials</li>
                      <li>• Valid credit card for filing fees (~$300)</li>
                      <li>• Your desired LLC name (must end with "LLC")</li>
                      <li>• Registered agent information</li>
                      <li>• Business address information</li>
                    </ul>
                  </div>

                  {/* Standard Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 Standard Information for All Microschools</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Managing Entity:</strong> Texas Sports Academy, 4402 Hudson Bend Rd, Austin, TX 78734</p>
                      <p><strong>Organizer:</strong> Strata Schools LLC, 1705 Guadalupe St, Austin, TX, 78701</p>
                      <p className="mt-2 font-medium">Use these exact details for consistency across all microschool LLCs</p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Texas Secretary of State</h3>
                        <p className="text-gray-600 mb-3 text-sm">
                          Navigate to the Texas SOS business filing portal and log into your account.
                        </p>
                        <div className="bg-gray-50 p-3 rounded border">
                          <p className="text-sm font-medium text-gray-700">🔗 Website:</p>
                          <a 
                            href="https://direct.sos.state.tx.us/acct/acct-login.asp" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            https://direct.sos.state.tx.us/acct/acct-login.asp
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Navigate to Business Organizations</h3>
                        <p className="text-gray-600 text-sm">
                          After logging in, click on "Business Organizations" to access the LLC filing section.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select LLC Formation</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          Choose "Domestic Limited Liability Company (LLC)" and click "File Document".
                        </p>
                        <div className="bg-gray-50 p-3 rounded border text-sm">
                          <p><strong>Entity Type:</strong> Domestic Limited Liability Company (LLC)</p>
                          <p><strong>Document Type:</strong> Certificate of Formation</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Company Information</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          Fill in your LLC details including name, address, and purpose.
                        </p>
                        <div className="bg-gray-50 p-3 rounded border text-sm space-y-1">
                          <p>• LLC Name (must end with "LLC")</p>
                          <p>• Principal office address</p>
                          <p>• Business purpose</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        5
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Registered Agent</h3>
                        <p className="text-gray-600 text-sm">
                          Provide registered agent information - the person/company that will receive legal documents.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        6
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Managers/Members</h3>
                        <p className="text-gray-600 text-sm">
                          Add at least one manager or member to your LLC.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        7
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review and Submit</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          Review all information, proceed to payment, and submit your LLC formation.
                        </p>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-sm text-green-800">
                            ✅ After payment, you'll receive confirmation and your LLC will be officially formed!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 rounded-b-xl">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowManualInstructions(false)
                      setShowIncorporationChoice(true)
                    }}
                    className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Back to Options
                  </Button>
                  <Button
                    onClick={() => {
                      setShowManualInstructions(false)
                      updateRequirementStatus(1, 'completed')
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark as Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Live Browser View Modal - Rebuilt */}
      {showLiveView && liveViewUrl && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowLiveView(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-t-xl px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <ComputerDesktopIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Live Browser Automation</h2>
                      <p className="text-purple-100 text-sm">
                        Real-time LLC incorporation process
                        {sessionId && <span className="ml-2">• Session: {sessionId}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live
                    </div>
                    <button
                      onClick={() => setShowLiveView(false)}
                      className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 min-h-0">
                <div className="w-full h-full bg-gray-100 rounded-lg border border-gray-300 flex flex-col overflow-hidden">
                  {/* Browser Bar */}
                  <div className="p-3 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PlayIcon className="h-4 w-4" />
                        Browserbase Live Session
                      </div>
                      <a
                        href={liveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline font-medium"
                      >
                        Open in New Tab
                      </a>
                    </div>
                  </div>
                  
                  {/* Browser Frame */}
                  <div className="flex-1 relative min-h-0">
                    <iframe
                      src={liveViewUrl}
                      className="w-full h-full border-0"
                      title="Live Browser Automation"
                      sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    💡 <strong>Live View:</strong> Watch the automation navigate through the Texas Secretary of State portal in real-time.
                  </div>
                  <Button
                    onClick={() => setShowLiveView(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2"
                  >
                    Close Live View
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Screenshot Slideshow Modal - Simplified Test Version */}
      {showScreenshotSlideshow && screenshots.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
          <div className="flex h-full items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowScreenshotSlideshow(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              {/* Simple Header */}
              <div className="bg-purple-600 rounded-t-xl px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    Screenshot {currentSlideIndex + 1} of {screenshots.length}
                  </h2>
                  <button
                    onClick={() => setShowScreenshotSlideshow(false)}
                    className="text-white hover:text-gray-200 p-1"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Simple Image Display */}
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
                {screenshots[currentSlideIndex] ? (
                  <img 
                    src={screenshots[currentSlideIndex]} 
                    alt={`Screenshot ${currentSlideIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onLoad={() => console.log('✅ Image loaded successfully in slideshow')}
                    onError={() => console.error('❌ Image failed to load in slideshow')}
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500">No screenshot available</p>
                    <button 
                      onClick={() => {
                        console.log('Debug info:', {
                          currentSlideIndex,
                          totalScreenshots: screenshots.length,
                          currentScreenshot: screenshots[currentSlideIndex]?.substring(0, 50)
                        })
                      }}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Debug Info
                    </button>
                  </div>
                )}
              </div>

              {/* Simple Navigation */}
              <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center">
                <button
                  onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  {screenshotDescriptions[currentSlideIndex] || 'No description'}
                </span>
                
                <button
                  onClick={() => setCurrentSlideIndex(prev => Math.min(screenshots.length - 1, prev + 1))}
                  disabled={currentSlideIndex === screenshots.length - 1}
                  className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOS Account Signup Modal */}
      {showSosSignup && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowSosSignup(false)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-xl px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <LockClosedIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Texas SOS Account Signup</h2>
                      <p className="text-purple-100 text-sm">Automated account creation with the Secretary of State</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSosSignup(false)}
                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-6">
                  {/* Status Message */}
                  {sosSignupMessage && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${
                      sosSignupStatus === 'success' ? 'bg-green-50 border border-green-200' :
                      sosSignupStatus === 'error' ? 'bg-red-50 border border-red-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      {sosSignupStatus === 'loading' ? (
                        <div className="h-5 w-5 mt-0.5 flex-shrink-0">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        </div>
                      ) : sosSignupStatus === 'success' ? (
                        <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                      ) : (
                        <InformationCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">{sosSignupMessage}</span>
                    </div>
                  )}

                  {/* Introduction */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">🚀 Automated SOS Account Creation</h4>
                    <p className="text-purple-800 text-sm mb-3">
                      Our automation will create your Texas Secretary of State account automatically. 
                      This account will be needed for LLC incorporation and future business filings.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-purple-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Automated form filling
                      </div>
                      <div className="flex items-center gap-1 text-purple-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Secure payment
                      </div>
                      <div className="flex items-center gap-1 text-purple-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Account activation
                      </div>
                      <div className="flex items-center gap-1 text-purple-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        Instant verification
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-purple-800 font-medium">
                      ⚡ Expected time: 2-3 minutes
                    </div>
                  </div>

                  {/* Form Sections */}
                  <div className="space-y-4">
                    {/* Business Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <BuildingOffice2Icon className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Business Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.businessName}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="ACME School"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.phone}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="5555555555"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Address */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <HomeIcon className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Business Address</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.address1}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, address1: e.target.value }))}
                            placeholder="123 acme st"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.city}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Austin"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.zipCode}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                            placeholder="78701"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Account Credentials */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <IdentificationIcon className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Account Credentials</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="email"
                            value={sosSignupFormData.email}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="info@example.com"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div></div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="password"
                            value={sosSignupFormData.password}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Choose a strong password"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="password"
                            value={sosSignupFormData.confirmPassword}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your password"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Payment Information</h3>
                        <span className="text-sm text-gray-500">(Account setup fee)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Credit Card Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.cardNumber}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                            placeholder="2221327646280673"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Month <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={sosSignupFormData.expirationMonth}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, expirationMonth: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            disabled={sosSignupStatus === 'loading'}
                          >
                            <option value="">Month</option>
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Year <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={sosSignupFormData.expirationYear}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, expirationYear: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            disabled={sosSignupStatus === 'loading'}
                          >
                            <option value="">Year</option>
                            {Array.from({length: 15}, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.cvv}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, cvv: e.target.value }))}
                            placeholder="555"
                            maxLength={4}
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Billing Business Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={sosSignupFormData.billingBusinessName}
                            onChange={(e) => setSosSignupFormData(prev => ({ ...prev, billingBusinessName: e.target.value }))}
                            placeholder="ACME School"
                            className="w-full"
                            disabled={sosSignupStatus === 'loading'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-gray-200 p-4 rounded-b-xl flex-shrink-0">
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowSosSignup(false)}
                    className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    disabled={sosSignupStatus === 'loading'}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={fillSosTestData}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6"
                    disabled={sosSignupStatus === 'loading'}
                  >
                    Fill Test Data
                  </Button>
                  <Button
                    onClick={startSosSignupAutomation}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!isSosSignupFormValid() || sosSignupStatus === 'loading'}
                  >
                    {sosSignupStatus === 'loading' ? 'Creating Account...' : 'Create SOS Account'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 