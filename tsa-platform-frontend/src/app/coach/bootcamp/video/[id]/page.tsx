'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { 
  PlayCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/solid'
import { getCurrentUser } from '@/lib/auth'

interface VideoData {
  id: number
  title: string
  description: string
  duration: number
  module: string
}

// Sample video data
const sampleVideos: Record<string, VideoData> = {
  '1': {
    id: 1,
    title: 'Introduction to TimeBack Learning',
    description: 'Learn the fundamentals of our revolutionary educational approach that gives students their time back while achieving better learning outcomes.',
    duration: 1800, // 30 minutes
    module: 'Core Concepts'
  },
  '3': {
    id: 3,
    title: 'Implementing Sports-Based Learning',
    description: 'Discover how to seamlessly integrate academic concepts with physical activities and sports for enhanced learning experiences.',
    duration: 2400, // 40 minutes
    module: 'Implementation'
  },
  '5': {
    id: 5,
    title: 'Creating Learning Environments',
    description: 'Design flexible, movement-friendly spaces that support the TimeBack Learning methodology and promote student engagement.',
    duration: 1800, // 30 minutes
    module: 'Environment Design'
  }
}

export default function VideoPage() {
  const params = useParams()
  const router = useRouter()
  const [coachId, setCoachId] = useState<string | null>(null)
  const [video, setVideo] = useState<VideoData | null>(null)
  const [completed, setCompleted] = useState(false)

  const videoId = params.id as string

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

  // Load video data
  useEffect(() => {
    if (videoId && sampleVideos[videoId]) {
      setVideo(sampleVideos[videoId])
      
      // Check if video was already completed
      const bootcampProgress = JSON.parse(localStorage.getItem('bootcampProgress') || '{}')
      if (bootcampProgress.completedModules?.includes(parseInt(videoId))) {
        setCompleted(true)
      }
    }
  }, [videoId])

  const handleMarkComplete = () => {
    // Mark as completed in localStorage
    const bootcampProgress = JSON.parse(localStorage.getItem('bootcampProgress') || '{}')
    if (!bootcampProgress.completedModules) {
      bootcampProgress.completedModules = []
    }
    if (!bootcampProgress.completedModules.includes(parseInt(videoId))) {
      bootcampProgress.completedModules.push(parseInt(videoId))
    }
    localStorage.setItem('bootcampProgress', JSON.stringify(bootcampProgress))
    
    setCompleted(true)
  }

  const handleReturnToBootcamp = () => {
    router.push('/coach/bootcamp')
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60)
    return `${minutes} min`
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a67b3] mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading video...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
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
        
        <div className="flex items-center justify-between">
          <div>
            <Heading className="text-2xl sm:text-3xl">{video.title}</Heading>
            <p className="mt-2 text-zinc-600">{video.description}</p>
          </div>
          {completed && (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-6 w-6 mr-2" />
              <span className="font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">{video.module}</h3>
            <div className="flex items-center text-blue-700">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span>{formatDuration(video.duration)} estimated duration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Placeholder */}
      <div className="bg-black rounded-lg mb-6 aspect-video flex items-center justify-center">
        <div className="text-center text-white">
          <PlayCircleIcon className="h-24 w-24 mx-auto mb-4 opacity-60" />
          <h3 className="text-xl font-semibold mb-2">Video Player</h3>
          <p className="text-gray-300">Video content will be displayed here</p>
          <p className="text-sm text-gray-400 mt-2">
            This is a placeholder for the actual video player implementation
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          {completed ? 'You have completed this video' : 'Watch the complete video to mark as complete'}
        </div>
        
        <div className="space-x-4">
          {!completed && (
            <Button onClick={handleMarkComplete} color="blue">
              Mark as Complete
            </Button>
          )}
          <Button onClick={handleReturnToBootcamp} color="zinc" className="bg-gray-200">
            {completed ? 'Continue Learning' : 'Return to Bootcamp'}
          </Button>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Learning Objectives</h3>
        <ul className="space-y-2 text-zinc-700">
          {video.id === 1 && (
            <>
              <li>• Understand the core principles of TimeBack Learning</li>
              <li>• Learn how efficiency and effectiveness work together</li>
              <li>• Discover the role of personalized learning paths</li>
              <li>• Explore real-world applications in sports education</li>
            </>
          )}
          {video.id === 3 && (
            <>
              <li>• Master the integration of academic and physical learning</li>
              <li>• Learn assessment strategies for sports-based education</li>
              <li>• Understand how to adapt curricula for movement-based learning</li>
              <li>• Explore case studies of successful implementations</li>
            </>
          )}
          {video.id === 5 && (
            <>
              <li>• Design flexible learning environments</li>
              <li>• Understand spatial requirements for movement-based learning</li>
              <li>• Learn about technology integration in active spaces</li>
              <li>• Explore safety considerations and best practices</li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
} 