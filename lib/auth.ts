import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

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
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    // Handle user service token format (userId, username)
    if (decoded.userId) {
      return {
        id: decoded.userId,
        email: decoded.email || '', // We'll fetch this from database if needed
        created_at: new Date().toISOString()
      }
    }
    
    // Handle old token format (id, email, created_at)
    return decoded as { id: string; email: string; created_at: string }
  } catch {
    return null
  }
}

export async function registerUser(
  email: string, 
  username: string, 
  password: string, 
  musicalPreferences?: any
): Promise<User> {
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Create user profile with musical preferences
  const profile = {
    role: 'user' as const,
    bio: '',
    avatar: '',
    musicalPreferences: {
      instruments: musicalPreferences?.instruments || [],
      genres: musicalPreferences?.genres || [],
      experience: musicalPreferences?.experience || 'beginner',
      collaborationStyle: 'flexible',
      preferredTempo: { min: 60, max: 140 },
      preferredKeys: [],
      collaborationGoals: musicalPreferences?.collaborationGoals || []
    }
  }

  try {
    // Use Prisma instead of raw SQL
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        profile
      }
    })

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profile: typeof user.profile === 'string' ? JSON.parse(user.profile as string) : user.profile,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  } catch (error) {
    console.error('Registration error:', error)
    throw new Error('Registration failed')
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '')

    if (!isPasswordValid) {
      return null
    }

    const token = generateToken(user.id, user.email, user.createdAt)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: typeof user.profile === 'string' ? JSON.parse(user.profile as string) : user.profile,
        created_at: user.createdAt,
        updated_at: user.updatedAt
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
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profile: typeof user.profile === 'string' ? JSON.parse(user.profile as string) : user.profile,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}
