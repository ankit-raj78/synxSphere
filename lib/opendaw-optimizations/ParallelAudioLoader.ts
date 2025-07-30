/**
 * Parallel Audio Loader - Optimizes audio file downloading and processing
 * Addresses bottlenecks: Sequential downloads, OPFS operations, redundant processing
 */

export interface AudioFileMetadata {
  id: string
  originalName: string
  filename: string
  filePath?: string
  size?: number
  duration?: number
  sampleRate?: number
  channels?: number
}

export interface LoadProgress {
  stage: 'fetching' | 'processing' | 'storing' | 'complete'
  progress: number
  fileName: string
  fileIndex: number
  totalFiles: number
}

export interface BatchLoadResult {
  successful: AudioFileMetadata[]
  failed: { file: AudioFileMetadata; error: string }[]
  totalTime: number
  cacheHits: number
}

export class ParallelAudioLoader {
  private readonly maxConcurrency: number = 4
  private readonly chunkSize: number = 8
  private readonly cacheEnabled: boolean = true
  private readonly progressCallback?: (progress: LoadProgress) => void
  
  // Cache for processed audio data
  private static audioCache = new Map<string, {
    audioData: ArrayBuffer
    peaks: ArrayBuffer
    metadata: AudioFileMetadata
    timestamp: number
  }>()
  
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(options?: {
    maxConcurrency?: number
    chunkSize?: number
    cacheEnabled?: boolean
    onProgress?: (progress: LoadProgress) => void
  }) {
    this.maxConcurrency = options?.maxConcurrency ?? 4
    this.chunkSize = options?.chunkSize ?? 8
    this.cacheEnabled = options?.cacheEnabled ?? true
    this.progressCallback = options?.onProgress
  }

  /**
   * Load multiple audio files in parallel with optimized batching
   */
  async loadAudioFilesBatch(
    files: AudioFileMetadata[],
    roomId: string,
    token: string,
    apiBaseUrl: string
  ): Promise<BatchLoadResult> {
    const startTime = Date.now()
    console.log(`🚀 PARALLEL-LOADER: Starting batch load of ${files.length} files`)
    
    // Filter out already cached files
    const { cachedFiles, filesToLoad } = this.partitionFiles(files)
    console.log(`📋 PARALLEL-LOADER: ${cachedFiles.length} cached, ${filesToLoad.length} to download`)
    
    // Process files in chunks to avoid overwhelming the system
    const chunks = this.chunkArray(filesToLoad, this.chunkSize)
    const successful: AudioFileMetadata[] = [...cachedFiles]
    const failed: { file: AudioFileMetadata; error: string }[] = []
    
    let processedCount = 0
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]
      console.log(`📦 PARALLEL-LOADER: Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} files)`)
      
      // Process chunk in parallel with concurrency limit
      const chunkResults = await this.processChunkParallel(
        chunk,
        roomId,
        token,
        apiBaseUrl,
        (progress) => {
          if (this.progressCallback) {
            this.progressCallback({
              ...progress,
              fileIndex: processedCount + progress.fileIndex,
              totalFiles: files.length
            })
          }
        }
      )
      
      successful.push(...chunkResults.successful)
      failed.push(...chunkResults.failed)
      processedCount += chunk.length
      
      // Small delay between chunks to prevent system overload
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✅ PARALLEL-LOADER: Batch complete in ${totalTime}ms`)
    console.log(`📊 PARALLEL-LOADER: ${successful.length} successful, ${failed.length} failed`)
    
    return {
      successful,
      failed,
      totalTime,
      cacheHits: cachedFiles.length
    }
  }

  /**
   * Process a chunk of files in parallel with concurrency control
   */
  private async processChunkParallel(
    files: AudioFileMetadata[],
    roomId: string,
    token: string,
    apiBaseUrl: string,
    onProgress: (progress: LoadProgress) => void
  ): Promise<{ successful: AudioFileMetadata[]; failed: { file: AudioFileMetadata; error: string }[] }> {
    const semaphore = new Semaphore(this.maxConcurrency)
    const successful: AudioFileMetadata[] = []
    const failed: { file: AudioFileMetadata; error: string }[] = []
    
    const promises = files.map(async (file, index) => {
      await semaphore.acquire()
      
      try {
        onProgress({
          stage: 'fetching',
          progress: 0,
          fileName: file.originalName,
          fileIndex: index,
          totalFiles: files.length
        })
        
        const result = await this.loadSingleAudioFile(file, roomId, token, apiBaseUrl, (stage, progress) => {
          onProgress({
            stage,
            progress,
            fileName: file.originalName,
            fileIndex: index,
            totalFiles: files.length
          })
        })
        
        if (result.success) {
          successful.push(file)
        } else {
          failed.push({ file, error: result.error || 'Unknown error' })
        }
      } catch (error) {
        failed.push({ file, error: error instanceof Error ? error.message : String(error) })
      } finally {
        semaphore.release()
      }
    })
    
    await Promise.all(promises)
    return { successful, failed }
  }

  /**
   * Load a single audio file with caching and optimized storage
   */
  private async loadSingleAudioFile(
    file: AudioFileMetadata,
    roomId: string,
    token: string,
    apiBaseUrl: string,
    onProgress: (stage: LoadProgress['stage'], progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cached = ParallelAudioLoader.audioCache.get(file.id)
        if (cached && (Date.now() - cached.timestamp) < ParallelAudioLoader.CACHE_TTL) {
          console.log(`💾 CACHE-HIT: Using cached data for ${file.originalName}`)
          await this.storeToOPFS(file, cached.audioData, cached.peaks, cached.metadata)
          onProgress('complete', 100)
          return { success: true }
        }
      }
      
      // Download audio file
      onProgress('fetching', 25)
      const downloadUrl = `${apiBaseUrl}/api/audio-files/${file.id}/download`
      const response = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }
      
      const audioBuffer = await response.arrayBuffer()
      onProgress('processing', 50)
      
      // Process audio (decode + generate peaks) in parallel
      const [audioData, peaks] = await Promise.all([
        this.processAudioBuffer(audioBuffer),
        this.generatePeaks(audioBuffer)
      ])
      
      onProgress('storing', 75)
      
      // Cache the processed data
      if (this.cacheEnabled) {
        ParallelAudioLoader.audioCache.set(file.id, {
          audioData: audioData,
          peaks: peaks,
          metadata: file,
          timestamp: Date.now()
        })
      }
      
      // Store to OPFS
      await this.storeToOPFS(file, audioData, peaks, file)
      onProgress('complete', 100)
      
      return { success: true }
      
    } catch (error) {
      console.error(`❌ PARALLEL-LOADER: Failed to load ${file.originalName}:`, error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Optimized OPFS storage with batch operations
   */
  private async storeToOPFS(
    file: AudioFileMetadata,
    audioData: ArrayBuffer,
    peaks: ArrayBuffer,
    metadata: AudioFileMetadata
  ): Promise<void> {
    // Use dynamic import to avoid circular dependencies
    const { AudioStorage } = await import('../../openDAW/studio/src/audio/AudioStorage')
    
    // Generate a simple UUID for now - in production, use proper UUID generation
    const uuidString = crypto.randomUUID()
    // Convert to UUID format expected by AudioStorage
    const uuid = new Uint8Array(16) // Placeholder - would need proper UUID conversion
    
    // Batch OPFS operations to reduce I/O overhead
    const operations = [
      AudioStorage.store(uuid, audioData as any, peaks, metadata as any)
    ]
    
    await Promise.all(operations)
  }

  /**
   * Process audio buffer (placeholder for actual audio processing)
   */
  private async processAudioBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // This would include WAV decoding, format conversion, etc.
    // For now, return the buffer as-is
    return buffer
  }

  /**
   * Generate audio peaks data
   */
  private async generatePeaks(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Simplified peaks generation - in real implementation,
    // this would analyze the audio and generate waveform peaks
    const peaks = new Float32Array(1000) // Placeholder
    return peaks.buffer
  }

  /**
   * Partition files into cached and to-be-loaded
   */
  private partitionFiles(files: AudioFileMetadata[]): {
    cachedFiles: AudioFileMetadata[]
    filesToLoad: AudioFileMetadata[]
  } {
    if (!this.cacheEnabled) {
      return { cachedFiles: [], filesToLoad: files }
    }
    
    const cachedFiles: AudioFileMetadata[] = []
    const filesToLoad: AudioFileMetadata[] = []
    
    for (const file of files) {
      const cached = ParallelAudioLoader.audioCache.get(file.id)
      if (cached && (Date.now() - cached.timestamp) < ParallelAudioLoader.CACHE_TTL) {
        cachedFiles.push(file)
      } else {
        filesToLoad.push(file)
      }
    }
    
    return { cachedFiles, filesToLoad }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupCache(): number {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, value] of ParallelAudioLoader.audioCache) {
      if (now - value.timestamp > ParallelAudioLoader.CACHE_TTL) {
        ParallelAudioLoader.audioCache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 CACHE-CLEANUP: Removed ${cleanedCount} expired entries`)
    }
    
    return cleanedCount
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    
    return new Promise(resolve => {
      this.waiting.push(resolve)
    })
  }

  release(): void {
    this.permits++
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()
      if (next) {
        this.permits--
        next()
      }
    }
  }
}
