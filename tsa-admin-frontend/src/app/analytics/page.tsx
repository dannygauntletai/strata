'use client'

import { useState, useEffect } from 'react'
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

interface AuditLog {
  action: string;
  details: string;
  timestamp: string;
  user: string;
  resource_type: string;
  resource_id?: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [auditLimit, setAuditLimit] = useState(50)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const [analyticsData, auditData] = await Promise.all([
        adminAPI.getAnalytics().catch(err => {
          console.error('Analytics API error:', err)
          return null
        }),
        adminAPI.getAuditLogs(auditLimit).catch(err => {
          console.error('Audit logs API error:', err)
          return { logs: [] }
        })
      ])

      // Handle null responses (from 401 logout)
      if (analyticsData !== null) {
        setAnalytics(analyticsData)
      }
      if (auditData !== null) {
        setAuditLogs(auditData.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [auditLimit])

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

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('accepted')) return 'text-green-600'
    if (action.includes('cancelled') || action.includes('deleted')) return 'text-red-600'
    if (action.includes('updated') || action.includes('resent')) return 'text-blue-600'
    return 'text-gray-600'
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
          <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Analytics</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchAnalytics} 
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
        <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
        <p className="mt-2 text-gray-600">
          Detailed insights and metrics for the TSA Coach platform
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Invitations</div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics?.total_invitations ?? 0}
          </div>
          <div className="text-sm text-blue-600">
            {analytics?.completed_invitations ?? 0} completed
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Active Coaches</div>
          <div className="text-3xl font-bold text-green-600">
            {analytics?.active_coaches ?? 0}
          </div>
          <div className="text-sm text-gray-500">
            of {analytics?.total_coaches ?? 0} total
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Completion Rate</div>
          <div className="text-3xl font-bold text-blue-600">
            {analytics?.onboarding_completion_rate?.toFixed(1) ?? 0}%
          </div>
          <div className="text-sm text-gray-500">
            Onboarding success
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Avg. Onboarding Time</div>
          <div className="text-3xl font-bold text-purple-600">
            {analytics?.average_onboarding_time ?? 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            Per coach
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Invitation Status Breakdown</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Pending</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{analytics?.pending_invitations ?? 0}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ 
                        width: analytics?.total_invitations ? 
                          `${((analytics.pending_invitations / analytics.total_invitations) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Completed</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{analytics?.completed_invitations ?? 0}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: analytics?.total_invitations ? 
                          `${((analytics.completed_invitations / analytics.total_invitations) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Cancelled</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{analytics?.cancelled_invitations ?? 0}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: analytics?.total_invitations ? 
                          `${((analytics.cancelled_invitations / analytics.total_invitations) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Coach Activity Status</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Active Coaches</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{analytics?.active_coaches ?? 0}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: analytics?.total_coaches ? 
                          `${((analytics.active_coaches / analytics.total_coaches) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Inactive Coaches</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {(analytics?.total_coaches ?? 0) - (analytics?.active_coaches ?? 0)}
                  </span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ 
                        width: analytics?.total_coaches ? 
                          `${(((analytics.total_coaches - analytics.active_coaches) / analytics.total_coaches) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Platform Activity</h2>
          <p className="text-sm text-gray-500">Latest actions and events across the platform</p>
        </div>
        <div className="p-6">
          {analytics?.recent_activity && analytics.recent_activity.length > 0 ? (
            <div className="space-y-4">
              {analytics.recent_activity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${getActionColor(activity.action)}`}>
                      {activity.action}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{activity.details}</div>
                    {activity.user && (
                      <div className="text-xs text-gray-500 mt-1">by {activity.user}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 ml-4">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">No recent activity</div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Audit Logs</h2>
              <p className="text-sm text-gray-500">Detailed system activity and changes</p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                value={auditLimit}
                onChange={(e) => setAuditLimit(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value={25}>25 entries</option>
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
                <option value={200}>200 entries</option>
              </select>
            </div>
          </div>
        </div>
        <div className="">
          {auditLogs.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                        <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{log.details}</div>
                          {log.resource_type && (
                            <div className="text-xs text-gray-500">{log.resource_type} {log.resource_id && `- ${log.resource_id}`}</div>
                      )}
                    </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                      {log.user}
                    </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {auditLogs.map((log, index) => (
                  <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-900 mb-2">{log.details}</div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>by {log.user}</span>
                      {log.resource_type && (
                        <span>{log.resource_type}{log.resource_id && ` - ${log.resource_id}`}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <div className="text-gray-400 text-sm">No audit logs available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 