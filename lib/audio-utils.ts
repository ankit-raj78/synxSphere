import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { DatabaseService } from './prisma'

export interface DefaultAudioFile {
  id: string
  filename: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  duration: number
  metadata: any
}

/**
 * 生成默认的音频文件内容（WAV格式的空音频文件）
 * 创建一个2秒的静音音频文件作为默认模板
 */
export function generateDefaultAudioContent(): Buffer {
  // 创建一个简单的WAV文件头（44字节）+ 2秒的静音数据
  const sampleRate = 44100
  const channels = 2
  const bitsPerSample = 16
  const duration = 2 // 2秒
  
  const numSamples = sampleRate * duration * channels
  const dataSize = numSamples * (bitsPerSample / 8)
  const fileSize = 44 + dataSize
  
  const buffer = Buffer.alloc(fileSize)
  
  // WAV文件头
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(fileSize - 8, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // fmt chunk size
  buffer.writeUInt16LE(1, 20) // PCM format
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  
  // 静音数据（已经是0填充）
  return buffer
}

/**
 * 为新创建的房间创建默认音频文件
 */
export async function createDefaultAudioFileForRoom(
  roomId: string,
  creatorId: string,
  roomName: string
): Promise<DefaultAudioFile> {
  // 创建上传目录
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'rooms', roomId)
  await mkdir(uploadsDir, { recursive: true })
  
  // 生成文件信息
  const timestamp = Date.now()
  const filename = `${timestamp}-default-template.wav`
  const originalName = `${roomName} - Default Template.wav`
  const filePath = path.join(uploadsDir, filename)
  const publicPath = `/uploads/rooms/${roomId}/${filename}`
  
  // 生成音频内容
  const audioContent = generateDefaultAudioContent()
  
  // 保存文件
  await writeFile(filePath, audioContent)
  
  // 创建数据库记录
  const audioFile = await DatabaseService.createAudioFile({
    userId: creatorId,
    filename,
    originalName,
    filePath: publicPath,
    fileSize: BigInt(audioContent.length),
    mimeType: 'audio/wav',
    roomId,
    duration: 2.0,
    sampleRate: 44100,
    channels: 2,
    bitRate: 1411,
    format: 'WAV',
    metadata: {
      type: 'default_template',
      createdBy: 'system',
      description: 'Default audio template for new room',
      uploadedAt: new Date().toISOString()
    }
  })
  
  // 同时创建 audio track 记录
  await DatabaseService.createAudioTrack({
    roomId,
    uploaderId: creatorId,
    name: originalName,
    filePath: publicPath,
    duration: "0:02",
    artist: "Template",
    waveform: generateDefaultWaveform(),
    metadata: {
      type: 'default_template',
      isTemplate: true
    }
  })
  
  return {
    id: audioFile.id,
    filename: audioFile.filename,
    originalName: audioFile.originalName,
    filePath: audioFile.filePath,
    fileSize: Number(audioFile.fileSize),
    mimeType: audioFile.mimeType,
    duration: 2.0,
    metadata: audioFile.metadata
  }
}

/**
 * 生成默认波形数据
 */
function generateDefaultWaveform(): number[] {
  return Array.from({ length: 100 }, (_, i) => {
    // 生成一个简单的正弦波形作为默认波形
    return Math.sin(i * 0.1) * 0.3 + 0.5
  })
}

/**
 * 为房间创建默认的OpenDAW项目数据，包含默认音频文件
 */
export function createDefaultOpenDAWProjectData(
  roomName: string,
  defaultAudioFile: DefaultAudioFile
): any {
  return {
    version: "1.0.0",
    name: roomName,
    description: `Studio project for ${roomName}`,
    tempo: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    settings: {
      sampleRate: 44100,
      bufferSize: 512,
      masterVolume: 0.8
    },
    tracks: [
      {
        id: `track_${defaultAudioFile.id}`,
        name: defaultAudioFile.originalName,
        type: "audio",
        audioFileId: defaultAudioFile.id,
        filePath: defaultAudioFile.filePath,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        regions: [
          {
            id: `region_${defaultAudioFile.id}`,
            name: "Default Template",
            start: 0,
            length: defaultAudioFile.duration,
            offset: 0,
            volume: 1.0,
            fadeIn: 0,
            fadeOut: 0
          }
        ]
      }
    ],
    markers: [],
    automation: {},
    metadata: {
      createdAt: new Date().toISOString(),
      type: "room_default_project",
      roomId: defaultAudioFile.id.split('_')[0] // 从文件ID推断房间ID
    }
  }
} 