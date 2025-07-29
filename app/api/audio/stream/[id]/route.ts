import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

import { verifyToken } from '@/lib/auth'

import { readFile } from 'fs/promises'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== AUDIO STREAM REQUEST START ===')
  console.log('Audio stream request for ID:', params.id)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  console.log('Full params object:', params)
  
  try {
    
    // Validate ID parameter
    if (!params.id || params.id === 'undefined') {
      console.error('Invalid ID parameter:', params.id)
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  new URL(request.url).searchParams.get('auth') // Support token in URL parameters
    
    if (!token) {
      console.error('No authentication token provided')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Verify token and get user
    const tokenData = verifyToken(token)
    if (!tokenData) {
      console.error('Invalid authentication token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = { id: tokenData.id }
    
    console.log('User authenticated:', user.id, 'requesting file:', params.id)

    // Query for audio file using Prisma - allow access if user owns it OR if it's in a room where user is a member
    let audioFile = await prisma.audioFile.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.id },
          {
            room: {
              participants: {
                some: {
                  userId: user.id
                }
              }
            }
          }
        ]
      },
      include: {
        room: true
      }
    })
    
    // If not found in AudioFile table, check audio_tracks table using metadata.audioFileId
    if (!audioFile) {
      console.log('File not found in AudioFile table, checking audio_tracks table...')
      const audioTrack = await prisma.$queryRaw`
        SELECT * FROM audio_tracks 
        WHERE metadata->>'audioFileId' = ${params.id}
        LIMIT 1
      `
      
      if (Array.isArray(audioTrack) && audioTrack.length > 0) {
        const track = audioTrack[0] as any
        console.log('Found in audio_tracks table:', track.id, track.name)
        
        // Create a compatible audioFile object from audio_tracks data
        audioFile = {
          id: track.id,
          userId: track.uploader_id,
          filename: track.name,
          originalName: track.name,
          filePath: track.file_path,
          fileSize: null,
          mimeType: track.file_path.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
          duration: track.duration,
          sampleRate: null,
          channels: null,
          bitRate: null,
          format: track.file_path.endsWith('.mp3') ? 'MP3' : 'WAV',
          isProcessed: false,
          isPublic: false,
          roomId: track.room_id,
          metadata: track.metadata,
          createdAt: track.uploaded_at,
          updatedAt: track.uploaded_at,
          room: null
        } as any
      }
    }
    
    console.log('Database query result:', audioFile ? 'File found' : 'File not found')
    
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }
    console.log('Audio file path from DB:', audioFile.filePath)
    
    // Handle path resolution - both container and host system paths
    let containerPath: string
    let hostPath: string
    
    // Extract filename from database path
    let filename: string
    if (audioFile.filePath.startsWith('/uploads/rooms/')) {
      // Room-specific uploads: /uploads/rooms/{roomId}/{filename}
      const pathParts = audioFile.filePath.split('/')
      filename = pathParts[pathParts.length - 1] // Get the last part (filename)
      containerPath = `/app/public${audioFile.filePath}`
      // For host system, files are stored in flat uploads directory
      hostPath = `/Users/ankitraj2/Documents/GitHub/synxSphere/uploads/${filename}`
    } else if (audioFile.filePath.startsWith('/uploads/')) {
      // Direct uploads: /uploads/{filename}
      filename = audioFile.filePath.replace('/uploads/', '')
      containerPath = `/app/public${audioFile.filePath}`
      hostPath = `/Users/ankitraj2/Documents/GitHub/synxSphere/uploads/${filename}`
    } else if (audioFile.filePath.startsWith('/app/uploads/')) {
      // Direct container uploads: /app/uploads/{filename}
      filename = audioFile.filePath.replace('/app/uploads/', '')
      containerPath = audioFile.filePath  // Already has /app prefix
      hostPath = `/Users/ankitraj2/Documents/GitHub/synxSphere/uploads/${filename}`
    } else {
      // Other formats not supported
      console.error('Unsupported file path format:', audioFile.filePath)
      return NextResponse.json({ error: 'File path format not supported' }, { status: 400 })
    }
    
    console.log('Container file path:', containerPath)
    console.log('Host file path:', hostPath)
    console.log('Extracted filename:', filename)
    
    // Create fallback search pattern for filename mismatches
    const originalNameClean = audioFile.originalName.replace(/[^\w\-_\.]/g, '_').replace(/[\s]+/g, '_')
    const searchPattern = `*${originalNameClean.substring(0, 20)}*` // Use first 20 chars of original name
    console.log('Search pattern for fallback:', searchPattern)

    try {
      let fileBuffer: Buffer
      try {
        // First try the container path (for Docker environment)
        fileBuffer = await readFile(containerPath)
        console.log('File read successfully from container path, size:', fileBuffer.length, 'bytes')
      } catch (containerError) {
        console.log('File not found at container path:', containerPath)
        console.log('Trying host path:', hostPath)
        try {
          // Fallback to host system path
          fileBuffer = await readFile(hostPath)
          console.log('File read successfully from host path, size:', fileBuffer.length, 'bytes')
        } catch (hostError) {
          console.error('File not found at either path, trying fallback search...')
          console.error('Container path error:', containerError)
          console.error('Host path error:', hostError)
          
          // Last resort: search for files that match the original name pattern
          try {
            const { readdir } = require('fs/promises')
            // Try to use container path first, then host path as fallback
            let uploadsDir = '/app/uploads'
            try {
              await readdir(uploadsDir)
              console.log(`Using container uploads directory: ${uploadsDir}`)
            } catch (containerDirError) {
              uploadsDir = '/Users/ankitraj2/Documents/GitHub/synxSphere/uploads'
              console.log(`Container path failed, trying host path: ${uploadsDir}`)
            }
            
            const files = await readdir(uploadsDir)
            
            console.log(`🔍 Searching for files matching "${audioFile.originalName}" in ${files.length} files`)
            
            // Look for files that contain key parts of the original name
            const originalNameParts = audioFile.originalName.toLowerCase()
              .replace(/[^\w\s]/g, '_')  // Replace special chars with underscores
              .split(/[\s_-]+/)           // Split on spaces, underscores, dashes
              .filter(part => part.length > 2) // Only use parts longer than 2 chars
            
            console.log(`🔍 Search parts from "${audioFile.originalName}":`, originalNameParts)
            
            let matchingFile = null
            let bestMatchScore = 0
            
            for (const file of files) {
              if (!file.toLowerCase().endsWith('.wav') && !file.toLowerCase().endsWith('.mp3')) continue
              
              const fileLower = file.toLowerCase()
              let matchScore = 0
              
              // Count how many parts of the original name appear in the filename
              for (const part of originalNameParts) {
                if (fileLower.includes(part)) {
                  matchScore++
                }
              }
              
              console.log(`🔍 File "${file}" matches ${matchScore}/${originalNameParts.length} parts`)
              
              if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore
                matchingFile = file
              }
            }
            
            // Require at least half the parts to match for a valid match
            const requiredMatches = Math.max(1, Math.floor(originalNameParts.length / 2))
            
            if (matchingFile && bestMatchScore >= requiredMatches) {
              const fallbackPath = `${uploadsDir}/${matchingFile}`
              console.log(`✅ Found best matching file: "${matchingFile}" (score: ${bestMatchScore}/${originalNameParts.length})`)
              fileBuffer = await readFile(fallbackPath)
              console.log('File read successfully from fallback search, size:', fileBuffer.length, 'bytes')
            } else {
              console.error(`❌ No adequate matches found. Best was "${matchingFile}" with score ${bestMatchScore}/${originalNameParts.length} (required: ${requiredMatches})`)
              return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
            }
          } catch (searchError) {
            console.error('Fallback search failed:', searchError)
            return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
          }
        }
      }
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mimeType || 'audio/wav',
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      })
    } catch (error) {
      console.error('Error reading audio file:', error)
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error streaming audio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
