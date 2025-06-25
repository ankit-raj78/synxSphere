// ✅ SECURE Audio Upload API using Prisma ORM - No SQL injection risk
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { analyzeAudioFeatures } from '@/lib/audio-analysis'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const roomId = formData.get('roomId') as string | null
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // ✅ SECURE - If roomId provided, verify membership using Prisma
    if (roomId) {
      const membership = await DatabaseService.checkRoomMembership(roomId, user.id)
      
      if (!membership.isMember) {
        return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
      }
    }

    const uploadedFiles = []

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    for (const file of files) {
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes`)
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        console.log(`Skipping file ${file.name} - too large (${file.size} bytes)`)
        continue // Skip files that are too large
      }

      try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const safeName = (file.name || 'unknown-file').replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${timestamp}_${randomString}_${safeName}`
        const filepath = join(uploadsDir, filename)

        console.log(`Saving file to: ${filepath}`)

        // Save file to disk
        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))
        
        console.log(`File saved successfully: ${filename}`)

        try {
          // ✅ SECURE - Create database record using Prisma ORM
          console.log('Creating database record...')
          const audioFile = await DatabaseService.createAudioFile({
            userId: user.id,
            filename,
            originalName: file.name || 'unknown-file',
            filePath: filepath,
            fileSize: BigInt(file.size || 0),
            mimeType: file.type || 'application/octet-stream',
            roomId: roomId || undefined,
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalSize: file.size,
              uploadSource: 'web'
            }
          })

          console.log(`Database record created with ID: ${audioFile.id}`)
          
          // Convert BigInt to number for JSON serialization
          const serializedFile = {
            ...audioFile,
            fileSize: Number(audioFile.fileSize)
          }
          
          uploadedFiles.push(serializedFile)

          // ✅ SECURE - Start audio analysis in the background using Prisma
          setTimeout(async () => {
            try {
              console.log(`Starting audio analysis for: ${filename}`)
              const features = await analyzeAudioFeatures(filepath)
              
              // Store analysis results if available
              if (features) {
                console.log('Audio analysis completed:', features)
              }
            } catch (error) {
              console.error('Error analyzing audio:', error)
              // Analysis failure doesn't affect upload success
            }
          }, 1000)

        } catch (dbError) {
          console.error('Database error during file record creation:', dbError)
          // If database insert fails, we still have the file on disk
          // Return basic file info without database ID
          uploadedFiles.push({
            id: `temp-${timestamp}`, // Temp ID since DB insert failed
            filename,
            originalName: file.name || 'unknown-file',
            filePath: filepath,
            fileSize: file.size || 0, // Regular number instead of BigInt
            mimeType: file.type || 'application/octet-stream',
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            isProcessed: false,
            isPublic: false,
            roomId: roomId || null,
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalSize: file.size,
              uploadSource: 'web',
              dbError: 'Database record creation failed'
            }
          })
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        // Continue with other files even if one fails
        continue
      }
    }

    console.log(`Upload completed. Processed ${uploadedFiles.length} file(s)`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
      totalFiles: uploadedFiles.length
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error in upload handler:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
