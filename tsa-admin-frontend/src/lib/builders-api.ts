/**
 * Builder Tools API Client
 * Connects frontend components to backend APIs for all builder tools
 */

import { adminAPI } from './auth'

// API Configuration
const API_BASE_URL = 'https://1ftsz7n04d.execute-api.us-east-1.amazonaws.com/prod'  // Admin backend API endpoint

// =================================
// UTM CAMPAIGN BUILDER API
// =================================

export interface UTMCampaign {
  id?: string
  tenant_id?: string
  name: string
  url: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term?: string
  utm_content?: string
  short_url?: string
  qr_code?: string
  qr_settings?: {
    size: number
    error_correction: 'L' | 'M' | 'Q' | 'H'
    border_size: number
    dark_color: string
    light_color: string
  }
  created_at?: string
  updated_at?: string
  click_count?: number
  is_active?: boolean
}

export const utmAPI = {
  // Get all UTM campaigns
  getCampaigns: async (): Promise<UTMCampaign[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/utm-campaigns`, {
        method: 'GET'
      })
      return response.campaigns || []
    } catch (error) {
      console.error('Failed to fetch UTM campaigns:', error)
      throw error
    }
  },

  // Create new UTM campaign
  createCampaign: async (campaign: Omit<UTMCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<UTMCampaign> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/utm-campaigns`, {
        method: 'POST',
        body: JSON.stringify(campaign)
      })
      return response.campaign
    } catch (error) {
      console.error('Failed to create UTM campaign:', error)
      throw error
    }
  },

  // Update UTM campaign
  updateCampaign: async (id: string, updates: Partial<UTMCampaign>): Promise<UTMCampaign> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/utm-campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      return response.campaign
    } catch (error) {
      console.error('Failed to update UTM campaign:', error)
      throw error
    }
  },

  // Delete UTM campaign
  deleteCampaign: async (id: string): Promise<void> => {
    try {
      await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/utm-campaigns/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to delete UTM campaign:', error)
      throw error
    }
  },

  // Generate QR code for campaign
  generateQRCode: async (url: string, settings?: UTMCampaign['qr_settings']): Promise<{ qr_code: string }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/utm-campaigns/qr-code`, {
        method: 'POST',
        body: JSON.stringify({ url, settings })
      })
      return response
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      throw error
    }
  }
}

// =================================
// EMAIL TEMPLATE BUILDER API
// =================================

export interface EmailTemplate {
  id?: string
  tenant_id?: string
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

export interface ABTest {
  id?: string
  template_id: string
  name: string
  variants: Array<{
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
  }>
  status: 'draft' | 'running' | 'completed'
  winner?: string
  created_at?: string
}

export const emailAPI = {
  // Get all email templates
  getTemplates: async (): Promise<EmailTemplate[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates`, {
        method: 'GET'
      })
      return response.templates || []
    } catch (error) {
      console.error('Failed to fetch email templates:', error)
      throw error
    }
  },

  // Get template presets
  getPresets: async (): Promise<any[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates/presets`, {
        method: 'GET'
      })
      return response.presets || []
    } catch (error) {
      console.error('Failed to fetch template presets:', error)
      throw error
    }
  },

  // Create new email template
  createTemplate: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates`, {
        method: 'POST',
        body: JSON.stringify(template)
      })
      return response.template
    } catch (error) {
      console.error('Failed to create email template:', error)
      throw error
    }
  },

  // Compile MJML to HTML
  compileMJML: async (mjml_content: string): Promise<{ html_content: string }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates/compile`, {
        method: 'POST',
        body: JSON.stringify({ mjml_content })
      })
      return response
    } catch (error) {
      console.error('Failed to compile MJML:', error)
      throw error
    }
  },

  // Get A/B tests
  getABTests: async (): Promise<ABTest[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates/ab-tests`, {
        method: 'GET'
      })
      return response.tests || []
    } catch (error) {
      console.error('Failed to fetch A/B tests:', error)
      throw error
    }
  },

  // Create A/B test
  createABTest: async (test: Omit<ABTest, 'id' | 'created_at'>): Promise<ABTest> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/email-templates/ab-tests`, {
        method: 'POST',
        body: JSON.stringify(test)
      })
      return response.test
    } catch (error) {
      console.error('Failed to create A/B test:', error)
      throw error
    }
  }
}

// =================================
// LANDING PAGE COMPONENTS API
// =================================

export interface LandingComponent {
  id?: string
  tenant_id?: string
  name: string
  type: 'hero' | 'features' | 'cta' | 'form' | 'testimonials' | 'stats' | 'pricing' | 'faq'
  config: Record<string, any>
  wordpress_shortcode?: string
  embed_code?: string
  created_at?: string
  updated_at?: string
}

export const landingAPI = {
  // Get all landing page components
  getComponents: async (): Promise<LandingComponent[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/landing-components`, {
        method: 'GET'
      })
      return response.components || []
    } catch (error) {
      console.error('Failed to fetch landing components:', error)
      throw error
    }
  },

  // Get available component types
  getComponentTypes: async (): Promise<any[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/landing-components/types`, {
        method: 'GET'
      })
      return response.types || []
    } catch (error) {
      console.error('Failed to fetch component types:', error)
      throw error
    }
  },

  // Create new landing component
  createComponent: async (component: Omit<LandingComponent, 'id' | 'created_at' | 'updated_at'>): Promise<LandingComponent> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/landing-components`, {
        method: 'POST',
        body: JSON.stringify(component)
      })
      return response.component
    } catch (error) {
      console.error('Failed to create landing component:', error)
      throw error
    }
  },

  // Generate WordPress plugin
  generateWordPressPlugin: async (): Promise<{ plugin_zip: string }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/landing-components/wordpress-plugin`, {
        method: 'POST'
      })
      return response
    } catch (error) {
      console.error('Failed to generate WordPress plugin:', error)
      throw error
    }
  }
}

// =================================
// CUSTOM REPORTS API
// =================================

export interface CustomReport {
  id?: string
  tenant_id?: string
  name: string
  description?: string
  query: string
  parameters?: Record<string, any>
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    recipients: string[]
  }
  created_at?: string
  updated_at?: string
  last_run?: string
}

export const reportsAPI = {
  // Get all custom reports
  getReports: async (): Promise<CustomReport[]> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/custom-reports`, {
        method: 'GET'
      })
      return response.reports || []
    } catch (error) {
      console.error('Failed to fetch custom reports:', error)
      throw error
    }
  },

  // Create new custom report
  createReport: async (report: Omit<CustomReport, 'id' | 'created_at' | 'updated_at'>): Promise<CustomReport> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/custom-reports`, {
        method: 'POST',
        body: JSON.stringify(report)
      })
      return response.report
    } catch (error) {
      console.error('Failed to create custom report:', error)
      throw error
    }
  },

  // Execute report and get results
  executeReport: async (id: string, parameters?: Record<string, any>): Promise<{ results: any[], columns: string[] }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/custom-reports/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ parameters })
      })
      return response
    } catch (error) {
      console.error('Failed to execute report:', error)
      throw error
    }
  }
}

// =================================
// REAL-TIME ANALYTICS API
// =================================

export interface AnalyticsEvent {
  id?: string
  tenant_id?: string
  event_type: string
  event_data: Record<string, any>
  user_id?: string
  session_id?: string
  timestamp?: string
  source?: string
}

export const realTimeAPI = {
  // Get real-time events stream
  getEventsStream: async (since?: string): Promise<AnalyticsEvent[]> => {
    try {
      const params = since ? `?since=${encodeURIComponent(since)}` : ''
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/analytics/events${params}`, {
        method: 'GET'
      })
      return response.events || []
    } catch (error) {
      console.error('Failed to fetch real-time events:', error)
      throw error
    }
  },

  // Send custom event
  sendEvent: async (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/analytics/events`, {
        method: 'POST',
        body: JSON.stringify(event)
      })
      return response.event
    } catch (error) {
      console.error('Failed to send analytics event:', error)
      throw error
    }
  },

  // Get live dashboard data
  getDashboardData: async (): Promise<{
    active_sessions: number
    events_last_hour: number
    top_pages: Array<{ page: string; views: number }>
    recent_events: AnalyticsEvent[]
  }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/analytics/dashboard`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      throw error
    }
  }
}

// =================================
// TRACKING SCRIPT API
// =================================

export const trackingAPI = {
  // Get tracking script
  getTrackingScript: async (): Promise<{ script: string; installation_guide: string }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/public/tracking-script.js`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('Failed to fetch tracking script:', error)
      throw error
    }
  },

  // Get tracking configuration
  getTrackingConfig: async (): Promise<{
    tenant_id: string
    tracking_domains: string[]
    events_to_capture: string[]
    privacy_settings: Record<string, any>
  }> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/tracking/config`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('Failed to fetch tracking config:', error)
      throw error
    }
  },

  // Update tracking configuration
  updateTrackingConfig: async (config: Record<string, any>): Promise<any> => {
    try {
      const response = await adminAPI.authenticatedRequest(`${API_BASE_URL}/admin/tracking/config`, {
        method: 'PUT',
        body: JSON.stringify(config)
      })
      return response
    } catch (error) {
      console.error('Failed to update tracking config:', error)
      throw error
    }
  }
}

// =================================
// COMBINED BUILDERS API
// =================================

export const buildersAPI = {
  utm: utmAPI,
  email: emailAPI,
  landing: landingAPI,
  reports: reportsAPI,
  realTime: realTimeAPI,
  tracking: trackingAPI
}

export default buildersAPI 