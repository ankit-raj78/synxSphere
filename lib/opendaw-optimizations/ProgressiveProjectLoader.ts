/**
 * Progressive Project Loader - Optimizes BoxGraph processing and project loading
 * Addresses bottlenecks: Synchronous BoxGraph processing, UI blocking, no progress indication
 */

export interface ProjectLoadProgress {
  stage: 'fetching' | 'decoding' | 'migrating' | 'samples' | 'ui' | 'complete'
  progress: number
  message: string
  details?: {
    boxCount?: number
    sampleCount?: number
    migrationSteps?: number
  }
}

export interface ProjectLoadOptions {
  enableProgressiveUI?: boolean
  enableWorkerProcessing?: boolean
  enablePartialLoading?: boolean
  onProgress?: (progress: ProjectLoadProgress) => void
  priority?: 'speed' | 'memory' | 'balanced'
}

export interface ProjectLoadResult {
  success: boolean
  project?: any
  session?: any
  loadTime: number
  error?: string
  warnings?: string[]
}

export class ProgressiveProjectLoader {
  private readonly options: Required<ProjectLoadOptions>
  private worker?: Worker
  private abortController?: AbortController

  constructor(options: ProjectLoadOptions = {}) {
    this.options = {
      enableProgressiveUI: options.enableProgressiveUI ?? true,
      enableWorkerProcessing: options.enableWorkerProcessing ?? false, // Disabled by default due to complexity
      enablePartialLoading: options.enablePartialLoading ?? true,
      onProgress: options.onProgress ?? (() => {}),
      priority: options.priority ?? 'balanced'
    }
  }

  /**
   * Load project with progressive enhancement and non-blocking operations
   */
  async loadProject(
    service: any,
    projectData: any,
    roomId: string
  ): Promise<ProjectLoadResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()
    const warnings: string[] = []

    try {
      console.log('🚀 PROGRESSIVE-LOADER: Starting optimized project load')
      
      // Stage 1: Quick project creation for immediate UI responsiveness
      this.reportProgress('fetching', 10, 'Creating basic project structure')
      
      const hasBundle = projectData.boxGraphData && projectData.boxGraphData.length > 0
      
      if (hasBundle) {
        return await this.loadFromBundle(service, projectData, startTime)
      } else {
        return await this.createNewProject(service, projectData, roomId, startTime)
      }

    } catch (error) {
      console.error('❌ PROGRESSIVE-LOADER: Project load failed:', error)
      return {
        success: false,
        loadTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        warnings
      }
    } finally {
      this.cleanup()
    }
  }

  /**
   * Load project from existing bundle with progressive processing
   */
  private async loadFromBundle(
    service: any,
    projectData: any,
    startTime: number
  ): Promise<ProjectLoadResult> {
    console.log('📦 PROGRESSIVE-LOADER: Loading from existing bundle')
    
    this.reportProgress('decoding', 20, 'Decoding project bundle')
    
    // Decode bundle in chunks to avoid blocking
    const bundleBuffer = await this.decodeBundleProgressive(projectData.boxGraphData)
    
    this.reportProgress('migrating', 40, 'Processing project structure')
    
    // Use OpenDAW's optimized bundle import
    const { Projects } = await import('../../openDAW/studio/src/project/Projects')
    
    // Load bundle with timeout protection
    const session = await Promise.race([
      Projects.importBundle(service, bundleBuffer),
      this.createTimeoutPromise(10000, 'Bundle loading timeout')
    ])
    
    this.reportProgress('samples', 70, 'Verifying samples')
    
    // Verify samples in background (non-blocking)
    this.verifySamplesInBackground(session.project)
    
    this.reportProgress('ui', 90, 'Updating interface')
    
    // Set session - simplified approach
    const mockOption = { wrap: (val: any) => ({ isEmpty: () => false, unwrap: () => val }) }
    service.sessionService.setValue(mockOption.wrap(session))
    
    this.reportProgress('complete', 100, 'Project loaded successfully')
    
    return {
      success: true,
      project: session.project,
      session,
      loadTime: Date.now() - startTime
    }
  }

  /**
   * Create new project with progressive setup
   */
  private async createNewProject(
    service: any,
    projectData: any,
    roomId: string,
    startTime: number
  ): Promise<ProjectLoadResult> {
    console.log('🎯 PROGRESSIVE-LOADER: Creating new project')
    
    this.reportProgress('fetching', 20, 'Creating new project')
    
    // Create basic project structure immediately
    this.safeCreateNewProject(service, 'Progressive project creation')
    
    this.reportProgress('migrating', 40, 'Setting up project defaults')
    
    // Wait for project to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))
    
    this.reportProgress('samples', 60, 'Preparing audio files')
    
    // Process audio files if available
    if (projectData.audioFiles && projectData.audioFiles.length > 0) {
      await this.processAudioFilesProgressive(service, projectData.audioFiles, roomId)
    }
    
    this.reportProgress('ui', 90, 'Finalizing setup')
    
    // Get the current session
    const currentSession = service.sessionService.getValue()
    
    this.reportProgress('complete', 100, 'New project ready')
    
    return {
      success: true,
      project: currentSession.nonEmpty() ? currentSession.unwrap().project : undefined,
      session: currentSession.nonEmpty() ? currentSession.unwrap() : undefined,
      loadTime: Date.now() - startTime
    }
  }

  /**
   * Decode bundle progressively to avoid blocking UI
   */
  private async decodeBundleProgressive(bundleData: any): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      // Use requestIdleCallback if available for non-blocking processing
      const processChunk = (deadline?: IdleDeadline) => {
        try {
          let bundleBuffer: Uint8Array
          
          if (Array.isArray(bundleData)) {
            bundleBuffer = new Uint8Array(bundleData)
          } else if (typeof bundleData === 'string') {
            const binaryString = atob(bundleData)
            bundleBuffer = new Uint8Array(binaryString.length)
            
            // Process in chunks if we have time
            let processed = 0
            const chunkSize = 1000
            
            const processNextChunk = () => {
              const end = Math.min(processed + chunkSize, binaryString.length)
              
              for (let i = processed; i < end; i++) {
                bundleBuffer[i] = binaryString.charCodeAt(i)
              }
              
              processed = end
              
              if (processed < binaryString.length) {
                // Continue processing in next idle period
                if (window.requestIdleCallback) {
                  window.requestIdleCallback(processNextChunk, { timeout: 16 })
                } else {
                  setTimeout(processNextChunk, 0)
                }
              } else {
                resolve(bundleBuffer.buffer as ArrayBuffer)
              }
            }
            
            processNextChunk()
            return
          } else {
            throw new Error('Unknown bundle format')
          }
          
          resolve(bundleBuffer.buffer as ArrayBuffer)
        } catch (error) {
          reject(error)
        }
      }
      
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processChunk, { timeout: 50 })
      } else {
        setTimeout(processChunk, 0)
      }
    })
  }

  /**
   * Process audio files with progress indication
   */
  private async processAudioFilesProgressive(
    service: any,
    audioFiles: any[],
    roomId: string
  ): Promise<void> {
    console.log(`🎵 PROGRESSIVE-LOADER: Processing ${audioFiles.length} audio files`)
    
    // Use the ParallelAudioLoader for optimized processing
    const { ParallelAudioLoader } = await import('./ParallelAudioLoader')
    
    const loader = new ParallelAudioLoader({
      maxConcurrency: 3, // Moderate concurrency for progressive loading
      onProgress: (progress) => {
        const overallProgress = 60 + (progress.progress * 0.3) // Map to 60-90% range
        this.reportProgress('samples', overallProgress, 
          `Processing ${progress.fileName} (${progress.fileIndex + 1}/${progress.totalFiles})`)
      }
    })
    
    // Get auth token
    const { token } = this.getAuthToken()
    if (!token) {
      console.warn('⚠️ PROGRESSIVE-LOADER: No token for audio processing')
      return
    }
    
    const apiBaseUrl = await this.getWorkingApiBaseUrl(token)
    if (!apiBaseUrl) {
      console.warn('⚠️ PROGRESSIVE-LOADER: No API URL for audio processing')
      return
    }
    
    await loader.loadAudioFilesBatch(audioFiles, roomId, token, apiBaseUrl)
  }

  /**
   * Verify samples in background without blocking
   */
  private verifySamplesInBackground(project: any): void {
    // Run sample verification asynchronously
    setTimeout(async () => {
      try {
        console.log('🔍 PROGRESSIVE-LOADER: Background sample verification starting')
        await project.verifySamples()
        console.log('✅ PROGRESSIVE-LOADER: Background sample verification complete')
      } catch (error) {
        console.warn('⚠️ PROGRESSIVE-LOADER: Background sample verification failed:', error)
      }
    }, 1000)
  }

  /**
   * Safe project creation helper
   */
  private safeCreateNewProject(service: any, reason: string): boolean {
    const sessionOpt = service.sessionService.getValue()
    if (sessionOpt.isEmpty()) {
      console.log(`✅ PROGRESSIVE-LOADER: Creating new project - ${reason}`)
      service.cleanSlate()
      return true
    } else {
      console.log(`⚠️ PROGRESSIVE-LOADER: Project already exists, skipping - ${reason}`)
      return false
    }
  }

  /**
   * Create timeout promise for race conditions
   */
  private createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    stage: ProjectLoadProgress['stage'],
    progress: number,
    message: string,
    details?: ProjectLoadProgress['details']
  ): void {
    if (this.abortController?.signal.aborted) return
    
    this.options.onProgress({
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      details
    })
  }

  /**
   * Get auth token (simplified version)
   */
  private getAuthToken(): { token: string | null } {
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('auth_token')
    
    if (urlToken) {
      try {
        return { token: atob(urlToken) }
      } catch (e) {
        console.warn('⚠️ Invalid base64 auth_token in URL')
      }
    }
    
    return { token: localStorage.getItem('token') || sessionStorage.getItem('synxsphere_token') }
  }

  /**
   * Get working API base URL (simplified)
   */
  private async getWorkingApiBaseUrl(token: string): Promise<string | null> {
    return 'http://localhost:8000' // Default for development
  }

  /**
   * Cancel current loading operation
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
    if (this.worker) {
      this.worker.terminate()
      this.worker = undefined
    }
    this.abortController = undefined
  }
}
