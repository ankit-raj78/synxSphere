// ✅ SECURE Audio Upload API using Prisma ORM - No SQL injection risk
import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { DatabaseService } from '@/lib/prisma'
import { prisma } from '@/lib/prisma'

import { verifyToken } from '@/lib/auth'

import { analyzeAudioFeatures } from '@/lib/audio-analysis'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Audio metadata extraction using ffprobe
async function extractAudioMetadata(filePath: string): Promise<{
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate: number;
  format: string;
  codec: string;
}> {
  try {
    console.log('🎵 [AUDIO-EXTRACT] Starting metadata extraction for:', filePath);
    
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const metadata = JSON.parse(stdout);
    
    console.log('🎵 [AUDIO-EXTRACT] Raw ffprobe metadata:', JSON.stringify(metadata, null, 2));
    
    const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio');
    
    if (!audioStream) {
      throw new Error('No audio stream found in file');
    }

    const result = {
      duration: parseFloat(metadata.format.duration || '0'),
      sampleRate: parseInt(audioStream.sample_rate || '0'),
      channels: parseInt(audioStream.channels || '0'),
      bitRate: parseInt(audioStream.bit_rate || metadata.format.bit_rate || '0'),
      format: metadata.format.format_name || 'unknown',
      codec: audioStream.codec_name || 'unknown'
    };

    console.log('🎵 [AUDIO-EXTRACT] Extracted metadata:', result);
    return result;
  } catch (error) {
    console.error('🎵 [AUDIO-EXTRACT] Error extracting metadata:', error);
    throw error;
  }
}

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
    
    // Try multiple common field names for file uploads
    let files: File[] = []
    const possibleFieldNames = ['files', 'file', 'audio', 'upload', 'audioFile']
    
    for (const fieldName of possibleFieldNames) {
      const foundFiles = formData.getAll(fieldName) as File[]
      if (foundFiles.length > 0) {
        files = foundFiles
        console.log(`Found ${foundFiles.length} file(s) using field name: ${fieldName}`)
        break
      }
    }
    
    // If no files found with common names, check all form data entries
    if (files.length === 0) {
      console.log('No files found with common field names, checking all form data...')
      const formDataEntries = Array.from(formData.entries())
      for (const [key, value] of formDataEntries) {
        console.log(`Form field: ${key}, type: ${typeof value}, isFile: ${value instanceof File}`)
        if (value instanceof File && value.size > 0) {
          files.push(value)
          console.log(`Found file: ${value.name} (${value.size} bytes) in field: ${key}`)
        }
      }
    }
    
    const roomId = formData.get('roomId') as string | null
    
    if (files.length === 0) {
      console.log('No files provided in the request')
      return NextResponse.json({ 
        error: 'No files provided',
        availableFields: Array.from(formData.keys()),
        debugInfo: 'Check that files are being sent with proper field names'
      }, { status: 400 })
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
              console.log(`🎵 [UPLOAD] Starting audio metadata extraction for: ${filename}`)
              const metadata = await extractAudioMetadata(filepath)
              
              // Update database record with extracted metadata using direct Prisma
              const updatedAudioFile = await prisma.audioFile.update({
                where: { id: audioFile.id },
                data: {
                  duration: metadata.duration,
                  sampleRate: metadata.sampleRate,
                  channels: metadata.channels,
                  bitRate: metadata.bitRate,
                  format: metadata.format,
                  isProcessed: true
                }
              })
              
              console.log('🎵 [UPLOAD] Audio metadata extraction completed and database updated:', {
                fileId: audioFile.id,
                duration: metadata.duration,
                sampleRate: metadata.sampleRate,
                channels: metadata.channels
              })
            } catch (error) {
              console.error('🎵 [UPLOAD] Error extracting audio metadata:', error)
              // Mark as processing failed but don't fail the upload
              try {
                await prisma.audioFile.update({
                  where: { id: audioFile.id },
                  data: {
                    isProcessed: false
                  }
                })
              } catch (dbError) {
                console.error('🎵 [UPLOAD] Error updating processing status:', dbError)
              }
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
