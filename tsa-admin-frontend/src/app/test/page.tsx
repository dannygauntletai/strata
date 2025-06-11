'use client'

import { useState } from 'react'
import { adminAPI } from '@/lib/auth'

interface HealthResult {
  status: string;
  services: {
    lambda?: string;
    dynamodb?: string;
    ses?: string;
  };
  timestamp: string;
}

interface InvitationsResult {
  invitations: Array<{
    invitation_id: string;
    email: string;
    role: string;
    school_name: string;
    status: string;
    created_at: string;
    expires_at: string | number;
  }>;
  count: number;
}

interface ConnectionTestResult {
  success: boolean;
  endpoint: string;
  error?: string;
  details?: any;
}

export default function TestPage() {
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null)
  const [invitationsResult, setInvitationsResult] = useState<InvitationsResult | null>(null)
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    try {
      setLoading(true)
      setError(null)
      setConnectionResult(null)
      
      console.log('🔍 Starting connection test...')
      const result = await adminAPI.testConnection()
      setConnectionResult(result)
      
      if (result.success) {
        console.log('✅ Connection test passed')
      } else {
        console.warn('⚠️ Connection test failed:', result.error)
      }
    } catch (err) {
      console.error('❌ Connection test error:', err)
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setLoading(false)
    }
  }

  const testHealthEndpoint = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminAPI.getHealth()
      
      // Handle null response (from 401 logout)
      if (result !== null) {
      setHealthResult(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed')
    } finally {
      setLoading(false)
    }
  }

  const testInvitationsEndpoint = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminAPI.getInvitations()
      
      // Handle null response (from 401 logout)
      if (result !== null) {
        setInvitationsResult(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitations fetch failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Connection Test</h1>
        <p className="mt-2 text-gray-600">
          Test the API endpoints to verify connectivity and authentication
        </p>
      </div>

      <div className="space-y-6">
        {/* Connection Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">API Connection Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            Test basic connectivity to the API without authentication
          </p>
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          {connectionResult && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Test Result:</h3>
              <div className={`p-3 rounded border ${connectionResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center mb-2">
                  <span className={`w-3 h-3 rounded-full mr-2 ${connectionResult.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`font-medium ${connectionResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {connectionResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Endpoint:</strong> {connectionResult.endpoint}</p>
                  {connectionResult.error && (
                    <p><strong>Error:</strong> {connectionResult.error}</p>
                  )}
                </div>
                <details className="mt-2">
                  <summary className="text-sm text-gray-500 cursor-pointer">Technical Details</summary>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1">
                    {JSON.stringify(connectionResult.details, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Health Check Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Health Check (No Auth Required)</h2>
          <button
            onClick={testHealthEndpoint}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Health Endpoint'}
          </button>
          
          {healthResult && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Health Check Result:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(healthResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Invitations Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invitations (Auth Required)</h2>
          <button
            onClick={testInvitationsEndpoint}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Invitations Endpoint'}
          </button>
          
          {invitationsResult && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Invitations Result:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(invitationsResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">Error:</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-4">Troubleshooting Guide</h2>
          <div className="space-y-4 text-blue-800">
            <div>
              <h3 className="font-medium mb-2">If Connection Test Fails:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Check if you're connected to the internet</li>
                <li>Verify the API endpoint URL is correct</li>
                <li>Check for firewall or proxy blocking the connection</li>
                <li>Try opening the API URL directly in your browser</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">If Authentication Fails:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Make sure you're logged in with <code className="bg-white px-1 rounded">danny.mota@superbuilders.school</code></li>
                <li>Try logging out and logging back in</li>
                <li>Check browser console for authentication errors</li>
                <li>Verify the admin email is correctly configured</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Configuration:</h3>
              <div className="text-sm bg-white p-3 rounded border">
                <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
                <p><strong>Debug Mode:</strong> Enabled in development</p>
                <p><strong>Check browser console for detailed logs</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 