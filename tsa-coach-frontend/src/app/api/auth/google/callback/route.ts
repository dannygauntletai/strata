import { NextRequest, NextResponse } from 'next/server'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_TSA_COACH_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deibk5wgx1.execute-api.us-east-1.amazonaws.com/prod'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateParam = searchParams.get('state')

  // Get base URL from the request
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=google_auth_failed`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`)
  }

  // Parse state parameter to get role and invitation
  let role = 'coach'
  let invitation = null
  try {
    if (stateParam) {
      const state = JSON.parse(stateParam)
      role = state.role || 'coach'
      invitation = state.invitation
    }
  } catch (e) {
    console.error('Error parsing state parameter:', e)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens)
      throw new Error('Failed to exchange code for tokens')
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userResponse.json()

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userInfo)
      throw new Error('Failed to get user info from Google')
    }

    // Verify user exists in TSA system and authenticate
    const authResult = await verifyAndAuthenticate(userInfo.email, role, invitation)
    
    if (!authResult.success) {
      const errorParam = encodeURIComponent(authResult.error)
      return NextResponse.redirect(`${baseUrl}/login?role=${role}&error=${errorParam}`)
    }

    // Store Google tokens for calendar integration (in parallel)
    try {
      await fetch(`${API_BASE_URL}/coach/google-calendar/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coach_email: userInfo.email,
          google_tokens: tokens,
          google_user_info: userInfo,
        }),
      })
    } catch (error) {
      console.error('Failed to store Google tokens (non-blocking):', error)
    }

    // Create success redirect with authentication tokens
    const redirectUrl = new URL(`${baseUrl}/verify`)
    redirectUrl.searchParams.append('token', authResult.token)
    redirectUrl.searchParams.append('role', role)
    if (invitation) {
      redirectUrl.searchParams.append('invitation', invitation)
    }

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    return NextResponse.redirect(`${baseUrl}/login?role=${role}&error=oauth_failed`)
  }
}

async function verifyAndAuthenticate(email: string, role: string, invitation: string | null) {
  try {
    // Use existing magic link authentication endpoint to verify and authenticate
    const authApiUrl = API_BASE_URL.replace('/prod', '') + '/dev' // Use dev endpoint
    
    const requestBody: any = {
      email: email.toLowerCase().trim(),
      user_role: role,
      is_google_auth: true // Flag to indicate this is Google OAuth
    }

    if (role === 'parent' && invitation) {
      requestBody.invitation_token = invitation
    }

    // Call the authentication service to verify user and create tokens
    const response = await fetch(`${authApiUrl}/auth/google-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        token: data.token || data.verification_token,
        user: data.user
      }
    } else {
      // Handle different error scenarios
      if (response.status === 404) {
        if (role === 'coach') {
          return {
            success: false,
            error: 'Email not found. Only invited coaches can access this portal. Please contact an administrator for an invitation.'
          }
        } else {
          return {
            success: false,
            error: 'Invalid invitation or email address. Please check your invitation email and try again.'
          }
        }
      }
      return {
        success: false,
        error: data.error || 'Authentication failed'
      }
    }
  } catch (error) {
    console.error('Error verifying user:', error)
    return {
      success: false,
      error: 'Network error during authentication'
    }
  }
} 