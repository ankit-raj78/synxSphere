import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'
import { createCompleteRoomProjectFiles } from '@/lib/audio-utils'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

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

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // 创建房间上传目录
    const roomUploadsDir = join(process.cwd(), 'public', 'uploads', 'rooms', roomId)
    await mkdir(roomUploadsDir, { recursive: true })

    const uploadedFiles = []
    const audioFileRecords = []

    // 处理每个上传的文件
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        console.log(`Skipping file ${file.name} - too large`)
        continue
      }

      try {
        // 生成唯一文件名
        const timestamp = Date.now()
        const safeName = (file.name || 'unknown-file').replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${timestamp}-${safeName}`
        const filepath = join(roomUploadsDir, filename)
        const publicPath = `/uploads/rooms/${roomId}/${filename}`

        // 保存文件
        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))

        // 创建数据库记录
        const audioFile = await DatabaseService.createAudioFile({
          userId: user.id,
          filename,
          originalName: file.name || 'unknown-file',
          filePath: publicPath,
          fileSize: BigInt(file.size),
          mimeType: file.type || 'audio/unknown',
          roomId: roomId,
          format: file.name?.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          metadata: {
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.id,
            roomUpload: true
          }
        })

        audioFileRecords.push({
          id: audioFile.id,
          filename: audioFile.filename,
          originalName: audioFile.originalName,
          filePath: audioFile.filePath,
          fileSize: Number(audioFile.fileSize),
          mimeType: audioFile.mimeType,
          duration: 0, // 需要音频分析来获取准确时长
          metadata: audioFile.metadata
        })

        uploadedFiles.push({
          id: audioFile.id,
          filename: audioFile.filename,
          originalName: audioFile.originalName,
          size: file.size,
          type: file.type
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
      }
    }

    // 更新房间的项目文件，包括新上传的音频文件
    try {
      const existingProject = await DatabaseService.getRoomStudioProject(roomId)
      
      if (existingProject) {
        // 获取房间的所有音频文件
        const allRoomAudioFiles = await DatabaseService.getRoomAudioFiles(roomId)
        
        // 转换为 DefaultAudioFile 格式
        const audioFiles = allRoomAudioFiles.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          filePath: file.filePath,
          fileSize: Number(file.fileSize),
          mimeType: file.mimeType,
          duration: Number(file.duration) || 0,
          metadata: file.metadata
        }))

        // 重新生成完整的项目文件，包括 .odb 包
        const completeProjectFiles = await createCompleteRoomProjectFiles(
          roomId,
          existingProject.name,
          user.id,
          undefined, // 默认音频文件
          audioFiles // 所有音频文件
        )

        // 更新项目数据，包括新的 .odb 包
        await DatabaseService.updateStudioProject(existingProject.id, {
          projectData: completeProjectFiles.projectJson,
          projectBinary: completeProjectFiles.projectBinary,
          projectBundle: completeProjectFiles.projectBundle
        })

        console.log(`✅ Updated project files for room ${roomId}:`)
        console.log(`   - Updated .odb bundle: ${completeProjectFiles.projectBundle?.length || 0} bytes`)
        console.log(`   - Total audio files: ${audioFiles.length}`)
      }
    } catch (error) {
      console.error('Error updating project files:', error)
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles,
      roomId: roomId
    })

  } catch (error) {
    console.error('Error in room audio upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}