import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { getDatabase } from './mongodb'

export interface User {
  _id?: ObjectId
  email: string
  username: string
  password?: string
  profile: {
    instruments: string[]
    genres: string[]
    experience: string
    collaborationGoals: string[]
    musicalAnalysis?: {
      preferredTempo: number[]
      harmonicComplexity: number
      rhythmicStyle: string[]
      createdAt: Date
    }
  }
  createdAt: Date
  updatedAt: Date
}

export interface AuthResult {
  success: boolean
  message: string
  user?: Omit<User, 'password'>
  token?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

export async function registerUser(userData: {
  email: string
  username: string
  password: string
  instruments: string[]
  genres: string[]
  experience: string
  collaborationGoals: string[]
}): Promise<AuthResult> {
  try {
    const db = await getDatabase()
    const users = db.collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    })

    if (existingUser) {
      return {
        success: false,
        message: 'User with this email or username already exists'
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const user: User = {
      email: userData.email,
      username: userData.username,
      password: hashedPassword,
      profile: {
        instruments: userData.instruments,
        genres: userData.genres,
        experience: userData.experience,
        collaborationGoals: userData.collaborationGoals
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await users.insertOne(user)
    const token = generateToken(result.insertedId.toString())

    // Remove password from response
    const { password, ...userWithoutPassword } = user
    
    return {
      success: true,
      message: 'User registered successfully',
      user: { ...userWithoutPassword, _id: result.insertedId },
      token
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      message: 'Registration failed. Please try again.'
    }
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    const db = await getDatabase()
    const users = db.collection('users')

    // Find user
    const user = await users.findOne({ email }) as User | null

    if (!user || !user.password) {
      return {
        success: false,
        message: 'Invalid email or password'
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password'
      }
    }

    // Generate token
    const token = generateToken(user._id!.toString())

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return {
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: 'Login failed. Please try again.'
    }
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = await getDatabase()
    const users = db.collection('users')
    
    const user = await users.findOne({ _id: new ObjectId(userId) }) as User | null
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword as User
    }
    
    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}
