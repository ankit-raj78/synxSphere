// Secure Prisma Database Service
// Replaces all raw SQL queries with type-safe ORM operations
import { PrismaClient } from '@prisma/client'
import type { 
  User, 
  Room, 
  RoomParticipant,
  AudioFile, 
  AudioAnalysis,
  AudioTrack,
  JoinRequest, 
  Composition,
  UserSession,
  JoinRequestStatus
} from '@prisma/client'

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Secure Database Service Class
export class DatabaseService {
  
  // ===== USER OPERATIONS =====
  
  static async createUser(data: {
    email: string
    username: string
    password: string
    profile?: object
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: data.password,
        profile: data.profile || { role: 'user', bio: '', avatar: '' }
      }
    })
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    })
  }

  static async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    })
  }

  static async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username }
    })
  }

  static async updateUser(id: string, data: Partial<{
    username: string
    profile: any
  }>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  static async deleteUser(id: string): Promise<User> {
    // Prisma handles cascade deletions automatically based on schema
    return prisma.user.delete({
      where: { id }
    })
  }

  static async getUsersWithPagination(options: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }) {
    const { page = 1, limit = 10, search, role } = options
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role) {
      where.profile = {
        path: ['role'],
        equals: role
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          profile: true,
          createdAt: true,
          _count: {
            select: {
              createdRooms: true,
              roomParticipants: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // ===== SESSION OPERATIONS =====
  
  static async createSession(userId: string, token: string, expiresAt: Date): Promise<UserSession> {
    return prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt
      }
    })
  }

  static async findSessionByToken(token: string): Promise<UserSession | null> {
    return prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    })
  }

  static async deleteSession(token: string): Promise<UserSession | null> {
    try {
      return await prisma.userSession.delete({
        where: { token }
      })
    } catch {
      return null
    }
  }

  static async deleteExpiredSessions(): Promise<{ count: number }> {
    return prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  }

  // ===== ROOM OPERATIONS =====
  
  static async createRoom(data: {
    name: string
    description?: string
    genre?: string
    creatorId: string
    settings?: object
  }): Promise<Room> {
    return prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        genre: data.genre,
        creatorId: data.creatorId,
        settings: data.settings || {}
      }
    })
  }

  static async findRoomById(id: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id },
      include: {
        creator: { select: { username: true } },
        participants: {
          include: { user: { select: { username: true } } }
        },
        _count: {
          select: { participants: true, audioFiles: true }
        }
      }
    })
  }

  static async getUserRooms(userId: string) {
    const [createdRooms, joinedRooms] = await Promise.all([
      // Rooms created by user
      prisma.room.findMany({
        where: { creatorId: userId },
        include: {
          _count: { select: { participants: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Rooms user joined
      prisma.room.findMany({
        where: {
          participants: { some: { userId } },
          NOT: { creatorId: userId }
        },
        include: {
          creator: { select: { username: true } },
          _count: { select: { participants: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Get membership status for all rooms
    const allRoomIds = [...createdRooms.map(r => r.id), ...joinedRooms.map(r => r.id)]
    const membershipMap: Record<string, string> = {}
    
    for (const room of createdRooms) {
      membershipMap[room.id] = 'creator'
    }
    for (const room of joinedRooms) {
      membershipMap[room.id] = 'member'
    }

    return {
      statistics: {
        created_rooms: createdRooms.length,
        joined_rooms: joinedRooms.length,
        total_rooms: createdRooms.length + joinedRooms.length
      },
      created_rooms: createdRooms,
      joined_rooms: joinedRooms,
      membership_map: membershipMap
    }
  }

  static async checkRoomMembership(roomId: string, userId: string): Promise<{
    isMember: boolean
    isCreator: boolean
    role?: string
  }> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { creatorId: true }
    })

    if (!room) {
      return { isMember: false, isCreator: false }
    }

    if (room.creatorId === userId) {
      return { isMember: true, isCreator: true, role: 'creator' }
    }

    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId }
      }
    })

    return {
      isMember: !!participant,
      isCreator: false,
      role: participant?.role || undefined
    }
  }

  // ===== ROOM PARTICIPANT OPERATIONS =====
  
  static async addRoomParticipant(data: {
    roomId: string
    userId: string
    role?: string
    instruments?: string[]
  }): Promise<RoomParticipant> {
    return prisma.roomParticipant.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        role: data.role || 'participant',
        instruments: data.instruments || []
      }
    })
  }

  static async removeRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | null> {
    try {
      return await prisma.roomParticipant.delete({
        where: {
          roomId_userId: { roomId, userId }
        }
      })
    } catch {
      return null
    }
  }

  // ===== AUDIO FILE OPERATIONS =====
  
  static async createAudioFile(data: {
    userId: string
    filename: string
    originalName: string
    filePath: string
    fileSize: bigint
    mimeType: string
    roomId?: string
    duration?: number
    sampleRate?: number
    channels?: number
    bitRate?: number
    format?: string
    metadata?: object
  }): Promise<AudioFile> {
    return prisma.audioFile.create({
      data: {
        userId: data.userId,
        filename: data.filename,
        originalName: data.originalName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        roomId: data.roomId,
        duration: data.duration,
        sampleRate: data.sampleRate,
        channels: data.channels,
        bitRate: data.bitRate,
        format: data.format,
        metadata: data.metadata || {}
      }
    })
  }

  static async createDefaultRoomAudioFile(data: {
    userId: string
    roomId: string
    roomName: string
  }): Promise<AudioFile> {
    const filename = `room_${data.roomId}_default.json`
    const defaultProjectData = {
      name: `${data.roomName} - Project`,
      version: "1.0.0",
      tracks: [],
      tempo: 120,
      timeSignature: [4, 4],
      key: "C",
      createdAt: new Date().toISOString(),
      roomId: data.roomId
    }
    
    return prisma.audioFile.create({
      data: {
        userId: data.userId,
        filename,
        originalName: `${data.roomName} - Default Project`,
        filePath: `virtual://${filename}`,
        fileSize: BigInt(JSON.stringify(defaultProjectData).length),
        mimeType: 'application/json',
        roomId: data.roomId,
        format: 'opendaw-project',
        isPublic: false,
        metadata: {
          type: 'default_room_project',
          projectData: defaultProjectData,
          isVirtual: true,
          createdAt: new Date().toISOString()
        }
      }
    })
  }

  static async findAudioFileById(id: string): Promise<AudioFile | null> {
    return prisma.audioFile.findUnique({
      where: { id },
      include: {
        user: { select: { username: true } },
        room: { select: { name: true } },
        analysis: true
      }
    })
  }

  // This method is deprecated, use getRoomStudioProject instead
  static async getRoomDefaultAudioFile(roomId: string): Promise<any | null> {
    // For backward compatibility, return the studio project data in AudioFile format
    const studioProject = await this.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      return null
    }

    // Return in a format compatible with the old API endpoint
    return {
      id: studioProject.id,
      filename: `${studioProject.name}.opendaw`,
      originalName: `${studioProject.name}.opendaw`,
      roomId: studioProject.roomId || '',
      metadata: {
        type: 'default_room_project',
        projectData: studioProject.projectData
      },
      createdAt: studioProject.createdAt,
      updatedAt: studioProject.updatedAt
    }
  }

  static async deleteAudioFile(id: string, userId: string): Promise<AudioFile | null> {
    // Only allow deletion by file owner
    try {
      return await prisma.audioFile.delete({
        where: {
          id,
          userId // This ensures user can only delete their own files
        }
      })
    } catch {
      return null
    }
  }

  // ===== JOIN REQUEST OPERATIONS =====
  
  static async createJoinRequest(data: {
    roomId: string
    userId: string
    message?: string
  }): Promise<JoinRequest> {
    return prisma.joinRequest.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        message: data.message
      }
    })
  }

  static async updateJoinRequestStatus(
    id: string,
    status: JoinRequestStatus,
    response?: string
  ): Promise<JoinRequest> {
    return prisma.joinRequest.update({
      where: { id },
      data: { status, response }
    })
  }

  // ===== STUDIO PROJECT METHODS =====

  static async createStudioProject(data: {
    userId: string
    roomId?: string
    name: string
    description?: string
    projectData?: any
    projectBinary?: Buffer
    syncVersion?: number
  }) {
    return prisma.studioProject.create({
      data: {
        userId: data.userId,
        roomId: data.roomId,
        name: data.name,
        description: data.description,
        projectData: data.projectData || {},
        projectBinary: data.projectBinary,
        syncVersion: data.syncVersion || 0
      }
    })
  }

  static async getRoomStudioProject(roomId: string) {
    return prisma.studioProject.findUnique({
      where: { roomId },
      select: {
        id: true,
        name: true,
        description: true,
        projectData: true,
        projectBinary: true,
        projectBundle: true,
        version: true,
        syncVersion: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        roomId: true
      }
    })
  }

  static async updateStudioProject(id: string, data: {
    projectData?: any
    projectBinary?: Buffer
    projectBundle?: Buffer
    name?: string
    description?: string
  }) {
    return prisma.studioProject.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      // Only select fields that are safe to return (exclude large binary/data fields)
      select: {
        id: true,
        name: true,
        description: true,
        roomId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        version: true,
        syncVersion: true,
        isPublic: true,
        // Exclude: projectData, projectBinary, projectBundle
      }
    })
  }

  static async getRoomAudioFiles(roomId: string) {
    return prisma.audioFile.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' }
    })
  }


  // ===== UTILITY METHODS =====
  
  static async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: Date }> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ok', timestamp: new Date() }
    } catch {
      return { status: 'error', timestamp: new Date() }
    }
  }

  static async createAudioTrack(data: {
    roomId: string
    uploaderId: string
    name: string
    filePath: string
    duration?: string
    artist?: string
    waveform?: number[]
    metadata?: any
  }) {
    return prisma.audioTrack.create({
      data: {
        roomId: data.roomId,
        uploaderId: data.uploaderId,
        name: data.name,
        filePath: data.filePath,
        duration: data.duration || "0:00",
        artist: data.artist || "Unknown",
        waveform: data.waveform || [],
        metadata: data.metadata || {}
      }
    })
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

// Export types for better TypeScript support
export type {
  User,
  Room,
  RoomParticipant,
  AudioFile,
  AudioAnalysis,
  AudioTrack,
  JoinRequest,
  Composition,
  UserSession,
  JoinRequestStatus
}

export default DatabaseService
