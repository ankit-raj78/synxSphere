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
  roomId: string,
  defaultAudioFile?: DefaultAudioFile,
  additionalAudioFiles?: DefaultAudioFile[]
): any {
  const tracks = []
  
  // Add default audio file track if provided
  if (defaultAudioFile) {
    tracks.push({
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
    })
  }

  // Add tracks for all additional audio files
  if (additionalAudioFiles) {
    additionalAudioFiles.forEach((audioFile, index) => {
      tracks.push({
        id: `track_${audioFile.id}`,
        name: audioFile.originalName,
        type: "audio",
        audioFileId: audioFile.id,
        filePath: audioFile.filePath,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        regions: [
          {
            id: `region_${audioFile.id}`,
            name: audioFile.originalName,
            start: 0,
            length: audioFile.duration || 0,
            offset: 0,
            volume: 1.0,
            fadeIn: 0,
            fadeOut: 0
          }
        ]
      })
    })
  }

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
    tracks,
    markers: [],
    automation: {},
    metadata: {
      createdAt: new Date().toISOString(),
      type: "room_default_project",
      roomId: roomId,
      version: "1.0.0",
      trackCount: tracks.length
    }
  }
}

/**
 * 生成空的 OpenDAW 二进制项目文件 (.od)
 * 这是一个最小的有效 OpenDAW 项目文件
 */
export function generateEmptyOpenDAWBinary(projectData: any): Buffer {
  // OpenDAW .od 文件的基本结构
  const magicHeader = Buffer.from([0x4F, 0x50, 0x45, 0x4E]) // "OPEN" in hex
  const formatVersion = Buffer.alloc(4)
  formatVersion.writeUInt32LE(2, 0) // Version 2
  
  // 将 JSON 数据转换为简化的二进制格式
  const jsonString = JSON.stringify(projectData)
  const jsonBuffer = Buffer.from(jsonString, 'utf8')
  const jsonLength = Buffer.alloc(4)
  jsonLength.writeUInt32LE(jsonBuffer.length, 0)
  
  // 组合所有部分
  return Buffer.concat([
    magicHeader,           // 4 bytes: Magic header
    formatVersion,         // 4 bytes: Format version
    jsonLength,            // 4 bytes: JSON data length
    jsonBuffer,            // Variable: JSON data
  ])
}

/**
 * 生成空的 OpenDAW 协作同步日志文件 (.odsl)
 */
export function generateEmptyOpenDAWSyncLog(roomId: string, userId: string): Buffer {
  const syncLogData = {
    version: "1.0.0",
    roomId: roomId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    syncVersion: 0,
    entries: [] // 空的同步条目数组
  }
  
  // 简化的同步日志格式（实际中应该使用 OpenDAW 的二进制格式）
  const logString = JSON.stringify(syncLogData)
  return Buffer.from(logString, 'utf8')
}

/**
 * 为房间创建完整的项目文件集合
 */
export interface RoomProjectFiles {
  projectJson: any           // JSON 格式的项目数据
  projectBinary: Buffer      // .od 二进制文件
  syncLog: Buffer           // .odsl 同步日志文件
}

export function createRoomProjectFiles(
  roomId: string,
  roomName: string,
  userId: string,
  defaultAudioFile?: DefaultAudioFile
): RoomProjectFiles {
  // 1. 生成 JSON 项目数据
  const projectJson = createDefaultOpenDAWProjectData(roomName, roomId, defaultAudioFile)
  
  // 2. 生成二进制项目文件
  const projectBinary = generateEmptyOpenDAWBinary(projectJson)
  
  // 3. 生成同步日志文件
  const syncLog = generateEmptyOpenDAWSyncLog(roomId, userId)
  
  return {
    projectJson,
    projectBinary,
    syncLog
  }
}

/**
 * 生成完整的 OpenDAW 项目包 (.odb) 文件
 * 包含项目配置 + 所有音频文件
 */
export async function generateOpenDAWBundle(
  roomId: string,
  projectData: any,
  audioFiles: DefaultAudioFile[]
): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  
  // 1. 添加项目文件
  const projectBinary = generateEmptyOpenDAWBinary(projectData)
  zip.file('project.od', projectBinary)
  
  // 2. 添加项目元数据
  const metaData = {
    name: projectData.name,
    description: projectData.description,
    version: projectData.version,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    roomId: roomId
  }
  zip.file('meta.json', JSON.stringify(metaData, null, 2))
  
  // 3. 添加版本信息
  zip.file('version', '1')
  
  // 4. 添加音频文件
  const samplesFolder = zip.folder('samples')
  if (samplesFolder) {
    for (const audioFile of audioFiles) {
      try {
        // 如果是虚拟文件，跳过
        if (audioFile.filePath.startsWith('virtual://')) {
          continue
        }
        
        // 读取音频文件
        const fs = await import('fs')
        const path = await import('path')
        const fullPath = path.join(process.cwd(), 'public', audioFile.filePath)
        
        if (fs.existsSync(fullPath)) {
          const audioBuffer = fs.readFileSync(fullPath)
          samplesFolder.file(audioFile.filename, audioBuffer)
        }
      } catch (error) {
        console.error(`Failed to add audio file ${audioFile.filename} to bundle:`, error)
      }
    }
  }
  
  // 5. 生成 ZIP 文件
  const bundleBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  return bundleBuffer
}

/**
 * 扩展的房间项目文件接口，支持 .odb 包
 */
export interface ExtendedRoomProjectFiles extends RoomProjectFiles {
  projectBundle?: Buffer    // .odb 项目包文件
}

/**
 * 创建包含 .odb 包的完整项目文件集合
 */
export async function createCompleteRoomProjectFiles(
  roomId: string,
  roomName: string,
  userId: string,
  defaultAudioFile?: DefaultAudioFile,
  additionalAudioFiles: DefaultAudioFile[] = []
): Promise<ExtendedRoomProjectFiles> {
  // 1. 创建基本项目文件
  const basicFiles = createRoomProjectFiles(roomId, roomName, userId, defaultAudioFile)
  
  // 2. 收集所有音频文件
  const allAudioFiles = []
  if (defaultAudioFile) allAudioFiles.push(defaultAudioFile)
  allAudioFiles.push(...additionalAudioFiles)
  
  // 3. 生成 .odb 包（如果有音频文件）
  let projectBundle: Buffer | undefined
  if (allAudioFiles.length > 0) {
    try {
      projectBundle = await generateOpenDAWBundle(roomId, basicFiles.projectJson, allAudioFiles)
    } catch (error) {
      console.error('Failed to generate .odb bundle:', error)
    }
  }
  
  return {
    ...basicFiles,
    projectBundle
  }
} 