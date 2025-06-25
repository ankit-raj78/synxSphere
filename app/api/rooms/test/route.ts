import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    try {
      console.log('Deleting test rooms...')
      
      // Find all test rooms
      const testRooms = await prisma.room.findMany({
        where: {
          name: {
            contains: 'test',
            mode: 'insensitive'
          }
        }
      });
      
      if (testRooms.length === 0) {
        return NextResponse.json({ message: 'No test rooms found' })
      }
      
      let deletedCount = 0
      
      // Delete test room participants and rooms using transactions
      for (const room of testRooms) {
        await prisma.$transaction(async (tx) => {
          // Delete participants first (due to foreign key constraints)
          await tx.roomParticipant.deleteMany({
            where: {
              roomId: room.id
            }
          });
          
          // Delete room
          await tx.room.delete({
            where: {
              id: room.id
            }
          });
        });
        
        deletedCount++
        console.log(`Deleted test room: ${room.name}`)
      }
      
      return NextResponse.json({ 
        message: `Successfully deleted ${deletedCount} test rooms` 
      })
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error deleting test rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
