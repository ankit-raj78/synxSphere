/**
 * Streaming Bundle Processor - Optimizes large file transfers and bundle processing
 * Addresses bottlenecks: Large data transfers, base64 encoding overhead, no compression
 */

export interface StreamingOptions {
  chunkSize?: number
  enableCompression?: boolean
  enableStreamDecoding?: boolean
  maxMemoryUsage?: number // in MB
  onProgress?: (loaded: number, total: number) => void
}

export interface BundleInfo {
  size: number
  format: 'base64' | 'binary' | 'compressed'
  chunks: number
  estimatedMemory: number
}

export interface StreamResult {
  buffer: ArrayBuffer
  processTime: number
  compressionRatio?: number
  memoryPeak: number
}

export class StreamingBundleProcessor {
  private readonly options: Required<StreamingOptions>
  private decoderWorker?: Worker
  private abortController?: AbortController

  constructor(options: StreamingOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 64 * 1024, // 64KB chunks
      enableCompression: options.enableCompression ?? true,
      enableStreamDecoding: options.enableStreamDecoding ?? true,
      maxMemoryUsage: (options.maxMemoryUsage ?? 256) * 1024 * 1024, // Convert MB to bytes
      onProgress: options.onProgress ?? (() => {})
    }
  }

  /**
   * Process bundle data with streaming optimization
   */
  async processBundleStream(bundleData: any): Promise<StreamResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()
    
    try {
      console.log('🌊 STREAMING-PROCESSOR: Starting bundle processing')
      
      // Analyze bundle data
      const bundleInfo = this.analyzeBundleData(bundleData)
      console.log('📊 STREAMING-PROCESSOR: Bundle info:', bundleInfo)
      
      // Check memory constraints
      if (bundleInfo.estimatedMemory > this.options.maxMemoryUsage) {
        console.warn(`⚠️ STREAMING-PROCESSOR: Bundle size (${bundleInfo.estimatedMemory / 1024 / 1024}MB) exceeds limit`)
        const largeResult = await this.processLargeBundleStreaming(bundleData, bundleInfo)
        const processTime = Date.now() - startTime
        return {
          buffer: largeResult,
          processTime,
          memoryPeak: this.estimateMemoryUsage(bundleInfo)
        }
      }
      
      // Process based on format
      let result: ArrayBuffer
      
      if (bundleInfo.format === 'base64') {
        result = await this.processBase64Streaming(bundleData, bundleInfo)
      } else if (bundleInfo.format === 'compressed') {
        result = await this.processCompressedStreaming(bundleData, bundleInfo)
      } else {
        result = await this.processBinaryStreaming(bundleData, bundleInfo)
      }
      
      const processTime = Date.now() - startTime
      console.log(`✅ STREAMING-PROCESSOR: Completed in ${processTime}ms`)
      
      return {
        buffer: result,
        processTime,
        memoryPeak: this.estimateMemoryUsage(bundleInfo)
      }
      
    } catch (error) {
      console.error('❌ STREAMING-PROCESSOR: Processing failed:', error)
      throw error
    } finally {
      this.cleanup()
    }
  }

  /**
   * Analyze bundle data to determine optimal processing strategy
   */
  private analyzeBundleData(bundleData: any): BundleInfo {
    let size: number
    let format: 'base64' | 'binary' | 'compressed'
    
    if (typeof bundleData === 'string') {
      size = bundleData.length
      format = 'base64'
    } else if (Array.isArray(bundleData)) {
      size = bundleData.length
      format = 'binary'
    } else if (bundleData instanceof ArrayBuffer) {
      size = bundleData.byteLength
      format = 'binary'
    } else {
      throw new Error('Unknown bundle data format')
    }
    
    // Check if data might be compressed (starts with compression magic bytes)
    if (format === 'binary' && size > 4) {
      let firstBytes: number[]
      if (Array.isArray(bundleData)) {
        firstBytes = bundleData.slice(0, 4)
      } else if (bundleData instanceof ArrayBuffer) {
        firstBytes = Array.from(new Uint8Array(bundleData, 0, 4))
      } else {
        firstBytes = []
      }
      
      // Check for gzip (1f 8b), deflate, or other compression signatures
      if (this.isCompressed(firstBytes)) {
        format = 'compressed'
      }
    }
    
    const chunks = Math.ceil(size / this.options.chunkSize)
    const estimatedMemory = format === 'base64' ? size * 0.75 : size // Base64 decoding reduces size
    
    return { size, format, chunks, estimatedMemory }
  }

  /**
   * Process base64 data with streaming
   */
  private async processBase64Streaming(data: string, info: BundleInfo): Promise<ArrayBuffer> {
    console.log('📝 STREAMING-PROCESSOR: Processing base64 data with streaming')
    
    if (!this.options.enableStreamDecoding || info.size < this.options.chunkSize * 2) {
      // Small data - process directly
      return this.decodeBase64Direct(data)
    }
    
    // Large data - process in chunks
    return this.decodeBase64Chunked(data, info)
  }

  /**
   * Direct base64 decoding for small data
   */
  private decodeBase64Direct(data: string): ArrayBuffer {
    const binaryString = atob(data)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return bytes.buffer
  }

  /**
   * Chunked base64 decoding for large data
   */
  private async decodeBase64Chunked(data: string, info: BundleInfo): Promise<ArrayBuffer> {
    const totalBytes = Math.floor(data.length * 0.75) // Base64 to binary ratio
    const result = new Uint8Array(totalBytes)
    let resultOffset = 0
    
    // Process in chunks to avoid blocking UI
    for (let i = 0; i < data.length; i += this.options.chunkSize) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Processing cancelled')
      }
      
      const chunk = data.slice(i, i + this.options.chunkSize)
      
      // Ensure chunk is valid base64 (pad if necessary)
      const paddedChunk = this.padBase64Chunk(chunk, i + this.options.chunkSize >= data.length)
      
      try {
        const binaryString = atob(paddedChunk)
        
        // Copy to result buffer
        for (let j = 0; j < binaryString.length; j++) {
          if (resultOffset < result.length) {
            result[resultOffset++] = binaryString.charCodeAt(j)
          }
        }
      } catch (error) {
        console.warn(`⚠️ STREAMING-PROCESSOR: Failed to decode chunk at ${i}, skipping`)
      }
      
      // Report progress
      this.options.onProgress(i + chunk.length, data.length)
      
      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    return result.buffer.slice(0, resultOffset)
  }

  /**
   * Process compressed data
   */
  private async processCompressedStreaming(data: any, info: BundleInfo): Promise<ArrayBuffer> {
    console.log('🗜️ STREAMING-PROCESSOR: Processing compressed data')
    
    // For now, return data as-is (would implement decompression in production)
    if (data instanceof ArrayBuffer) {
      return data
    } else if (Array.isArray(data)) {
      return new Uint8Array(data).buffer
    } else {
      throw new Error('Invalid compressed data format')
    }
  }

  /**
   * Process binary data
   */
  private async processBinaryStreaming(data: any, info: BundleInfo): Promise<ArrayBuffer> {
    console.log('📦 STREAMING-PROCESSOR: Processing binary data')
    
    if (data instanceof ArrayBuffer) {
      return data
    } else if (Array.isArray(data)) {
      // Convert array to ArrayBuffer in chunks
      return this.arrayToBufferChunked(data, info)
    } else {
      throw new Error('Invalid binary data format')
    }
  }

  /**
   * Convert array to ArrayBuffer in chunks
   */
  private async arrayToBufferChunked(data: number[], info: BundleInfo): Promise<ArrayBuffer> {
    const result = new Uint8Array(data.length)
    
    for (let i = 0; i < data.length; i += this.options.chunkSize) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Processing cancelled')
      }
      
      const chunkEnd = Math.min(i + this.options.chunkSize, data.length)
      
      // Copy chunk
      for (let j = i; j < chunkEnd; j++) {
        result[j] = data[j]
      }
      
      // Report progress
      this.options.onProgress(chunkEnd, data.length)
      
      // Yield control periodically
      if (i % (this.options.chunkSize * 4) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    return result.buffer
  }

  /**
   * Process very large bundles with memory streaming
   */
  private async processLargeBundleStreaming(data: any, info: BundleInfo): Promise<ArrayBuffer> {
    console.log('🌊 STREAMING-PROCESSOR: Using memory-efficient streaming for large bundle')
    
    // Create temporary storage for large data processing
    const chunks: Uint8Array[] = []
    let totalSize = 0
    
    if (typeof data === 'string') {
      // Process base64 in smaller chunks to manage memory
      const smallChunkSize = Math.min(this.options.chunkSize, 16384) // 16KB max chunks
      
      for (let i = 0; i < data.length; i += smallChunkSize) {
        const chunk = data.slice(i, i + smallChunkSize)
        const paddedChunk = this.padBase64Chunk(chunk, i + smallChunkSize >= data.length)
        
        try {
          const binaryString = atob(paddedChunk)
          const bytes = new Uint8Array(binaryString.length)
          
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j)
          }
          
          chunks.push(bytes)
          totalSize += bytes.length
          
          // Report progress
          this.options.onProgress(i + chunk.length, data.length)
          
          // Clean up memory if getting too large
          if (totalSize > this.options.maxMemoryUsage * 0.8) {
            // Combine chunks and clean up
            const combined = this.combineChunks(chunks, totalSize)
            chunks.length = 0
            chunks.push(combined)
            totalSize = combined.length
          }
          
        } catch (error) {
          console.warn(`⚠️ STREAMING-PROCESSOR: Failed to process large chunk at ${i}`)
        }
        
        // Yield control more frequently for large files
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    // Combine all chunks into final result
    return this.combineChunks(chunks, totalSize).buffer as ArrayBuffer
  }

  /**
   * Combine multiple chunks into a single buffer
   */
  private combineChunks(chunks: Uint8Array[], totalSize: number): Uint8Array {
    const result = new Uint8Array(totalSize)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    
    return result
  }

  /**
   * Pad base64 chunk to ensure valid encoding
   */
  private padBase64Chunk(chunk: string, isLast: boolean): string {
    if (!isLast) {
      // Ensure chunk length is multiple of 4
      const remainder = chunk.length % 4
      if (remainder !== 0) {
        return chunk.slice(0, chunk.length - remainder)
      }
    } else {
      // Pad last chunk if needed
      while (chunk.length % 4 !== 0) {
        chunk += '='
      }
    }
    return chunk
  }

  /**
   * Check if data appears to be compressed
   */
  private isCompressed(firstBytes: number[] | Uint8Array): boolean {
    // Check for common compression signatures
    const bytes = Array.from(firstBytes)
    
    // Gzip: 1f 8b
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) return true
    
    // ZIP: 50 4b (PK)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return true
    
    // Add other compression format checks as needed
    
    return false
  }

  /**
   * Estimate memory usage for bundle processing
   */
  private estimateMemoryUsage(info: BundleInfo): number {
    // Rough estimation based on format and processing overhead
    let baseMemory = info.estimatedMemory
    
    if (info.format === 'base64') {
      baseMemory *= 1.5 // Temporary string storage during decoding
    }
    
    if (this.options.enableStreamDecoding && info.size > this.options.maxMemoryUsage) {
      baseMemory *= 0.6 // Streaming reduces peak memory
    }
    
    return baseMemory
  }

  /**
   * Cancel current processing operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.cleanup()
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.decoderWorker) {
      this.decoderWorker.terminate()
      this.decoderWorker = undefined
    }
    this.abortController = undefined
  }

  /**
   * Get processing recommendations for given data
   */
  static getProcessingRecommendations(bundleData: any): {
    shouldUseStreaming: boolean
    recommendedChunkSize: number
    estimatedTime: number
    memoryWarning?: string
  } {
    const size = typeof bundleData === 'string' 
      ? bundleData.length 
      : Array.isArray(bundleData) 
        ? bundleData.length 
        : bundleData.byteLength || 0
    
    const shouldUseStreaming = size > 1024 * 1024 // 1MB threshold
    const recommendedChunkSize = Math.min(64 * 1024, Math.max(4 * 1024, size / 100))
    const estimatedTime = Math.max(100, size / (1024 * 1024) * 1000) // ~1 second per MB
    
    let memoryWarning: string | undefined
    if (size > 50 * 1024 * 1024) { // 50MB
      memoryWarning = 'Large bundle detected. Consider using streaming mode or splitting the bundle.'
    }
    
    return {
      shouldUseStreaming,
      recommendedChunkSize,
      estimatedTime,
      memoryWarning
    }
  }
}
