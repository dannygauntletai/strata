'use client'

import React, { useRef, useEffect, useState as useReactState } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { 
  XMarkIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  Bars3BottomRightIcon
} from '@heroicons/react/20/solid'
import { useState } from 'react'
import { 
  exportAsPDF, 
  exportAsPNG, 
  printWithStyling, 
  copyToClipboard,
  downloadAsHTML,
  type ExportOptions 
} from '@/utils/exportUtils'

interface MarketingMaterial {
  id: string
  type: 'flyer' | 'brochure' | 'social-media' | 'email-template' | 'website-content' | 'presentation' | 'poster' | 'newsletter' | 'business-card' | 'event-material'
  title: string
  description: string
  thumbnail: string
  category: string
  lastModified: string
  status: 'draft' | 'published' | 'archived'
  htmlContent?: string // Store the HTML content for editing
}

interface MaterialOption {
  id: string
  type: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  category: 'print' | 'digital' | 'presentation' | 'web'
  templates: number
  estimatedTime: string
  features: string[]
}

interface MaterialCreationModalProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  materialCreationOptions: MaterialOption[]
  editingMaterial?: MarketingMaterial | null
  handleCloseModal: () => void
  handleSaveMaterial?: (material: MarketingMaterial) => void
}

export default function MaterialCreationModal({
  showCreateModal,
  setShowCreateModal,
  materialCreationOptions,
  editingMaterial,
  handleCloseModal,
  handleSaveMaterial
}: MaterialCreationModalProps) {
  const [mounted, setMounted] = useState(false)
  const [createStep, setCreateStep] = useState<'select' | 'configure' | 'template' | 'edit'>('select')
  const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialOption | null>(null)

  // AI Chat and Editing States
  const [uploadedFlyer, setUploadedFlyer] = useState<string | null>(null)
  const [uploadedFlyerData, setUploadedFlyerData] = useState<string | null>(null)
  const [flyerAnalysis, setFlyerAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [originalFileType, setOriginalFileType] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentCanvasContent, setCurrentCanvasContent] = useState<string>('')
  const [canvasTitle, setCanvasTitle] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<string | null>(null)
  const [chatWidth, setChatWidth] = useState(384) // Default width, will be adjusted on mount
  const [isResizing, setIsResizing] = useState(false)
  const [editableTitle, setEditableTitle] = useState<string>('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Initialize state based on whether we're editing or creating
  React.useEffect(() => {
    if (editingMaterial) {
      // Find the material option that matches the editing material type
      const materialOption = materialCreationOptions.find(option => option.type === editingMaterial.type)
      if (materialOption) {
        setSelectedMaterialType(materialOption)
        setCreateStep('edit') // Go directly to edit mode
        setCanvasTitle(editingMaterial.title)
        setEditableTitle(editingMaterial.title) // Initialize editable title
        
        // Load the saved HTML content if available
        if (editingMaterial.htmlContent) {
          setCurrentCanvasContent(editingMaterial.htmlContent)
          setAnalysisComplete(true)
        }
        
        // Generate dynamic welcome message via Gemini
        generateWelcomeMessage(editingMaterial.title, editingMaterial.type)
      }
    } else {
      setCreateStep('select')
      setSelectedMaterialType(null)
      setChatMessages([])
      setUploadedFlyer(null)
      setUploadedFlyerData(null)
      setFlyerAnalysis(null)
      setCurrentCanvasContent('')
      setCanvasTitle('')
      setEditableTitle('') // Reset editable title
      setAnalysisComplete(false)
      setIsAnalyzing(false)
      setOriginalFileType('')
    }
  }, [editingMaterial, materialCreationOptions])

  // Auto-scroll chat to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      const minWidth = 320
      const maxWidth = window.innerWidth * 0.5 // 50% of viewport width
      setChatWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Set responsive chat width on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const responsiveWidth = Math.min(384, window.innerWidth * 0.4)
      setChatWidth(responsiveWidth)
    }
  }, [])

  // Only render on client side to prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // Enhanced markdown parser for premium chat experience with consistent styling
  const parseMarkdown = (text: string) => {
    return text
      .replace(/\n/g, '<br>')
      // Remove markdown formatting that could cause inconsistent styling
      .replace(/##\s*(.*?)$/gm, '<span style="font-weight: 600;">$1</span><br>')
      .replace(/###\s*(.*?)$/gm, '<span style="font-weight: 600;">$1</span><br>')
      .replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: 600;">$1</span>')
      .replace(/\*(.*?)\*/g, '<span style="font-style: italic;">$1</span>')
      .replace(/^\- (.*?)$/gm, '<span style="margin: 4px 0; display: block;">• $1</span>')
      .replace(/^\d+\. (.*?)$/gm, '<span style="margin: 4px 0; display: block;">$1</span>')
  }

  // Thinking animation component
  const ThinkingBubble = () => (
    <div className="flex justify-start mb-4">
      <div className="bg-white rounded-3xl px-4 py-3 shadow-sm border border-gray-100 max-w-[200px]">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

        </div>
      </div>
    </div>
  )

  const isEditing = !!editingMaterial

  // Function to save a completed material
  const saveCompletedMaterial = (title: string, type: MarketingMaterial['type'], content?: string) => {
    if (!selectedMaterialType || !handleSaveMaterial) return

    const material: MarketingMaterial = {
      id: Date.now().toString(),
      type: type,
      title: title,
      description: selectedMaterialType.description,
      thumbnail: '/placeholder-material.jpg', // Could be generated from content
      category: selectedMaterialType.category === 'print' ? 'Print Materials' :
                selectedMaterialType.category === 'digital' ? 'Digital Content' :
                selectedMaterialType.category === 'presentation' ? 'Presentations' :
                selectedMaterialType.category === 'web' ? 'Web Content' : 'General',
      lastModified: new Date().toISOString().split('T')[0],
      status: 'draft',
      htmlContent: content // Store the HTML content for later editing
    }

    handleSaveMaterial(material)
  }

  // File Upload Handler
  const handleFlyerUpload = async (file: File) => {
    if (!file) return

    setIsAnalyzing(true)
    setAnalysisComplete(false)
    setOriginalFileType(file.type)
    
    try {
      // Show uploaded file immediately in canvas with analysis indicator
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })

      // Show initial preview with analysis indicator
      if (file.type.startsWith('image/')) {
        setCurrentCanvasContent(`<div style="position: relative; display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 20px;">
          <img src="${dataUrl}" alt="Uploaded material" style="max-width: 100%; max-height: 600px; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); opacity: 0.7;" />
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.95); padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
            <div style="width: 40px; height: 40px; border: 3px solid #004aad; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
            <div style="font-size: 16px; font-weight: 600; color: #004aad; margin-bottom: 4px;">Analyzing Image</div>
            <div style="font-size: 14px; color: #666;">Converting to editable format...</div>
          </div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>`)
      } else if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        // For HTML files, show them directly but still analyze
        const text = await file.text()
        setCurrentCanvasContent(`<div style="position: relative;">
          ${text}
          <div style="position: fixed; top: 20px; right: 20px; background: rgba(255,255,255,0.95); padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid #004aad; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="font-size: 14px; color: #004aad; font-weight: 500;">Analyzing...</span>
          </div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>`)
      } else {
        // Show file info with analysis indicator
        setCurrentCanvasContent(`<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 400px; padding: 20px; text-align: center; position: relative;">
          <div style="background: rgba(255,255,255,0.95); padding: 30px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); max-width: 400px;">
            <div style="width: 40px; height: 40px; border: 3px solid #004aad; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
            <h2 style="margin: 0 0 8px 0; color: #333; font-size: 18px;">${file.name}</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">File type: ${file.type || 'Unknown'}</p>
            <p style="margin: 8px 0 16px 0; color: #666; font-size: 14px;">Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <div style="font-size: 16px; font-weight: 600; color: #004aad; margin-bottom: 4px;">Converting to HTML/CSS</div>
            <div style="font-size: 14px; color: #666;">This will make it editable via chat...</div>
          </div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>`)
      }

      // Upload file to get analysis
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/gemini/upload-flyer', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) throw new Error(uploadData.error)

      setUploadedFlyer(uploadData.uri)
      setUploadedFlyerData(uploadData.dataUrl || dataUrl)

      // Analyze and convert to HTML/CSS
      const analysisResponse = await fetch('/api/gemini/analyze-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUri: uploadData.uri,
          fileName: uploadData.name || file.name,
          dataUrl: uploadData.dataUrl || dataUrl,
          convertToHTML: !file.type.startsWith('text/html') // Convert non-HTML files
        })
      })

      const analysis = await analysisResponse.json()
      if (!analysisResponse.ok) throw new Error(analysis.error)

      setFlyerAnalysis(analysis)
      setAnalysisComplete(true)

      // Show the final editable content
      if (analysis.recreatedHTML) {
        // Use Gemini's HTML/CSS recreation
        setCurrentCanvasContent(`<div style="position: relative;">
          ${analysis.recreatedHTML}
        </div>`)
      } else if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        // For HTML files, show success indicator
        const text = await file.text()
        setCurrentCanvasContent(`<div style="position: relative;">
          ${text}
        </div>`)
      } else {
        // Fallback for images
        setCurrentCanvasContent(`<div style="display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 20px; position: relative;">
          <img src="${dataUrl}" alt="Uploaded material" style="max-width: 100%; max-height: 600px; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        </div>`)
      }

      // Add analysis completion message to chat
      // Generate dynamic analysis completion message
      await generateContextualMessage('analysis_complete', analysis)

      // Save uploaded material if it's from the upload media flow
      if (selectedMaterialType?.id === 'upload-media' && !isEditing) {
        saveCompletedMaterial(
          file.name.replace(/\.[^/.]+$/, ""), // Remove file extension for title
          'flyer' as MarketingMaterial['type'], // Default type for uploaded media
          analysis.recreatedHTML || currentCanvasContent
        )
      }

    } catch (error) {
      console.error('Upload/Analysis error:', error)
      setAnalysisComplete(false)
      // Generate dynamic error message
      await generateContextualMessage('error', null, { 
        error: error instanceof Error ? error.message : String(error) 
      })
      
      // Show error state in canvas
      setCurrentCanvasContent(`<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 400px; padding: 20px; text-align: center;">
        <div style="width: 64px; height: 64px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="color: white; font-size: 24px;">❌</span>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #ef4444; font-size: 18px;">Analysis Failed</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Please try uploading a different file</p>
      </div>`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Chat Message Handler
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setChatMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/gemini/modify-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: currentCanvasContent || '<div>No content uploaded yet</div>',
          userRequest: newMessage,
          contentType: selectedMaterialType?.type || 'flyer',
          canvasTitle: canvasTitle
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      console.log('Modify content response:', data) // Debug logging

      if (data.isInstruction && data.updatedContent) {
        console.log('Updating canvas with new content:', data.updatedContent.substring(0, 100) + '...') // Debug logging
        setCurrentCanvasContent(data.updatedContent)
        
        // Generate dynamic success message
        await generateContextualMessage('changes_applied', null, {
          changes: data.changes,
          explanation: data.explanation
        })
      } else if (!data.isInstruction && data.conversationalResponse) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.conversationalResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, aiMessage])
      } else {
        console.log('Unexpected response format:', data) // Debug logging
        throw new Error('Could not understand the request')
      }

    } catch (error) {
      console.error('Chat error:', error)
      // Generate dynamic error message for processing errors
      await generateContextualMessage('processing_error', null, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Export Handler with actual file downloads
  const handleExport = async (type: 'pdf' | 'png' | 'print' | 'clipboard') => {
    if (!currentCanvasContent) {
      // Generate dynamic "no content" message
      await generateContextualMessage('no_content', null, { exportType: type })
      return
    }

    if (!canvasRef.current) {
      await generateContextualMessage('export_error', null, { 
        exportType: type,
        error: 'Canvas element not found'
      })
      return
    }

    setIsExporting(true)
    setExportType(type)

    try {
      const filename = `${canvasTitle || 'marketing-material'}-${Date.now()}`
      const options: ExportOptions = {
        filename: filename,
        quality: 0.95,
        format: 'a4',
        orientation: 'portrait'
      }

      switch (type) {
        case 'pdf':
          await exportAsPDF(canvasRef.current, { 
            ...options, 
            filename: `${filename}.pdf` 
          })
          break

        case 'png':
          await exportAsPNG(canvasRef.current, { 
            ...options, 
            filename: `${filename}.png` 
          })
          break

        case 'print':
          printWithStyling(canvasRef.current, canvasTitle || 'Marketing Material')
          break

        case 'clipboard':
          await copyToClipboard(currentCanvasContent)
          break

        default:
          throw new Error(`Unsupported export type: ${type}`)
      }

      // Generate dynamic success message
      await generateContextualMessage('export_success', null, { exportType: type })

    } catch (error) {
      console.error('Export error:', error)
      // Generate dynamic error message
      await generateContextualMessage('export_error', null, { 
        exportType: type,
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  // Generate dynamic welcome message using Gemini
  const generateWelcomeMessage = async (materialTitle: string, materialType: string) => {
    try {
      const response = await fetch('/api/gemini/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'welcome',
          materialTitle,
          materialType,
          isEditing: true
        })
      })

      const data = await response.json()
      if (response.ok && data.message) {
        setChatMessages([{
          id: Date.now().toString(),
          type: 'ai',
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
      }
    } catch (error) {
      console.error('Failed to generate welcome message:', error)
      // Fallback to simple message
      setChatMessages([{
        id: Date.now().toString(),
        type: 'ai',
        content: `Ready to help you edit "${materialTitle}". Upload your current material in the canvas area to start making changes.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }
  }

  // Generate dynamic contextual message using Gemini
  const generateContextualMessage = async (context: string, analysisData?: any, additionalData?: any) => {
    try {
      const response = await fetch('/api/gemini/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          analysisData,
          additionalData,
          materialType: selectedMaterialType?.type || 'flyer'
        })
      })

      const data = await response.json()
      if (response.ok && data.message) {
        const newMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, newMessage])
        return newMessage
      }
    } catch (error) {
      console.error('Failed to generate contextual message:', error)
      return null
    }
  }

  if (!showCreateModal) return null

  // Render full-screen edit interface when editing or when upload-media is selected
  if (createStep === 'edit' && selectedMaterialType && (isEditing || selectedMaterialType.id === 'upload-media')) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900">
        {/* Header Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Only show back button for non-upload-media flows */}
            {selectedMaterialType?.id !== 'upload-media' && (
              <Button
                className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => setCreateStep('configure')}
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180 mr-1" />
                Back
              </Button>
            )}
            <div className="flex-1">
              {/* Editable title field - now takes the place of AI-Powered Editor */}
              {isEditingTitle ? (
                <Input
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false)
                    if (editableTitle.trim()) {
                      setCanvasTitle(editableTitle.trim())
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false)
                      if (editableTitle.trim()) {
                        setCanvasTitle(editableTitle.trim())
                      }
                    }
                  }}
                  autoFocus
                  className="text-xl font-bold text-gray-900 px-2 py-1 border border-gray-300 rounded focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] bg-white"
                />
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-bold text-gray-900 hover:text-[#004aad] border-b-2 border-dashed border-gray-400 hover:border-[#004aad] transition-colors cursor-pointer bg-transparent"
                >
                  {editableTitle || 'Click to set title'}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              className="bg-gray-600 text-white hover:bg-gray-700 cursor-pointer"
              onClick={handleCloseModal}
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Close Editor
            </Button>
          </div>
        </div>

        {/* Main Editor Layout */}
        <div className="flex h-[calc(100vh-73px)]">
          {/* Canvas Preview - Left Side */}
          <div className="flex-1 bg-gray-100 flex flex-col" style={{ width: `calc(100vw - ${chatWidth + 1}px)` }}>
            {/* Canvas Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Live Preview</h2>
              <div className="flex items-center space-x-2">
                {/* Export Buttons */}
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 cursor-pointer text-sm px-3 py-1"
                  onClick={() => handleExport('pdf')}
                  disabled={!currentCanvasContent || isExporting}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  {isExporting && exportType === 'pdf' ? 'Exporting...' : 'PDF'}
                </Button>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer text-sm px-3 py-1"
                  onClick={() => handleExport('png')}
                  disabled={!currentCanvasContent || isExporting}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  {isExporting && exportType === 'png' ? 'Exporting...' : 'PNG'}
                </Button>
                <Button
                  className="bg-gray-600 text-white hover:bg-gray-700 cursor-pointer text-sm px-3 py-1"
                  onClick={() => handleExport('print')}
                  disabled={!currentCanvasContent || isExporting}
                >
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  {isExporting && exportType === 'print' ? 'Printing...' : 'Print'}
                </Button>
                <Button
                  className="bg-purple-600 text-white hover:bg-purple-700 cursor-pointer text-sm px-3 py-1"
                  onClick={() => handleExport('clipboard')}
                  disabled={!currentCanvasContent || isExporting}
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  {isExporting && exportType === 'clipboard' ? 'Copying...' : 'Copy'}
                </Button>
                <Button
                  className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer text-sm px-3 py-1"
                  onClick={() => {
                    if (currentCanvasContent) {
                      const filename = `${canvasTitle || 'marketing-material'}-${Date.now()}.html`
                      downloadAsHTML(currentCanvasContent, filename)
                    }
                  }}
                  disabled={!currentCanvasContent || isExporting}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  HTML
                </Button>
              </div>
            </div>

            {/* Canvas Content */}
            <div className="flex-1 p-6 overflow-auto">
              {currentCanvasContent ? (
                <div className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg border border-gray-300 overflow-auto">
                  <div
                    ref={canvasRef}
                    className="w-full h-full p-4"
                    dangerouslySetInnerHTML={{ __html: currentCanvasContent }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <EyeIcon className="h-24 w-24 mx-auto mb-6 text-gray-300" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">No Preview Available</h3>
                    <p className="text-gray-500 mb-6">Upload your material in the chat panel to start editing</p>
                    
                    {/* Upload Section - Only here, not in chat panel */}
                    <div className="max-w-md mx-auto">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.html,.htm,.pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFlyerUpload(file)
                        }}
                        className="hidden"
                      />
                      
                      {!uploadedFlyer ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#004aad] transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Current Material</h4>
                          <p className="text-gray-600 mb-4">Upload your existing material to start AI-powered editing</p>
                          <Button
                            className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? 'Analyzing...' : 'Choose File'}
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">Images, HTML, PDF up to 20MB</p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Material Uploaded!</h4>
                          <p className="text-gray-600 mb-4">Ready for AI editing. Use the chat to make changes.</p>
                          <Button
                            className="border border-gray-300 hover:bg-gray-50 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Upload Different File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resize Handle */}
          <div
            ref={resizeRef}
            className={`w-1 bg-gray-300 hover:bg-[#004aad] cursor-col-resize transition-colors ${isResizing ? 'bg-[#004aad]' : ''}`}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Chat Panel - Right Side (Resizable) */}
          <div className="bg-white border-l border-gray-200 flex flex-col" style={{ width: `${chatWidth}px`, minWidth: '320px', maxWidth: '50vw' }}>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#004aad] mr-2" />
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                </div>
                <div className="flex items-center text-gray-500">
                  <Bars3BottomRightIcon className="h-4 w-4 mr-1" />
                  <span className="text-xs">Drag to resize</span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0" style={{ fontFamily: 'sans-serif' }}>
              {chatMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`relative max-w-[75%] ${message.type === 'user' ? 'ml-12' : 'mr-12'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`
                        px-4 py-3 shadow-sm
                        ${message.type === 'user' 
                          ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-[8px]' 
                          : 'bg-white text-gray-900 border border-gray-100 rounded-[20px] rounded-bl-[8px]'
                        }
                        ${message.type === 'user' && index < chatMessages.length - 1 && chatMessages[index + 1]?.type === 'user'
                          ? 'rounded-br-[8px] mb-1' 
                          : 'mb-2'
                        }
                        ${message.type === 'ai' && index < chatMessages.length - 1 && chatMessages[index + 1]?.type === 'ai'
                          ? 'rounded-bl-[8px] mb-1' 
                          : 'mb-2'
                        }
                      `}
                      style={{
                        fontSize: '15px',
                        lineHeight: '1.4',
                        fontWeight: '400',
                        letterSpacing: '-0.01em',
                        boxShadow: message.type === 'user' 
                          ? '0 1px 2px rgba(0, 122, 255, 0.2)' 
                          : '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: parseMarkdown(message.content)
                        }}
                      />
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`
                      text-xs text-gray-500 px-2 mb-2
                      ${message.type === 'user' ? 'text-right' : 'text-left'}
                    `} style={{ fontSize: '11px', fontWeight: '400' }}>
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Premium Thinking Indicator */}
              {isProcessing && <ThinkingBubble />}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0" style={{ fontFamily: 'sans-serif' }}>
              <div className="flex items-end space-x-3">
                <div className="flex-1 min-w-0">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      !uploadedFlyer 
                        ? "Upload a material first to start AI editing" 
                        : isAnalyzing 
                        ? "Analyzing your material..."
                        : analysisComplete
                        ? "Ask me to make changes like 'change background to blue'..."
                        : "Upload a material first to start AI editing"
                    }
                    className="resize-none border border-gray-200 rounded-[22px] px-4 py-3 text-[15px] leading-5 
                              focus:border-[#007AFF] focus:ring-[#007AFF] focus:ring-1 focus:outline-none
                              placeholder-gray-500 bg-white transition-all duration-200"
                    rows={3}
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.4',
                      fontWeight: '400',
                      minHeight: '80px',
                      maxHeight: '160px'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={!analysisComplete || isProcessing}
                  />
                </div>
                <Button
                  className={`
                    rounded-full w-11 h-11 p-0 flex items-center justify-center 
                    transition-all duration-200 cursor-pointer flex-shrink-0
                    ${!analysisComplete || !newMessage.trim() || isProcessing
                      ? 'bg-gray-300 text-gray-500' 
                      : 'bg-[#007AFF] text-white hover:bg-[#0066CC] shadow-lg hover:shadow-xl transform hover:scale-105'
                    }
                  `}
                  onClick={handleSendMessage}
                  disabled={!analysisComplete || !newMessage.trim() || isProcessing}
                  style={{
                    boxShadow: !analysisComplete || !newMessage.trim() || isProcessing 
                      ? 'none' 
                      : '0 4px 12px rgba(0, 122, 255, 0.3)'
                  }}
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular modal for creation flow
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-full max-h-[90vh]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditing ? `Edit ${editingMaterial.title}` : 'Create New Marketing Material'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {isEditing 
                    ? `Make changes to your ${selectedMaterialType?.name.toLowerCase() || 'material'}`
                    : 'Choose the type of marketing material you\'d like to create for Texas Sports Academy'
                  }
                </p>
              </div>
              <Button
                className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={handleCloseModal}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>

            {createStep === 'select' && (
              <>
                {/* Category Tabs */}
                <div className="mb-6">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    {['all', 'print', 'digital', 'presentation', 'web'].map((category) => (
                      <button
                        key={category}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                          category === 'all' 
                            ? 'bg-white text-[#004aad] shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {category === 'all' ? 'All Materials' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Material Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materialCreationOptions.map((option) => {
                    const IconComponent = option.icon
                    return (
                      <div
                        key={option.id}
                        className={`bg-white border border-gray-200 rounded-lg p-4 hover:border-[#004aad] hover:shadow-md transition-all cursor-pointer group ${
                          option.id === 'upload-media' ? 'flex flex-col justify-center items-center text-center min-h-[200px]' : 'flex flex-col h-full'
                        }`}
                        onClick={() => {
                          setSelectedMaterialType(option)
                          // If it's upload media, go directly to edit mode
                          if (option.id === 'upload-media') {
                            setCreateStep('edit')
                            setCanvasTitle('Upload Your Media')
                            setEditableTitle('My Marketing Material') // Set default editable title
                            // Initialize with upload message
                            setChatMessages([{
                              id: Date.now().toString(),
                              type: 'ai',
                              content: 'Ready to help you edit your uploaded material! Upload your file in the canvas area to get started.',
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }])
                          } else {
                            setCreateStep('configure')
                          }
                        }}
                      >
                        {option.id === 'upload-media' ? (
                          // Special centered layout for Upload Your Media
                          <>
                            <div 
                              className="p-3 rounded-lg mb-3"
                              style={{ backgroundColor: `${option.color}15` }}
                            >
                              <div style={{ color: option.color }}>
                                <IconComponent 
                                  className="h-8 w-8"
                                />
                              </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-[#004aad] mb-2">
                              {option.name}
                            </h3>
                            <div className="text-xs text-gray-500 mb-2">
                              Est. time: {option.estimatedTime}
                            </div>
                            <div className="text-xs text-[#004aad] font-medium">
                              Get Started →
                            </div>
                          </>
                        ) : (
                          // Regular layout for other cards
                          <>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <div 
                                  className="p-2 rounded-lg mr-3"
                                  style={{ backgroundColor: `${option.color}15` }}
                                >
                                  <div style={{ color: option.color }}>
                                    <IconComponent 
                                      className="h-6 w-6"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 group-hover:text-[#004aad]">
                                    {option.name}
                                  </h3>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span>{option.templates} templates</span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-[#004aad]" />
                            </div>

                            {/* Content Area - Takes up available space */}
                            <div className="flex-1">
                              {/* Description */}
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {option.description}
                              </p>

                              {/* Features */}
                              <div className="space-y-1 mb-3">
                                {option.features.slice(0, 3).map((feature, idx) => (
                                  <div key={idx} className="flex items-center text-xs text-gray-500">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                                    {feature}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Footer - Always at bottom */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 mt-auto">
                              <span>Est. time: {option.estimatedTime}</span>
                              <span className="text-[#004aad] font-medium">Get Started →</span>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {createStep === 'configure' && selectedMaterialType && (
              <div className="space-y-6">
                {/* Back Button */}
                <button
                  onClick={() => setCreateStep('select')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <ChevronRightIcon className="h-4 w-4 rotate-180 mr-1" />
                  Back to material types
                </button>

                {/* Selected Material Header */}
                <div className="bg-gradient-to-r from-[#004aad]/10 to-[#004aad]/5 rounded-lg p-6">
                  <div className="flex items-center">
                    <div 
                      className="p-3 rounded-lg mr-4"
                      style={{ backgroundColor: `${selectedMaterialType.color}15` }}
                    >
                      <div style={{ color: selectedMaterialType.color }}>
                        <selectedMaterialType.icon 
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedMaterialType.name}</h3>
                      <p className="text-gray-600 mt-1">{selectedMaterialType.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{selectedMaterialType.templates} templates available</span>
                        <span>•</span>
                        <span>Estimated time: {selectedMaterialType.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration Form */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material Title
                      </label>
                      <Input 
                        placeholder={`Enter your ${selectedMaterialType.name.toLowerCase()} title`}
                        className="w-full"
                        defaultValue={isEditing ? editingMaterial.title : ''}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Audience
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#004aad] focus:border-[#004aad]">
                        <option>Prospective Parents</option>
                        <option>Current Parents</option>
                        <option>Students</option>
                        <option>Community Members</option>
                        <option>Educators & Partners</option>
                        <option>Investors</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Purpose
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#004aad] focus:border-[#004aad]">
                        <option>Program Promotion</option>
                        <option>Event Announcement</option>
                        <option>School Information</option>
                        <option>Enrollment Drive</option>
                        <option>Community Outreach</option>
                        <option>Fundraising</option>
                        <option>Staff Communication</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Message
                      </label>
                      <Textarea 
                        placeholder="What's the main message you want to communicate?"
                        rows={3}
                        className="w-full"
                        defaultValue={isEditing ? editingMaterial.description : ''}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone & Style
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Professional', 'Friendly', 'Inspiring', 'Informative', 'Exciting', 'Trustworthy'].map((tone) => (
                          <button
                            key={tone}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-md hover:border-[#004aad] hover:bg-[#004aad]/5 cursor-pointer transition-colors"
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Include Elements
                      </label>
                      <div className="space-y-2">
                        {['School logo', 'Contact information', 'Call-to-action', 'Social media links', 'QR code', 'Photo placeholders'].map((element) => (
                          <label key={element} className="flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 text-[#004aad] focus:ring-[#004aad]" 
                              defaultChecked={['School logo', 'Contact information', 'Call-to-action'].includes(element)}
                            />
                            <span className="text-sm text-gray-700">{element}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distribution Method
                      </label>
                      <div className="space-y-2">
                        {['Print (physical distribution)', 'Digital (email/web)', 'Social media', 'Both print and digital'].map((method) => (
                          <label key={method} className="flex items-center cursor-pointer">
                            <input 
                              type="radio" 
                              name="distribution" 
                              className="mr-2 text-[#004aad] focus:ring-[#004aad]" 
                            />
                            <span className="text-sm text-gray-700">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {isEditing 
                      ? 'Ready to start AI-powered editing of your material'
                      : `We'll use AI to create a customized ${selectedMaterialType.name.toLowerCase()} based on your inputs`
                    }
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setCreateStep('select')}
                    >
                      Back
                    </Button>
                    <Button 
                      className="bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
                      onClick={() => setCreateStep(isEditing ? 'edit' : 'template')}
                    >
                      {isEditing ? (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Edit with AI
                        </>
                      ) : (
                        'Choose Template'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {createStep === 'template' && selectedMaterialType && (
              <div className="space-y-6">
                {/* Back Button */}
                <button
                  onClick={() => setCreateStep('configure')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <ChevronRightIcon className="h-4 w-4 rotate-180 mr-1" />
                  Back to configuration
                </button>

                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Choose a Template for {selectedMaterialType.name}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Select a professional template that best fits your needs. All templates are customizable with TSA branding.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: selectedMaterialType.templates }, (_, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#004aad] hover:shadow-md transition-all cursor-pointer group"
                      >
                        {/* Template Preview */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div style={{ color: selectedMaterialType.color }}>
                                <selectedMaterialType.icon 
                                  className="h-12 w-12 mx-auto mb-2"
                                />
                              </div>
                              <div className="text-xs text-gray-500">Template {i + 1}</div>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2">
                            <div className="bg-white rounded-full p-1 shadow-sm">
                              <EyeIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Template Info */}
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {['Modern', 'Classic', 'Creative', 'Minimal', 'Bold', 'Professional'][i % 6]} Design
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {['Clean and contemporary', 'Traditional and elegant', 'Eye-catching and vibrant', 'Simple and focused', 'Strong and impactful', 'Polished and refined'][i % 6]} layout
                          </p>
                          <Button 
                            className="w-full bg-[#004aad] text-white hover:bg-[#003888] cursor-pointer"
                            onClick={handleCloseModal}
                          >
                            {isEditing ? 'Save Changes' : 'Use This Template'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar with Tips - Only show for non-edit steps */}
          {createStep !== 'edit' && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">💡 Quick Tips</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#004aad] rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>All materials will automatically include TSA branding and colors</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#004aad] rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Use AI editing features to refine your materials after creation</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#004aad] rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Materials can be exported in multiple formats for print and digital use</span>
                  </div>
                </div>
              </div>

              {createStep === 'select' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🎯 Most Popular</h3>
                  <div className="space-y-2 text-sm">
                    {materialCreationOptions.slice(0, 4).map((option) => (
                      <div 
                        key={option.id}
                        className="flex items-center p-2 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-[#004aad] transition-colors"
                        onClick={() => {
                          setSelectedMaterialType(option)
                          setCreateStep('configure')
                        }}
                      >
                        <div style={{ color: option.color }}>
                          <option.icon 
                            className="h-4 w-4 mr-2"
                          />
                        </div>
                        <span className="text-gray-700">{option.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {selectedMaterialType && createStep !== 'select' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">✨ Features</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {selectedMaterialType.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📞 Need Help?</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Our AI assistant can help guide you through the creation process.
                </p>
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer text-sm">
                  Chat with AI Assistant
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
} 