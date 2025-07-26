// CRDTIntegrationExample.ts - How to integrate CRDT into existing system

import { SimpleCRDTAgent } from './SimpleCRDTAgent';
import { DatabaseService } from '../database/DatabaseService';
import { WSClient } from '../websocket/WSClient';
import { CollabMessage } from '../websocket/MessageTypes';

/**
 * One-Day CRDT Integration Example
 * 
 * This shows how to replace your existing CollaborativeOpfsAgent
 * with the new SimpleCRDTAgent in just a few steps.
 */

export class CRDTIntegrationManager {
  private crdtAgent: SimpleCRDTAgent | null = null;
  private db: DatabaseService;
  private ws: WSClient;
  private projectId: string;
  private userId: string;

  constructor(
    db: DatabaseService,
    ws: WSClient,
    projectId: string,
    userId: string
  ) {
    this.db = db;
    this.ws = ws;
    this.projectId = projectId;
    this.userId = userId;
  }

  // Step 1: Initialize CRDT system
  async initializeCRDT(): Promise<void> {
    console.log('[CRDT Integration] Initializing CRDT system...');
    
    try {
      // Create CRDT agent (no local OPFS needed for basic version)
      this.crdtAgent = new SimpleCRDTAgent(
        undefined, // localOpfs - not needed for basic implementation
        this.db,
        this.ws,
        this.projectId,
        this.userId
      );

      // Initialize and load existing state
      await this.crdtAgent.initialize();

      // Set up message handling
      this.setupMessageHandling();

      // Set up UI event listeners
      this.setupUIEventListeners();

      console.log('[CRDT Integration] ✅ CRDT system initialized successfully');
    } catch (error) {
      console.error('[CRDT Integration] ❌ Failed to initialize CRDT:', error);
      throw error;
    }
  }

  // Step 2: Set up WebSocket message handling
  private setupMessageHandling(): void {
    if (!this.crdtAgent) return;

    // Add message handler to WSClient (you'll need to modify WSClient for this)
    // For now, we'll use a simple approach
    this.addMessageHandler((message: CollabMessage) => {
      if (this.crdtAgent) {
        this.crdtAgent.handleMessage(message);
      }
    });

    console.log('[CRDT Integration] Message handling set up');
  }

  // Step 3: Set up UI event listeners
  private setupUIEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for CRDT project updates
    window.addEventListener('crdtProjectUpdate', ((event: CustomEvent) => {
      const { projectId, tracks, regionCount, lastUpdate } = event.detail;
      
      console.log(`[CRDT Integration] Project updated: ${regionCount} regions across ${tracks.length} tracks`);
      
      // Update your existing UI components
      this.updateUI(tracks);
      
    }) as EventListener);

    console.log('[CRDT Integration] UI event listeners set up');
  }

  // Step 4: Replace existing audio operations
  
  /**
   * Replace your existing addAudioRegion calls with this
   */
  async addAudioFile(fileName: string, trackId: string = 'default-track'): Promise<void> {
    if (!this.crdtAgent) {
      throw new Error('CRDT not initialized');
    }

    console.log(`[CRDT Integration] Adding audio file: ${fileName}`);

    try {
      const region = await this.crdtAgent.addAudioRegion(
        trackId,
        0,         // startTime - you can calculate this based on timeline position
        10,        // endTime - you can get this from audio file duration
        fileName,
        1.0,       // volume
        0.5,       // pan (center)
        '#3b82f6'  // color
      );

      console.log(`[CRDT Integration] ✅ Audio file added: ${region.id}`);
      
      // Optional: Trigger any additional UI updates
      this.notifyAudioFileAdded(region.id, fileName);
      
    } catch (error) {
      console.error(`[CRDT Integration] ❌ Failed to add audio file:`, error);
      throw error;
    }
  }

  /**
   * Replace your existing region movement with this
   */
  async moveAudioRegion(regionId: string, newStartTime: number, newEndTime: number): Promise<void> {
    if (!this.crdtAgent) {
      throw new Error('CRDT not initialized');
    }

    console.log(`[CRDT Integration] Moving region ${regionId} to ${newStartTime}-${newEndTime}`);

    try {
      const success = await this.crdtAgent.updateRegionPosition(regionId, newStartTime, newEndTime);
      
      if (success) {
        console.log(`[CRDT Integration] ✅ Region moved successfully`);
      } else {
        console.warn(`[CRDT Integration] ⚠️ Region move had no effect (already at position or region not found)`);
      }
      
    } catch (error) {
      console.error(`[CRDT Integration] ❌ Failed to move region:`, error);
      throw error;
    }
  }

  /**
   * Replace your existing volume changes with this
   */
  async changeRegionVolume(regionId: string, volume: number): Promise<void> {
    if (!this.crdtAgent) {
      throw new Error('CRDT not initialized');
    }

    console.log(`[CRDT Integration] Changing region ${regionId} volume to ${volume}`);

    try {
      const success = await this.crdtAgent.updateRegionVolume(regionId, volume);
      
      if (success) {
        console.log(`[CRDT Integration] ✅ Volume changed successfully`);
      } else {
        console.warn(`[CRDT Integration] ⚠️ Volume change had no effect`);
      }
      
    } catch (error) {
      console.error(`[CRDT Integration] ❌ Failed to change volume:`, error);
      throw error;
    }
  }

  /**
   * Delete an audio region
   */
  async deleteAudioRegion(regionId: string): Promise<void> {
    if (!this.crdtAgent) {
      throw new Error('CRDT not initialized');
    }

    console.log(`[CRDT Integration] Deleting region ${regionId}`);

    try {
      const success = await this.crdtAgent.deleteRegion(regionId);
      
      if (success) {
        console.log(`[CRDT Integration] ✅ Region deleted successfully`);
      } else {
        console.warn(`[CRDT Integration] ⚠️ Region deletion had no effect`);
      }
      
    } catch (error) {
      console.error(`[CRDT Integration] ❌ Failed to delete region:`, error);
      throw error;
    }
  }

  // Step 5: Get current state for UI
  
  /**
   * Get current project state for your UI components
   */
  getCurrentProjectState(): Array<{ id: string; regions: any[] }> {
    if (!this.crdtAgent) {
      return [];
    }

    return this.crdtAgent.getProjectState();
  }

  /**
   * Get individual region data
   */
  getRegion(regionId: string): any | null {
    if (!this.crdtAgent) {
      return null;
    }

    const region = this.crdtAgent.getActiveRegions().find(r => r.id === regionId);
    return region ? region.toAudioRegionData() : null;
  }

  // Helper methods

  private addMessageHandler(handler: (message: CollabMessage) => void): void {
    // TODO: You'll need to modify WSClient to support message handlers
    // For now, this is a placeholder
    console.log('[CRDT Integration] Message handler added (placeholder)');
  }

  private updateUI(tracks: Array<{ id: string; regions: any[] }>): void {
    // Update your existing UI components with new track data
    // This is where you'd trigger re-renders in React/Vue/etc.
    
    console.log(`[CRDT Integration] UI update: ${tracks.length} tracks`);
    
    // Example: Dispatch event for your existing components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audioTracksUpdated', {
        detail: { tracks }
      }));
    }
  }

  private notifyAudioFileAdded(regionId: string, fileName: string): void {
    // Notify other parts of your application that a new audio file was added
    console.log(`[CRDT Integration] Audio file notification: ${fileName} (${regionId})`);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audioFileAdded', {
        detail: { regionId, fileName }
      }));
    }
  }

  // Cleanup
  destroy(): void {
    if (this.crdtAgent) {
      this.crdtAgent.destroy();
      this.crdtAgent = null;
    }
    
    console.log('[CRDT Integration] Integration manager destroyed');
  }
}

/**
 * Example Usage in Your Existing Code:
 * 
 * // Replace your existing CollaborativeOpfsAgent initialization:
 * const crdtManager = new CRDTIntegrationManager(db, ws, projectId, userId);
 * await crdtManager.initializeCRDT();
 * 
 * // Replace your existing audio operations:
 * await crdtManager.addAudioFile('drums.wav', 'track-1');
 * await crdtManager.moveAudioRegion('region-123', 5.0, 15.0);
 * await crdtManager.changeRegionVolume('region-123', 0.8);
 * 
 * // Get current state for UI:
 * const tracks = crdtManager.getCurrentProjectState();
 * 
 * // Clean up when done:
 * crdtManager.destroy();
 */

export default CRDTIntegrationManager;
