'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface EmailTemplate {
  id?: string
  name: string
  subject: string
  mjml_content: string
  html_content?: string
  variables: string[]
  category: 'welcome' | 'newsletter' | 'promotional' | 'announcement' | 'custom'
  status: 'draft' | 'active' | 'archived'
  created_at?: string
  updated_at?: string
  stats?: {
    sent: number
    opened: number
    clicked: number
    open_rate: number
    click_rate: number
  }
}

interface ABTestVariant {
  id: string
  name: string
  subject: string
  weight: number
  stats: {
    sent: number
    opened: number
    clicked: number
    open_rate: number
    click_rate: number
  }
}

interface ABTest {
  id?: string
  template_id: string
  name: string
  variants: ABTestVariant[]
  status: 'draft' | 'running' | 'completed'
  winner?: string
  created_at?: string
}

export default function EmailTemplateBuilderPage() {
  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    subject: '',
    mjml_content: '',
    variables: [],
    category: 'custom',
    status: 'draft'
  })
  
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([])
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [previewHTML, setPreviewHTML] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('builder')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  
  // MJML Template Presets
  const templatePresets = {
    welcome: {
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}, {{first_name}}! 🎉',
      mjml_content: `<mjml>
  <mj-head>
    <mj-title>Welcome Email</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="16px" color="#333" line-height="1.5" />
      <mj-button background-color="#007bff" border-radius="5px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-image width="200px" src="{{company_logo}}" alt="{{company_name}}" />
        <mj-divider border-color="#e0e0e0" />
        <mj-text font-size="24px" font-weight="bold" align="center">
          Welcome, {{first_name}}!
        </mj-text>
        <mj-text>
          We're thrilled to have you join {{company_name}}. You're now part of a community of dedicated coaches and athletes working towards excellence.
        </mj-text>
        <mj-text>
          Here's what you can expect:
        </mj-text>
        <mj-text>
          • Access to premium coaching resources<br/>
          • Connect with other coaches in your area<br/>
          • Build and manage your athlete roster<br/>
          • Track progress and performance
        </mj-text>
        <mj-button href="{{onboarding_url}}">
          Complete Your Profile
        </mj-button>
        <mj-text font-size="14px" color="#666">
          Need help? Reply to this email or visit our support center.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
      variables: ['company_name', 'first_name', 'company_logo', 'onboarding_url']
    },
    newsletter: {
      name: 'Monthly Newsletter',
      subject: '{{month}} Newsletter: Latest Training Tips & Updates',
      mjml_content: `<mjml>
  <mj-head>
    <mj-title>Monthly Newsletter</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="16px" color="#333" line-height="1.5" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8f9fa">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-image width="150px" src="{{company_logo}}" alt="{{company_name}}" />
        <mj-text font-size="28px" font-weight="bold" align="center" color="#2c3e50">
          {{month}} Newsletter
        </mj-text>
        <mj-text font-size="18px" color="#7f8c8d" align="center">
          Training tips, success stories, and platform updates
        </mj-text>
        <mj-divider border-color="#e9ecef" />
        
        <mj-text font-size="20px" font-weight="bold" color="#2c3e50">
          🏆 Coach Spotlight
        </mj-text>
        <mj-text>
          This month we're featuring {{featured_coach}}, who has helped over {{athlete_count}} athletes achieve their goals.
        </mj-text>
        
        <mj-text font-size="20px" font-weight="bold" color="#2c3e50">
          📚 Training Tip of the Month
        </mj-text>
        <mj-text>
          {{training_tip}}
        </mj-text>
        
        <mj-button href="{{newsletter_url}}" background-color="#28a745">
          Read Full Newsletter
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
      variables: ['company_name', 'company_logo', 'month', 'featured_coach', 'athlete_count', 'training_tip', 'newsletter_url']
    },
    promotional: {
      name: 'Promotional Email',
      subject: '{{discount_percent}}% Off - Limited Time Offer! 🔥',
      mjml_content: `<mjml>
  <mj-head>
    <mj-title>Promotional Offer</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="16px" color="#333" line-height="1.5" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8f9fa">
    <mj-section background-color="#dc3545" padding="20px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="18px" font-weight="bold">
          ⏰ LIMITED TIME OFFER - {{expiry_date}}
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-image width="150px" src="{{company_logo}}" alt="{{company_name}}" />
        <mj-text font-size="32px" font-weight="bold" align="center" color="#dc3545">
          {{discount_percent}}% OFF
        </mj-text>
        <mj-text font-size="24px" align="center" color="#2c3e50">
          {{offer_title}}
        </mj-text>
        <mj-text align="center">
          {{offer_description}}
        </mj-text>
        <mj-text align="center" font-size="18px" color="#28a745" font-weight="bold">
          Use code: {{promo_code}}
        </mj-text>
        <mj-button href="{{cta_url}}" background-color="#dc3545" font-size="18px">
          {{cta_text}}
        </mj-button>
        <mj-text font-size="14px" color="#6c757d" align="center">
          Offer expires {{expiry_date}}. Terms and conditions apply.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
      variables: ['company_name', 'company_logo', 'discount_percent', 'offer_title', 'offer_description', 'promo_code', 'cta_url', 'cta_text', 'expiry_date']
    }
  }

  useEffect(() => {
    fetchSavedTemplates()
    fetchABTests()
  }, [])

  const fetchSavedTemplates = async () => {
    try {
      // This would call your backend API
      // const response = await adminAPI.getEmailTemplates()
      // setSavedTemplates(response)
      
      // Mock data
      setSavedTemplates([
        {
          id: '1',
          name: 'Welcome Series - Email 1',
          subject: 'Welcome to TSA Coaching Platform! 🎉',
          mjml_content: templatePresets.welcome.mjml_content,
          variables: templatePresets.welcome.variables,
          category: 'welcome',
          status: 'active',
          created_at: '2024-01-15T10:30:00Z',
          stats: {
            sent: 1250,
            opened: 1000,
            clicked: 450,
            open_rate: 80.0,
            click_rate: 36.0
          }
        }
      ])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchABTests = async () => {
    try {
      // Mock A/B test data
      setAbTests([
        {
          id: '1',
          template_id: '1',
          name: 'Welcome Email Subject Test',
          status: 'running',
          variants: [
            {
              id: 'a',
              name: 'Variant A (Emoji)',
              subject: 'Welcome to TSA Coaching Platform! 🎉',
              weight: 50,
              stats: { sent: 625, opened: 520, clicked: 234, open_rate: 83.2, click_rate: 37.4 }
            },
            {
              id: 'b',
              name: 'Variant B (No Emoji)',
              subject: 'Welcome to TSA Coaching Platform',
              weight: 50,
              stats: { sent: 625, opened: 480, clicked: 216, open_rate: 76.8, click_rate: 34.6 }
            }
          ],
          created_at: '2024-01-10T09:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch A/B tests:', error)
    }
  }

  const handlePresetSelect = (presetKey: string) => {
    const preset = templatePresets[presetKey as keyof typeof templatePresets]
    setTemplate(prev => ({
      ...prev,
      name: preset.name,
      subject: preset.subject,
      mjml_content: preset.mjml_content,
      variables: preset.variables,
      category: presetKey as any
    }))
  }

  const handleSaveTemplate = async () => {
    try {
      setLoading(true)
      
      // This would call your backend API
      // const response = await adminAPI.createEmailTemplate(template)
      
      // Mock save
      const newTemplate = {
        ...template,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        html_content: previewHTML,
        stats: {
          sent: 0,
          opened: 0,
          clicked: 0,
          open_rate: 0,
          click_rate: 0
        }
      }
      
      setSavedTemplates(prev => [newTemplate, ...prev])
      
      // Reset form
      setTemplate({
        name: '',
        subject: '',
        mjml_content: '',
        variables: [],
        category: 'custom',
        status: 'draft'
      })
      setPreviewHTML('')
      
      alert('Template saved successfully!')
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const compilePreview = async () => {
    if (!template.mjml_content) return
    
    try {
      setLoading(true)
      
      // This would call your backend API to compile MJML
      // const response = await adminAPI.compileMJML(template.mjml_content)
      
      // Mock compilation - in reality this would be server-side MJML compilation
      const mockHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: white; padding: 40px; border-radius: 8px;">
            <h1 style="color: #333; text-align: center;">Preview Compiled from MJML</h1>
            <p style="color: #666; line-height: 1.5;">
              This is a preview of your email template. The actual compilation would happen server-side using the MJML library.
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Variables detected:</strong> ${template.variables.join(', ')}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Call to Action Button
              </a>
            </div>
          </div>
        </div>
      `
      setPreviewHTML(mockHTML)
    } catch (error) {
      console.error('Failed to compile preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const extractVariables = (mjmlContent: string) => {
    const variableRegex = /\{\{([^}]+)\}\}/g
    const variables = new Set<string>()
    let match
    
    while ((match = variableRegex.exec(mjmlContent)) !== null) {
      variables.add(match[1].trim())
    }
    
    return Array.from(variables)
  }

  useEffect(() => {
    // Auto-extract variables when MJML content changes
    if (template.mjml_content) {
      const extractedVars = extractVariables(template.mjml_content)
      setTemplate(prev => ({ ...prev, variables: extractedVars }))
    }
  }, [template.mjml_content])

  const createABTest = async (templateId: string) => {
    const testName = prompt('Enter A/B Test Name:')
    if (!testName) return
    
    const variantB = prompt('Enter Variant B Subject Line:')
    if (!variantB) return
    
    // This would call your backend API
    // await adminAPI.createABTest({ template_id: templateId, name: testName, variant_b_subject: variantB })
    
    alert('A/B Test created successfully!')
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
            <h1 className="text-3xl font-bold text-gray-900">Email Template Builder</h1>
            <p className="mt-2 text-gray-600">
              Create responsive email templates with MJML and test with A/B variants
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {savedTemplates.length} templates created
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'builder', name: 'Template Builder', icon: 'code' },
            { id: 'templates', name: 'Saved Templates', icon: 'collection' },
            { id: 'ab-tests', name: 'A/B Tests', icon: 'beaker' },
            { id: 'analytics', name: 'Analytics', icon: 'chart' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Template Details</h2>
              
              {/* Quick Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Quick Start Templates</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(templatePresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 text-sm font-medium text-gray-700 hover:text-green-700 transition-colors text-left"
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{preset.variables.length} variables</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Email - New Coaches"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={template.subject}
                    onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Use {{variables}} for personalization"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {'{variable_name}'} for dynamic content</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={template.category}
                      onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="welcome">Welcome</option>
                      <option value="newsletter">Newsletter</option>
                      <option value="promotional">Promotional</option>
                      <option value="announcement">Announcement</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={template.status}
                      onChange={(e) => setTemplate(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* MJML Editor */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">MJML Template</h2>
                <button
                  onClick={compilePreview}
                  disabled={!template.mjml_content || loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Compiling...' : 'Preview'}
                </button>
              </div>
              
              <textarea
                value={template.mjml_content}
                onChange={(e) => setTemplate(prev => ({ ...prev, mjml_content: e.target.value }))}
                placeholder="Enter your MJML template here..."
                className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 font-mono text-sm"
              />
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-700 mb-2">Variables Detected:</div>
                <div className="flex flex-wrap gap-2">
                  {template.variables.length > 0 ? (
                    template.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {variable}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No variables detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleSaveTemplate}
                disabled={!template.name || !template.subject || !template.mjml_content || loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
              
              <button
                onClick={() => {
                  setTemplate({
                    name: '',
                    subject: '',
                    mjml_content: '',
                    variables: [],
                    category: 'custom',
                    status: 'draft'
                  })
                  setPreviewHTML('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Live Preview</h2>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[500px]">
                {previewHTML ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewHTML }}
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <p className="text-sm">Click "Preview" to compile MJML</p>
                    </div>
                  </div>
                )}
              </div>
              
              {previewHTML && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([previewHTML], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${template.name || 'template'}.html`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                  >
                    Download HTML
                  </button>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewHTML)
                      alert('HTML copied to clipboard!')
                    }}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Copy HTML
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Saved Templates</h2>
            <p className="text-sm text-gray-500">Manage your email templates and track performance</p>
          </div>
          
          <div className="p-6">
            {savedTemplates.length > 0 ? (
              <div className="space-y-4">
                {savedTemplates.map((savedTemplate) => (
                  <div key={savedTemplate.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{savedTemplate.name}</h3>
                        <p className="text-sm text-gray-600">{savedTemplate.subject}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          savedTemplate.status === 'active' ? 'bg-green-100 text-green-800' :
                          savedTemplate.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {savedTemplate.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          savedTemplate.category === 'welcome' ? 'bg-blue-100 text-blue-800' :
                          savedTemplate.category === 'newsletter' ? 'bg-purple-100 text-purple-800' :
                          savedTemplate.category === 'promotional' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {savedTemplate.category}
                        </span>
                      </div>
                    </div>
                    
                    {savedTemplate.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-700">Sent:</span>
                          <span className="ml-2 text-gray-600">{savedTemplate.stats.sent.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Opened:</span>
                          <span className="ml-2 text-gray-600">{savedTemplate.stats.opened.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Clicked:</span>
                          <span className="ml-2 text-gray-600">{savedTemplate.stats.clicked.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Open Rate:</span>
                          <span className="ml-2 text-green-600 font-medium">{savedTemplate.stats.open_rate}%</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Click Rate:</span>
                          <span className="ml-2 text-blue-600 font-medium">{savedTemplate.stats.click_rate}%</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        Edit
                      </button>
                      <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                        Duplicate
                      </button>
                      <button
                        onClick={() => createABTest(savedTemplate.id!)}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Create A/B Test
                      </button>
                      <span className="text-sm text-gray-500">
                        Created {new Date(savedTemplate.created_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium mb-2">No templates yet</p>
                <p className="text-gray-400 text-sm mb-6">Create your first email template to get started</p>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Create Template
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'ab-tests' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">A/B Tests</h2>
            <p className="text-sm text-gray-500">Compare email variants and optimize performance</p>
          </div>
          
          <div className="p-6">
            {abTests.length > 0 ? (
              <div className="space-y-6">
                {abTests.map((test) => (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{test.name}</h3>
                        <p className="text-sm text-gray-500">Template ID: {test.template_id}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'running' ? 'bg-green-100 text-green-800' :
                        test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {test.variants.map((variant) => (
                        <div key={variant.id} className="border border-gray-100 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{variant.name}</h4>
                            <span className="text-sm text-gray-500">{variant.weight}% traffic</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4">"{variant.subject}"</p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Sent</div>
                              <div className="font-medium">{variant.stats.sent.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Open Rate</div>
                              <div className="font-medium text-green-600">{variant.stats.open_rate}%</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Clicked</div>
                              <div className="font-medium">{variant.stats.clicked.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Click Rate</div>
                              <div className="font-medium text-blue-600">{variant.stats.click_rate}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Started {new Date(test.created_at!).toLocaleDateString()}
                      </span>
                      <div className="space-x-3">
                        {test.status === 'running' && (
                          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                            Stop Test
                          </button>
                        )}
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium mb-2">No A/B tests yet</p>
                <p className="text-gray-400 text-sm">Create templates first, then start A/B testing</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Email Analytics</h2>
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium mb-2">Email Performance Dashboard</p>
            <p className="text-gray-400 text-sm">Detailed email analytics and insights coming soon</p>
          </div>
        </div>
      )}
    </div>
  )
} 