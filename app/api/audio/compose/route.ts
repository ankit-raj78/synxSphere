import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { join } from 'path'
import fs from 'fs/promises'

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

    const { trackIds, roomId, settings } = await request.json()

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 tracks are required' }, { status: 400 })
    }    // Get track information from database using Prisma
    // If roomId is provided, check that user is a member and allow composing all room tracks
    // Otherwise, only allow user's own tracks
    
    let tracks;
    
    if (roomId) {
      // Verify user is a member of the room using Prisma
      const membership = await prisma.roomParticipant.findFirst({
        where: {
          roomId: roomId,
          userId: user.id
        }
      });
      
      if (!membership) {
        return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
      }

      // Allow composing tracks from all room members or files associated with the room
      tracks = await prisma.audioFile.findMany({
        where: {
          id: { in: trackIds },
          OR: [
            { roomId: roomId },
            {
              user: {
                roomParticipants: {
                  some: { roomId: roomId }
                }
              }
            }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      // Only allow user's own tracks if no room specified
      tracks = await prisma.audioFile.findMany({
        where: {
          id: { in: trackIds },
          userId: user.id
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    
    if (tracks.length !== trackIds.length) {
      return NextResponse.json({ error: 'Some tracks not found or access denied' }, { status: 404 })
    }

    // Prepare tracks for mixing
    const trackFiles = tracks.map((track: { filePath: string }, index: number) => ({
      file: track.filePath,
      volume: 1.0, // Default volume, could be made configurable
      delay: 0     // Default delay, could be made configurable
    }))    // Generate output filename
    const outputFilename = `composition_${Date.now()}_${uuidv4().substring(0, 8)}.${settings?.format || 'mp3'}`
    const outputPath = join(process.cwd(), 'uploads', outputFilename)

    try {
      // Use a simplified mixing approach since AudioProcessor might not be available in Next.js context
      // For now, we'll create a simple concatenation or use ffmpeg directly
      
      // This is a simplified version - in production you'd want to use the actual AudioProcessor
      const { execSync } = require('child_process')
      
      // Define FFmpeg path - check multiple possible locations
      const possibleFFmpegPaths = [
        'ffmpeg', // Try PATH first
        'C:\\Users\\10304\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe',
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
        'C:\\ffmpeg\\bin\\ffmpeg.exe'
      ]
      
      let ffmpegPath = 'ffmpeg'
      
      // Test which FFmpeg path works
      for (const path of possibleFFmpegPaths) {
        try {
          execSync(`"${path}" -version`, { stdio: 'pipe' })
          ffmpegPath = path
          break
        } catch (e) {
          continue
        }
      }
      
      // Build ffmpeg command for mixing
      const inputs = tracks.map((track: { filePath: string }) => `-i "${track.filePath}"`).join(' ')
      const filters = tracks.map((_: any, index: number) => `[${index}:0]`).join('')
      const mixFilter = `${filters}amix=inputs=${tracks.length}:duration=longest:dropout_transition=2`
      
      const ffmpegCommand = `"${ffmpegPath}" ${inputs} -filter_complex "${mixFilter}" -ac 2 -ar ${settings?.sampleRate || 44100} -b:a ${settings?.bitrate || '192k'} "${outputPath}"`
      
      console.log('Executing FFmpeg command:', ffmpegCommand)
      execSync(ffmpegCommand, { stdio: 'pipe', env: { ...process.env, PATH: process.env.PATH } })

      // Get file stats
      const stats = await fs.stat(outputPath)      // Create database record for the composition using Prisma
      const compositionId = uuidv4()
      
      const savedComposition = await prisma.composition.create({
        data: {
          id: compositionId,
          userId: user.id,
          roomId: roomId,
          title: `Composition ${tracks.length} Tracks`,
          filePath: outputPath,
          fileSize: stats.size,
          mixSettings: settings || {},
          isPublic: false
        }
      })

      return NextResponse.json({
        message: 'Composition created successfully',
        composition: savedComposition,
        sourceTrackCount: tracks.length,
        outputFile: outputFilename
      }, { status: 201 })

    } catch (ffmpegError) {
      console.error('FFmpeg error:', ffmpegError)
      
      // Fallback: create a simple metadata-only composition record using Prisma
      const compositionId = uuidv4()
      
      const fallbackResult = await prisma.audioFile.create({
        data: {
          id: compositionId,
          userId: user.id,
          filename: `composition_${Date.now()}.json`,
          originalName: `Composition_${tracks.length}_tracks`,
          filePath: '',
          fileSize: 0,
          mimeType: 'application/json',
          isProcessed: false,
          isPublic: false,
          roomId: roomId || null
        }
      })

      return NextResponse.json({
        message: 'Composition metadata created (audio mixing failed)',
        composition: fallbackResult,
        sourceTrackCount: tracks.length,
        warning: 'Audio mixing failed, but composition metadata was saved'
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Error creating composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
