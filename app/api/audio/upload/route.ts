import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { analyzeAudioFeatures } from '@/lib/audio-analysis'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ObjectId } from 'mongodb'

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
    const files = formData.getAll('audio') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const uploadedFiles = []

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        continue // Skip files that are too large
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const filename = `${timestamp}_${randomString}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filepath = join(uploadsDir, filename)

      // Save file to disk
      const bytes = await file.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))

      // Create database record
      const audioFile = {
        filename,
        originalName: file.name,
        filepath,
        fileSize: file.size,
        mimeType: file.type,
        userId: user.userId,
        uploadedAt: new Date(),
        analysisStatus: 'pending' as const,
        audioFeatures: null
      }

      const result = await db.collection('audioFiles').insertOne(audioFile)
      
      uploadedFiles.push({
        _id: result.insertedId,
        ...audioFile
      })

      // Start audio analysis in the background
      // Note: In a real application, this would be handled by a background job queue
      setTimeout(async () => {
        try {
          await db.collection('audioFiles').updateOne(
            { _id: result.insertedId },
            { $set: { analysisStatus: 'processing' } }
          )

          const features = await analyzeAudioFeatures(filepath)
          
          await db.collection('audioFiles').updateOne(
            { _id: result.insertedId },
            { 
              $set: { 
                analysisStatus: 'completed',
                audioFeatures: features
              }
            }
          )
        } catch (error) {
          console.error('Error analyzing audio:', error)
          await db.collection('audioFiles').updateOne(
            { _id: result.insertedId },
            { $set: { analysisStatus: 'failed' } }
          )
        }
      }, 1000)
    }

    return NextResponse.json(uploadedFiles, { status: 201 })
  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
