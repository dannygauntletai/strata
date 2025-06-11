import { NextRequest, NextResponse } from 'next/server'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

interface CreateEventRequest {
  tsa_event_id: string
  coach_email: string
  attendee_emails?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEventRequest = await request.json()
    
    // Forward request to Lambda backend
    const response = await fetch(`${API_BASE_URL}/coach/google-calendar/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create Google Calendar event' },
        { status: response.status }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 