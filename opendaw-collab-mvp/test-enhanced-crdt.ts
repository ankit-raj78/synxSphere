// Test Enhanced CRDT with UpdateTask support
import { OpenDAWUpdateTaskGenerator, UpdateTask } from './src/crdt/OpenDAWUpdateTaskGenerator'

// Mock for testing UpdateTask integration
class MockEnhancedCRDTAgent {
  private updateTaskGenerator: OpenDAWUpdateTaskGenerator
  private operations: any[] = []
  private syncTarget: any = null

  constructor(userId: string, roomId: string) {
    this.updateTaskGenerator = new OpenDAWUpdateTaskGenerator(userId, roomId)
    console.log(`[MockEnhancedCRDT] 🚀 Created enhanced agent for ${userId}`)
  }

  // Add mock operations
  addOperation(operation: any): void {
    this.operations.push(operation)
    console.log(`[MockEnhancedCRDT] ➕ Added operation: ${operation.type} (${operation.id})`)
  }

  // Set sync target (like OpenDAW's sync-target)
  setSyncTarget(syncTarget: any): void {
    this.syncTarget = syncTarget
    console.log(`[MockEnhancedCRDT] 🔗 Connected to sync target`)
  }

  // Process operations using UpdateTasks
  async processWithUpdateTasks(): Promise<any> {
    if (this.operations.length === 0) {
      return { success: true, operationsApplied: 0 }
    }

    console.log(`[MockEnhancedCRDT] 🔄 Processing ${this.operations.length} operations as UpdateTasks`)

    // Generate UpdateTasks
    const updateTasks = this.updateTaskGenerator.generateUpdateTasks(this.operations)

    // Apply to sync target if available
    if (this.syncTarget) {
      console.log(`[MockEnhancedCRDT] 🎯 Sending UpdateTasks to sync target`)
      this.syncTarget.sendUpdates(updateTasks)
    }

    const result = {
      success: true,
      operationsApplied: this.operations.length,
      updateTasksGenerated: updateTasks.length,
      method: 'updateTasks'
    }

    // Clear processed operations
    this.operations = []

    return result
  }

  getStatus() {
    return {
      operationsQueued: this.operations.length,
      syncTargetConnected: !!this.syncTarget,
      generatorStats: this.updateTaskGenerator.getStats()
    }
  }
}

// Mock OpenDAW sync target (like the one in sync-target.ts)
class MockOpenDAWSyncTarget {
  private boxGraph: Map<string, any> = new Map()
  private inTransaction = false

  sendUpdates(updates: ReadonlyArray<UpdateTask>): void {
    console.log(`[MockSyncTarget] 📥 Received ${updates.length} UpdateTasks`)
    
    this.beginTransaction()
    
    try {
      updates.forEach(update => {
        switch (update.type) {
          case "new":
            console.log(`[MockSyncTarget] ➕ Creating ${update.name} box: ${update.uuid}`)
            this.boxGraph.set(update.uuid!, {
              uuid: update.uuid,
              type: update.name,
              buffer: update.buffer,
              created: Date.now()
            })
            break
            
          case "update-primitive":
            console.log(`[MockSyncTarget] 📝 Updating field: ${update.address} = ${update.value}`)
            // Would update field in real implementation
            break
            
          case "update-pointer":
            console.log(`[MockSyncTarget] 🔗 Updating pointer: ${update.address} -> ${update.target}`)
            // Would update pointer in real implementation
            break
            
          case "delete":
            console.log(`[MockSyncTarget] ❌ Deleting box: ${update.uuid}`)
            this.boxGraph.delete(update.uuid!)
            break
        }
      })
      
      this.endTransaction()
      console.log(`[MockSyncTarget] ✅ Applied ${updates.length} UpdateTasks successfully`)
      
    } catch (error) {
      console.error(`[MockSyncTarget] ❌ Error applying UpdateTasks:`, error)
      this.endTransaction()
    }
  }

  async checksum(value: Int8Array): Promise<void> {
    console.log(`[MockSyncTarget] 🔍 Verifying checksum: ${value.length} bytes`)
    // Would compare with actual boxGraph checksum
    return Promise.resolve()
  }

  private beginTransaction(): void {
    console.log(`[MockSyncTarget] 🔄 Beginning transaction`)
    this.inTransaction = true
  }

  private endTransaction(): void {
    console.log(`[MockSyncTarget] ✅ Ending transaction`)
    this.inTransaction = false
  }

  getBoxCount(): number {
    return this.boxGraph.size
  }

  getAllBoxes(): any[] {
    return Array.from(this.boxGraph.values())
  }
}

async function testEnhancedCRDTWithUpdateTasks() {
  console.log('\n🧪 Testing Enhanced CRDT with OpenDAW UpdateTask Integration\n')

  // 1. Create enhanced CRDT agent
  const agent = new MockEnhancedCRDTAgent('user-enhanced', 'room-enhanced')
  
  // 2. Create OpenDAW-style sync target
  const syncTarget = new MockOpenDAWSyncTarget()
  agent.setSyncTarget(syncTarget)

  // 3. Add some CRDT operations
  const operations = [
    {
      id: 'op-audio-001',
      type: 'box_add',
      target: { boxUuid: 'audio-001', boxType: 'AudioFileBox' },
      data: { fileName: 'kick.wav', duration: 2.5 },
      userId: 'user-enhanced',
      timestamp: Date.now(),
      vectorClock: { 'user-enhanced': 1 },
      dependencies: []
    },
    {
      id: 'op-track-001', 
      type: 'box_add',
      target: { boxUuid: 'track-001', boxType: 'TrackBox' },
      data: { name: 'Kick Track', volume: 0.8 },
      userId: 'user-enhanced',
      timestamp: Date.now() + 1,
      vectorClock: { 'user-enhanced': 2 },
      dependencies: ['op-audio-001']
    },
    {
      id: 'op-volume-update',
      type: 'field_update',
      target: { 
        boxUuid: 'track-001', 
        boxType: 'TrackBox',
        fieldAddress: 'track-001/volume'
      },
      data: { oldValue: 0.8, newValue: 0.95 },
      userId: 'user-enhanced',
      timestamp: Date.now() + 2,
      vectorClock: { 'user-enhanced': 3 },
      dependencies: ['op-track-001']
    }
  ]

  // Add operations to agent
  operations.forEach(op => agent.addOperation(op))

  console.log(`📊 Initial Status:`)
  const initialStatus = agent.getStatus()
  console.log(`   Operations queued: ${initialStatus.operationsQueued}`)
  console.log(`   Sync target connected: ${initialStatus.syncTargetConnected}`)

  // 4. Process operations using UpdateTasks
  console.log(`\n🔄 Processing operations...`)
  const result = await agent.processWithUpdateTasks()

  // 5. Check final state
  console.log(`\n📊 Final State:`)
  console.log(`   Operations applied: ${result.operationsApplied}`)
  console.log(`   UpdateTasks generated: ${result.updateTasksGenerated}`)
  console.log(`   Method used: ${result.method}`)
  console.log(`   Boxes in sync target: ${syncTarget.getBoxCount()}`)

  console.log(`\n📦 Boxes in OpenDAW sync target:`)
  syncTarget.getAllBoxes().forEach(box => {
    console.log(`   - ${box.type} (${box.uuid})`)
  })

  return {
    success: result.success,
    operationsProcessed: result.operationsApplied,
    updateTasksGenerated: result.updateTasksGenerated,
    finalBoxCount: syncTarget.getBoxCount(),
    integrationMethod: 'openDAW-updateTasks'
  }
}

// Run the test
if (require.main === module) {
  testEnhancedCRDTWithUpdateTasks().then(result => {
    console.log('\n🏁 Enhanced CRDT UpdateTask Test Result:', result)
    console.log('\n🎯 This demonstrates how our CRDT can integrate directly with OpenDAW\'s sync system!')
    process.exit(0)
  }).catch(error => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
}

export { testEnhancedCRDTWithUpdateTasks }
