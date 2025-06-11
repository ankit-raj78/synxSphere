import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import fs from 'fs/promises'

export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url)
    const fileId = url.searchParams.get('id')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file information from database
    const fileQuery = `
      SELECT * FROM audio_files 
      WHERE id = $1 AND user_id = $2
    `
    const fileResult = await DatabaseManager.executeQuery(fileQuery, [fileId, user.id])
    
    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    const file = fileResult.rows[0]

    try {
      // Delete physical file if it exists
      if (file.file_path) {
        await fs.unlink(file.file_path)
      }
    } catch (fsError) {
      console.warn('Could not delete physical file:', fsError)
      // Continue with database deletion even if physical file deletion fails
    }

    // Delete from audio_analysis table first (foreign key constraint)
    const deleteAnalysisQuery = `
      DELETE FROM audio_analysis 
      WHERE file_id = $1
    `
    await DatabaseManager.executeQuery(deleteAnalysisQuery, [fileId])

    // Delete from audio_files table
    const deleteFileQuery = `
      DELETE FROM audio_files 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `
    const deleteResult = await DatabaseManager.executeQuery(deleteFileQuery, [fileId, user.id])

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'File deleted successfully',
      deletedFile: deleteResult.rows[0]
    }, { status: 200 })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
