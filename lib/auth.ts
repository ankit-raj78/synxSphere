import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import DatabaseManager from './database'

export interface User {
  id: string
  email: string
  username: string
  password_hash?: string
  profile: {
    role?: 'user' | 'admin' | 'moderator'
    bio?: string
    avatar?: string
    instruments?: string[]
    genres?: string[]
    experience?: string
    collaborationGoals?: string[]
    musicalAnalysis?: {
      preferredTempo: number[]
      harmonicComplexity: number
      rhythmicStyle: string[]
      createdAt: Date
    }
  }
  created_at: Date
  updated_at: Date
}

export interface AuthResult {
  success: boolean
  message: string
  user?: Omit<User, 'password_hash'>
  token?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, email: string, created_at: Date): string {
  return jwt.sign({ 
    id: userId, 
    email,
    created_at: created_at.toISOString()
  }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; email: string; created_at: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; created_at: string }
  } catch {
    return null
  }
}

export async function registerUser(email: string, username: string, password: string): Promise<User> {
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Create user profile
  const profile = {
    role: 'user' as const,
    bio: '',
    avatar: ''
  }

  try {
    // Use PostgreSQL instead of MongoDB
    const result = await DatabaseManager.executeQuery(
      `INSERT INTO users (id, email, username, password_hash, profile, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()) 
       RETURNING id, email, username, profile, created_at, updated_at`,
      [email, username, hashedPassword, JSON.stringify(profile)]
    )

    if (result.rows.length === 0) {
      throw new Error('Failed to create user')
    }

    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profile: typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  } catch (error) {
    console.error('Registration error:', error)
    throw new Error('Registration failed')
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    const result = await DatabaseManager.executeQuery(
      'SELECT id, email, username, password_hash, profile, created_at, updated_at FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return null
    }

    const user = result.rows[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return null
    }

    const token = generateToken(user.id, user.email, user.created_at)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    }
  } catch (error) {
    console.error('Login error:', error)
    throw new Error('Login failed')
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await DatabaseManager.executeQuery(
      'SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profile: typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}
