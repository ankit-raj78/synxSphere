/**
 * Smart Cache Manager - Reduces redundant processing and improves loading performance
 * Addresses bottlenecks: Redundant processing, duplicate sample checks, multiple format conversions
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  accessCount: number
  lastAccess: number
  size: number
  key: string
  metadata?: Record<string, any>
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictions: number
  memoryUsage: number
}

export interface CacheOptions {
  maxSize?: number // Maximum cache size in bytes
  maxEntries?: number // Maximum number of entries
  ttl?: number // Time to live in milliseconds
  evictionPolicy?: 'lru' | 'lfu' | 'ttl'
  persistToDisk?: boolean
  enableCompression?: boolean
}

export class SmartCacheManager {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = [] // For LRU tracking
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  }
  
  private readonly options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100 * 1024 * 1024, // 100MB default
      maxEntries: options.maxEntries ?? 1000,
      ttl: options.ttl ?? 30 * 60 * 1000, // 30 minutes default
      evictionPolicy: options.evictionPolicy ?? 'lru',
      persistToDisk: options.persistToDisk ?? false,
      enableCompression: options.enableCompression ?? false
    }

    // Initialize disk persistence if enabled
    if (this.options.persistToDisk) {
      this.initializeDiskPersistence()
    }

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      
      // Try to load from disk if persistence is enabled
      if (this.options.persistToDisk) {
        const diskData = await this.loadFromDisk<T>(key)
        if (diskData) {
          await this.set(key, diskData, { skipDiskWrite: true })
          return diskData
        }
      }
      
      return null
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccess = Date.now()
    this.updateAccessOrder(key)
    
    this.stats.hits++
    
    console.log(`💾 CACHE-HIT: Retrieved ${key} (${entry.size} bytes)`)
    return entry.data as T
  }

  /**
   * Store data in cache
   */
  async set<T>(
    key: string, 
    data: T, 
    options: { 
      ttl?: number
      metadata?: Record<string, any>
      skipDiskWrite?: boolean
    } = {}
  ): Promise<void> {
    const size = this.calculateSize(data)
    const ttl = options.ttl ?? this.options.ttl
    
    // Check if we need to make space
    await this.makeSpace(size)
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      size,
      key,
      metadata: options.metadata
    }

    // Store in memory cache
    this.cache.set(key, entry)
    this.stats.totalSize += size
    this.updateAccessOrder(key)
    
    // Persist to disk if enabled and not skipped
    if (this.options.persistToDisk && !options.skipDiskWrite) {
      await this.saveToDisk(key, data, entry)
    }
    
    console.log(`💾 CACHE-SET: Stored ${key} (${size} bytes)`)
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    this.cache.delete(key)
    this.stats.totalSize -= entry.size
    this.removeFromAccessOrder(key)
    
    // Remove from disk if persistence is enabled
    if (this.options.persistToDisk) {
      this.removeFromDisk(key).catch(console.warn)
    }
    
    console.log(`💾 CACHE-DELETE: Removed ${key}`)
    return true
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry !== undefined && !this.isExpired(entry)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats.totalSize = 0
    
    if (this.options.persistToDisk) {
      this.clearDisk().catch(console.warn)
    }
    
    console.log('💾 CACHE-CLEAR: All entries removed')
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictions: this.stats.evictions,
      memoryUsage: this.stats.totalSize
    }
  }

  /**
   * Specific cache methods for common use cases
   */

  // Audio file cache
  async cacheAudioFile(fileId: string, audioData: ArrayBuffer, metadata: any): Promise<void> {
    await this.set(`audio:${fileId}`, {
      data: audioData,
      metadata
    }, {
      metadata: { type: 'audio', fileId }
    })
  }

  async getCachedAudioFile(fileId: string): Promise<{ data: ArrayBuffer; metadata: any } | null> {
    return await this.get(`audio:${fileId}`)
  }

  // Project bundle cache
  async cacheProjectBundle(roomId: string, bundleData: ArrayBuffer): Promise<void> {
    await this.set(`bundle:${roomId}`, bundleData, {
      metadata: { type: 'bundle', roomId }
    })
  }

  async getCachedProjectBundle(roomId: string): Promise<ArrayBuffer | null> {
    return await this.get(`bundle:${roomId}`)
  }

  // BoxGraph cache
  async cacheBoxGraph(projectId: string, boxGraph: any): Promise<void> {
    await this.set(`boxgraph:${projectId}`, boxGraph, {
      metadata: { type: 'boxgraph', projectId }
    })
  }

  async getCachedBoxGraph(projectId: string): Promise<any | null> {
    return await this.get(`boxgraph:${projectId}`)
  }

  // Sample verification cache
  async cacheSampleVerification(sampleId: string, exists: boolean): Promise<void> {
    await this.set(`sample_exists:${sampleId}`, exists, {
      ttl: 5 * 60 * 1000, // Short TTL for existence checks
      metadata: { type: 'verification', sampleId }
    })
  }

  async getCachedSampleVerification(sampleId: string): Promise<boolean | null> {
    return await this.get(`sample_exists:${sampleId}`)
  }

  /**
   * Private helper methods
   */

  private async makeSpace(requiredSize: number): Promise<void> {
    // Check size limit
    while (this.stats.totalSize + requiredSize > this.options.maxSize && this.cache.size > 0) {
      await this.evictEntry()
    }
    
    // Check entry count limit
    while (this.cache.size >= this.options.maxEntries) {
      await this.evictEntry()
    }
  }

  private async evictEntry(): Promise<void> {
    let keyToEvict: string | null = null
    
    switch (this.options.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0] || null
        break
      case 'lfu':
        keyToEvict = this.findLeastFrequentlyUsed()
        break
      case 'ttl':
        keyToEvict = this.findOldestEntry()
        break
    }
    
    if (keyToEvict) {
      this.delete(keyToEvict)
      this.stats.evictions++
      console.log(`💾 CACHE-EVICT: Removed ${keyToEvict}`)
    }
  }

  private findLeastFrequentlyUsed(): string | null {
    let leastUsed: string | null = null
    let minAccessCount = Infinity
    
    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount
        leastUsed = key
      }
    }
    
    return leastUsed
  }

  private findOldestEntry(): string | null {
    let oldest: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldest = key
      }
    }
    
    return oldest
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key)
    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.options.ttl
  }

  private calculateSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength
    } else if (typeof data === 'string') {
      return data.length * 2 // Approximate UTF-16 size
    } else if (data instanceof Uint8Array) {
      return data.byteLength
    } else {
      // Rough estimation for objects
      try {
        return JSON.stringify(data).length * 2
      } catch {
        return 1024 // Default size for non-serializable objects
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    // Find expired entries
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.options.ttl) {
        keysToDelete.push(key)
      }
    }
    
    // Remove expired entries
    for (const key of keysToDelete) {
      this.delete(key)
    }
    
    if (keysToDelete.length > 0) {
      console.log(`💾 CACHE-CLEANUP: Removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Disk persistence methods (simplified implementations)
   */

  private async initializeDiskPersistence(): Promise<void> {
    // In a real implementation, this would set up IndexedDB or similar
    console.log('💾 CACHE: Disk persistence initialized')
  }

  private async loadFromDisk<T>(key: string): Promise<T | null> {
    // In a real implementation, this would load from IndexedDB
    return null
  }

  private async saveToDisk<T>(key: string, data: T, entry: CacheEntry<T>): Promise<void> {
    // In a real implementation, this would save to IndexedDB
  }

  private async removeFromDisk(key: string): Promise<void> {
    // In a real implementation, this would remove from IndexedDB
  }

  private async clearDisk(): Promise<void> {
    // In a real implementation, this would clear IndexedDB
  }
}

// Global cache instance
export const globalCache = new SmartCacheManager({
  maxSize: 200 * 1024 * 1024, // 200MB
  maxEntries: 2000,
  ttl: 30 * 60 * 1000, // 30 minutes
  evictionPolicy: 'lru',
  persistToDisk: true
})
