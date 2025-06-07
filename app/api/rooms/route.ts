import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    
    // Get all rooms the user is part of or can join
    const rooms = await db.collection('rooms').find({
      $or: [
        { creator: tokenData.userId },
        { 'participants._id': tokenData.userId },
        { isPublic: true }
      ]
    }).toArray()

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    
    // Fetch user data
    const user = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, genre, isPublic = false, maxParticipants = 10 } = body

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
    }
    
    const newRoom = {
      name,
      description,
      genre: genre || 'General',
      creator: user._id,
      participants: [{
        _id: user._id,
        username: user.username,
        isOnline: true,
        instruments: user.profile?.instruments || [],
        role: 'creator'
      }],
      maxParticipants,
      isPublic,
      isActive: true,
      currentTrack: null,
      tracks: [],
      playbackPosition: 0,
      musicalRequirements: {
        instruments: user.profile?.instruments || [],
        genres: user.profile?.genres || [],
        experienceLevel: [user.profile?.experience || 'intermediate'],
        tempoRange: [60, 180],
        keyPreferences: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('rooms').insertOne(newRoom)
    
    return NextResponse.json({ 
      _id: result.insertedId,
      ...newRoom 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
