import { NextRequest, NextResponse } from 'next/server'
import { registerUser, generateToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Email validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

// Password validation function
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character'
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, instruments, genres, experience, collaborationGoals } = body

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // Prepare musical preferences
    const musicalPreferences = {
      instruments: instruments || [],
      genres: genres || [],
      experience: experience || 'beginner',
      collaborationGoals: collaborationGoals || []
    }

    // Register user using PostgreSQL
    const user = await registerUser(email, username, password, musicalPreferences)

    // Generate token for automatic login after registration
    const token = generateToken(user.id, user.email, user.created_at)

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: user.profile
      },
      token // Add token to response for automatic login
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
