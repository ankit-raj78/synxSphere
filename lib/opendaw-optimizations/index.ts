/**
 * OpenDAW Optimizations - Performance improvements for room project loading
 * 
 * This module provides comprehensive optimizations to address the major bottlenecks
 * identified in the OpenDAW loading process when launched from rooms.
 * 
 * Key optimizations:
 * 1. Parallel Audio Loading - Download and process multiple audio files simultaneously
 * 2. Progressive Project Loading - Non-blocking project initialization with progress feedback
 * 3. Streaming Bundle Processing - Memory-efficient large file handling
 * 4. Smart Caching - Reduce redundant processing and network requests
 * 5. Optimized Integration - Combines all optimizations with intelligent fallbacks
 */

export { ParallelAudioLoader } from './ParallelAudioLoader'
export { ProgressiveProjectLoader } from './ProgressiveProjectLoader'
export { StreamingBundleProcessor } from './StreamingBundleProcessor'
export { SmartCacheManager, globalCache } from './SmartCacheManager'
export { OptimizedOpenDAWIntegration } from './OptimizedOpenDAWIntegration'

export type {
  AudioFileMetadata,
  LoadProgress as AudioLoadProgress,
  BatchLoadResult
} from './ParallelAudioLoader'

export type {
  ProjectLoadProgress,
  ProjectLoadOptions,
  ProjectLoadResult
} from './ProgressiveProjectLoader'

export type {
  StreamingOptions,
  BundleInfo,
  StreamResult
} from './StreamingBundleProcessor'

export type {
  CacheEntry,
  CacheStats,
  CacheOptions
} from './SmartCacheManager'

export type {
  OptimizedLoadOptions,
  LoadResult as OptimizedLoadResult
} from './OptimizedOpenDAWIntegration'

/**
 * Quick setup function for immediate optimization
 */
export async function createOptimizedLoader(options?: {
  enableAll?: boolean
  maxConcurrency?: number
  showProgress?: boolean
}) {
  const { OptimizedOpenDAWIntegration } = await import('./OptimizedOpenDAWIntegration')
  
  const defaultOptions = {
    enableParallelAudio: options?.enableAll ?? true,
    enableProgressiveLoading: options?.enableAll ?? true,
    enableStreamingBundles: options?.enableAll ?? true,
    enableSmartCaching: options?.enableAll ?? true,
    maxConcurrency: options?.maxConcurrency ?? 4,
    showProgressUI: options?.showProgress ?? true
  }
  
  return new OptimizedOpenDAWIntegration(defaultOptions)
}

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Monitor loading performance and suggest optimizations
   */
  async analyzeLoadingPerformance(
    audioFileCount: number,
    bundleSize?: number,
    networkSpeed?: 'slow' | 'medium' | 'fast'
  ): Promise<{
    recommendations: string[]
    estimatedImprovement: string
    priority: 'low' | 'medium' | 'high'
  }> {
    const recommendations: string[] = []
    let priority: 'low' | 'medium' | 'high' = 'low'
    
    if (audioFileCount > 5) {
      recommendations.push('Enable parallel audio loading for faster file processing')
      priority = 'medium'
    }
    
    if (bundleSize && bundleSize > 10 * 1024 * 1024) {
      recommendations.push('Enable streaming bundle processing for large project files')
      priority = 'high'
    }
    
    if (networkSpeed === 'slow') {
      recommendations.push('Enable smart caching to reduce repeated downloads')
      priority = 'high'
    }
    
    if (audioFileCount > 10 || (bundleSize && bundleSize > 20 * 1024 * 1024)) {
      recommendations.push('Enable progressive loading for better user experience')
      priority = 'high'
    }
    
    const estimatedImprovement = priority === 'high' ? '50-70% faster' : 
                                priority === 'medium' ? '25-40% faster' : 
                                '10-20% faster'
    
    return {
      recommendations: recommendations.length > 0 ? recommendations : ['No optimizations needed'],
      estimatedImprovement,
      priority
    }
  },

  /**
   * Get current cache performance
   */
  async getCachePerformance() {
    const { globalCache } = await import('./SmartCacheManager')
    return globalCache.getStats()
  },

  /**
   * Clear all performance caches
   */
  async clearAllCaches() {
    const { globalCache } = await import('./SmartCacheManager')
    globalCache.clear()
    console.log('🧹 PERFORMANCE-MONITOR: All caches cleared')
  }
}

/**
 * Usage examples and documentation
 */
export const Examples = {
  /**
   * Basic optimized loading
   */
  basicUsage: `
    import { createOptimizedLoader } from './opendaw-optimizations'
    
    const loader = await createOptimizedLoader({
      enableAll: true,
      maxConcurrency: 4,
      showProgress: true
    })
    
    const result = await loader.loadRoomProject(service, roomId, token, apiBaseUrl)
    console.log('Load time:', result.loadTime, 'ms')
  `,

  /**
   * Custom optimization configuration
   */
  customConfiguration: `
    import { OptimizedOpenDAWIntegration } from './opendaw-optimizations'
    
    const loader = new OptimizedOpenDAWIntegration({
      enableParallelAudio: true,
      enableProgressiveLoading: true,
      enableStreamingBundles: false, // Disable for small projects
      enableSmartCaching: true,
      maxConcurrency: 6,
      onProgress: (stage, progress, message) => {
        console.log(\`[\${stage}] \${progress}%: \${message}\`)
      }
    })
  `,

  /**
   * Performance monitoring
   */
  performanceMonitoring: `
    import { PerformanceMonitor } from './opendaw-optimizations'
    
    const analysis = await PerformanceMonitor.analyzeLoadingPerformance(
      15, // audio file count
      25 * 1024 * 1024, // bundle size in bytes
      'medium' // network speed
    )
    
    console.log('Recommendations:', analysis.recommendations)
    console.log('Expected improvement:', analysis.estimatedImprovement)
  `
}

/**
 * Migration guide for existing code
 */
export const MigrationGuide = {
  description: `
    To migrate from the current loading system to the optimized version:
    
    1. Replace the existing synxsphere-integration initialization:
       OLD: await initializeSynxSphereIntegration(service)
       NEW: const loader = await createOptimizedLoader()
            await loader.loadRoomProject(service, roomId, token, apiBaseUrl)
    
    2. Update progress handling:
       The optimized loader provides detailed progress callbacks for better UX
    
    3. Enable caching:
       Smart caching is enabled by default and will significantly improve
       subsequent loading times
    
    4. Monitor performance:
       Use PerformanceMonitor to analyze and optimize loading patterns
  `,
  
  compatibilityNotes: [
    'Fully compatible with existing OpenDAW service structure',
    'Progressive enhancement - falls back gracefully if optimizations fail',
    'No changes required to existing project/audio file storage systems',
    'Cache can be disabled for testing/debugging purposes'
  ]
}
