import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const apiKey = process.env.GOOGLE_AI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: NextRequest) {
  try {
    const { fileUri, fileName, dataUrl, convertToHTML } = await request.json()
    
    if (!dataUrl && !fileUri) {
      return NextResponse.json({ error: 'No file URI or data URL provided' }, { status: 400 })
    }

    // Get the Gemini model for vision analysis - upgraded to Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" })

    const analysisPrompt = `
You are an expert web designer and analyzer. Analyze this image/document and provide detailed analysis.

${convertToHTML ? `
IMPORTANT: Since this is not an HTML file, you must RECREATE this design as editable HTML/CSS code.

RESPOND WITH VALID JSON containing both analysis AND recreated HTML:

{
  "textElements": [
    {
      "content": "exact text content from image",
      "hierarchy": "headline|subheading|body|footer",
      "position": {"x": 0, "y": 0},
      "style": {
        "fontSize": "large|medium|small", 
        "fontWeight": "bold|normal|light",
        "color": "color name or hex"
      }
    }
  ],
  "colors": {
    "primary": "dominant color (hex code)",
    "secondary": "secondary color (hex code)", 
    "accent": "accent colors array",
    "background": "background color (hex code)"
  },
  "layout": {
    "style": "modern|classic|minimal|creative|professional",
    "sections": ["header", "body", "footer"],
    "alignment": "left|center|right|justified"
  },
  "recreatedHTML": "COMPLETE HTML/CSS code that recreates this design exactly. Use inline CSS for maximum compatibility. Make it look IDENTICAL to the original but fully editable. Include proper semantic HTML structure with divs, headings, paragraphs, etc. Use modern CSS with flexbox/grid. Make text selectable and editable via CSS contenteditable if appropriate."
}
` : `
RESPOND WITH VALID JSON:

{
  "textElements": [
    {
      "content": "exact text content",
      "hierarchy": "headline|subheading|body|footer",
      "position": {"x": 0, "y": 0},
      "style": {
        "fontSize": "large|medium|small",
        "fontWeight": "bold|normal|light", 
        "color": "color name or hex"
      }
    }
  ],
  "colors": {
    "primary": "dominant color (hex code)",
    "secondary": "secondary color (hex code)",
    "accent": "accent colors array", 
    "background": "background color (hex code)"
  },
  "layout": {
    "style": "modern|classic|minimal|creative|professional",
    "sections": ["header", "body", "footer"],
    "alignment": "left|center|right|justified"
  }
}
`}

Analyze every detail: text content, colors, fonts, layout, spacing, images, and overall design style.`

    let result
    if (dataUrl) {
      // Use inline data for analysis
      const base64Data = dataUrl.split(',')[1]
      const mimeType = dataUrl.split(';')[0].split(':')[1]
      
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: analysisPrompt }
      ])
    } else {
      // Fallback to original file URI method (though this won't work with current setup)
      result = await model.generateContent([
        {
          fileData: {
            mimeType: "image/jpeg",
            fileUri: fileUri
          }
        },
        { text: analysisPrompt }
      ])
    }

    const response = await result.response
    const analysisText = response.text()
    
    // Try to parse the JSON response
    let analysis
    try {
      // Extract JSON from the response (remove any markdown formatting)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError)
      console.log('Raw response:', analysisText)
      
      // Fallback: create a basic analysis structure
      analysis = {
        textElements: [
          {
            content: "Text analysis in progress...",
            hierarchy: "body",
            position: { x: 0, y: 0 },
            style: { fontSize: "medium", fontWeight: "normal", color: "black" }
          }
        ],
        colors: {
          primary: "#333333",
          secondary: "#666666", 
          accent: ["#004aad"],
          background: "#ffffff"
        },
        layout: {
          style: "modern",
          sections: 3,
          alignment: "center"
        },
        graphics: [],
        dimensions: {
          width: 800,
          height: 1200,
          aspectRatio: "portrait"
        },
        overallTheme: "Professional flyer design",
        qualityAssessment: {
          resolution: "medium",
          clarity: "good",
          designQuality: "professional"
        },
        suggestions: [
          "Consider using TSA brand colors",
          "Enhance text hierarchy for better readability"
        ],
        rawAnalysis: analysisText // Include raw response for debugging
      }
    }

    console.log('Flyer analysis completed for:', fileName)
    
    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze flyer with Gemini' },
      { status: 500 }
    )
  }
} 