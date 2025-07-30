/**
 * Example integration of OpenDAW optimizations
 * 
 * This file shows how to replace the existing synxsphere-integration
 * with the optimized version for better performance.
 */

import { createOptimizedLoader, PerformanceMonitor } from './index'

/**
 * Optimized replacement for initializeSynxSphereIntegration
 */
export async function initializeOptimizedSynxSphereIntegration(service: any) {
  console.log('🚀 OPTIMIZED: Starting enhanced SynxSphere integration')

  try {
    // Extract room parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('projectId')
    const roomId = projectId?.startsWith('room-') ? projectId.substring(5) : null
    const userId = urlParams.get('userId')
    const userName = urlParams.get('userName')

    if (!roomId || !userId) {
      console.log('⚠️ OPTIMIZED: No room context, falling back to basic project')
      service.cleanSlate()
      service.switchScreen("default")
      return
    }

    // Get authentication token
    const token = getAuthToken()
    if (!token) {
      console.warn('⚠️ OPTIMIZED: No auth token, creating empty project')
      service.cleanSlate()
      service.switchScreen("default")
      return
    }

    // Get API base URL
    const apiBaseUrl = 'http://localhost:8000' // Default for development

    // Analyze project requirements for optimization recommendations
    console.log('📊 OPTIMIZED: Analyzing project requirements...')
    const recommendations = await PerformanceMonitor.analyzeLoadingPerformance(
      10, // Assume 10 audio files for analysis
      undefined, // Bundle size unknown initially
      'medium' // Assume medium network speed
    )
    
    console.log('💡 OPTIMIZED: Performance recommendations:', recommendations)

    // Create optimized loader with progress UI
    const loader = await createOptimizedLoader({
      enableAll: true,
      maxConcurrency: 4,
      showProgress: true
    })

    // Set up progress UI
    const progressUI = createProgressUI(projectId || roomId)
    
    // Load project with optimizations
    const result = await loader.loadRoomProject(
      service,
      roomId,
      token,
      apiBaseUrl
    )

    // Remove progress UI
    progressUI.remove()

    if (result.success) {
      console.log(`✅ OPTIMIZED: Project loaded successfully in ${result.loadTime}ms`)
      console.log(`📊 OPTIMIZED: Performance stats:`, {
        cacheHits: result.cacheHits,
        audioFiles: result.audioFilesProcessed,
        bundleProcessed: result.bundleProcessed
      })

      // Switch to workspace if not already there
      service.switchScreen("default")
      
      // Show success notification
      showOptimizationResults(result, recommendations.estimatedImprovement)
      
    } else {
      console.error('❌ OPTIMIZED: Project loading failed:', result.error)
      
      // Fallback to basic project creation
      console.log('🔄 OPTIMIZED: Falling back to basic project creation')
      service.cleanSlate()
      service.switchScreen("default")
      
      // Show error notification
      showErrorNotification(result.error || 'Unknown error')
    }

  } catch (error) {
    console.error('❌ OPTIMIZED: Integration failed:', error)
    
    // Final fallback
    service.cleanSlate()
    service.switchScreen("default")
    showErrorNotification('Optimization failed, using basic mode')
  }
}

/**
 * Get authentication token from various sources
 */
function getAuthToken(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  
  // Try URL parameter first (base64 encoded)
  const urlToken = urlParams.get('auth_token')
  if (urlToken) {
    try {
      return atob(urlToken)
    } catch (e) {
      console.warn('⚠️ Invalid base64 auth_token in URL')
    }
  }
  
  // Try session storage
  const sessionToken = sessionStorage.getItem('synxsphere_token')
  if (sessionToken) return sessionToken
  
  // Try local storage
  return localStorage.getItem('token')
}

/**
 * Create progress UI for visual feedback
 */
function createProgressUI(projectName: string): HTMLElement {
  const progressContainer = document.createElement('div')
  progressContainer.id = 'opendaw-optimization-progress'
  progressContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 30px;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 10000;
    min-width: 400px;
    text-align: center;
    border: 2px solid #3b82f6;
    backdrop-filter: blur(10px);
  `
  
  progressContainer.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
        🚀 Loading Optimized Project
      </div>
      <div style="font-size: 14px; color: #94a3b8;">
        ${projectName}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <div id="progress-stage" style="font-size: 14px; margin-bottom: 8px;">
        Initializing...
      </div>
      <div style="background: #374151; border-radius: 8px; overflow: hidden;">
        <div id="progress-bar" style="
          background: linear-gradient(90deg, #3b82f6, #10b981);
          height: 8px;
          width: 0%;
          transition: width 0.3s ease;
        "></div>
      </div>
      <div id="progress-percentage" style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
        0%
      </div>
    </div>
    
    <div id="progress-details" style="font-size: 12px; color: #94a3b8;">
      Using optimized parallel loading...
    </div>
  `
  
  document.body.appendChild(progressContainer)
  
  // Update progress based on loader callbacks
  const updateProgress = (stage: string, progress: number, message: string) => {
    const stageEl = document.getElementById('progress-stage')
    const barEl = document.getElementById('progress-bar')
    const percentageEl = document.getElementById('progress-percentage')
    const detailsEl = document.getElementById('progress-details')
    
    if (stageEl) stageEl.textContent = stage.charAt(0).toUpperCase() + stage.slice(1)
    if (barEl) barEl.style.width = `${progress}%`
    if (percentageEl) percentageEl.textContent = `${Math.round(progress)}%`
    if (detailsEl) detailsEl.textContent = message
  }
  
  // Expose update function for the loader
  ;(window as any).updateOptimizedProgress = updateProgress
  
  return progressContainer
}

/**
 * Show optimization results
 */
function showOptimizationResults(result: any, estimatedImprovement: string): void {
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(16, 185, 129, 0.95);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 10000;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(16, 185, 129, 0.3);
  `
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">
      ⚡ Optimization Active
    </div>
    <div style="font-size: 12px; opacity: 0.9;">
      Loaded in ${result.loadTime}ms • ${result.cacheHits} cache hits • ${estimatedImprovement}
    </div>
  `
  
  document.body.appendChild(notification)
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 5000)
}

/**
 * Show error notification
 */
function showErrorNotification(error: string): void {
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 10000;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(239, 68, 68, 0.3);
    max-width: 300px;
  `
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">
      ⚠️ Optimization Warning
    </div>
    <div style="font-size: 12px; opacity: 0.9;">
      ${error}
    </div>
  `
  
  document.body.appendChild(notification)
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 8000)
}

/**
 * Performance monitoring dashboard (for development)
 */
export function showPerformanceDashboard(): void {
  const dashboard = document.createElement('div')
  dashboard.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 16px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    min-width: 250px;
    border: 1px solid #374151;
  `
  
  // Update dashboard with performance stats
  const updateDashboard = async () => {
    const stats = await PerformanceMonitor.getCachePerformance()
    
    dashboard.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🔧 Performance Monitor</div>
      <div>Cache Entries: ${stats.totalEntries}</div>
      <div>Cache Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
      <div>Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%</div>
      <div>Memory Usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB</div>
      <div style="margin-top: 8px;">
        <button onclick="PerformanceMonitor.clearAllCaches()" style="
          background: #374151;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
        ">Clear Cache</button>
      </div>
    `
  }
  
  updateDashboard()
  setInterval(updateDashboard, 5000) // Update every 5 seconds
  
  document.body.appendChild(dashboard)
}

// Auto-show performance dashboard in development
if (window.location.hostname === 'localhost') {
  setTimeout(showPerformanceDashboard, 2000)
}
