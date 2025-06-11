import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const apiKey = process.env.GOOGLE_AI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: NextRequest) {
  try {
    const { context, materialTitle, materialType, analysisData, additionalData, isEditing } = await request.json()
    
    // Get the Gemini model for text generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" })

    let prompt = ""

    switch (context) {
      case 'welcome':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor. 

Generate a friendly, professional welcome message for a user who wants to edit their "${materialTitle}" (${materialType}). 

The message should:
- Be conversational and encouraging
- Explain that they need to upload their current material first
- Mention key editing capabilities (colors, text, layout, branding)
- Be concise (2-3 sentences max)
- Use a professional but approachable tone

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'analysis_complete':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

The user just uploaded a ${materialType} file and analysis is complete. Here's what was found:
- ${analysisData?.textElements?.length || 0} text elements detected
- ${analysisData?.recreatedHTML ? 'Successfully converted to editable HTML/CSS format' : 'Content analyzed and ready for editing'}
- Primary colors: ${analysisData?.colors?.primary || 'various colors detected'}
- Layout style: ${analysisData?.layout?.style || 'modern design'}

Generate an encouraging message that:
- Confirms analysis is complete
- Briefly mentions what was found (text elements, conversion status)
- Gives 2-3 specific example editing commands they can try
- Asks what they'd like to change
- Is conversational and helpful (2-3 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'error':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

An error occurred: ${additionalData?.error || 'Unknown error'}

Generate a helpful, reassuring error message that:
- Acknowledges the issue without being overly technical
- Suggests trying a different file format or smaller file size
- Maintains a positive, helpful tone
- Offers to help once they upload a valid file
- Is brief (1-2 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'processing_error':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

A processing error occurred while trying to modify the user's ${materialType}: ${additionalData?.error || 'Unknown processing error'}

Generate a helpful error message that:
- Acknowledges there was an issue processing their request
- Suggests they try being more specific with their request
- Gives 2-3 example commands they could try instead
- Maintains a helpful, encouraging tone
- Is brief (2-3 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'changes_applied':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

The user requested changes and they have been successfully applied to their ${materialType}.

Changes made: ${additionalData?.changes?.join(', ') || 'User requested modifications'}

Generate a brief confirmation message that:
- Confirms the changes were applied
- Briefly mentions what was changed
- Asks if they want any other adjustments
- Is encouraging and professional (1-2 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'export_success':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

The user successfully exported their ${materialType} as ${additionalData?.exportType || 'file'}.

Generate a brief success message that:
- Confirms the export was successful
- Mentions the export format
- Is positive and concluding (1 sentence max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'export_error':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

An export error occurred when trying to export as ${additionalData?.exportType || 'file'}: ${additionalData?.error || 'Unknown export error'}

Generate a brief error message that:
- Acknowledges the export failed
- Suggests trying a different export format
- Maintains a helpful tone
- Is brief (1-2 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      case 'no_content':
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor.

The user tried to export but there's no content available to export.

Generate a helpful message that:
- Explains they need to upload material first
- Suggests uploading and making changes before exporting
- Is encouraging and helpful
- Is brief (1-2 sentences max)

Do NOT use markdown formatting. Return plain text only.`
        break

      default:
        prompt = `You are a helpful AI assistant for Texas Sports Academy's marketing material editor. Provide a brief, encouraging message to help the user with their ${materialType || 'material'}.`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const message = response.text().trim()

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Generate instructions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate instructions' },
      { status: 500 }
    )
  }
} 