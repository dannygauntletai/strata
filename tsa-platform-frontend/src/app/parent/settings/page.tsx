'use client'

import { Heading } from '@/components/heading'

export default function SettingsPage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Heading className="text-3xl font-bold">Settings</Heading>
          <p className="text-gray-600 mt-2">Configure your portal preferences and account settings</p>
        </div>
        
        <div className="card p-6">
          <Heading className="text-lg font-semibold mb-4">Portal Settings</Heading>
          <p className="text-gray-500">Settings configuration coming soon...</p>
        </div>
      </div>
    </div>
  )
} 