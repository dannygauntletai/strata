'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getCoachApiUrl } from '@/lib/ssm-config'

// API endpoint loaded from SSM - unused in this component currently

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface QuizData {
  id: number
  title: string
  description: string
  duration: number
  questions: Question[]
  passingScore: number
}

// Sample quiz data - in a real app this would come from an API
const sampleQuizzes: Record<string, QuizData> = {
  '2': {
    id: 2,
    title: 'TimeBack Learning Fundamentals Quiz',
    description: 'Test your understanding of the TimeBack Learning methodology and core principles.',
    duration: 900, // 15 minutes
    passingScore: 80,
    questions: [
      {
        id: 1,
        question: 'What is the core principle of TimeBack Learning?',
        options: [
          'Traditional classroom instruction',
          'Student-led discovery and hands-on experience',
          'Memorization and repetition',
          'Teacher-centered lectures'
        ],
        correctAnswer: 1,
        explanation: 'TimeBack Learning emphasizes student-led discovery and hands-on experience to make learning more engaging and effective.'
      },
      {
        id: 2,
        question: 'How does TimeBack Learning integrate with sports education?',
        options: [
          'It replaces physical activity with academics',
          'It separates academic and athletic training',
          'It combines learning through physical movement and sports activities',
          'It focuses only on sports skills'
        ],
        correctAnswer: 2,
        explanation: 'TimeBack Learning integrates academic concepts with physical movement and sports activities for holistic education.'
      },
      {
        id: 3,
        question: 'What role does the coach play in TimeBack Learning?',
        options: [
          'Passive observer',
          'Sole source of knowledge',
          'Facilitator and guide',
          'Strict disciplinarian'
        ],
        correctAnswer: 2,
        explanation: 'In TimeBack Learning, coaches act as facilitators and guides, helping students discover and learn through experience.'
      },
      {
        id: 4,
        question: 'Which assessment method is most aligned with TimeBack Learning?',
        options: [
          'Multiple choice tests only',
          'Performance-based assessments and portfolios',
          'Standardized testing',
          'Memorization quizzes'
        ],
        correctAnswer: 1,
        explanation: 'Performance-based assessments and portfolios better reflect the experiential nature of TimeBack Learning.'
      },
      {
        id: 5,
        question: 'How should learning spaces be designed for TimeBack Learning?',
        options: [
          'Traditional rows of desks',
          'Flexible, movement-friendly environments',
          'Individual isolated workstations',
          'Lecture hall style seating'
        ],
        correctAnswer: 1,
        explanation: 'TimeBack Learning requires flexible, movement-friendly environments that support various activities and learning styles.'
      }
    ]
  }
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const [coachId, setCoachId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const quizId = params.id as string

  // Get coach ID from auth context
  useEffect(() => {
    try {
      const user = getCurrentUser()
      if (user?.email) {
        setCoachId(user.email)
      }
    } catch (err) {
      console.error('Error getting authenticated user:', err)
    }
  }, [])

  // Load quiz data
  useEffect(() => {
    if (quizId && sampleQuizzes[quizId]) {
      setQuiz(sampleQuizzes[quizId])
      setTimeRemaining(sampleQuizzes[quizId].duration)
      
      // Check if quiz was already completed
      const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes') || '{}')
      if (completedQuizzes[quizId]) {
        setQuizCompleted(true)
      }
    }
  }, [quizId])

  const handleSubmitQuiz = useCallback(() => {
    if (!quiz) return

    // Calculate score
    const correctAnswers = answers.reduce((count, answer, index) => {
      return answer === quiz.questions[index].correctAnswer ? count + 1 : count
    }, 0)

    const calculatedScore = Math.round((correctAnswers / quiz.questions.length) * 100)
    setScore(calculatedScore)
    setShowResults(true)

    // Cache completion in localStorage
    if (calculatedScore >= quiz.passingScore) {
      const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes') || '{}')
      completedQuizzes[quizId] = {
        completed: true,
        score: calculatedScore,
        completedAt: new Date().toISOString(),
        coachId
      }
      localStorage.setItem('completedQuizzes', JSON.stringify(completedQuizzes))

      // Also update bootcamp progress in localStorage
      const bootcampProgress = JSON.parse(localStorage.getItem('bootcampProgress') || '{}')
      if (!bootcampProgress.completedModules) {
        bootcampProgress.completedModules = []
      }
      if (!bootcampProgress.completedModules.includes(parseInt(quizId))) {
        bootcampProgress.completedModules.push(parseInt(quizId))
      }
      localStorage.setItem('bootcampProgress', JSON.stringify(bootcampProgress))

      setQuizCompleted(true)
    }
  }, [quiz, answers, quizId, coachId])

  // Timer effect
  useEffect(() => {
    if (quizStarted && !showResults && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [quizStarted, showResults, timeRemaining, handleSubmitQuiz])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartQuiz = () => {
    setQuizStarted(true)
    setAnswers(new Array(quiz!.questions.length).fill(-1))
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = answerIndex
    setAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quiz!.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleReturnToBootcamp = () => {
    router.push('/coach/bootcamp')
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a67b3] mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (quizCompleted && !quizStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <Heading className="text-2xl text-green-800 mb-2">Quiz Already Completed!</Heading>
          <p className="text-zinc-600 mb-6">
            You have already successfully completed this quiz. You can retake it if you'd like to improve your score.
          </p>
          <div className="space-x-4">
            <Button onClick={handleStartQuiz} color="blue">
              Retake Quiz
            </Button>
            <Button onClick={handleReturnToBootcamp} color="zinc" className="bg-gray-200">
              Return to Bootcamp
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz intro screen
  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button 
            onClick={handleReturnToBootcamp} 
            color="zinc"
            className="mb-4 bg-gray-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Bootcamp
          </Button>
          <Heading className="text-2xl sm:text-3xl">{quiz.title}</Heading>
          <p className="mt-2 text-zinc-600">{quiz.description}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Quiz Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-zinc-500" />
              <span>{Math.round(quiz.duration / 60)} minutes</span>
            </div>
            <div className="flex items-center">
              <AcademicCapIcon className="h-4 w-4 mr-2 text-zinc-500" />
              <span>{quiz.questions.length} questions</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-2 text-zinc-500" />
              <span>{quiz.passingScore}% to pass</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Answer all questions to the best of your ability</li>
            <li>• You can navigate between questions using the Previous/Next buttons</li>
            <li>• Your progress is automatically saved</li>
            <li>• You need {quiz.passingScore}% or higher to pass</li>
            <li>• The quiz will auto-submit when time expires</li>
          </ul>
        </div>

        <Button onClick={handleStartQuiz} color="blue" className="w-full">
          Start Quiz
        </Button>
      </div>
    )
  }

  // Results screen
  if (showResults) {
    const passed = score >= quiz.passingScore
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-8">
          {passed ? (
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
          
          <Heading className={`text-2xl mb-2 ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {passed ? 'Congratulations!' : 'Quiz Not Passed'}
          </Heading>
          
          <p className="text-zinc-600 mb-6">
            {passed 
              ? 'You have successfully completed this quiz.'
              : `You need ${quiz.passingScore}% to pass. You can retake the quiz to improve your score.`
            }
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {score}%
              </div>
              <p className="text-zinc-600">
                {answers.filter((answer, index) => answer === quiz.questions[index].correctAnswer).length} out of {quiz.questions.length} correct
              </p>
            </div>
          </div>

          <div className="space-x-4">
            {!passed && (
              <Button onClick={() => {
                setQuizStarted(false)
                setShowResults(false)
                setCurrentQuestion(0)
                setAnswers([])
                setTimeRemaining(quiz.duration)
              }} color="blue">
                Retake Quiz
              </Button>
            )}
            <Button onClick={handleReturnToBootcamp} color="zinc" className="bg-gray-200">
              Return to Bootcamp
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz questions
  const question = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          onClick={handleReturnToBootcamp} 
          color="zinc"
          className="mb-4 bg-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Bootcamp
        </Button>
        
        <div className="flex items-center justify-between mb-4">
          <Heading className="text-xl">{quiz.title}</Heading>
          <div className="flex items-center space-x-4">
            <Badge color="blue">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </Badge>
            <div className="flex items-center text-sm text-zinc-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-[#1a67b3] h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
        
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                answers[currentQuestion] === index
                  ? 'border-[#1a67b3] bg-blue-50 text-[#1a67b3]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  answers[currentQuestion] === index
                    ? 'border-[#1a67b3] bg-[#1a67b3]'
                    : 'border-gray-300'
                }`}>
                  {answers[currentQuestion] === index && (
                    <div className="w-full h-full rounded-full bg-white transform scale-[0.4]"></div>
                  )}
                </div>
                {option}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePrevQuestion}
          disabled={currentQuestion === 0}
          color="zinc"
          className="bg-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-zinc-600">
          {answers.filter(a => a !== -1).length} of {quiz.questions.length} answered
        </div>

        {currentQuestion === quiz.questions.length - 1 ? (
          <Button
            onClick={handleSubmitQuiz}
            color="blue"
            disabled={answers.includes(-1)}
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNextQuestion}
            color="blue"
          >
            Next
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
} 