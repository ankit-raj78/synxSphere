import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, instruments, genres, experience, collaborationGoals } = body

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Register user
    const result = await registerUser({
      email,
      username,
      password,
      instruments: instruments || [],
      genres: genres || [],
      experience: experience || '',
      collaborationGoals: collaborationGoals || []
    })

    if (result.success) {
      return NextResponse.json(result, { status: 201 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
