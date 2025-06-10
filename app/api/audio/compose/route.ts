import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
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
    }

    // Get track information from database
    const trackQuery = `
      SELECT * FROM audio_files 
      WHERE id = ANY($1) AND user_id = $2
      ORDER BY created_at ASC
    `
    const trackResult = await DatabaseManager.executeQuery(trackQuery, [trackIds, user.id])
    
    if (trackResult.rows.length !== trackIds.length) {
      return NextResponse.json({ error: 'Some tracks not found or access denied' }, { status: 404 })
    }

    const tracks = trackResult.rows

    // Prepare tracks for mixing
    const trackFiles = tracks.map((track, index) => ({
      file: track.file_path,
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
      const inputs = tracks.map(track => `-i "${track.file_path}"`).join(' ')
      const filters = tracks.map((_, index) => `[${index}:0]`).join('')
      const mixFilter = `${filters}amix=inputs=${tracks.length}:duration=longest:dropout_transition=2`
      
      const ffmpegCommand = `"${ffmpegPath}" ${inputs} -filter_complex "${mixFilter}" -ac 2 -ar ${settings?.sampleRate || 44100} -b:a ${settings?.bitrate || '192k'} "${outputPath}"`
      
      console.log('Executing FFmpeg command:', ffmpegCommand)
      execSync(ffmpegCommand, { stdio: 'pipe', env: { ...process.env, PATH: process.env.PATH } })

      // Get file stats
      const stats = await fs.stat(outputPath)      // Create database record for the composition
      const compositionId = uuidv4()
      const composition = {
        id: compositionId,
        user_id: user.id,
        room_id: roomId || null,
        title: `Composition ${tracks.length} Tracks`,
        filename: outputFilename,
        file_path: outputPath,
        file_size: stats.size,
        mime_type: `audio/${settings?.format || 'mp3'}`,
        source_track_ids: trackIds,
        source_track_count: tracks.length,
        composition_settings: settings || {},
        is_public: false,
        created_at: new Date(),
        updated_at: new Date()
      }

      const insertQuery = `
        INSERT INTO compositions (
          id, user_id, room_id, title, filename, file_path, file_size, 
          mime_type, source_track_ids, source_track_count, composition_settings, 
          is_public, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `

      const insertValues = [
        composition.id,
        composition.user_id,
        composition.room_id,
        composition.title,
        composition.filename,
        composition.file_path,
        composition.file_size,
        composition.mime_type,
        composition.source_track_ids,
        composition.source_track_count,
        composition.composition_settings,
        composition.is_public,
        composition.created_at,
        composition.updated_at
      ]

      const result = await DatabaseManager.executeQuery(insertQuery, insertValues)
      const savedComposition = result.rows[0]

      // Store composition metadata
      const metadataQuery = `
        INSERT INTO composition_analysis (
          id, composition_id, created_at, updated_at
        ) 
        VALUES ($1, $2, NOW(), NOW())
      `
      await DatabaseManager.executeQuery(metadataQuery, [uuidv4(), compositionId])

      return NextResponse.json({
        message: 'Composition created successfully',
        composition: savedComposition,
        sourceTrackCount: tracks.length,
        outputFile: outputFilename
      }, { status: 201 })

    } catch (ffmpegError) {
      console.error('FFmpeg error:', ffmpegError)
      
      // Fallback: create a simple metadata-only composition record
      const compositionId = uuidv4()
      const fallbackComposition = {
        id: compositionId,
        user_id: user.id,
        filename: `composition_${Date.now()}.json`,
        original_name: `Composition_${tracks.length}_tracks`,
        file_path: '',
        file_size: 0,
        mime_type: 'application/json',
        is_processed: false,
        is_public: false,
        room_id: roomId || null,
        created_at: new Date(),
        updated_at: new Date()
      }

      const fallbackQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, is_processed, is_public, room_id, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `

      const fallbackValues = [
        fallbackComposition.id,
        fallbackComposition.user_id,
        fallbackComposition.filename,
        fallbackComposition.original_name,
        fallbackComposition.file_path,
        fallbackComposition.file_size,
        fallbackComposition.mime_type,
        fallbackComposition.is_processed,
        fallbackComposition.is_public,
        fallbackComposition.room_id,
        fallbackComposition.created_at,
        fallbackComposition.updated_at
      ]

      const fallbackResult = await DatabaseManager.executeQuery(fallbackQuery, fallbackValues)

      return NextResponse.json({
        message: 'Composition metadata created (audio mixing failed)',
        composition: fallbackResult.rows[0],
        sourceTrackCount: tracks.length,
        warning: 'Audio mixing failed, but composition metadata was saved'
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Error creating composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
