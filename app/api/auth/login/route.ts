import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Login user
    const result = await loginUser(email, password)

    if (result) {
      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          profile: result.user.profile
        },
        token: result.token
      }, { status: 200 })
    } else {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login error:', error)
        return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
