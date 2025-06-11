import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import fs from 'fs/promises'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

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
    const compositionId = url.searchParams.get('id')

    if (!compositionId) {
      return NextResponse.json({ error: 'Composition ID is required' }, { status: 400 })
    }

    // Get composition from database to verify ownership and get file path
    const selectQuery = 'SELECT * FROM compositions WHERE id = $1 AND user_id = $2'
    const selectResult = await DatabaseManager.executeQuery(selectQuery, [compositionId, user.id])

    if (selectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Composition not found or access denied' }, { status: 404 })
    }

    const composition = selectResult.rows[0]

    // Delete from composition_analysis table first (foreign key constraint)
    const deleteAnalysisQuery = 'DELETE FROM composition_analysis WHERE composition_id = $1'
    await DatabaseManager.executeQuery(deleteAnalysisQuery, [compositionId])    // Delete from compositions table
    const deleteQuery = 'DELETE FROM compositions WHERE id = $1 AND user_id = $2'
    const deleteResult = await DatabaseManager.executeQuery(deleteQuery, [compositionId, user.id])

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Failed to delete composition' }, { status: 400 })
    }

    // Delete the physical file
    try {
      await fs.unlink(composition.file_path)
    } catch (fileError) {
      console.warn('Could not delete composition file:', fileError)
      // Continue anyway - database record is already deleted
    }

    return NextResponse.json({ message: 'Composition deleted successfully' })
  } catch (error) {
    console.error('Error deleting composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
