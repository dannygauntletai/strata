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
  PlayIcon,
  ArrowDownTrayIcon,
  BookOpenIcon,
  BoltIcon,
  MegaphoneIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  ChevronRightIcon
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

const difficultyColors = {
  'Easy': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'Hard': 'bg-red-100 text-red-800'
}

const statusColors = {
  draft: 'amber',
  published: 'green',
  archived: 'zinc'
} as const

// Parent recruiting workflow steps
interface RecruitingStep {
  id: string
  stepNumber: number
  title: string
  description: string
  estimatedTime: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  resources: ResourceMaterial[]
  isCompleted?: boolean
}

// Resource materials for parent recruiting
interface ResourceMaterial {
  id: string
  title: string
  description: string
  type: 'video' | 'template' | 'guide' | 'copy'
  url?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const recruitingSteps: RecruitingStep[] = [
  {
    id: 'foundation',
    stepNumber: 1,
    title: 'Master Your Academic Story',
    description: 'Before you can confidently recruit parents, you need to fully understand what makes your academic program special. Parents will ask tough questions about academics, and you need to be able to explain how your students achieve top 2% test scores.',
    estimatedTime: '2-3 hours',
    difficulty: 'Easy',
    resources: [
      {
        id: 'learning-videos',
        title: '2 Hour Learning Resource Videos',
        description: 'Watch these to understand the learning system that gives your students a competitive edge',
        type: 'video',
        url: 'http://sportsacademy.school/resources',
        icon: PlayIcon,
        color: '#dc2626'
      },
      {
        id: 'learning-whitepaper',
        title: '2 Hour Learning Whitepaper',
        description: 'Deep dive into the methodology - this is your academic credibility foundation',
        type: 'guide',
        url: 'https://heyzine.com/flip-book/2hourlearning.html#page/1',
        icon: BookOpenIcon,
        color: '#059669'
      }
    ]
  },
  {
    id: 'website-marketing',
    stepNumber: 2,
    title: 'Set Up Your Digital Presence',
    description: 'Your website is often the first impression parents get. You need compelling copy that positions your school as the premium academic-athletic option. Most coaches underestimate how much parents research online before ever contacting you.',
    estimatedTime: '1-2 hours',
    difficulty: 'Easy',
    resources: [
      {
        id: 'website-copy',
        title: 'Proven Website Copy Templates',
        description: 'Copy-paste headlines and body text that convert visitors into enrolled families',
        type: 'copy',
        icon: GlobeAltIcon,
        color: '#059669'
      },
      {
        id: 'marketing-strategy',
        title: 'Parent Targeting Strategy',
        description: 'Focus your efforts on the right families to maximize your enrollment success',
        type: 'guide',
        icon: BoltIcon,
        color: '#f59e0b'
      }
    ]
  },
  {
    id: 'content-creation',
    stepNumber: 3,
    title: 'Build Your Winning Presentation',
    description: 'This is where most coaches either win or lose parents. Your presentation needs to tell a compelling story that addresses parents\' biggest concerns: academics, safety, and results. We\'ll show you exactly what works.',
    estimatedTime: '3-4 hours',
    difficulty: 'Medium',
    resources: [
      {
        id: 'example-presentation',
        title: 'Winning Presentation Example',
        description: 'See exactly how Texas Sports Academy Lake Travis converts parents (real recording)',
        type: 'video',
        url: 'https://drive.google.com/file/d/1ny0WuA-xLNywtQjWNkMETyAQEyAR4nUT/view',
        icon: PresentationChartBarIcon,
        color: '#7c3aed'
      },
      {
        id: 'template-deck',
        title: 'Customizable Presentation Template',
        description: 'Your starting point - but you MUST customize it with your specific credibility markers',
        type: 'template',
        url: 'https://docs.google.com/presentation/d/1nmcfr_V3TTnKEfmsIXl06fvir7CTK5cjZyId34G3_XI/edit?usp=sharing',
        icon: ArrowDownTrayIcon,
        color: '#7c3aed'
      }
    ]
  },
  {
    id: 'event-planning',
    stepNumber: 4,
    title: 'Plan High-Converting Events',
    description: 'The best enrollment happens when parents see your program in action. But the format matters - you need to end with your pitch when parents are most engaged, not when they\'re walking out the door.',
    estimatedTime: '2-3 hours',
    difficulty: 'Medium',
    resources: [
      {
        id: 'event-marketing',
        title: 'Event Format Playbook',
        description: 'Three proven event structures that consistently convert interested parents into enrolled families',
        type: 'guide',
        icon: CalendarDaysIcon,
        color: '#059669'
      }
    ]
  },
  {
    id: 'sales-conversion',
    stepNumber: 5,
    title: 'Master Your Closing Conversation',
    description: 'This is where preparation pays off. Parents who attend your events are already interested - but they need specific talking points about academics, training advantages, and pricing to feel confident saying yes.',
    estimatedTime: '1-2 hours',
    difficulty: 'Hard',
    resources: [
      {
        id: 'pitch-delivery',
        title: 'Closing Conversation Scripts',
        description: 'Exact phrases and responses for the most common parent questions and objections',
        type: 'guide',
        icon: MegaphoneIcon,
        color: '#dc2626'
      }
    ]
  }
]

export default function MarketingPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<ResourceMaterial | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<MarketingMaterial | null>(null)
  const [materials, setMaterials] = useState<MarketingMaterial[]>([])
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // Load cached materials on component mount - only on client side
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setMaterials(getLocalMarketingMaterials())
      // Load completed steps from localStorage
      const saved = localStorage.getItem('completed-recruiting-steps')
      if (saved) {
        setCompletedSteps(new Set(JSON.parse(saved)))
      }
    }
  }, [])

  const categories = ['all', 'Academic Programs', 'Events', 'General', 'Social Media', 'Athletics', 'Communications']

  const filteredMaterials = selectedCategory === 'all' 
    ? materials 
    : materials.filter(material => material.category === selectedCategory)

  const handleStepComplete = (stepId: string) => {
    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepId)) {
      // If already completed, remove it (uncheck)
      newCompleted.delete(stepId)
    } else {
      // If not completed, add it (check)
      newCompleted.add(stepId)
    }
    setCompletedSteps(newCompleted)
    if (typeof window !== 'undefined') {
      localStorage.setItem('completed-recruiting-steps', JSON.stringify(Array.from(newCompleted)))
    }
  }

  const handleResourceClick = (resource: ResourceMaterial) => {
    if (resource.url) {
      window.open(resource.url, '_blank')
    } else {
      handleViewResourceContent(resource)
    }
  }

  const handleViewResourceContent = (resource: ResourceMaterial) => {
    setSelectedResource(resource)
    setShowResourceModal(true)
  }

  const handleEditMaterial = (material: MarketingMaterial) => {
    setEditingMaterial(material)
    setShowCreateModal(true)
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

  const getResourceContent = (resourceId: string): string => {
    switch (resourceId) {
      case 'website-copy':
        return `═══ WEBSITE COPY THAT CONVERTS PARENTS ═══

🎯 PRO TIP: Most coaches write generic copy about "excellence." Parents want specifics about results and methodology.

═══ HEADLINE ═══
We are partnering with Alpha School to launch Houston's first breaking school!

═══ BODY ═══
Alpha School (alpha.school) is a leading private school based in Austin with students that consistently test in the top 2% in the nation (see press coverage). They are partnering with us to provide top academics at our breaking school, while our team leads the breaking training.

═══ DAY IN THE LIFE ═══
Here's what a typical day looks like:
• 9am - 11:30am: Academics with Alpha School's learning technology
• 12pm - 3:30pm: Professional breaking training

═══ OUR WHY ═══
Traditional education systems aren't setting students up for success. Alpha School has an innovative way to accelerate student learning, and by partnering with them, we can create Houston's first breaking school that helps students succeed in all areas.

═══ CTA ═══
We'll be hosting an event (part breaking training, part information session) in the weeks ahead to share more about our new school. Drop your email to stay updated on event announcements.

⚠️ CUSTOMIZATION REQUIRED:
- Replace "Houston's first breaking school" with your city/sport
- Add your personal education background in the "OUR WHY" section
- Include specific examples of your athletic credentials`

      case 'event-marketing':
        return `═══ EVENT FORMATS THAT WORK ═══

If you host events to recruit parents, there are a few options. These are general recommendations for event types we've seen work well for Texas Sports Academy and other Alpha Schools:

═══ 2 HOUR EVENT ═══
First hour = Parent pitch 
Second hour = Athletic training

═══ DAY-LONG EVENT ═══
Morning = Athletic training
Afternoon = Competition (parents come in)
Last 30 mins = Parent pitch

═══ FULL SHADOW DAY ═══
Replicate of what a day at your school will be
Morning = Academics with Alpha's Software
Afternoon = Athletic training
Last 30 mins = Parent pitch`

      case 'marketing-strategy':
        return `🎯 ═══ MARKETING STRATEGY ═══

Goal: 5 students by Fall 2025

1. 🏠 ═══ TARGET HOMESCHOOL FAMILIES ═══
   • Start with kids you already train
   • Ask about other homeschool students they know

2. 💬 ═══ FOCUS ON WORD-OF-MOUTH ═══
   • Personal referrals beat social media
   • Ask families: "Who else might benefit?"

3. 🤝 ═══ MAKE REFERRALS EASY ═══
   • Follow up within 24 hours
   • Consider tuition credit incentives`

      case 'pitch-delivery':
        return `═══ YOUR CLOSING CONVERSATION TOOLKIT ═══

🎯 REMEMBER: Parents at your events are already interested. Your job is to give them confidence to say yes.

═══ KEY MESSAGE #1: ACADEMIC SUPERIORITY ═══
"Our academics will be best-in-class using the same technology that helps students test in the top 2% nationally. This isn't just tutoring - it's the actual learning system used at Alpha School in Austin." 

📰 Reference: Fox News coverage of Alpha School results

💡 WHY THIS WORKS: Parents' #1 concern is always academics. Lead with strength.

═══ KEY MESSAGE #2: COMPETITIVE ADVANTAGE ═══
"In our program, we train from 11:30am-3:30pm every day while other kids are in traditional classrooms. That's 20 extra hours of focused training per week that gives your child a massive competitive advantage."

💡 WHY THIS WORKS: Quantifies the advantage in terms parents understand.

═══ KEY MESSAGE #3: VALUE PROPOSITION ═══
"Our tuition is $15,000/year, but through our partnership with Alpha School, families receive $10,000 scholarships. So you're paying about $500/month for both elite academics and professional training."

💡 WHY THIS WORKS: Addresses cost concerns upfront with the scholarship benefit.

═══ COMMON OBJECTIONS & RESPONSES ═══

❓ "How do we know the academics really work?"
✅ "The same system is used at Alpha School where students consistently test in the top 2%. Here's the press coverage and test score data..."

❓ "What if my child falls behind socially?"
✅ "Our students actually develop stronger social skills through team training and diverse age interactions, plus they have more time for family and community activities."

❓ "This seems too good to be true."
✅ "I understand the skepticism. That's why we offer shadow days - come see it in action before making any commitment."

🎯 ALWAYS END WITH: "What questions do you have about getting [child's name] started with us?"

⚠️ AVOID: Pressuring for immediate decisions. Give them 48 hours to discuss as a family, then follow up.`

      case 'template-deck':
        return `═══ PRESENTATION CUSTOMIZATION CHECKLIST ═══

🎯 CRITICAL: Don't just use the template as-is. Parents can tell when presentations are generic.

═══ REQUIRED CUSTOMIZATIONS ═══

1. ═══ YOUR CREDIBILITY SECTION ═══
   Add specific examples of your breaking expertise:
   - Competition wins and rankings
   - Years of experience training students  
   - Student success stories and achievements
   - Reviews from current families (screenshot from your website)

2. ═══ LOCAL RELEVANCE ═══
   - Replace "Houston" with your specific city/area
   - Include local school district comparisons
   - Reference local competition and training opportunities
   - Add photos of your actual training space

3. ═══ SUCCESS STORIES ═══
   Replace generic examples with YOUR student stories:
   - Before/after skill progression videos
   - Academic improvement testimonials
   - College acceptance or scholarship stories
   - Character development examples

4. ═══ PARTNERSHIP DETAILS ═══
   Customize the Alpha School partnership slides:
   - Your specific relationship timeline
   - How you discovered Alpha School methodology
   - Your personal education background/credentials

💡 PRO TIPS:
- Practice the presentation at least 3 times before your first event
- Time it - should be 20-25 minutes max with Q&A
- Have enrollment forms and calendars ready
- End with a clear call-to-action (schedule shadow day)

⚠️ COMMON MISTAKES:
- Reading directly from slides (memorize key points)
- Going over 30 minutes total (parents get restless)
- Forgetting to ask for questions/enrollment
- Not having next steps clearly defined

═══ BEFORE YOUR FIRST PRESENTATION ═══
□ Customize all placeholder content
□ Add your photos and videos
□ Practice timing and transitions
□ Prepare for common questions
□ Set up enrollment process`

      default:
        return 'Content not available.'
    }
  }

  return (
    <>

      {/* Student Recruiting Plan Section - Now comes first */}
      <div className="mb-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Student Recruiting Plan</h2>
              <p className="mt-2 text-zinc-500">
                Step-by-step checklist to attract and convert families to your program.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {completedSteps.size} of {recruitingSteps.length} completed
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-[#004aad] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(completedSteps.size / recruitingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recruiting Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {recruitingSteps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id)
            const isNext = !isCompleted && (index === 0 || completedSteps.has(recruitingSteps[index - 1].id))
            
            return (
              <div key={step.id} className={`border-b border-gray-100 last:border-b-0 ${isNext ? 'bg-blue-50' : ''}`}>
                <div className="p-6">
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleStepComplete(step.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                            : isNext 
                              ? 'border-[#004aad] hover:bg-[#004aad] hover:text-white' 
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                        title={isCompleted ? 'Click to uncheck' : 'Click to check off this step'}
                      >
                        {isCompleted && <CheckCircleIcon className="h-4 w-4" />}
                      </button>
                      <h3 className={`text-lg font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        Step {step.stepNumber}: {step.title}
                      </h3>
                    </div>
                    {isNext && !isCompleted && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Next
                      </span>
                    )}
                  </div>

                  {/* Resources */}
                  <div className="ml-9">
                    <div className="flex flex-wrap gap-3">
                      {step.resources.map((resource) => (
                        <button
                          key={resource.id}
                          onClick={() => handleResourceClick(resource)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <div style={{ color: resource.color }}>
                            <resource.icon className="h-4 w-4" />
                          </div>
                          <span>{resource.title}</span>
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion Message */}
        {completedSteps.size === recruitingSteps.length && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-green-800 font-medium">
                🎉 Congratulations! You've completed the student recruiting plan. Now create your marketing materials below.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-12"></div>

      {/* Marketing Materials Section - Now comes second */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Marketing Materials</h2>
            <p className="mt-2 text-zinc-500">
              Now that you have your recruiting strategy, create professional materials to support it.
            </p>
          </div>
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

      {/* Resource Content Modal */}
      {showResourceModal && selectedResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex h-full max-h-[90vh]">
              <div className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedResource.title}</h2>
                    <p className="text-gray-600 mt-1">{selectedResource.description}</p>
                  </div>
                  <Button
                    className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setShowResourceModal(false)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-base text-gray-900 font-sans leading-7 bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                    {getResourceContent(selectedResource.id)}
                  </pre>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(getResourceContent(selectedResource.id))
                    }}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    Copy Content
                  </Button>
                  <Button
                    className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
                    onClick={() => setShowResourceModal(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Creation Modal */}
      <MaterialCreationModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        materialCreationOptions={materialCreationOptions}
        editingMaterial={editingMaterial}
        handleCloseModal={() => {
          setShowCreateModal(false)
          setEditingMaterial(null)
          // Reload materials from localStorage when modal closes
          if (mounted && typeof window !== 'undefined') {
            setMaterials(getLocalMarketingMaterials())
          }
        }}
        handleSaveMaterial={handleSaveMaterial}
      />
    </>
  )
} 