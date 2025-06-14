import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import { analyzeAudioFeatures } from '@/lib/audio-analysis'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })    }    const formData = await request.formData()
    const files = formData.getAll('files') as File[] // Changed from 'audio' to 'files'
    const roomId = formData.get('roomId') as string | null
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // If roomId is provided, verify user is a member of that room
    if (roomId) {
      const membershipQuery = `
        SELECT r.id 
        FROM rooms r 
        JOIN room_participants rp ON r.id = rp.room_id 
        WHERE r.id = $1 AND rp.user_id = $2
      `
      const membershipResult = await DatabaseManager.executeQuery(membershipQuery, [roomId, user.id])
      
      if (membershipResult.rows.length === 0) {
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
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        continue // Skip files that are too large
      }      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const safeName = (file.name || 'unknown-file').replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}_${randomString}_${safeName}`
      const filepath = join(uploadsDir, filename)// Save file to disk
      const bytes = await file.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))      // Create database record
      const audioFileId = uuidv4()
      const audioFile = {
        id: audioFileId,
        filename,
        original_name: file.name || 'unknown-file',
        file_path: filepath,        file_size: file.size || 0,
        mime_type: file.type || 'application/octet-stream',
        user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
        is_processed: false
      }

      const insertQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, is_processed, room_id, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const insertValues = [
        audioFile.id,
        audioFile.user_id,
        audioFile.filename,
        audioFile.original_name,
        audioFile.file_path,
        audioFile.file_size,
        audioFile.mime_type,
        audioFile.is_processed,
        roomId, // Add room_id
        audioFile.created_at,
        audioFile.updated_at
      ]

      try {
        const result = await DatabaseManager.executeQuery(insertQuery, insertValues)
        uploadedFiles.push(result.rows[0])

        // Start audio analysis in the background
        setTimeout(async () => {
          try {
            const features = await analyzeAudioFeatures(filepath)
            
            // Update analysis status
            const updateQuery = `
              UPDATE audio_files 
              SET is_processed = true, updated_at = NOW()
              WHERE id = $1
            `
            await DatabaseManager.executeQuery(updateQuery, [audioFileId])              // Store analysis results if available
              if (features) {
                const analysisQuery = `
                  INSERT INTO audio_analysis (
                    id, file_id, duration, tempo, key_signature, created_at, updated_at
                  ) 
                  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                  ON CONFLICT (file_id) DO UPDATE SET
                    duration = $3, tempo = $4, key_signature = $5, updated_at = NOW()
                `
                
                await DatabaseManager.executeQuery(analysisQuery, [
                  uuidv4(),
                  audioFileId,
                  features.duration || 0,
                  features.tempo || 120,
                  features.key || 'C'
                ])
              }
          } catch (error) {
            console.error('Error analyzing audio:', error)
            // Mark as failed
            const failQuery = `
              UPDATE audio_files 
              SET is_processed = false, updated_at = NOW()
              WHERE id = $1
            `
            await DatabaseManager.executeQuery(failQuery, [audioFileId])
          }
        }, 1000)
      } catch (dbError) {        console.error('Database error:', dbError)
        // Fallback response
        uploadedFiles.push({
          id: audioFileId,
          filename,
          original_name: file.name || 'unknown-file',
          file_path: filepath,
          file_size: file.size || 0,
          mime_type: file.type || 'application/octet-stream',
          user_id: user.id
        })
      }
    }

    return NextResponse.json(uploadedFiles, { status: 201 })
  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
