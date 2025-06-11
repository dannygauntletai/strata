import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  
  // Get base URL from the request instead of environment variable
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const redirectUri = `${baseUrl}/api/auth/google/callback`
  
  // Get role and invitation from query parameters
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || 'coach'
  const invitation = searchParams.get('invitation')
  
  // Create state parameter to preserve role and invitation through OAuth flow
  const state = JSON.stringify({
    role,
    ...(invitation && { invitation })
  })
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'profile',
    'email'
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.append('client_id', clientId!)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('scope', scopes)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('access_type', 'offline')
  authUrl.searchParams.append('prompt', 'consent')
  authUrl.searchParams.append('state', state)

  return NextResponse.redirect(authUrl.toString())
}
