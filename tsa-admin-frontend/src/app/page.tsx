'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminAPI } from '@/lib/auth'

interface HealthData {
  status: string;
  services: {
    lambda?: string;
    dynamodb?: string;
    sendgrid?: string;
  };
  timestamp: string;
}

export default function AdminDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch health data
        const healthData = await adminAPI.getHealth().catch(err => {
            console.error('Health API error:', err)
            return null
          })

        // Handle null response (from 401 logout)
        if (healthData !== null) {
          setHealth(healthData)
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getServiceStatus = (service: string) => {
    const status = health?.services?.[service as keyof typeof health.services]
    return status || 'unknown'
  }

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'unhealthy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage the TSA Coach platform across all services and organizations
        </p>
      </div>



      {/* System Health */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          <p className="text-sm text-gray-500">
            Status: <span className={`font-medium ${health?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
              {health?.status || 'Unknown'}
            </span> • Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unknown'}
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { name: 'Lambda Functions', service: 'lambda' },
              { name: 'Database (DynamoDB)', service: 'dynamodb' },
              { name: 'Email Service (SendGrid)', service: 'sendgrid' },
            ].map((service) => {
              const status = getServiceStatus(service.service)
              return (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getServiceStatusColor(status)}`}></div>
                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status === 'healthy' 
                        ? 'bg-green-100 text-green-800' 
                        : status === 'unhealthy'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col h-full">
          <div className="flex-grow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Coach Invitations</h3>
            <p className="text-gray-600 mb-4">Send invitations and manage coach onboarding</p>
          </div>
          <div className="mt-auto">
            <Link href="/invitations">
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Manage Invitations
              </button>
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow flex flex-col h-full">
          <div className="flex-grow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Coach Management</h3>
            <p className="text-gray-600 mb-4">View and manage registered coaches</p>
          </div>
          <div className="mt-auto">
            <Link href="/coaches">
              <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                View Coaches
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Builder Tools Section */}
      <div className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Builder Tools</h2>
            <p className="text-gray-600">Marketing and analytics tools for coaches</p>
          </div>
          <Link href="/builders">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
              View All Builders
            </button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/builders/utm" className="group">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 hover:border-blue-200 transition-all group-hover:shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-blue-500 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">UTM Builder</h3>
                  <p className="text-xs text-gray-600">QR codes & tracking</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/builders/email-templates" className="group">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 hover:border-green-200 transition-all group-hover:shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-green-500 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email Templates</h3>
                  <p className="text-xs text-gray-600">MJML & A/B testing</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/builders/landing-components" className="group">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-100 hover:border-purple-200 transition-all group-hover:shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-purple-500 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 002 2h4a2 2 0 012-2V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Landing Components</h3>
                  <p className="text-xs text-gray-600">WordPress & Wix</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/builders/reports" className="group">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-100 hover:border-orange-200 transition-all group-hover:shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-orange-500 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Custom Reports</h3>
                  <p className="text-xs text-gray-600">SQL & dashboard</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Latest admin actions and system events</p>
        </div>
        <div className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            <div className="text-gray-500 text-lg font-medium mb-2">Activity tracking coming soon</div>
              <div className="text-gray-400 text-sm mb-6">
              Activity logs will appear here as you manage coaches and invitations
              </div>
              <div className="space-y-2">
                <Link href="/invitations">
                  <button className="block mx-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                    Send First Invitation
                  </button>
                </Link>
                <Link href="/coaches">
                  <button className="block mx-auto bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm">
                    View Coaches
                  </button>
                </Link>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
