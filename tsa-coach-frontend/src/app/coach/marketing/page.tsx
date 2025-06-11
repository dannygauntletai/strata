'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'

// Dynamically import the modal to prevent SSR issues
const MaterialCreationModal = dynamic(
  () => import('@/components/marketing/MaterialCreationModal'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
)
import { 
  PhotoIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  PresentationChartBarIcon,
  NewspaperIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PrinterIcon,
  TrashIcon,
} from '@heroicons/react/20/solid'

interface MarketingMaterial {
  id: string
  type: 'flyer' | 'brochure' | 'social-media' | 'email-template' | 'website-content' | 'presentation' | 'poster' | 'newsletter' | 'business-card' | 'event-material'
  title: string
  description: string
  thumbnail: string
  category: string
  lastModified: string
  status: 'draft' | 'published' | 'archived'
}

interface MaterialOption {
  id: string
  type: MarketingMaterial['type']
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  category: 'print' | 'digital' | 'presentation' | 'web'
  templates: number
  estimatedTime: string
  features: string[]
}

// Dynamic material type to icon mapping - no hardcoding
const materialTypeConfig = {
  'flyer': { icon: DocumentTextIcon, color: '#004aad' },
  'brochure': { icon: PhotoIcon, color: '#7c2d12' },
  'social-media': { icon: DevicePhoneMobileIcon, color: '#dc2626' },
  'email-template': { icon: EnvelopeIcon, color: '#ea580c' },
  'website-content': { icon: GlobeAltIcon, color: '#059669' },
  'presentation': { icon: PresentationChartBarIcon, color: '#7c3aed' },
  'poster': { icon: PrinterIcon, color: '#be185d' },
  'newsletter': { icon: NewspaperIcon, color: '#0891b2' },
  'business-card': { icon: IdentificationIcon, color: '#4338ca' },
  'event-material': { icon: CalendarDaysIcon, color: '#059669' }
} as const

// Dynamic helper function - no hardcoding
const getMaterialIcon = (type: string) => {
  const config = materialTypeConfig[type as keyof typeof materialTypeConfig]
  if (!config) {
    return <DocumentTextIcon className="h-5 w-5 text-gray-600" />
  }
  const IconComponent = config.icon
  return <IconComponent className="h-5 w-5" style={{ color: config.color }} />
}

// TODO: Replace with API calls - these should come from backend
const marketingMaterials: MarketingMaterial[] = []

// Local storage functions for caching materials
const saveMarketingMaterial = (material: MarketingMaterial) => {
  if (typeof window === 'undefined') return
  try {
    const saved = getLocalMarketingMaterials()
    const updated = [...saved, material]
    localStorage.setItem('marketing-materials', JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving material:', error)
  }
}

const getLocalMarketingMaterials = (): MarketingMaterial[] => {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem('marketing-materials')
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading cached materials:', error)
    return []
  }
}

const removeMarketingMaterial = (id: string) => {
  if (typeof window === 'undefined') return
  try {
    const saved = getLocalMarketingMaterials()
    const updated = saved.filter(material => material.id !== id)
    localStorage.setItem('marketing-materials', JSON.stringify(updated))
  } catch (error) {
    console.error('Error removing material:', error)
  }
}

// TODO: Replace with API calls - these should be configurable
const materialCreationOptions: MaterialOption[] = [
  {
    id: 'flyer',
    type: 'flyer',
    name: 'Flyers',
    description: 'Eye-catching promotional flyers for programs, events, and announcements',
    icon: DocumentTextIcon,
    color: '#004aad',
    category: 'print',
    templates: 12,
    estimatedTime: '15-30 min',
    features: ['Multiple formats', 'AI-powered editing', 'TSA branding', 'Print-ready']
  },
  {
    id: 'presentation',
    type: 'presentation',
    name: 'Marketing Presentations',
    description: 'Professional decks for parent meetings, investor pitches, and school overviews',
    icon: PresentationChartBarIcon,
    color: '#7c3aed',
    category: 'presentation',
    templates: 8,
    estimatedTime: '45-90 min',
    features: ['Interactive content', 'Data visualization', 'Professional layouts', 'Export options']
  },
  {
    id: 'website-content',
    type: 'website-content',
    name: 'Website Content',
    description: 'Landing pages, program descriptions, and web content for your school site',
    icon: GlobeAltIcon,
    color: '#059669',
    category: 'web',
    templates: 15,
    estimatedTime: '30-60 min',
    features: ['SEO optimized', 'Mobile responsive', 'Conversion focused', 'CMS ready']
  },
  {
    id: 'social-media',
    type: 'social-media',
    name: 'Social Media Content',
    description: 'Posts, stories, and campaigns for Instagram, Facebook, and LinkedIn',
    icon: DevicePhoneMobileIcon,
    color: '#dc2626',
    category: 'digital',
    templates: 20,
    estimatedTime: '10-20 min',
    features: ['Multiple platforms', 'Trending formats', 'Engagement focused', 'Batch creation']
  },
  {
    id: 'brochure',
    type: 'brochure',
    name: 'School Brochures',
    description: 'Comprehensive school overviews and program guides for prospective families',
    icon: PhotoIcon,
    color: '#7c2d12',
    category: 'print',
    templates: 6,
    estimatedTime: '60-120 min',
    features: ['Multi-page layouts', 'High-quality imagery', 'Detailed information', 'Professional printing']
  },
  {
    id: 'email-template',
    type: 'email-template',
    name: 'Email Campaigns',
    description: 'Newsletters, announcements, and parent communication templates',
    icon: EnvelopeIcon,
    color: '#ea580c',
    category: 'digital',
    templates: 10,
    estimatedTime: '20-40 min',
    features: ['Mobile responsive', 'Personalization', 'A/B testing', 'Analytics tracking']
  },
  {
    id: 'poster',
    type: 'poster',
    name: 'Event Posters',
    description: 'Large format posters for bulletin boards, community centers, and events',
    icon: PrinterIcon,
    color: '#be185d',
    category: 'print',
    templates: 8,
    estimatedTime: '25-45 min',
    features: ['Large format', 'High impact design', 'Event focused', 'Community posting']
  },
  {
    id: 'newsletter',
    type: 'newsletter',
    name: 'School Newsletters',
    description: 'Monthly or weekly newsletters for parents and the school community',
    icon: NewspaperIcon,
    color: '#0891b2',
    category: 'digital',
    templates: 5,
    estimatedTime: '45-75 min',
    features: ['Multi-article layout', 'Photo galleries', 'Parent submissions', 'Archive ready']
  },
  {
    id: 'business-card',
    type: 'business-card',
    name: 'Business Cards',
    description: 'Professional cards for staff, teachers, and school representatives',
    icon: IdentificationIcon,
    color: '#4338ca',
    category: 'print',
    templates: 4,
    estimatedTime: '10-15 min',
    features: ['Professional design', 'Contact information', 'QR codes', 'Premium materials']
  },
  {
    id: 'event-material',
    type: 'event-material',
    name: 'Event Materials',
    description: 'Open house materials, registration forms, and event signage',
    icon: CalendarDaysIcon,
    color: '#059669',
    category: 'print',
    templates: 12,
    estimatedTime: '30-60 min',
    features: ['Event branding', 'Registration forms', 'Directional signage', 'Welcome packets']
  },
  {
    id: 'upload-media',
    type: 'flyer',
    name: 'Upload Your Media',
    description: 'Upload and edit existing materials with AI-powered tools',
    icon: PhotoIcon,
    color: '#8b5cf6',
    category: 'digital',
    templates: 0,
    estimatedTime: '5-15 min',
    features: ['Upload any image', 'AI-powered editing', 'Convert to editable format']
  }
]

const statusColors = {
  draft: 'amber',
  published: 'green',
  archived: 'zinc'
} as const

export default function MarketingPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MarketingMaterial | null>(null)
  const [materials, setMaterials] = useState<MarketingMaterial[]>([])
  const [mounted, setMounted] = useState(false)

  // Load cached materials on component mount - only on client side
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setMaterials(getLocalMarketingMaterials())
    }
  }, [])

  const categories = ['all', 'Academic Programs', 'Events', 'General', 'Social Media', 'Athletics', 'Communications']

  const filteredMaterials = selectedCategory === 'all' 
    ? materials 
    : materials.filter(material => material.category === selectedCategory)

  const handleEditMaterial = (material: MarketingMaterial) => {
    setEditingMaterial(material)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingMaterial(null)
    // Reload materials from localStorage when modal closes
    if (mounted && typeof window !== 'undefined') {
      setMaterials(getLocalMarketingMaterials())
    }
  }

  const handleSaveMaterial = (material: MarketingMaterial) => {
    if (mounted && typeof window !== 'undefined') {
      saveMarketingMaterial(material)
      setMaterials(getLocalMarketingMaterials()) // Refresh the list
    }
  }

  const handleDeleteMaterial = (id: string) => {
    if (mounted && typeof window !== 'undefined') {
      removeMarketingMaterial(id)
      setMaterials(getLocalMarketingMaterials()) // Refresh the list
    }
  }

  return (
    <>
      {/* Header following design theme typography */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Marketing Materials</Heading>
            <p className="mt-2 text-zinc-500">
              Create, edit, and manage marketing materials with self-service templates.
            </p>
          </div>
          <Button 
            className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer flex items-center gap-2"
            onClick={() => {
              setEditingMaterial(null)
              setShowCreateModal(true)
            }}
          >
            <PlusIcon className="h-5 w-5" />
            Create New Material
          </Button>
        </div>
      </div>

      {/* Category Filter with TSA branding */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <Text className="text-sm font-medium text-gray-700">Filter by category:</Text>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-[#004aad] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materials Grid following Feature Dashboard Card pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredMaterials.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No marketing materials yet</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Create professional marketing materials with AI assistance or upload existing materials to edit them.
            </p>
            <Button 
              className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer flex items-center gap-2"
              onClick={() => {
                setEditingMaterial(null)
                setShowCreateModal(true)
              }}
            >
              <PlusIcon className="h-5 w-5" />
              Create Your First Material
            </Button>
          </div>
        ) : (
          filteredMaterials.map((material) => (
            <div key={material.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
              {/* Card header with gradient background */}
              <div className="aspect-video bg-gradient-to-br from-[#004aad]/10 to-[#004aad]/5 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                    {getMaterialIcon(material.type)}
                  </div>
                  <div className="absolute top-3 left-3">
                  <Badge color={statusColors[material.status]}>
                    {material.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
            
              {/* Card content following theme pattern */}
              <div className="px-6 py-5 hover:bg-gray-50 transition-colors flex-1 flex flex-col">
                {/* Category and Modified Date - moved above title */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{material.category}</span>
                <span>Modified {material.lastModified}</span>
              </div>
              
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{material.title}</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 flex-1">{material.description}</p>
                
                {/* Action buttons following theme pattern */}
                <div className="flex items-center space-x-2 mt-auto">
                <Button 
                    className="bg-[#004aad] text-white hover:bg-[#003888] flex-1 cursor-pointer"
                    onClick={() => handleEditMaterial(material)}
                >
                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                  <Button className="border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                  <Button className="border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  Share
                </Button>
                    <Button 
                    className="border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 cursor-pointer"
                    onClick={() => handleDeleteMaterial(material.id)}
                    title="Delete material"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
      )}
    </div>

      {/* Material Creation Modal */}
      <MaterialCreationModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        materialCreationOptions={materialCreationOptions}
        editingMaterial={editingMaterial}
        handleCloseModal={handleCloseModal}
        handleSaveMaterial={handleSaveMaterial}
      />
    </>
  )
} 