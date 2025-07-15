import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { AIService, AIRecommendation } from '@/lib/ai-service'

export async function GET(request: NextRequest) {
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

    const userId = tokenData.id
    const url = new URL(request.url)
    const useAI = url.searchParams.get('ai') !== 'false' // Default to true
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Get AI recommendations if requested
    let aiRecommendations: AIRecommendation[] = []
    if (useAI) {
      aiRecommendations = await AIService.getRoomRecommendations(userId, limit)
    }

    // Get rooms from the existing endpoint
    const baseUrl = new URL('/api/rooms', request.url)
    const roomsResponse = await fetch(baseUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!roomsResponse.ok) {
      throw new Error('Failed to fetch rooms')
    }

    const rooms = await roomsResponse.json()

    // If we have AI recommendations, sort rooms based on AI scores
    if (aiRecommendations.length > 0) {
      const aiScoreMap = new Map(
        aiRecommendations.map((rec: any) => [rec.room_id, rec])
      )

      const sortedRooms = rooms
        .map((room: any) => {
          const aiRec = aiScoreMap.get(room.id)
          return {
            ...room,
            aiScore: aiRec?.score || 0,
            aiReasoning: aiRec?.reasoning,
            aiRecommended: !!aiRec
          }
        })
        .sort((a: any, b: any) => {
          // Sort by AI score (descending), then by live status, then by participant count
          if (a.aiScore !== b.aiScore) {
            return b.aiScore - a.aiScore
          }
          if (a.isLive !== b.isLive) {
            return a.isLive ? -1 : 1
          }
          return b.participantCount - a.participantCount
        })

      console.log(`✅ Sorted ${sortedRooms.length} rooms using AI recommendations for user ${userId}`)
      return NextResponse.json({
        rooms: sortedRooms,
        aiPowered: true,
        recommendations: aiRecommendations.length
      })
    } else {
      // Default sorting: live rooms first, then by participant count
      const sortedRooms = rooms.sort((a: any, b: any) => {
        if (a.isLive !== b.isLive) {
          return a.isLive ? -1 : 1
        }
        return b.participantCount - a.participantCount
      })

      console.log(`📋 Using default room sorting for user ${userId}`)
      return NextResponse.json({
        rooms: sortedRooms,
        aiPowered: false,
        recommendations: 0
      })
    }

  } catch (error) {
    console.error('Error in room recommendations API:', error)
    return NextResponse.json(
      { error: 'Failed to get room recommendations' },
      { status: 500 }
    )
  }
}
