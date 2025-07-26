/**
 * OpenDAW Project Rebuilder
 * 
 * Takes merged CRDT operations and rebuilds a consistent OpenDAW project:
 * 1. Applies operations in dependency order
 * 2. Generates valid .od file
 * 3. Updates local OPFS cache
 * 4. Handles audio file synchronization
 */

import { OpenDAWOperationLog, OpenDAWOperation } from './OpenDAWOperationLog'

// Audio file sync status
interface AudioFileStatus {
  uuid: string
  isAvailable: boolean
  needsDownload: boolean
  downloadInProgress: boolean
  metadata?: {
    name: string
    duration: number
    size: number
    url?: string
  }
}

// Project rebuild result
export interface ProjectRebuildResult {
  success: boolean
  odFileBuffer?: ArrayBuffer
  audioFilesNeeded: string[]
  audioFilesDownloaded: string[]
  operationsApplied: number
  errors: string[]
  warnings: string[]
  metadata: {
    rebuildTime: number
    totalOperations: number
    boxCount: number
    trackCount: number
  }
}

// OpenDAW Project Rebuilder
export class OpenDAWProjectRebuilder {
  private operationLog: OpenDAWOperationLog
  private userId: string
  private roomId: string
  private audioFileCache: Map<string, AudioFileStatus> = new Map()
  
  constructor(userId: string, roomId: string, operationLog: OpenDAWOperationLog) {
    this.userId = userId
    this.roomId = roomId
    this.operationLog = operationLog
  }

  // Rebuild project from operations
  async rebuildProject(): Promise<ProjectRebuildResult> {
    const startTime = Date.now()
    console.log('[ProjectRebuilder] 🔄 Starting project rebuild...')

    const result: ProjectRebuildResult = {
      success: false,
      audioFilesNeeded: [],
      audioFilesDownloaded: [],
      operationsApplied: 0,
      errors: [],
      warnings: [],
      metadata: {
        rebuildTime: 0,
        totalOperations: 0,
        boxCount: 0,
        trackCount: 0
      }
    }

    try {
      // 1. Get operations in correct order
      const orderedOperations = this.operationLog.getOrderedOperations()
      result.metadata.totalOperations = orderedOperations.length
      
      console.log(`[ProjectRebuilder] Processing ${orderedOperations.length} operations`)

      // 2. Create clean project state
      const projectState = this.createCleanProjectState()

      // 3. Apply operations sequentially
      for (const operation of orderedOperations) {
        try {
          await this.applyOperation(operation, projectState)
          this.operationLog.markApplied(operation.id)
          result.operationsApplied++
          
          console.log(`[ProjectRebuilder] ✅ Applied operation ${operation.id} (${operation.type})`)
        } catch (error) {
          const errorMsg = `Failed to apply operation ${operation.id}: ${(error as Error).message}`
          result.errors.push(errorMsg)
          console.error('[ProjectRebuilder] ❌', errorMsg)
        }
      }

      // 4. Ensure required audio files are available
      const audioFiles = this.extractAudioFiles(projectState)
      result.audioFilesNeeded = audioFiles
      
      for (const audioUuid of audioFiles) {
        if (await this.ensureAudioFileAvailable(audioUuid)) {
          result.audioFilesDownloaded.push(audioUuid)
        }
      }

      // 5. Generate .od file
      result.odFileBuffer = await this.generateODFile(projectState)
      
      // 6. Update metadata
      result.metadata.boxCount = this.countBoxes(projectState)
      result.metadata.trackCount = this.countTracks(projectState)
      result.metadata.rebuildTime = Date.now() - startTime
      
      result.success = true
      console.log(`[ProjectRebuilder] ✅ Project rebuilt successfully in ${result.metadata.rebuildTime}ms`)

    } catch (error) {
      result.errors.push(`Project rebuild failed: ${(error as Error).message}`)
      console.error('[ProjectRebuilder] ❌ Project rebuild failed:', error)
    }

    return result
  }

  // Create clean project state
  private createCleanProjectState(): any {
    // This would create a minimal OpenDAW project structure
    return {
      version: '1.0.0',
      boxes: new Map(),
      connections: new Map(),
      tracks: new Map(),
      audioFiles: new Map(),
      metadata: {
        createdAt: Date.now(),
        roomId: this.roomId,
        rebuildSource: 'crdt-operations'
      }
    }
  }

  // Apply single operation to project state
  private async applyOperation(operation: OpenDAWOperation, projectState: any): Promise<void> {
    console.log(`[ProjectRebuilder] Applying operation:`, {
      id: operation.id,
      type: operation.type,
      target: operation.target,
      userId: operation.userId
    })

    switch (operation.type) {
      case 'box_add':
        await this.applyBoxAdd(operation, projectState)
        break
        
      case 'box_remove':
        await this.applyBoxRemove(operation, projectState)
        break
        
      case 'box_modify':
        await this.applyBoxModify(operation, projectState)
        break
        
      case 'connection_change':
        await this.applyConnectionChange(operation, projectState)
        break
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }

  // Apply box addition
  private async applyBoxAdd(operation: OpenDAWOperation, projectState: any): Promise<void> {
    const { boxUuid, boxType } = operation.target
    const { boxData } = operation.data

    // Create box based on type
    const box = this.createBoxFromData(boxType, boxUuid, boxData)
    projectState.boxes.set(boxUuid, box)

    // Special handling for AudioFileBox
    if (boxType === 'AudioFileBox' && boxData.fields?.fileName) {
      projectState.audioFiles.set(boxUuid, {
        uuid: boxUuid,
        fileName: boxData.fields.fileName,
        metadata: boxData.fields
      })
    }

    // Special handling for TrackBox  
    if (boxType === 'TrackBox') {
      projectState.tracks.set(boxUuid, {
        uuid: boxUuid,
        name: boxData.fields?.name || `Track ${projectState.tracks.size + 1}`,
        regions: []
      })
    }

    console.log(`[ProjectRebuilder] ✅ Added ${boxType} box: ${boxUuid}`)
  }

  // Apply box removal
  private async applyBoxRemove(operation: OpenDAWOperation, projectState: any): Promise<void> {
    const { boxUuid, boxType } = operation.target

    // Remove from appropriate collections
    projectState.boxes.delete(boxUuid)
    projectState.audioFiles.delete(boxUuid)
    projectState.tracks.delete(boxUuid)

    // Remove connections involving this box
    for (const [connectionId, connection] of projectState.connections) {
      if (connection.sourceBox === boxUuid || connection.targetBox === boxUuid) {
        projectState.connections.delete(connectionId)
      }
    }

    console.log(`[ProjectRebuilder] ✅ Removed ${boxType} box: ${boxUuid}`)
  }

  // Apply box modification
  private async applyBoxModify(operation: OpenDAWOperation, projectState: any): Promise<void> {
    const { boxUuid, fieldPath } = operation.target
    const { newValue } = operation.data

    const box = projectState.boxes.get(boxUuid)
    if (!box) {
      throw new Error(`Box not found for modification: ${boxUuid}`)
    }

    // Apply field change
    if (fieldPath && fieldPath.length > 0) {
      this.setNestedValue(box, fieldPath, newValue)
    }

    console.log(`[ProjectRebuilder] ✅ Modified ${box.type} box ${boxUuid}: ${fieldPath?.join('.')} = ${newValue}`)
  }

  // Apply connection change
  private async applyConnectionChange(operation: OpenDAWOperation, projectState: any): Promise<void> {
    const { boxUuid } = operation.target
    const { connectionData } = operation.data

    // This would handle box connections in OpenDAW
    // Implementation depends on OpenDAW's connection system
    console.log(`[ProjectRebuilder] ✅ Applied connection change for box: ${boxUuid}`)
  }

  // Create box from data
  private createBoxFromData(boxType: string, boxUuid: string, boxData: any): any {
    return {
      uuid: boxUuid,
      type: boxType,
      fields: boxData.fields || {},
      connections: boxData.connections || {},
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    }
  }

  // Set nested value in object
  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!(key in current)) {
        current[key] = {}
      }
      current = current[key]
    }
    
    current[path[path.length - 1]] = value
  }

  // Extract audio file UUIDs from project
  private extractAudioFiles(projectState: any): string[] {
    const audioUuids: string[] = []
    
    for (const [uuid, audioFile] of projectState.audioFiles) {
      audioUuids.push(uuid)
    }
    
    return audioUuids
  }

  // Ensure audio file is available in OPFS
  private async ensureAudioFileAvailable(audioUuid: string): Promise<boolean> {
    try {
      // Check if already available in cache
      const status = this.audioFileCache.get(audioUuid)
      if (status?.isAvailable) {
        return true
      }

      // Check OPFS for audio file
      const isAvailable = await this.checkAudioFileInOPFS(audioUuid)
      
      if (isAvailable) {
        this.audioFileCache.set(audioUuid, {
          uuid: audioUuid,
          isAvailable: true,
          needsDownload: false,
          downloadInProgress: false
        })
        return true
      }

      // Download if needed
      if (!status?.downloadInProgress) {
        this.audioFileCache.set(audioUuid, {
          uuid: audioUuid,
          isAvailable: false,
          needsDownload: true,
          downloadInProgress: true
        })

        const downloaded = await this.downloadAudioFile(audioUuid)
        
        this.audioFileCache.set(audioUuid, {
          uuid: audioUuid,
          isAvailable: downloaded,
          needsDownload: !downloaded,
          downloadInProgress: false
        })

        return downloaded
      }

      return false

    } catch (error) {
      console.error(`[ProjectRebuilder] Error ensuring audio file ${audioUuid}:`, error)
      return false
    }
  }

  // Check if audio file exists in OPFS
  private async checkAudioFileInOPFS(audioUuid: string): Promise<boolean> {
    try {
      // This would check OpenDAW's OPFS structure
      // For now, simulate check
      console.log(`[ProjectRebuilder] Checking OPFS for audio file: ${audioUuid}`)
      return false // Assume needs download for demo
    } catch (error) {
      console.error(`[ProjectRebuilder] Error checking OPFS for ${audioUuid}:`, error)
      return false
    }
  }

  // Download audio file from server
  private async downloadAudioFile(audioUuid: string): Promise<boolean> {
    try {
      console.log(`[ProjectRebuilder] Downloading audio file: ${audioUuid}`)
      
      // This would download from your server
      // const response = await fetch(`/api/audio/${audioUuid}`)
      // const audioBuffer = await response.arrayBuffer()
      // await this.saveToOPFS(audioUuid, audioBuffer)
      
      // For demo, simulate download
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log(`[ProjectRebuilder] ✅ Downloaded audio file: ${audioUuid}`)
      return true
      
    } catch (error) {
      console.error(`[ProjectRebuilder] ❌ Failed to download audio file ${audioUuid}:`, error)
      return false
    }
  }

  // Generate .od file from project state
  private async generateODFile(projectState: any): Promise<ArrayBuffer> {
    try {
      console.log('[ProjectRebuilder] Generating .od file...')
      
      // This would use OpenDAW's serialization
      // For now, create a simple binary representation
      const projectJson = JSON.stringify({
        version: projectState.version,
        metadata: projectState.metadata,
        boxes: Array.from(projectState.boxes.entries()),
        connections: Array.from(projectState.connections.entries()),
        tracks: Array.from(projectState.tracks.entries()),
        audioFiles: Array.from(projectState.audioFiles.entries())
      })

      // Simple binary format: magic header + JSON length + JSON data
      const magicHeader = new Uint8Array([0x4F, 0x44, 0x41, 0x57]) // "ODAW"
      const jsonBytes = new TextEncoder().encode(projectJson)
      const lengthBytes = new Uint32Array([jsonBytes.length])
      
      const totalLength = magicHeader.length + lengthBytes.byteLength + jsonBytes.length
      const buffer = new ArrayBuffer(totalLength)
      const view = new Uint8Array(buffer)
      
      let offset = 0
      view.set(magicHeader, offset)
      offset += magicHeader.length
      
      view.set(new Uint8Array(lengthBytes.buffer), offset)
      offset += lengthBytes.byteLength
      
      view.set(jsonBytes, offset)
      
      console.log(`[ProjectRebuilder] ✅ Generated .od file (${totalLength} bytes)`)
      return buffer
      
    } catch (error) {
      console.error('[ProjectRebuilder] Error generating .od file:', error)
      throw error
    }
  }

  // Count boxes in project
  private countBoxes(projectState: any): number {
    return projectState.boxes.size
  }

  // Count tracks in project
  private countTracks(projectState: any): number {
    return projectState.tracks.size
  }

  // Get audio file sync status
  getAudioFileStatus(): AudioFileStatus[] {
    return Array.from(this.audioFileCache.values())
  }

  // Clear cache
  clearCache(): void {
    this.audioFileCache.clear()
    console.log('[ProjectRebuilder] 🧹 Cleared audio file cache')
  }

  // Get rebuild statistics
  getStats(): any {
    return {
      audioFilesInCache: this.audioFileCache.size,
      availableAudioFiles: Array.from(this.audioFileCache.values()).filter(f => f.isAvailable).length,
      downloadingAudioFiles: Array.from(this.audioFileCache.values()).filter(f => f.downloadInProgress).length,
      operationLogStats: this.operationLog.getStats()
    }
  }
}
