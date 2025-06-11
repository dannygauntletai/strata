import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { currentContent, userRequest, contentType, canvasTitle } = await request.json()

    if (!currentContent || !userRequest) {
      return NextResponse.json(
        { error: 'Missing required fields: currentContent and userRequest' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `You are an expert web designer and HTML/CSS editor. You receive HTML/CSS content and user requests to modify it dynamically.

CURRENT HTML/CSS CONTENT:
${currentContent}

CURRENT TITLE: ${canvasTitle}

USER REQUEST: "${userRequest}"

Analyze the user request and determine if it's:
1. An actual instruction to modify HTML/CSS content (e.g., "change background to blue", "make text larger", "update the school name", "make it modern")
2. Casual conversation (e.g., "hello", "thanks", "how are you")

If it's an INSTRUCTION, intelligently modify the HTML/CSS content based on the request. You can:
- Change colors in CSS (backgrounds, text, borders, gradients)
- Modify fonts and typography (size, weight, family)
- Update text content in HTML (names, titles, descriptions, contact info)
- Modify layout and spacing (margins, padding, flexbox, grid)
- Apply design themes (modern, professional, minimal, bold)
- Update styling and visual elements dynamically
- Change dimensions, positioning, and responsive behavior

If it's CASUAL CONVERSATION, provide a friendly conversational response.

RESPOND WITH VALID JSON ONLY (no markdown formatting):

For INSTRUCTIONS:
{
  "isInstruction": true,
  "updatedContent": "complete modified HTML with inline CSS",
  "changes": ["specific change 1", "specific change 2"],
  "explanation": "Brief explanation of what was done"
}

For CASUAL CONVERSATION:
{
  "isInstruction": false,
  "conversationalResponse": "friendly response to the user"
}

If you cannot understand or execute the instruction:
{
  "isInstruction": true,
  "updatedContent": null,
  "changes": [],
  "explanation": "Could not interpret the request. Please be more specific."
}

IMPORTANT RULES:
- Return ONLY valid JSON, no other text or formatting
- For color changes, use proper hex codes or CSS color names
- Maintain complete HTML structure with inline CSS
- Be intelligent about context and scope of changes
- Keep all styling inline for consistency and portability
- Make changes that improve the overall design quality
- Preserve original content unless specifically asked to change it`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Clean the response to ensure it's valid JSON
    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim()
    
    try {
      const parsedResponse = JSON.parse(cleanedResponse)
      return NextResponse.json(parsedResponse)
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', cleanedResponse)
      
      // Fallback response if JSON parsing fails
      return NextResponse.json({
        isInstruction: true,
        updatedContent: null,
        changes: [],
        explanation: "I had trouble processing your request. Could you try rephrasing it?"
      })
    }

  } catch (error) {
    console.error('Content modification error:', error)
    return NextResponse.json(
      { error: 'Failed to process content modification request' },
      { status: 500 }
    )
  }
} 