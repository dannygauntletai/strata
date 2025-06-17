'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { 
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  DropdownDivider,
} from '@/components/dropdown'
import { Checkbox } from '@/components/checkbox'
import { 
  PhotoIcon, 
  VideoCameraIcon,
  CloudArrowUpIcon,
  CalendarIcon,
  UserGroupIcon,
  TrashIcon,
  EyeIcon,
  ShareIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/solid'
import { ChevronDownIcon } from '@heroicons/react/16/solid'

// Mock data
const mediaItems = [
  {
    id: 1,
    type: 'photo' as const,
    title: 'Basketball Practice',
    url: '/photos/basketball-practice.jpg',
    thumbnail: '/photos/basketball-practice-thumb.jpg',
    date: '2024-05-15',
    students: ['Emma Thompson', 'Jacob Martinez'],
    shared: true,
    views: 23,
    size: '2.4 MB',
  },
  {
    id: 2,
    type: 'video' as const,
    title: 'Soccer Goal Celebration',
    url: '/videos/soccer-goal.mp4',
    thumbnail: '/videos/soccer-goal-thumb.jpg',
    date: '2024-05-14',
    students: ['Olivia Johnson', 'Emma Thompson'],
    shared: true,
    views: 45,
    duration: '0:45',
    size: '15.2 MB',
  },
  {
    id: 3,
    type: 'photo' as const,
    title: 'Team Photo Day',
    url: '/photos/team-photo.jpg',
    thumbnail: '/photos/team-photo-thumb.jpg',
    date: '2024-05-13',
    students: ['All Students'],
    shared: false,
    views: 0,
    size: '4.1 MB',
  },
  {
    id: 4,
    type: 'video' as const,
    title: 'Football Training Drills',
    url: '/videos/football-drills.mp4',
    thumbnail: '/videos/football-drills-thumb.jpg',
    date: '2024-05-12',
    students: ['Jacob Martinez', 'Michael Chen'],
    shared: true,
    views: 18,
    duration: '2:15',
    size: '45.7 MB',
  },
  {
    id: 5,
    type: 'photo' as const,
    title: 'Science Fair Winners',
    url: '/photos/science-fair.jpg',
    thumbnail: '/photos/science-fair-thumb.jpg',
    date: '2024-05-11',
    students: ['Sarah Williams', 'Lisa Chen'],
    shared: true,
    views: 56,
    size: '3.2 MB',
  },
  {
    id: 6,
    type: 'video' as const,
    title: 'Morning Assembly',
    url: '/videos/assembly.mp4',
    thumbnail: '/videos/assembly-thumb.jpg',
    date: '2024-05-10',
    students: ['All Students'],
    shared: false,
    views: 0,
    duration: '5:30',
    size: '125.3 MB',
  },
]

const students = [
  'All Students',
  'Emma Thompson',
  'Jacob Martinez',
  'Olivia Johnson',
  'Michael Chen',
  'Sarah Williams',
  'Lisa Chen',
]

export default function Media() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState<'photo' | 'video'>('photo')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadStudents, setUploadStudents] = useState<string[]>([])
  const [shareImmediately, setShareImmediately] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<typeof mediaItems[0] | null>(null)

  const sharedCount = mediaItems.filter(item => item.shared).length
  const totalViews = mediaItems.reduce((sum, item) => sum + item.views, 0)

  const handleUpload = () => {
    console.log('Uploading:', { 
      type: uploadType, 
      title: uploadTitle, 
      students: uploadStudents,
      shareImmediately 
    })
    setShowUploadModal(false)
    setUploadTitle('')
    setUploadStudents([])
    setShareImmediately(false)
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Media</Heading>
            <Text className="mt-1">
              Capture and share memorable moments with families
            </Text>
          </div>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-[#1a67b3] hover:bg-[#1a67b3]/90"
          >
            <CloudArrowUpIcon />
            Upload Media
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Total Media</Text>
              <Text className="text-2xl font-semibold">{mediaItems.length}</Text>
            </div>
            <PhotoIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Shared</Text>
              <Text className="text-2xl font-semibold">{sharedCount}</Text>
            </div>
            <ShareIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Total Views</Text>
              <Text className="text-2xl font-semibold">{totalViews}</Text>
            </div>
            <EyeIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">This Week</Text>
              <Text className="text-2xl font-semibold">12</Text>
            </div>
            <CalendarIcon className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mediaItems.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Thumbnail */}
            <div 
              className="relative aspect-video bg-gray-100 cursor-pointer"
              onClick={() => setSelectedMedia(item)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {item.type === 'photo' ? (
                  <PhotoIcon className="h-16 w-16 text-gray-300" />
                ) : (
                  <VideoCameraIcon className="h-16 w-16 text-gray-300" />
                )}
              </div>
              
              {/* Video duration */}
              {item.type === 'video' && item.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {item.duration}
                </div>
              )}
              
              {/* Shared indicator */}
              {item.shared && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white p-1.5 rounded-full">
                    <CheckCircleIcon className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <Text className="font-medium line-clamp-1">{item.title}</Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </div>
                <Dropdown>
                  <DropdownButton plain>
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem onClick={() => setSelectedMedia(item)}>
                      <EyeIcon />
                      View
                    </DropdownItem>
                    <DropdownItem onClick={() => console.log('Share:', item)}>
                      <ShareIcon />
                      {item.shared ? 'Share Settings' : 'Share with Parents'}
                    </DropdownItem>
                    <DropdownItem onClick={() => console.log('Download:', item)}>
                      <ArrowDownTrayIcon />
                      Download
                    </DropdownItem>
                    <DropdownItem onClick={() => console.log('Copy link:', item)}>
                      <DocumentDuplicateIcon />
                      Copy Link
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => console.log('Delete:', item)}>
                      <TrashIcon />
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <UserGroupIcon className="h-3.5 w-3.5 mr-1" />
                  {item.students.length === 1 ? item.students[0] : `${item.students.length} students`}
                </span>
                {item.shared && (
                  <span>{item.views} views</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {mediaItems.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <Text className="text-gray-500 mb-4">No media found</Text>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-[#1a67b3] hover:bg-[#1a67b3]/90"
          >
            Upload your first media
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onClose={setShowUploadModal}>
        <DialogTitle>Upload Media</DialogTitle>
        <DialogDescription>
          Add photos or videos to share with parents and document student activities
        </DialogDescription>

        <DialogBody>
          <div className="space-y-6">
            {/* Media Type Selection */}
            <div>
              <Text className="text-sm font-medium mb-3">Media Type</Text>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUploadType('photo')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    uploadType === 'photo'
                      ? 'border-[#1a67b3] bg-[#1a67b3]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PhotoIcon className={`h-8 w-8 mx-auto mb-2 ${
                    uploadType === 'photo' ? 'text-[#1a67b3]' : 'text-gray-400'
                  }`} />
                  <Text className="text-sm font-medium">Photo</Text>
                  <Text className="text-xs text-gray-500 mt-1">JPG, PNG up to 10MB</Text>
                </button>
                <button
                  onClick={() => setUploadType('video')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    uploadType === 'video'
                      ? 'border-[#1a67b3] bg-[#1a67b3]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <VideoCameraIcon className={`h-8 w-8 mx-auto mb-2 ${
                    uploadType === 'video' ? 'text-[#1a67b3]' : 'text-gray-400'
                  }`} />
                  <Text className="text-sm font-medium">Video</Text>
                  <Text className="text-xs text-gray-500 mt-1">MP4, MOV up to 100MB</Text>
                </button>
              </div>
            </div>

            {/* Upload Area */}
            <div>
              <Text className="text-sm font-medium mb-3">Select Files</Text>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <Text className="text-sm text-gray-600 mb-1">
                  Drop files here or click to browse
                </Text>
                <Text className="text-xs text-gray-500">
                  You can upload multiple files at once
                </Text>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Spring Concert Rehearsal"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            {/* Tag Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag Students
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {students.map(student => (
                  <label key={student} className="flex items-center">
                    <Checkbox
                      checked={uploadStudents.includes(student)}
                      onChange={(checked) => {
                        if (checked) {
                          setUploadStudents([...uploadStudents, student])
                        } else {
                          setUploadStudents(uploadStudents.filter(s => s !== student))
                        }
                      }}
                    />
                    <Text className="ml-2 text-sm">{student}</Text>
                  </label>
                ))}
              </div>
            </div>

            {/* Share Options */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="flex items-center">
                <Checkbox
                  checked={shareImmediately}
                  onChange={setShareImmediately}
                />
                <div className="ml-3">
                  <Text className="text-sm font-medium">Share with parents immediately</Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Tagged parents will receive a notification
                  </Text>
                </div>
              </label>
            </div>
          </div>
        </DialogBody>

        <DialogActions>
          <Button plain onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            className="bg-[#1a67b3] hover:bg-[#1a67b3]/90"
          >
            Upload {uploadType === 'photo' ? 'Photos' : 'Videos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onClose={() => setSelectedMedia(null)}>
          <DialogTitle>{selectedMedia.title}</DialogTitle>
          <DialogBody>
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {selectedMedia.type === 'photo' ? (
                  <PhotoIcon className="h-24 w-24 text-gray-300" />
                ) : (
                  <VideoCameraIcon className="h-24 w-24 text-gray-300" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Text className="text-gray-500">Date</Text>
                  <Text className="font-medium">{new Date(selectedMedia.date).toLocaleDateString()}</Text>
                </div>
                <div>
                  <Text className="text-gray-500">Size</Text>
                  <Text className="font-medium">{selectedMedia.size}</Text>
                </div>
                <div>
                  <Text className="text-gray-500">Students</Text>
                  <Text className="font-medium">{selectedMedia.students.join(', ')}</Text>
                </div>
                <div>
                  <Text className="text-gray-500">Status</Text>
                  <Badge color={selectedMedia.shared ? 'green' : 'zinc'}>
                    {selectedMedia.shared ? 'Shared' : 'Private'}
                  </Badge>
                </div>
              </div>
              {selectedMedia.shared && (
                <div className="border-t pt-4">
                  <Text className="text-sm text-gray-500">
                    This media has been viewed {selectedMedia.views} times by parents
                  </Text>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setSelectedMedia(null)}>
              Close
            </Button>
            <Button
              onClick={() => console.log('Share:', selectedMedia)}
              className="bg-[#1a67b3] hover:bg-[#1a67b3]/90"
            >
              {selectedMedia.shared ? 'Share Settings' : 'Share with Parents'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
} 