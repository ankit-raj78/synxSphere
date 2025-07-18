import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET the studio project for a room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const roomId = params.id

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get the room's studio project
    const studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      return NextResponse.json({ error: 'No studio project found for this room' }, { status: 404 })
    }

    return NextResponse.json(studioProject)
  } catch (error) {
    console.error('Error fetching studio project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update the studio project for a room
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const roomId = params.id
    const body = await request.json()

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get the existing studio project
    const studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      // Create a new studio project if it doesn't exist
      const newProject = await DatabaseService.createStudioProject({
        userId: tokenData.id,
        roomId: roomId,
        name: body.name || `Room ${roomId} Project`,
        description: body.description,
        projectData: body.projectData || {}
      })
      return NextResponse.json(newProject)
    }

    // Update the existing project
    const updatedProject = await DatabaseService.updateStudioProject(studioProject.id, {
      projectData: body.projectData,
      name: body.name,
      description: body.description
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating studio project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}