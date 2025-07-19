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

    // 检查是否有 .odb 包
    if (!project.projectBundle) {
      return NextResponse.json({ error: 'Project bundle not available' }, { status: 404 })
    }

    // 生成文件名
    const filename = `${project.name.replace(/[^a-zA-Z0-9.-]/g, '_')}_${roomId.substring(0, 8)}.odb`

    // 返回文件
    const bundleBuffer = Buffer.from(project.projectBundle)
    return new NextResponse(bundleBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': bundleBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error downloading project bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}