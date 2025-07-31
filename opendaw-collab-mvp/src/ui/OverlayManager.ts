import { CollabMessage } from '../websocket/MessageTypes'

interface UserInfo {
  id: string
  name: string
  color: string
  isActive: boolean
}

export class OverlayManager {
  private currentUserId: string
  private projectId: string
  private users: Map<string, UserInfo> = new Map()
  private boxOwnership: Map<string, string> = new Map() // boxUuid -> userId
  private observer: MutationObserver | null = null
  private isInitialized = false
  private collaborationPanel: HTMLElement | null = null
  private connectionStatus: HTMLElement | null = null

  constructor(projectId: string, userId: string) {
    this.projectId = projectId
    this.currentUserId = userId
    this.setupMutationObserver()
    this.injectStyles()
    this.createUI()
    
    // Add current user to the list
    this.addCurrentUser()
  }

  private addCurrentUser(): void {
    // Add the current user with a clean name
    const currentUserName = this.getCurrentUserName()
    this.addUser(this.currentUserId, {
      name: `${currentUserName} (You)`,
      isActive: true
    })
    console.log(`👤 [OverlayManager] Added current user: ${currentUserName}`)
    
    // Update project info
    this.updateProjectInfo(`Project ${this.projectId.slice(0, 8)}`)
  }

  private getCurrentUserName(): string {
    // Try to get current user name from various sources
    if (typeof window !== 'undefined') {
      const globalUser = (window as any).currentUser
      if (globalUser && globalUser.name) {
        return globalUser.name
      }
      
      try {
        const savedUserInfo = localStorage.getItem('userInfo')
        if (savedUserInfo) {
          const userInfo = JSON.parse(savedUserInfo)
          if (userInfo.name) {
            return userInfo.name
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Generate a simple, clean friendly name
    return this.generateFriendlyName(this.currentUserId)
  }

  private injectStyles(): void {
    // Check if styles are already injected
    if (document.getElementById('opendaw-collab-styles')) {
      return
    }

    const link = document.createElement('link')
    link.id = 'opendaw-collab-styles'
    link.rel = 'stylesheet'
    link.href = '/opendaw-collab-styles.css' // We'll serve this from our server
    document.head.appendChild(link)

    // Fallback: inject critical styles inline
    const style = document.createElement('style')
    style.id = 'opendaw-collab-styles-inline'
    style.textContent = `
      .box-owned-by-me { border-left: 4px solid #10b981 !important; }
      .box-owned-by-others { border-left: 4px solid var(--owner-color, #ef4444) !important; opacity: 0.8; }
      .box-locked { pointer-events: none !important; filter: grayscale(0.5); opacity: 0.6; }
      .box-owned-by-others input, .box-owned-by-others button { pointer-events: none !important; opacity: 0.6; }
      
      /* Collapsible Collaboration Panel Styles */
      .collaboration-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(17, 24, 39, 0.95);
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        z-index: 10000;
        border: 1px solid #374151;
        min-width: 180px;
        max-width: 250px;
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
      }
      
      .collaboration-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #374151;
        background: rgba(55, 65, 81, 0.3);
      }
      
      .collaboration-header h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 500;
        color: #e5e7eb;
      }
      
      .collapse-btn, .connection-collapse-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 14px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        transition: background-color 0.2s ease;
      }
      
      .collapse-btn:hover, .connection-collapse-btn:hover {
        background: rgba(107, 114, 128, 0.2);
        color: #e5e7eb;
      }
      
      .collaboration-content {
        padding: 8px 12px;
        transition: all 0.3s ease;
      }
      
      .collaboration-panel.collapsed {
        min-width: auto;
      }
      
      .user-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      
      .user-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 11px;
      }
      
      .user-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        background: #374151;
        color: #9ca3af;
      }
      
      .upload-status {
        margin-top: 8px;
        padding: 6px;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 4px;
        border: 1px solid #10b981;
      }
      
      .upload-indicator {
        font-size: 11px;
        color: #10b981;
        text-align: center;
      }
      
      /* Connection Status Styles */
      .connection-status {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        z-index: 10000;
        min-width: 150px;
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
      }
      
      .connection-status.connected {
        border: 1px solid #10b981;
      }
      
      .connection-status.disconnected {
        border: 1px solid #ef4444;
      }
      
      .connection-status.connecting {
        border: 1px solid #f59e0b;
      }
      
      .connection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
      }
      
      .connection-text {
        font-weight: 600;
      }
      
      .connection-status.connected .connection-text {
        color: #10b981;
      }
      
      .connection-status.disconnected .connection-text {
        color: #ef4444;
      }
      
      .connection-status.connecting .connection-text {
        color: #f59e0b;
      }
      
      .connection-details {
        padding: 8px 12px;
        border-top: 1px solid #374151;
        transition: all 0.3s ease;
      }
      
      .connection-info div {
        margin: 4px 0;
        font-size: 11px;
        color: #d1d5db;
      }
      
      .connection-info span {
        color: white;
        font-weight: 500;
      }
      
      .user-name {
        font-weight: 500;
        color: #e5e7eb;
      }
      
      .user-status {
        font-size: 10px;
        color: #9ca3af;
      }
      
      .collab-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 13px;
        border-left: 3px solid #3b82f6;
      }
    `
    document.head.appendChild(style)
  }

  private createUI(): void {
    // Re-enable UI elements with collapsible functionality
    this.createCollaborationPanel()
    this.createConnectionStatus()
    
    console.log('✅ [OverlayManager] Collapsible collaboration UI elements created')
  }

  private createCollaborationPanel(): void {
    this.collaborationPanel = document.createElement('div')
    this.collaborationPanel.className = 'collaboration-panel'
    this.collaborationPanel.innerHTML = `
      <div class="collaboration-header">
        <h3>Collaborators</h3>
        <button class="collapse-btn" title="Toggle Panel">−</button>
      </div>
      <div class="collaboration-content">
        <ul class="user-list" id="user-list"></ul>
        <div class="upload-status" id="upload-status" style="display: none;">
          <div class="upload-indicator">📤 Uploading...</div>
        </div>
      </div>
    `
    
    // Add click handler for collapse functionality
    const collapseBtn = this.collaborationPanel.querySelector('.collapse-btn') as HTMLButtonElement
    const content = this.collaborationPanel.querySelector('.collaboration-content') as HTMLElement
    
    if (collapseBtn && content) {
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = content.style.display === 'none'
        content.style.display = isCollapsed ? 'block' : 'none'
        collapseBtn.textContent = isCollapsed ? '−' : '+'
        this.collaborationPanel?.classList.toggle('collapsed', !isCollapsed)
      })
    }
    
    document.body.appendChild(this.collaborationPanel)
  }

  private createConnectionStatus(): void {
    this.connectionStatus = document.createElement('div')
    this.connectionStatus.className = 'connection-status disconnected'
    this.connectionStatus.innerHTML = `
      <div class="connection-header">
        <span class="connection-text">Disconnected</span>
        <button class="connection-collapse-btn" title="Toggle Status">−</button>
      </div>
      <div class="connection-details" style="display: none;">
        <div class="connection-info">
          <div>Project: <span id="project-info">Loading...</span></div>
          <div>Status: <span id="detailed-status">Initializing</span></div>
        </div>
      </div>
    `
    
    // Add click handler for collapse functionality
    const collapseBtn = this.connectionStatus.querySelector('.connection-collapse-btn') as HTMLButtonElement
    const details = this.connectionStatus.querySelector('.connection-details') as HTMLElement
    
    if (collapseBtn && details) {
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = details.style.display === 'none'
        details.style.display = isCollapsed ? 'block' : 'none'
        collapseBtn.textContent = isCollapsed ? '−' : '+'
        this.connectionStatus?.classList.toggle('expanded', !isCollapsed)
      })
    }
    
    document.body.appendChild(this.connectionStatus)
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            this.scanForBoxElements(element)
          }
        })
      })
    })

    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startObserving()
      })
    } else {
      this.startObserving()
    }
  }

  private startObserving(): void {
    if (!this.observer) return
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    })

    // Scan existing elements
    this.scanForBoxElements(document.body)
  }

  private scanForBoxElements(root: Element): void {
    // Look for potential box elements with various selectors
    const selectors = [
      '[data-box-uuid]',           // If OpenDAW uses data attributes
      '.audio-unit-box',           // Common class name
      '.box',                      // Generic box class
      '[class*="box"]',            // Any class containing "box"
      '[id*="box"]',               // Any ID containing "box"
      '.track',                    // Alternative naming
      '[data-track-id]'            // Track data attributes
    ]

    selectors.forEach(selector => {
      try {
        const elements = root.querySelectorAll(selector)
        elements.forEach(element => {
          this.applyOwnershipStyling(element as HTMLElement)
        })
      } catch (error) {
        // Ignore invalid selectors
      }
    })
  }

  private applyOwnershipStyling(element: HTMLElement): void {
    const boxUuid = this.extractBoxUuid(element)
    if (!boxUuid) return

    const owner = this.boxOwnership.get(boxUuid)
    
    // Remove existing ownership classes
    element.classList.remove('box-owned-by-me', 'box-owned-by-others', 'box-locked')
    element.style.removeProperty('--owner-color')

    if (!owner) {
      // No owner - neutral state
      return
    }

    if (owner === this.currentUserId) {
      element.classList.add('box-owned-by-me')
    } else {
      element.classList.add('box-owned-by-others')
      const userInfo = this.users.get(owner)
      if (userInfo) {
        element.style.setProperty('--owner-color', userInfo.color)
      }
    }
  }

  private extractBoxUuid(element: HTMLElement): string | null {
    // Try various methods to extract box UUID
    
    // 1. Data attributes
    const dataUuid = element.dataset.boxUuid || element.dataset.trackId || element.dataset.uuid
    if (dataUuid) return dataUuid

    // 2. ID attribute
    const id = element.id
    if (id) {
      // Try to extract UUID from ID
      const uuidMatch = id.match(/([a-f0-9-]{36})/i)
      if (uuidMatch) return uuidMatch[1]
    }

    // 3. Class names
    const className = element.className
    if (className) {
      const uuidMatch = className.match(/([a-f0-9-]{36})/i)
      if (uuidMatch) return uuidMatch[1]
    }

    // 4. Look for UUID in child elements
    const uuidElements = element.querySelectorAll('[data-uuid], [data-box-uuid], [data-track-id]')
    if (uuidElements.length > 0) {
      const firstUuidElement = uuidElements[0] as HTMLElement
      return firstUuidElement.dataset.uuid || firstUuidElement.dataset.boxUuid || firstUuidElement.dataset.trackId || null
    }

    return null
  }

  // Public methods for handling collaboration messages

  updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected'): void {
    if (this.connectionStatus) {
      this.connectionStatus.className = `connection-status ${status}`
      const statusText = this.connectionStatus.querySelector('.connection-text') as HTMLElement
      if (statusText) {
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1)
      }
    }
  }

  // Methods for file upload status
  showUploadStatus(message: string = 'Uploading files...'): void {
    const uploadStatus = document.getElementById('upload-status') as HTMLElement
    const uploadIndicator = uploadStatus?.querySelector('.upload-indicator') as HTMLElement
    
    if (uploadStatus && uploadIndicator) {
      uploadIndicator.textContent = `📤 ${message}`
      uploadStatus.style.display = 'block'
    }
  }

  hideUploadStatus(): void {
    const uploadStatus = document.getElementById('upload-status') as HTMLElement
    if (uploadStatus) {
      uploadStatus.style.display = 'none'
    }
  }

  updateProjectInfo(projectName: string): void {
    const projectInfo = document.getElementById('project-info') as HTMLElement
    if (projectInfo) {
      projectInfo.textContent = projectName
    }
  }

  addUser(userId: string, userInfo: Partial<UserInfo>): void {
    console.log(`👤 [OverlayManager] Adding user: ${userId}`, userInfo)
    
    // Create a clean display name
    let displayName = userInfo.name || this.generateFriendlyName(userId)
    
    const user: UserInfo = {
      id: userId,
      name: displayName,
      color: '#6b7280', // Neutral gray color for everyone
      isActive: true
    }
    
    console.log(`👤 [OverlayManager] Created user object:`, user)
    this.users.set(userId, user)
    this.updateUserList()
  }

  private generateFriendlyName(userId: string): string {
    // Generate a simple, clean name based on user ID
    const names = ['Alex', 'Sam', 'Casey', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Blake', 'Drew']
    const shortId = userId.slice(0, 8)
    const nameIndex = parseInt(shortId, 16) % names.length
    return names[nameIndex]
  }

  removeUser(userId: string): void {
    this.users.delete(userId)
    this.updateUserList()
    
    // Remove ownership styling for this user
    this.removeUserBoxStyling(userId)
  }

  updateBoxOwnership(boxUuid: string, ownerId: string): void {
    this.boxOwnership.set(boxUuid, ownerId)
    this.refreshAllBoxStyling()
    this.showNotification(`Box owned by ${this.getUserName(ownerId)}`)
  }

  removeBoxOwnership(boxUuid: string): void {
    this.boxOwnership.delete(boxUuid)
    this.refreshAllBoxStyling()
  }

  handleCollaborationMessage(message: CollabMessage): void {
    console.log(`📨 [OverlayManager] Handling collaboration message:`, message)
    
    switch (message.type) {
      case 'USER_JOIN':
        console.log(`👤 [OverlayManager] USER_JOIN - userId: ${message.userId}, data:`, message.data)
        this.addUser(message.userId, message.data)
        this.showNotification(`${this.getUserName(message.userId)} joined`)
        break
      
      case 'USER_LEAVE':
        this.showNotification(`${this.getUserName(message.userId)} left`)
        this.removeUser(message.userId)
        break
      
      case 'BOX_OWNERSHIP_CLAIMED':
        this.updateBoxOwnership(message.data.boxUuid, message.data.ownerId)
        break
      
      case 'BOX_CREATED':
        this.updateBoxOwnership(message.data.boxUuid, message.data.ownerId)
        this.showNotification(`${this.getUserName(message.userId)} created a new track`)
        break
      
      case 'BOX_UPDATED':
        this.showNotification(`${this.getUserName(message.userId)} updated a track`, 1000)
        break
      
      case 'SYNC_RESPONSE':
        this.syncState(message.data)
        break
    }
  }

  private syncState(data: any): void {
    // Update ownership from server state
    this.boxOwnership.clear()
    Object.entries(data.ownership).forEach(([boxUuid, ownerId]) => {
      this.boxOwnership.set(boxUuid, ownerId as string)
    })

    // Update active users
    data.activeUsers.forEach((userId: string) => {
      if (!this.users.has(userId) && userId !== this.currentUserId) {
        this.addUser(userId, {})
      }
    })

    this.refreshAllBoxStyling()
  }

  private updateUserList(): void {
    const userList = document.getElementById('user-list')
    if (!userList) {
      console.log('🔇 [OverlayManager] User list element not found')
      return
    }

    console.log(`🔄 [OverlayManager] Updating user list with ${this.users.size} users`)
    userList.innerHTML = ''
    
    this.users.forEach(user => {
      const li = document.createElement('li')
      li.className = 'user-item'
      
      li.innerHTML = `
        <div class="user-avatar">
          👤
        </div>
        <span class="user-name">${user.name}</span>
        <span class="user-status">online</span>
      `
      userList.appendChild(li)
      console.log(`👤 [OverlayManager] Added user to list: ${user.name}`)
    })
  }

  private refreshAllBoxStyling(): void {
    // Re-scan and apply styling to all box elements
    this.scanForBoxElements(document.body)
  }

  private removeUserBoxStyling(userId: string): void {
    // Remove styling for boxes owned by this user
    Array.from(this.boxOwnership.entries())
      .filter(([, ownerId]) => ownerId === userId)
      .forEach(([boxUuid]) => {
        this.boxOwnership.delete(boxUuid)
      })
    
    this.refreshAllBoxStyling()
  }

  private generateUserColor(userId: string): string {
    // Generate consistent color based on user ID
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  private getUserName(userId: string): string {
    const user = this.users.get(userId)
    return user ? user.name : `User ${userId.slice(0, 8)}`
  }

  private showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div')
    notification.className = 'collab-notification'
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, duration)
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    
    if (this.collaborationPanel) {
      this.collaborationPanel.remove()
    }
    
    if (this.connectionStatus) {
      this.connectionStatus.remove()
    }
    
    // Remove injected styles
    const styles = document.getElementById('opendaw-collab-styles')
    if (styles) styles.remove()
    
    const inlineStyles = document.getElementById('opendaw-collab-styles-inline')
    if (inlineStyles) inlineStyles.remove()
  }
}
