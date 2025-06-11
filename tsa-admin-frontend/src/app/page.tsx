'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminAPI } from '@/lib/auth'

interface AnalyticsData {
  total_invitations: number;
  pending_invitations: number;
  completed_invitations: number;
  cancelled_invitations: number;
  total_coaches: number;
  active_coaches: number;
  onboarding_completion_rate: number;
  average_onboarding_time: string;
  recent_activity: Array<{
    action: string;
    details: string;
    timestamp: string;
    user?: string;
  }>;
}

interface HealthData {
  status: string;
  services: {
    lambda?: string;
    dynamodb?: string;
    ses?: string;
  };
  timestamp: string;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch analytics and health data in parallel
        const [analyticsData, healthData] = await Promise.all([
          adminAPI.getAnalytics().catch(err => {
            console.error('Analytics API error:', err)
            return null
          }),
          adminAPI.getHealth().catch(err => {
            console.error('Health API error:', err)
            return null
          })
        ])

        // Handle null responses (from 401 logout)
        if (analyticsData !== null) {
          setAnalytics(analyticsData)
        }
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500">Total Coaches</div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics?.total_coaches ?? 0}
          </div>
          <div className="text-sm text-green-600">
            {analytics?.active_coaches ?? 0} active
          </div>
          {(analytics?.total_coaches ?? 0) === 0 && (
            <div className="mt-2 text-xs text-gray-400">
              No coaches registered yet
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500">Total Invitations</div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics?.total_invitations ?? 0}
          </div>
          <div className="text-sm text-blue-600">
            {analytics?.completed_invitations ?? 0} completed
          </div>
          {(analytics?.total_invitations ?? 0) === 0 && (
            <div className="mt-2 text-xs text-gray-400">
              <Link href="/invitations" className="text-blue-500 hover:text-blue-700">
                Send your first invitation →
              </Link>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500">Pending Invitations</div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics?.pending_invitations ?? 0}
          </div>
          <div className="text-sm text-yellow-600">
            {analytics?.cancelled_invitations ?? 0} cancelled
          </div>
          {(analytics?.pending_invitations ?? 0) === 0 && (analytics?.total_invitations ?? 0) > 0 && (
            <div className="mt-2 text-xs text-green-400">
              All invitations processed ✓
            </div>
          )}
          {(analytics?.total_invitations ?? 0) === 0 && (
            <div className="mt-2 text-xs text-gray-400">
              No pending invitations
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500">Onboarding Rate</div>
          <div className="text-3xl font-bold text-green-600">
            {analytics?.onboarding_completion_rate?.toFixed(1) ?? 0}%
          </div>
          <div className="text-sm text-gray-500">
            {analytics?.total_invitations > 0 
              ? `${analytics.completed_invitations}/${analytics.total_invitations} completed`
              : 'No data yet'
            }
          </div>
          {(analytics?.total_invitations ?? 0) === 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Rate calculated after first invitation
            </div>
          )}
        </div>
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
              { name: 'Email Service (SES)', service: 'ses' },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        
        <div className="bg-white p-6 rounded-lg shadow flex flex-col h-full">
          <div className="flex-grow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Analytics</h3>
            <p className="text-gray-600 mb-4">View detailed analytics and reports</p>
          </div>
          <div className="mt-auto">
            <Link href="/analytics">
              <button className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                View Analytics
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Latest admin actions and system events</p>
        </div>
        <div className="p-6">
          {analytics?.recent_activity && analytics.recent_activity.length > 0 ? (
            <div className="space-y-4">
              {analytics.recent_activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                    <div className="text-sm text-gray-500">{activity.details}</div>
                    {activity.user && activity.user !== 'System' && (
                      <div className="text-xs text-gray-400 mt-1">by {activity.user}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 ml-4">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-gray-500 text-lg font-medium mb-2">No recent activity</div>
              <div className="text-gray-400 text-sm mb-6">
                Activity will appear here as you manage coaches and invitations
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
          )}
        </div>
      </div>
    </div>
  )
}
