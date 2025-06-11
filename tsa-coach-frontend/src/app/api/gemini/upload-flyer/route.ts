import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const apiKey = process.env.GOOGLE_AI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 })
    }

    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PNG, JPEG, WEBP, HEIC, or HEIF files.' 
      }, { status: 400 })
    }

    // Convert File to base64 data URL for storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64String = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64String}`

    // Create a temporary file identifier
    const fileId = `flyer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // For now, we'll return the file data directly
    // In a production environment, you might want to store this in a temporary storage
    // or use a proper file management service
    
    console.log(`Processed file: ${file.name} (${file.size} bytes)`)

    return NextResponse.json({
      uri: fileId, // Use file ID as URI for now
      name: file.name,
      displayName: `Flyer: ${file.name}`,
      mimeType: file.type,
      sizeBytes: file.size,
      state: 'PROCESSED',
      dataUrl: dataUrl, // Include data URL for direct analysis
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    )
  }
}

// New endpoint to handle HTML flyer conversion for testing
export async function PUT(request: NextRequest) {
  try {
    const { htmlContent, fileName = 'sample-flyer.html' } = await request.json()
    
    if (!htmlContent) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 })
    }

    // For HTML content, we'll create a simple data URL representation
    // In a full implementation, you might use puppeteer to render HTML to image
    const mockImageData = {
      uri: `html-flyer-${Date.now()}`,
      dataUrl: 'data:text/html;base64,' + Buffer.from(htmlContent).toString('base64'),
      mimeType: 'text/html',
      name: fileName,
      size: htmlContent.length
    }

    console.log('HTML flyer processed:', fileName, 'Size:', htmlContent.length)

    return NextResponse.json(mockImageData)

  } catch (error) {
    console.error('HTML processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process HTML content' },
      { status: 500 }
    )
  }
} 