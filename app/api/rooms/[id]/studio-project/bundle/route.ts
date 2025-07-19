import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 验证房间成员身份
    const membership = await DatabaseService.checkRoomMembership(roomId, user.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // 获取项目数据
    const project = await DatabaseService.getRoomStudioProject(roomId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 获取房间的所有音频文件
    const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)

    // 返回项目数据和音频文件信息
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        projectData: project.projectData,
        version: project.version,
        syncVersion: project.syncVersion,
        hasBundle: !!project.projectBundle,
        bundleSize: project.projectBundle ? Buffer.from(project.projectBundle).length : 0
      },
      audioFiles: audioFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        filePath: file.filePath,
        fileSize: Number(file.fileSize),
        mimeType: file.mimeType,
        duration: Number(file.duration) || 0,
        format: file.format,
        metadata: file.metadata
      })),
      roomId: roomId
    })

  } catch (error) {
    console.error('Error getting room studio project bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 验证房间成员身份
    const membership = await DatabaseService.checkRoomMembership(roomId, user.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // 获取项目数据
    const project = await DatabaseService.getRoomStudioProject(roomId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 检查是否有 .odb 包
    if (!project.projectBundle) {
      return NextResponse.json({ error: 'Project bundle not available' }, { status: 404 })
    }

    // 返回二进制数据作为 base64
    const bundleBase64 = Buffer.from(project.projectBundle).toString('base64')
    
    return NextResponse.json({
      bundleData: bundleBase64,
      bundleSize: Buffer.from(project.projectBundle).length,
      projectName: project.name,
      roomId: roomId
    })

  } catch (error) {
    console.error('Error getting project bundle data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}