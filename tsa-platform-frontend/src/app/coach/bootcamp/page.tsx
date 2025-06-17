'use client'

import { useState, useEffect } from 'react'
import { Heading, Subheading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { 
  PlayCircleIcon, 
  DocumentTextIcon, 
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  LockClosedIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import { PlayIcon, ArrowRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-2.amazonaws.com/prod'

// Types for better TypeScript support
interface BootcampModule {
  id: number
  title: string
  description: string
  type: 'video' | 'quiz'
  duration: number
  questions?: number
  status: 'completed' | 'current' | 'available' | 'locked'
  locked: boolean
  module: string
  prerequisites?: number[]
}

interface BootcampProgress {
  coach_id: string
  enrollment_date: string
  completion_percentage: number
  total_hours_completed: number
  current_module: number | null
  modules_completed: any[]
  quiz_attempts: any[]
  certifications_earned: string[]
  video_progress: Record<string, any>
  available_modules: number[]
  next_module: number | null
  statistics: {
    modules_completed: number
    total_modules: number
    video_modules_completed: number
    quiz_modules_completed: number
    completion_percentage: number
    total_hours_completed: number
    quiz_statistics: {
      total_attempts: number
      passed_quizzes: number
      average_score: number
    }
    certifications_earned: number
    enrollment_date: string | null
    last_activity: string | null
  }
}

// Helper function to format duration from seconds to human readable
const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

// Helper function to get status based on module state
const getModuleStatus = (moduleData: any, currentModule: number | null, availableModules: number[], completedModules: number[]): 'completed' | 'current' | 'available' | 'locked' => {
  // Mark module 1 as completed for demo purposes
  if (moduleData.id === 1) return 'completed'
  
  // Check localStorage for completed modules
  if (completedModules.includes(moduleData.id)) return 'completed'
  
  if (moduleData.completed) return 'completed'
  if (moduleData.id === currentModule) return 'current'
  if (availableModules.includes(moduleData.id)) return 'available'
  return 'locked'
}

// Sample modules data (moved outside component to avoid useEffect dependency issues)
const sampleModules: BootcampModule[] = [
  {
    id: 1,
    title: 'Introduction to TimeBack Learning',
    description: 'Learn the fundamentals of our revolutionary educational approach',
    type: 'video',
    duration: 1800, // 30 minutes
    status: 'completed', // Marked as completed for demo
    locked: false,
    module: 'Core Concepts'
  },
  {
    id: 2,
    title: 'TimeBack Learning Fundamentals Quiz',
    description: 'Test your understanding of the TimeBack Learning methodology',
    type: 'quiz',
    duration: 900, // 15 minutes
    questions: 5,
    status: 'available',
    locked: false,
    module: 'Core Concepts',
    prerequisites: [1]
  },
  {
    id: 3,
    title: 'Implementing Sports-Based Learning',
    description: 'How to integrate academic concepts with physical activities',
    type: 'video',
    duration: 2400, // 40 minutes
    status: 'locked',
    locked: true,
    module: 'Implementation',
    prerequisites: [1, 2]
  },
  {
    id: 4,
    title: 'Assessment Strategies Quiz',
    description: 'Master performance-based assessment techniques',
    type: 'quiz',
    duration: 1200, // 20 minutes
    questions: 8,
    status: 'locked',
    locked: true,
    module: 'Implementation',
    prerequisites: [3]
  },
  {
    id: 5,
    title: 'Creating Learning Environments',
    description: 'Design flexible spaces that support movement-based learning',
    type: 'video',
    duration: 1800, // 30 minutes
    status: 'locked',
    locked: true,
    module: 'Environment Design',
    prerequisites: [4]
  }
]

// Certification Tests Data
const certificationTests = [
  {
    id: 1,
    title: "Coaching Fundamentals",
    description: "Essential principles of youth coaching and mentorship",
    duration: "45 minutes",
    questions: 25,
    passingScore: 80,
    status: "available",
    categories: ["Leadership", "Communication", "Child Development"]
  },
  {
    id: 2,
    title: "Sports Training Methodology",
    description: "Evidence-based approaches to athletic development",
    duration: "60 minutes",
    questions: 30,
    passingScore: 80,
    status: "locked",
    prerequisites: [1],
    categories: ["Exercise Science", "Training Principles", "Skill Development"]
  },
  {
    id: 3,
    title: "Academic Integration",
    description: "Blending sports with educational curriculum",
    duration: "50 minutes",
    questions: 28,
    passingScore: 80,
    status: "locked",
    prerequisites: [1, 2],
    categories: ["Curriculum Design", "Learning Theory", "Assessment"]
  },
  {
    id: 4,
    title: "Safety & Risk Management",
    description: "Ensuring safe environments for student-athletes",
    duration: "40 minutes",
    questions: 20,
    passingScore: 90,
    status: "locked",
    prerequisites: [1],
    categories: ["Safety Protocols", "Emergency Response", "Legal Compliance"]
  },
  {
    id: 5,
    title: "Final Certification Exam",
    description: "Comprehensive assessment of all coaching competencies",
    duration: "90 minutes",
    questions: 50,
    passingScore: 85,
    status: "locked",
    prerequisites: [1, 2, 3, 4],
    categories: ["Comprehensive Assessment"]
  }
]

export default function TimebackLearning() {
  const [bootcampData, setBootcampData] = useState<BootcampProgress | null>(null)
  const [modules, setModules] = useState<BootcampModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingModule, setStartingModule] = useState<number | null>(null)
  const [startingFromCurrentStep, setStartingFromCurrentStep] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [completedModules, setCompletedModules] = useState<number[]>([])
  const [completedTests, setCompletedTests] = useState<number[]>([])
  const [testScores, setTestScores] = useState<{[key: number]: number}>({})
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Get coach ID from auth context
  useEffect(() => {
    try {
      const user = getCurrentUser()
      if (user?.email) {
        setCoachId(user.email) // Use email as coach identifier
      } else {
        setError('Authentication required. Please log in again.')
      }
    } catch (err) {
      console.error('Error getting authenticated user:', err)
      setError('Authentication error. Please log in again.')
    }
  }, [])

  // Load completed modules from localStorage
  useEffect(() => {
    const bootcampProgress = JSON.parse(localStorage.getItem('bootcampProgress') || '{}')
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes') || '{}')
    
    // Combine completed modules from bootcamp progress and quiz completions
    const allCompleted = [...(bootcampProgress.completedModules || []), 1] // Mark module 1 as completed
    
    // Add completed quizzes to the list
    Object.keys(completedQuizzes).forEach(quizId => {
      if (completedQuizzes[quizId].completed) {
        allCompleted.push(parseInt(quizId))
      }
    })
    
    // Remove duplicates using Array.from instead of spread operator
    setCompletedModules(Array.from(new Set(allCompleted)))
  }, [])

  // Load API endpoint from SSM
  useEffect(() => {
    try {
      const url = getCoachApiUrl();
      setApiBaseUrl(url);
    } catch (error) {
      console.error('Failed to load API endpoint:', error);
    }
  }, [])

  useEffect(() => {
    if (apiBaseUrl) {
      loadBootcampProgress()
    }
  }, [apiBaseUrl])

  const loadBootcampProgress = async () => {
    if (!apiBaseUrl) return

    try {
      setLoading(true)
      const user = getCurrentUser()
      if (!user?.email) {
        console.error('No user email available')
        return
      }

      const response = await fetch(`${apiBaseUrl}/bootcamp/progress`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user.token ? `Bearer ${user.token}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCompletedTests(data.completed_tests || [])
        setTestScores(data.test_scores || {})
      } else {
        console.error('Failed to load bootcamp progress')
      }
    } catch (error) {
      console.error('Error loading bootcamp progress:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch bootcamp progress and modules
  useEffect(() => {
    const fetchBootcampData = async () => {
      if (!coachId) return

      try {
        setLoading(true)
        setError(null)

        // For demo purposes, use sample data instead of API
        // In production, you would fetch from the API
        const mockProgress: BootcampProgress = {
          coach_id: coachId,
          enrollment_date: new Date().toISOString(),
          completion_percentage: 20, // 1 out of 5 modules completed
          total_hours_completed: 0.5,
          current_module: 2,
          modules_completed: [1], // Module 1 completed
          quiz_attempts: [],
          certifications_earned: [],
          video_progress: {},
          available_modules: [1, 2],
          next_module: 2,
          statistics: {
            modules_completed: 1,
            total_modules: 5,
            video_modules_completed: 1,
            quiz_modules_completed: 0,
            completion_percentage: 20,
            total_hours_completed: 0.5,
            quiz_statistics: {
              total_attempts: 0,
              passed_quizzes: 0,
              average_score: 0
            },
            certifications_earned: 0,
            enrollment_date: new Date().toISOString(),
            last_activity: new Date().toISOString()
          }
        }

        // Update modules with completion status
        const updatedModules = sampleModules.map(module => {
          const isCompleted = completedModules.includes(module.id)
          const hasPrerequisites = module.prerequisites?.every(prereq => completedModules.includes(prereq)) ?? true
          
          return {
            ...module,
            status: getModuleStatus(
              module, 
              mockProgress.current_module, 
              mockProgress.available_modules || [], 
              completedModules
            ),
            locked: !hasPrerequisites || (module.id > 2 && !completedModules.includes(2)) // Unlock quiz after completing intro
          }
        })

        setBootcampData(mockProgress)
        setModules(updatedModules)
      } catch (err) {
        console.error('Error setting up bootcamp data:', err)
        setError('Failed to load bootcamp data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchBootcampData()
  }, [coachId, completedModules])

  // Start a module
  const handleStartModule = async (moduleId: number, fromCurrentStep: boolean = false) => {
    if (!coachId) {
      setError('Authentication required. Please log in again.')
      return
    }

    try {
      setStartingModule(moduleId)
      setStartingFromCurrentStep(fromCurrentStep)
      
      // Navigate to the appropriate page based on module type
      const targetModule = modules.find(m => m.id === moduleId)
      if (targetModule) {
        if (targetModule.type === 'video') {
          // For now, just mark video modules as completed immediately for demo
          alert(`Video module "${targetModule.title}" would start here. For demo purposes, this will be marked as completed.`)
          
          // Mark as completed in localStorage
          const bootcampProgress = JSON.parse(localStorage.getItem('bootcampProgress') || '{}')
          if (!bootcampProgress.completedModules) {
            bootcampProgress.completedModules = []
          }
          if (!bootcampProgress.completedModules.includes(moduleId)) {
            bootcampProgress.completedModules.push(moduleId)
          }
          localStorage.setItem('bootcampProgress', JSON.stringify(bootcampProgress))
          
          // Refresh the page to show updated status
          window.location.reload()
        } else if (targetModule.type === 'quiz') {
          window.location.href = `/coach/bootcamp/quiz/${moduleId}`
        }
      }
    } catch (err) {
      console.error('Error starting module:', err)
      alert('Failed to start module. Please try again.')
    } finally {
      setStartingModule(null)
      setStartingFromCurrentStep(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a67b3] mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading your bootcamp progress...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  // Calculate progress
  const completedSteps = modules.filter(moduleItem => moduleItem.status === 'completed').length
  const totalSteps = modules.length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  // Group modules by module name
  const moduleGroups = modules.reduce((acc, moduleItem) => {
    const groupName = moduleItem.module || 'Other'
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(moduleItem)
    return acc
  }, {} as Record<string, BootcampModule[]>)

  // Find current and next modules
  const currentModule = modules.find(moduleItem => moduleItem.status === 'current')
  const nextModule = modules.find(moduleItem => moduleItem.status === 'available' && !moduleItem.locked)

  return (
    <>
      {/* Header with Progress */}
      <div className="mb-8">
        <Heading className="text-2xl sm:text-3xl">Coach Bootcamp</Heading>
        <p className="mt-2 text-zinc-500">
          Complete the comprehensive training program to become a certified Texas Sports Academy coach
        </p>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">Progress</span>
            <span className="text-zinc-900 font-medium">{completedSteps} of {totalSteps} completed ({progressPercent}%)</span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#1a67b3] h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {bootcampData?.total_hours_completed && bootcampData.total_hours_completed > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              {bootcampData.total_hours_completed.toFixed(1)} hours completed
            </p>
          )}
        </div>
      </div>

      {/* Current Step - Full Width */}
      {(currentModule || nextModule) && (
        <div className="bg-gradient-to-r from-[#1a67b3]/10 to-[#1a67b3]/5 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge color="blue" className="mb-3">
                {currentModule ? 'Current Step' : 'Next Step'}
              </Badge>
              <h2 className="text-2xl font-semibold text-zinc-900 mb-2">
                {(currentModule || nextModule)?.title}
              </h2>
              <p className="text-lg text-zinc-600 mb-4">
                {(currentModule || nextModule)?.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                {(currentModule || nextModule)?.type === 'video' ? (
                  <>
                    <span className="flex items-center">
                      <PlayCircleIcon className="h-4 w-4 mr-1" />
                      Video Lesson
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDuration((currentModule || nextModule)?.duration || 0)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center">
                      <PuzzlePieceIcon className="h-4 w-4 mr-1" />
                      Quiz
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDuration((currentModule || nextModule)?.duration || 0)}
                    </span>
                    <span>{(currentModule || nextModule)?.questions} questions</span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-8 flex items-center">
              {startingModule === (currentModule || nextModule)?.id && startingFromCurrentStep ? (
                <div className="flex items-center justify-center w-24 h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a67b3]"></div>
                </div>
              ) : (
                <button
                  onClick={() => handleStartModule((currentModule || nextModule)?.id!, true)}
                  className="group"
                >
                  <PlayCircleIcon className="h-24 w-24 text-[#1a67b3] hover:text-[#1a67b3]/80 cursor-pointer transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Learning Path */}
      <div className="space-y-8">
        {Object.entries(moduleGroups).map(([moduleName, moduleList]) => (
          <div key={moduleName}>
            <Subheading className="text-xl mb-4">{moduleName}</Subheading>
            <div className="space-y-3">
              {moduleList.map((moduleItem) => (
                <div
                  key={moduleItem.id}
                  className={`border rounded-lg p-4 transition-all ${
                    moduleItem.status === 'completed' 
                      ? 'bg-green-50 border-green-200' 
                      : moduleItem.status === 'current'
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : moduleItem.locked || moduleItem.status === 'locked'
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center">
                    {/* Step number or status icon */}
                    <div className="flex-shrink-0 mr-4">
                      {moduleItem.status === 'completed' ? (
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="h-6 w-6 text-white" />
                        </div>
                      ) : moduleItem.locked || moduleItem.status === 'locked' ? (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <LockClosedIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          moduleItem.status === 'current' ? 'bg-[#1a67b3] text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {moduleItem.id}
                        </div>
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-medium text-zinc-900">{moduleItem.title}</h4>
                          <p className="text-sm text-zinc-600 mt-1">{moduleItem.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center">
                              {moduleItem.type === 'video' ? (
                                <PlayCircleIcon className="h-4 w-4 mr-1" />
                              ) : (
                                <PuzzlePieceIcon className="h-4 w-4 mr-1" />
                              )}
                              {moduleItem.type === 'video' ? 'Video' : 'Quiz'}
                            </span>
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {formatDuration(moduleItem.duration || 0)}
                            </span>
                            {moduleItem.type === 'quiz' && moduleItem.questions && (
                              <span>{moduleItem.questions} questions</span>
                            )}
                          </div>
                        </div>
                        {!moduleItem.locked && moduleItem.status !== 'completed' && moduleItem.status !== 'locked' && (
                          <div className="ml-4 flex items-center">
                            {startingModule === moduleItem.id && !startingFromCurrentStep ? (
                              <div className="flex items-center justify-center w-12 h-12">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a67b3]"></div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartModule(moduleItem.id, false)}
                                className="group"
                              >
                                  <PlayCircleIcon className="h-12 w-12 text-[#1a67b3] hover:text-[#1a67b3]/80 cursor-pointer transition-colors" />
                              </button>
                                )}
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Certifications Earned */}
      {bootcampData?.certifications_earned && bootcampData.certifications_earned.length > 0 && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
            <AcademicCapIcon className="h-5 w-5 mr-2" />
            Certifications Earned
          </h3>
          <div className="space-y-2">
            {bootcampData.certifications_earned.map((cert: string, index: number) => (
              <div key={index} className="flex items-center text-green-700">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {cert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certification Preview */}
      <div className="mt-12 bg-gradient-to-r from-[#1a67b3] to-[#1a67b3]/80 rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold mb-2">Earn Your Coach Certification</h3>
            <p className="text-white/80 mb-4">
              Complete all modules and pass the final assessment to receive your official Texas Sports Academy coaching certification.
              This certification validates your expertise in implementing our educational sports programs.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Valid for 2 years
              </div>
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Digital certificate
              </div>
              {bootcampData?.statistics && (
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  {bootcampData.statistics.modules_completed} of {bootcampData.statistics.total_modules} completed
                </div>
              )}
            </div>
          </div>
          <div className="ml-8 flex-shrink-0">
            <div className="w-32 h-32 bg-white/20 rounded-lg flex items-center justify-center">
              <AcademicCapIcon className="h-20 w-20 text-white/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && bootcampData && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <pre className="overflow-auto">{JSON.stringify({ bootcampData, modules }, null, 2)}</pre>
        </div>
      )}
    </>
  )
} 