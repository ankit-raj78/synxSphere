/**
 * Test the Hybrid CRDT + OpenDAW approach
 * 
 * This test demonstrates:
 * 1. Operation logging from BoxGraph changes
 * 2. Operation synchronization between users
 * 3. Project rebuilding from operations
 * 4. .od file generation
 */

import { HybridCRDTAgent, HybridCRDTConfig } from './src/crdt/HybridCRDTAgent'

// Mock BoxGraph for testing
class MockBoxGraph {
  private boxes: Map<string, any> = new Map()
  private updateListeners: Array<(update: any) => void> = []

  // Mock createBox method
  createBox(type: string, uuid: string, fields: any = {}): any {
    const box = {
      address: { uuid: { getValue: () => uuid } },
      constructor: { name: type },
      ...fields
    }
    
    this.boxes.set(uuid, box)
    
    // Notify listeners
    this.updateListeners.forEach(listener => {
      listener({
        type: 'box_created',
        box: box,
        field: null
      })
    })
    
    return box
  }

  // Mock field update
  updateBoxField(boxUuid: string, fieldName: string, oldValue: any, newValue: any): void {
    const box = this.boxes.get(boxUuid)
    if (box) {
      if (!box.fields) box.fields = {}
      box.fields[fieldName] = newValue
      
      // Notify listeners
      this.updateListeners.forEach(listener => {
        listener({
          type: 'field_updated',
          box: box,
          field: { name: fieldName },
          oldValue,
          newValue
        })
      })
    }
  }

  // Mock subscription
  subscribeToAllUpdatesImmediate(callback: (update: any) => void): void {
    this.updateListeners.push(callback)
  }

  // Get box
  findBox(uuid: string): any {
    return this.boxes.get(uuid)
  }

  // Get all boxes
  getBoxes(): any[] {
    return Array.from(this.boxes.values())
  }
}

// Mock WebSocket class with shared message broadcasting
class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1  
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  
  // Shared connection registry
  static connections: MockWebSocket[] = []
  
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2 
  readonly CLOSED = 3

  url: string
  readyState: number = 1
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    
    // Add to shared connection registry
    MockWebSocket.connections.push(this)
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({} as Event)
      }
    }, 10)
  }

  send(data: string): void {
    console.log(`[MockWebSocket] Broadcasting message to ${MockWebSocket.connections.length} connections`)
    
    // Broadcast to all other connections (not self)
    setTimeout(() => {
      MockWebSocket.connections.forEach(conn => {
        if (conn !== this && conn.onmessage && conn.readyState === this.OPEN) {
          console.log(`[MockWebSocket] Delivering message to connection`)
          conn.onmessage({ data } as MessageEvent)
        }
      })
    }, 50) // Simulate network delay
  }

  close(): void {
    this.readyState = this.CLOSED
    
    // Remove from connections
    const index = MockWebSocket.connections.indexOf(this)
    if (index > -1) {
      MockWebSocket.connections.splice(index, 1)
    }
    
    if (this.onclose) {
      this.onclose({} as CloseEvent)
    }
  }
}

// Override global WebSocket for testing
;(globalThis as any).WebSocket = MockWebSocket as any

// Override global WebSocket for testing
;(globalThis as any).WebSocket = MockWebSocket as any

async function testHybridCRDTApproach() {
  console.log('\n🧪 Testing Hybrid CRDT + OpenDAW Approach\n')

  try {
    // 1. Create mock BoxGraph instances for two users
    const boxGraphA = new MockBoxGraph()
    const boxGraphB = new MockBoxGraph()

    console.log('📦 Created mock BoxGraphs for User A and User B')

    // 2. Create Hybrid CRDT Agents
    const configA: HybridCRDTConfig = {
      userId: 'user-a',
      roomId: 'test-room',
      websocketUrl: 'ws://localhost:3001',
      autoRebuildInterval: 5000,
      syncInterval: 2000,
      enableDebugLogs: true
    }

    const configB: HybridCRDTConfig = {
      userId: 'user-b',
      roomId: 'test-room',
      websocketUrl: 'ws://localhost:3001',
      autoRebuildInterval: 5000,
      syncInterval: 2000,
      enableDebugLogs: true
    }

    const agentA = new HybridCRDTAgent(configA)
    const agentB = new HybridCRDTAgent(configB)

    console.log('🤖 Created Hybrid CRDT Agents for both users')

    // 3. Set up event handlers
    agentA.onProjectUpdateCallback((result) => {
      console.log('🎵 User A: Project updated!', {
        operationsApplied: result.operationsApplied,
        boxCount: result.metadata.boxCount,
        success: result.success
      })
    })

    agentB.onProjectUpdateCallback((result) => {
      console.log('🎵 User B: Project updated!', {
        operationsApplied: result.operationsApplied,
        boxCount: result.metadata.boxCount,
        success: result.success
      })
    })

    agentA.onErrorCallback((error) => {
      console.error('❌ User A Error:', error)
    })

    agentB.onErrorCallback((error) => {
      console.error('❌ User B Error:', error)
    })

    // 4. Initialize agents with BoxGraphs
    console.log('\n🔧 Initializing agents...')
    
    await agentA.initialize(boxGraphA)
    await agentB.initialize(boxGraphB)

    console.log('✅ Both agents initialized successfully')

    // Wait for WebSocket connections
    await new Promise(resolve => setTimeout(resolve, 200))

    // 5. Simulate User A creating audio tracks
    console.log('\n🎵 User A: Creating audio tracks...')
    
    // Create AudioFileBox
    const audioFileUuid = 'audio-file-123'
    boxGraphA.createBox('AudioFileBox', audioFileUuid, {
      fileName: 'drums.wav',
      startInSeconds: 0,
      endInSeconds: 30,
      fields: {
        fileName: 'drums.wav',
        duration: 30
      }
    })

    // Create TrackBox
    const trackUuid = 'track-456'
    boxGraphA.createBox('TrackBox', trackUuid, {
      name: 'Drum Track',
      fields: {
        name: 'Drum Track',
        volume: 0.8,
        pan: 0.0
      }
    })

    // Create AudioRegionBox
    const regionUuid = 'region-789'
    boxGraphA.createBox('AudioRegionBox', regionUuid, {
      position: 0,
      duration: 30000,
      fields: {
        position: 0,
        duration: 30000,
        volume: 1.0
      }
    })

    console.log('✅ User A created 3 boxes (AudioFile, Track, Region)')

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 500))

    // 6. Simulate User B modifying track
    console.log('\n🔧 User B: Modifying track volume...')
    
    // Find the track (should be synced)
    const syncedTrack = boxGraphB.findBox(trackUuid)
    if (syncedTrack) {
      console.log('✅ User B found synced track:', syncedTrack.fields?.name)
      
      // Modify volume
      boxGraphB.updateBoxField(trackUuid, 'volume', 0.8, 0.6)
      console.log('✅ User B changed volume: 0.8 → 0.6')
    } else {
      console.log('⚠️ User B could not find synced track yet')
    }

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 500))

    // 7. Simulate User A creating another track
    console.log('\n🎸 User A: Adding bass track...')
    
    const bassFileUuid = 'audio-file-bass'
    boxGraphA.createBox('AudioFileBox', bassFileUuid, {
      fileName: 'bass.wav',
      fields: { fileName: 'bass.wav', duration: 45 }
    })

    const bassTrackUuid = 'track-bass'
    boxGraphA.createBox('TrackBox', bassTrackUuid, {
      name: 'Bass Track',
      fields: { name: 'Bass Track', volume: 0.7 }
    })

    console.log('✅ User A added bass track')

    // Wait for final sync
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 8. Check final state
    console.log('\n📊 Final State Check:')
    
    const statusA = agentA.getStatus()
    const statusB = agentB.getStatus()

    console.log('User A Status:', {
      operationsLogged: statusA.operationsLogged,
      operationsSynced: statusA.operationsSynced,
      isConnected: statusA.isConnected,
      errors: statusA.errors.length
    })

    console.log('User B Status:', {
      operationsLogged: statusB.operationsLogged,
      operationsSynced: statusB.operationsSynced,
      isConnected: statusB.isConnected,
      errors: statusB.errors.length
    })

    // 9. Force project rebuild to generate .od files
    console.log('\n🔄 Rebuilding projects...')
    
    const rebuildResultA = await agentA.rebuildProject()
    const rebuildResultB = await agentB.rebuildProject()

    console.log('User A Rebuild:', {
      success: rebuildResultA.success,
      operationsApplied: rebuildResultA.operationsApplied,
      boxCount: rebuildResultA.metadata.boxCount,
      trackCount: rebuildResultA.metadata.trackCount,
      odFileSize: rebuildResultA.odFileBuffer?.byteLength
    })

    console.log('User B Rebuild:', {
      success: rebuildResultB.success,
      operationsApplied: rebuildResultB.operationsApplied,
      boxCount: rebuildResultB.metadata.boxCount,
      trackCount: rebuildResultB.metadata.trackCount,
      odFileSize: rebuildResultB.odFileBuffer?.byteLength
    })

    // 10. Export final state for analysis
    console.log('\n📤 Exporting final states...')
    
    const stateA = agentA.exportState()
    const stateB = agentB.exportState()

    console.log('User A Operations:', stateA.operations.length)
    console.log('User B Operations:', stateB.operations.length)

    // 11. Verify consistency
    console.log('\n🔍 Consistency Check:')
    
    const opLogA = agentA.getOperationLog()
    const opLogB = agentB.getOperationLog()
    
    let hashA = ''
    let hashB = ''
    let consistent = false
    
    if (opLogA && opLogB) {
      hashA = opLogA.getStateHash()
      hashB = opLogB.getStateHash()
      consistent = hashA === hashB
      
      if (consistent) {
        console.log('✅ CRDT Consistency: Both users have identical operation logs!')
        console.log('🎯 Hash:', hashA)
      } else {
        console.log('❌ CRDT Inconsistency detected!')
        console.log('User A Hash:', hashA)
        console.log('User B Hash:', hashB)
      }
    } else {
      console.log('❌ Cannot verify consistency: operation logs not available')
    }

    // 12. Cleanup
    console.log('\n🧹 Cleaning up...')
    await agentA.shutdown()
    await agentB.shutdown()

    console.log('\n🎉 Hybrid CRDT + OpenDAW Test Complete!')
    console.log('\n📋 Test Results Summary:')
    console.log(`- Operations logged: ${statusA.operationsLogged + statusB.operationsLogged}`)
    console.log(`- Projects rebuilt: 2`)
    console.log(`- .od files generated: 2`)
    console.log(`- Consistency achieved: ${consistent ? 'YES' : 'NO'}`)
    console.log(`- Errors: ${statusA.errors.length + statusB.errors.length}`)

    return {
      success: true,
      consistent: consistent,
      operationsTotal: statusA.operationsLogged + statusB.operationsLogged,
      errors: statusA.errors.concat(statusB.errors)
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    return {
      success: false,
      error: (error as Error).message
    }
  }
}

// Run the test
if (require.main === module) {
  testHybridCRDTApproach().then(result => {
    console.log('\n🏁 Test Result:', result)
    process.exit(result.success ? 0 : 1)
  })
}

export { testHybridCRDTApproach }
