'use client'

import { useState } from 'react'
import Link from 'next/link'

interface BuilderTool {
  id: string
  name: string
  description: string
  features: string[]
  href: string
  icon: string
  color: string
  status: 'live' | 'beta' | 'coming-soon'
}

const builderTools: BuilderTool[] = [
  {
    id: 'utm',
    name: 'UTM Campaign Builder',
    description: 'Create trackable URLs with QR codes for marketing campaigns',
    features: ['Custom UTM parameters', 'QR code generation', 'Campaign analytics', 'Link shortening'],
    href: '/builders/utm',
    icon: 'chart-bar',
    color: 'blue',
    status: 'live'
  },
  {
    id: 'email-templates',
    name: 'Email Template Builder',
    description: 'Design responsive email templates with MJML and A/B testing',
    features: ['MJML templates', 'A/B testing', 'Variable substitution', 'Preview & send'],
    href: '/builders/email-templates',
    icon: 'mail',
    color: 'green',
    status: 'live'
  },
  {
    id: 'landing-components',
    name: 'Landing Page Components',
    description: 'Create embeddable components for WordPress and other platforms',
    features: ['WordPress shortcodes', 'Wix embed codes', 'Custom components', 'Third-party integration'],
    href: '/builders/landing-components',
    icon: 'template',
    color: 'purple',
    status: 'live'
  },
  {
    id: 'reports',
    name: 'Custom Report Builder',
    description: 'Build custom analytics reports with SQL query generation',
    features: ['Visual query builder', 'SQL generation', 'Scheduled reports', 'Export options'],
    href: '/builders/reports',
    icon: 'document-report',
    color: 'orange',
    status: 'live'
  },
  {
    id: 'tracking',
    name: 'Cross-Domain Tracking',
    description: 'Universal tracking script for all websites and platforms',
    features: ['Cross-domain tracking', 'Event capture', 'Real-time analytics', 'Privacy compliant'],
    href: '/builders/tracking',
    icon: 'globe',
    color: 'indigo',
    status: 'live'
  },
  {
    id: 'realtime',
    name: 'Real-Time Analytics',
    description: 'Live dashboard with WebSocket updates via Kinesis',
    features: ['Real-time events', 'Live dashboard', 'Stream processing', 'WebSocket updates'],
    href: '/builders/realtime',
    icon: 'lightning-bolt',
    color: 'yellow',
    status: 'beta'
  }
]

const getIconPath = (icon: string) => {
  const icons = {
    'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'mail': 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    'template': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 002 2h4a2 2 0 012-2V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z',
    'document-report': 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    'globe': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    'lightning-bolt': 'M13 10V3L4 14h7v7l9-11h-7z'
  }
  return icons[icon as keyof typeof icons] || icons['chart-bar']
}

const getColorClasses = (color: string) => {
  const colors = {
    blue: 'from-blue-50 to-indigo-50 border-blue-100 hover:border-blue-200 bg-blue-500',
    green: 'from-green-50 to-emerald-50 border-green-100 hover:border-green-200 bg-green-500',
    purple: 'from-purple-50 to-violet-50 border-purple-100 hover:border-purple-200 bg-purple-500',
    orange: 'from-orange-50 to-red-50 border-orange-100 hover:border-orange-200 bg-orange-500',
    indigo: 'from-indigo-50 to-blue-50 border-indigo-100 hover:border-indigo-200 bg-indigo-500',
    yellow: 'from-yellow-50 to-amber-50 border-yellow-100 hover:border-yellow-200 bg-yellow-500'
  }
  return colors[color as keyof typeof colors] || colors.blue
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'live':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Live
        </span>
      )
    case 'beta':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Beta
        </span>
      )
    case 'coming-soon':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Coming Soon
        </span>
      )
    default:
      return null
  }
}

export default function BuildersPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Tools' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'integration', name: 'Integration' }
  ]

  const getCategoryTools = (category: string) => {
    if (category === 'all') return builderTools
    
    const categoryMap = {
      marketing: ['utm', 'email-templates', 'landing-components'],
      analytics: ['reports', 'realtime', 'tracking'],
      integration: ['landing-components', 'tracking']
    }
    
    return builderTools.filter(tool => 
      categoryMap[category as keyof typeof categoryMap]?.includes(tool.id)
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Builder Tools</h1>
            <p className="mt-2 text-gray-600">
              Create, customize, and deploy marketing tools for your coaching business
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {builderTools.length} tools available
            </div>
            <div className="h-4 border-l border-gray-300"></div>
            <div className="flex items-center space-x-2">
              {getStatusBadge('live')}
              <span className="text-xs text-gray-400">Production ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <nav className="flex space-x-8" aria-label="Categories">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                selectedCategory === category.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {category.name}
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {getCategoryTools(category.id).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Builder Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getCategoryTools(selectedCategory).map((tool) => {
          const colorClasses = getColorClasses(tool.color)
          const [gradientClasses, borderClasses, iconBgClass] = colorClasses.split(' bg-')
          
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="group block"
            >
              <div className={`bg-gradient-to-r ${gradientClasses} p-6 rounded-lg border ${borderClasses} transition-all duration-200 group-hover:shadow-lg`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`bg-${iconBgClass} p-3 rounded-lg`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(tool.icon)} />
                    </svg>
                  </div>
                  {getStatusBadge(tool.status)}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                  {tool.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {tool.description}
                </p>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">Key Features:</div>
                  <ul className="space-y-1">
                    {tool.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-600">
                        <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    {tool.features.length > 3 && (
                      <li className="text-xs text-gray-500 ml-5">
                        +{tool.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to open builder</span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Getting Started */}
      <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started with Builder Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Choose a Tool</h3>
            <p className="text-sm text-gray-600">Select the builder tool that matches your marketing needs</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="text-green-600 font-semibold">2</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Customize & Build</h3>
            <p className="text-sm text-gray-600">Use our intuitive builders to create your marketing assets</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="text-purple-600 font-semibold">3</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Deploy & Track</h3>
            <p className="text-sm text-gray-600">Launch your campaigns and monitor performance in real-time</p>
          </div>
        </div>
      </div>
    </div>
  )
} 