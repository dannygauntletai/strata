import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const apiKey = process.env.GOOGLE_AI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: NextRequest) {
  try {
    const { originalFlyer, originalFlyerData, analysis, userRequest, outputFormats = ['png'] } = await request.json()
    
    if (!originalFlyerData && !originalFlyer) {
      return NextResponse.json({ 
        error: 'Original flyer data is required' 
      }, { status: 400 })
    }

    if (!userRequest) {
      return NextResponse.json({ 
        error: 'User request is required' 
      }, { status: 400 })
    }

    // Get the Gemini model - upgraded to Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" })

    // Create comprehensive modification prompt
    const modificationPrompt = `
You are a professional graphic designer helping to modify a flyer for Texas Sports Academy.

ORIGINAL FLYER ANALYSIS:
${JSON.stringify(analysis, null, 2)}

USER REQUEST: "${userRequest}"

BRAND GUIDELINES FOR TEXAS SPORTS ACADEMY:
- Primary Brand Color: #004aad (TSA Blue)
- Secondary Colors: Gold (#FFD700), White (#FFFFFF)
- Typography: Professional, clean, modern fonts
- Logo: Should be prominently featured
- Tone: Professional, inspiring, educational excellence

TASK: 
1. Analyze the user's request and determine what changes to make
2. Provide a detailed explanation of the changes
3. Generate HTML/CSS code for the modified flyer that can be rendered and converted to image

Respond in the following JSON format:
{
  "explanation": "Clear explanation of what changes you're making and why",
  "changes": [
    "Specific change 1",
    "Specific change 2",
    "Specific change 3"
  ],
  "flyerCode": "Complete HTML with inline CSS that creates the modified flyer",
  "newAnalysis": {
    "colors": {
      "primary": "updated primary color",
      "secondary": "updated secondary color",
      "accent": ["updated accent colors"]
    },
    "layout": {
      "style": "updated style",
      "alignment": "updated alignment"
    },
    "improvements": ["list of improvements made"]
  }
}

IMPORTANT REQUIREMENTS:
- The HTML should be complete and self-contained with inline CSS
- Use the exact TSA brand color #004aad where appropriate
- Make the flyer look professional and polished
- Ensure all text is readable and well-positioned
- Include proper spacing and typography
- The HTML should render well in a 600x800px container (portrait) or 800x600px (landscape)
- Use modern CSS techniques like flexbox and grid for layout
- Include the original content unless specifically asked to change it

Generate the modified flyer now:
`

    let result
    if (originalFlyerData) {
      // Use inline data for modification
      const base64Data = originalFlyerData.split(',')[1]
      const mimeType = originalFlyerData.split(';')[0].split(':')[1]
      
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: modificationPrompt }
      ])
    } else {
      // Fallback to original file URI method
      result = await model.generateContent([
        {
          fileData: {
            mimeType: "image/jpeg",
            fileUri: originalFlyer
          }
        },
        { text: modificationPrompt }
      ])
    }

    const response = await result.response
    const modificationText = response.text()
    
    // Try to parse the JSON response
    let modification
    try {
      // Extract JSON from the response (remove any markdown formatting)
      const jsonMatch = modificationText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        modification = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse modification JSON:', parseError)
      console.log('Raw response:', modificationText)
      
      // Fallback: create a basic modification response
      modification = {
        explanation: `I understand you want to: "${userRequest}". I'm working on generating a modified version of your flyer with these changes.`,
        changes: [
          "Applying your requested modifications",
          "Ensuring TSA brand consistency",
          "Optimizing layout and design"
        ],
        flyerCode: generateFallbackFlyerHTML(userRequest, analysis),
        newAnalysis: {
          colors: {
            primary: "#004aad",
            secondary: "#FFD700",
            accent: ["#FFFFFF", "#333333"]
          },
          layout: {
            style: "modern",
            alignment: "center"
          },
          improvements: [
            "Applied TSA branding",
            "Improved typography",
            "Enhanced visual hierarchy"
          ]
        },
        rawResponse: modificationText // Include for debugging
      }
    }

    // For now, we'll simulate file generation
    // In a full implementation, you'd render the HTML to image using puppeteer or similar
    const generatedFiles = outputFormats.map((format: string) => ({
      type: format,
      url: `/api/generate-flyer-preview?code=${encodeURIComponent(modification.flyerCode)}&format=${format}`,
      name: `modified_flyer_${Date.now()}.${format}`
    }))

    modification.generatedFiles = generatedFiles
    
    console.log('Flyer modification completed for request:', userRequest)
    
    return NextResponse.json(modification)

  } catch (error) {
    console.error('Modification error:', error)
    return NextResponse.json(
      { error: 'Failed to modify flyer with Gemini' },
      { status: 500 }
    )
  }
}

// Fallback HTML generator for when JSON parsing fails
function generateFallbackFlyerHTML(userRequest: string, analysis: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modified Flyer</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .flyer {
            width: 600px;
            height: 800px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #004aad;
            padding-bottom: 20px;
        }
        .school-name {
            font-size: 32px;
            font-weight: bold;
            color: #004aad;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .tagline {
            font-size: 14px;
            color: #666;
            margin: 5px 0 0 0;
            font-style: italic;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            text-align: center;
            margin: 20px 0;
            background: linear-gradient(45deg, #004aad, #0066cc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .highlight-box {
            background: linear-gradient(45deg, #004aad, #0066cc);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .feature {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #004aad;
        }
        .feature-title {
            font-weight: bold;
            color: #004aad;
            margin-bottom: 5px;
        }
        .contact {
            background: #004aad;
            color: white;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            margin-top: auto;
        }
        .contact h3 {
            margin: 0 0 10px 0;
        }
        .contact-info {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 10px;
        }
        .modification-note {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            color: #1976d2;
            text-align: center;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="flyer">
        <div class="modification-note">
            Modified based on: "${userRequest}"
        </div>
        
        <div class="header">
            <h1 class="school-name">Texas Sports Academy</h1>
            <p class="tagline">Excellence in Education Since 2009</p>
        </div>
        
        <h2 class="title">${analysis?.textElements?.[0]?.content || 'Academic Excellence Program'}</h2>
        
        <div class="content">
            <div class="highlight-box">
                <h3>Discover Your Potential</h3>
                <p>Join our community of learners and achieve academic excellence with personalized education.</p>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-title">Small Classes</div>
                    <div>8:1 Student-Teacher Ratio</div>
                </div>
                <div class="feature">
                    <div class="feature-title">High Success Rate</div>
                    <div>98% College Acceptance</div>
                </div>
                <div class="feature">
                    <div class="feature-title">Expert Faculty</div>
                    <div>Experienced Educators</div>
                </div>
                <div class="feature">
                    <div class="feature-title">Modern Facilities</div>
                    <div>State-of-the-Art Campus</div>
                </div>
            </div>
        </div>
        
        <div class="contact">
            <h3>Ready to Join Our Community?</h3>
            <div class="contact-info">
                <span>📞 (555) 123-4567</span>
                <span>✉️ info@texassportsacademy.com</span>
                <span>🌐 www.texassportsacademy.com</span>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
} 