'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminAPI } from '@/lib/auth'

interface UTMCampaign {
  id?: string
  campaign_id?: string
  name: string
  url: string
  utm_url?: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term?: string
  utm_content?: string
  short_url?: string
  qr_code?: string
  created_at?: string
  click_count?: number
  clicks?: number
  conversions?: number
}

interface QRCodeSettings {
  size: number
  error_correction: 'L' | 'M' | 'Q' | 'H'
  border_size: number
  dark_color: string
  light_color: string
}

export default function UTMBuilderPage() {
  const [campaign, setCampaign] = useState<UTMCampaign>({
    name: '',
    url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: ''
  })
  
  const [qrSettings, setQRSettings] = useState<QRCodeSettings>({
    size: 200,
    error_correction: 'M',
    border_size: 4,
    dark_color: '#000000',
    light_color: '#FFFFFF'
  })
  
  const [generatedURL, setGeneratedURL] = useState('')
  const [qrCodeURL, setQRCodeURL] = useState('')
  const [savedCampaigns, setSavedCampaigns] = useState<UTMCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('builder')
  
  // Common UTM presets
  const presets = {
    social: {
      utm_source: 'social',
      utm_medium: 'social-media',
      suggestions: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok']
    },
    email: {
      utm_source: 'email',
      utm_medium: 'email',
      suggestions: ['newsletter', 'welcome-series', 'promotional', 'announcement']
    },
    paid: {
      utm_source: 'google',
      utm_medium: 'cpc',
      suggestions: ['brand-keywords', 'coaching-services', 'local-coaching']
    },
    organic: {
      utm_source: 'google',
      utm_medium: 'organic',
      suggestions: ['seo-content', 'blog-post', 'resource-page']
    }
  }

  useEffect(() => {
    // Auto-generate URL when campaign details change
    if (campaign.url && campaign.utm_source && campaign.utm_medium && campaign.utm_campaign) {
      const url = new URL(campaign.url)
      url.searchParams.set('utm_source', campaign.utm_source)
      url.searchParams.set('utm_medium', campaign.utm_medium)
      url.searchParams.set('utm_campaign', campaign.utm_campaign)
      if (campaign.utm_term) url.searchParams.set('utm_term', campaign.utm_term)
      if (campaign.utm_content) url.searchParams.set('utm_content', campaign.utm_content)
      setGeneratedURL(url.toString())
    }
  }, [campaign])

  useEffect(() => {
    // Load saved campaigns
    fetchSavedCampaigns()
  }, [])

  const fetchSavedCampaigns = async () => {
    try {
      // Call the same backend API as analytics page
      const response = await adminAPI.authenticatedRequest(`${adminAPI.getBaseUrl('admin')}/admin/utm`)
      setSavedCampaigns(response.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      setSavedCampaigns([])
    }
  }

  const handlePresetSelect = (presetKey: string) => {
    const preset = presets[presetKey as keyof typeof presets]
    setCampaign(prev => ({
      ...prev,
      utm_source: preset.utm_source,
      utm_medium: preset.utm_medium
    }))
  }

  const handleSaveCampaign = async () => {
    try {
      setLoading(true)
      
      // Call the backend API to create UTM campaign
      const response = await adminAPI.authenticatedRequest(`${adminAPI.getBaseUrl('admin')}/admin/utm/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaign,
          url: generatedURL,
          tenant_id: 'default',
          name: campaign.name
        })
      })
      
      // Refresh campaigns list
      await fetchSavedCampaigns()
      
      // Reset form
      setCampaign({
        name: '',
        url: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: ''
      })
      setGeneratedURL('')
      
      alert('Campaign saved successfully!')
    } catch (error) {
      console.error('Failed to save campaign:', error)
      alert('Failed to save campaign')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    if (!generatedURL) return
    
    try {
      setLoading(true)
      
      // Use QR Server API for QR code generation
      const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSettings.size}x${qrSettings.size}&data=${encodeURIComponent(generatedURL)}&bgcolor=${qrSettings.light_color.substring(1)}&color=${qrSettings.dark_color.substring(1)}`
      setQRCodeURL(qrCodeURL)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/builders" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-2 inline-block">
              ← Back to Builders
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">UTM Campaign Builder</h1>
            <p className="mt-2 text-gray-600">
              Create trackable URLs with QR codes for your marketing campaigns
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {savedCampaigns.length} campaigns created
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'builder', name: 'Campaign Builder', icon: 'plus' },
            { id: 'campaigns', name: 'Saved Campaigns', icon: 'collection' },
            { id: 'analytics', name: 'Analytics', icon: 'chart' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Builder Tab */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Campaign Details</h2>
              
              {/* Quick Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(presets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-colors"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Summer Coaching Promotion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Destination URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={campaign.url}
                    onChange={(e) => setCampaign(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-website.com/landing-page"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* UTM Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaign.utm_source}
                      onChange={(e) => setCampaign(prev => ({ ...prev, utm_source: e.target.value }))}
                      placeholder="facebook, google, email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Traffic source (e.g., google, facebook)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medium <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaign.utm_medium}
                      onChange={(e) => setCampaign(prev => ({ ...prev, utm_medium: e.target.value }))}
                      placeholder="cpc, social, email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Marketing medium (e.g., cpc, banner, email)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaign.utm_campaign}
                      onChange={(e) => setCampaign(prev => ({ ...prev, utm_campaign: e.target.value }))}
                      placeholder="summer-promo-2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Campaign name or identifier</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term (Optional)
                    </label>
                    <input
                      type="text"
                      value={campaign.utm_term}
                      onChange={(e) => setCampaign(prev => ({ ...prev, utm_term: e.target.value }))}
                      placeholder="basketball coaching"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Paid keywords</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content (Optional)
                    </label>
                    <input
                      type="text"
                      value={campaign.utm_content}
                      onChange={(e) => setCampaign(prev => ({ ...prev, utm_content: e.target.value }))}
                      placeholder="banner-ad, text-link"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use to differentiate similar content</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Settings */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">QR Code Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size (px)</label>
                  <input
                    type="number"
                    value={qrSettings.size}
                    onChange={(e) => setQRSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    min="100"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Error Correction</label>
                  <select
                    value={qrSettings.error_correction}
                    onChange={(e) => setQRSettings(prev => ({ ...prev, error_correction: e.target.value as 'L' | 'M' | 'Q' | 'H' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dark Color</label>
                  <input
                    type="color"
                    value={qrSettings.dark_color}
                    onChange={(e) => setQRSettings(prev => ({ ...prev, dark_color: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Light Color</label>
                  <input
                    type="color"
                    value={qrSettings.light_color}
                    onChange={(e) => setQRSettings(prev => ({ ...prev, light_color: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Preview</h2>
              
              {/* Generated URL */}
              {generatedURL && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generated URL</label>
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <p className="text-sm text-gray-900 break-all">{generatedURL}</p>
                    <button
                      onClick={() => copyToClipboard(generatedURL)}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              )}

              {/* QR Code Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">QR Code</label>
                  <button
                    onClick={generateQRCode}
                    disabled={!generatedURL || loading}
                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate QR'}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md border min-h-[200px] flex items-center justify-center">
                  {qrCodeURL ? (
                    <div className="text-center">
                      <img src={qrCodeURL} alt="QR Code" className="mx-auto mb-3" />
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = qrCodeURL
                          link.download = `qr-${campaign.name || 'campaign'}.png`
                          link.click()
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Download QR Code
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Generate QR code to preview</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSaveCampaign}
                  disabled={!campaign.name || !campaign.url || !campaign.utm_source || !campaign.utm_medium || !campaign.utm_campaign || loading}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Campaign'}
                </button>
                
                <button
                  onClick={() => {
                    setCampaign({
                      name: '',
                      url: '',
                      utm_source: '',
                      utm_medium: '',
                      utm_campaign: '',
                      utm_term: '',
                      utm_content: ''
                    })
                    setGeneratedURL('')
                    setQRCodeURL('')
                  }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Clear Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Saved Campaigns</h2>
            <p className="text-sm text-gray-500">Manage your UTM campaigns and track performance</p>
          </div>
          
          <div className="p-6">
            {savedCampaigns.length > 0 ? (
              <div className="space-y-4">
                {savedCampaigns.map((savedCampaign) => (
                  <div key={savedCampaign.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{savedCampaign.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{savedCampaign.clicks || savedCampaign.click_count || 0} clicks</span>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm">Edit</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Source:</span>
                        <span className="ml-2 text-gray-600">{savedCampaign.utm_source}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Medium:</span>
                        <span className="ml-2 text-gray-600">{savedCampaign.utm_medium}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Campaign:</span>
                        <span className="ml-2 text-gray-600">{savedCampaign.utm_campaign}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-4">
                      <button
                        onClick={() => copyToClipboard(savedCampaign.utm_url || savedCampaign.url)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Copy URL
                      </button>
                      {savedCampaign.short_url && (
                        <button
                          onClick={() => copyToClipboard(savedCampaign.short_url!)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Copy Short URL
                        </button>
                      )}
                      <span className="text-sm text-gray-500">
                        Created {new Date(savedCampaign.created_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium mb-2">No campaigns yet</p>
                <p className="text-gray-400 text-sm mb-6">Create your first UTM campaign to get started</p>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create Campaign
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Campaign Analytics</h2>
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium mb-2">Analytics Dashboard</p>
            <p className="text-gray-400 text-sm">Detailed campaign performance metrics coming soon</p>
          </div>
        </div>
      )}
    </div>
  )
} 