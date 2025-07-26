// Test OpenDAW UpdateTask Generation
import { OpenDAWUpdateTaskGenerator, UpdateTask } from './src/crdt/OpenDAWUpdateTaskGenerator'

// Mock BoxGraph with transaction support (like OpenDAW)
class MockBoxGraphWithTransactions {
  private boxes = new Map<string, any>()
  private inTransaction = false
  
  beginTransaction(): void {
    console.log('[MockBoxGraph] 🔄 Beginning transaction')
    this.inTransaction = true
  }
  
  endTransaction(): void {
    console.log('[MockBoxGraph] ✅ Ending transaction')
    this.inTransaction = false
  }
  
  createBox(name: string, uuid: string, initializer?: (box: any) => void): void {
    console.log(`[MockBoxGraph] ➕ Creating ${name} box with UUID ${uuid}`)
    const box = {
      uuid,
      type: name,
      fields: new Map(),
      created: Date.now()
    }
    
    if (initializer) {
      initializer(box)
    }
    
    this.boxes.set(uuid, box)
  }
  
  findBox(uuid: string): any {
    return this.boxes.get(uuid)
  }
  
  unstageBox(box: any): void {
    console.log(`[MockBoxGraph] ❌ Removing box ${box.uuid}`)
    this.boxes.delete(box.uuid)
  }
  
  getBoxCount(): number {
    return this.boxes.size
  }
  
  getAllBoxes(): any[] {
    return Array.from(this.boxes.values())
  }
}

async function testUpdateTaskGeneration() {
  console.log('\n🧪 Testing OpenDAW UpdateTask Generation\n')

  // 1. Create generator and mock BoxGraph
  const generator = new OpenDAWUpdateTaskGenerator('user-test', 'room-test')
  const boxGraph = new MockBoxGraphWithTransactions()

  // 2. Create sample CRDT operations (like our hybrid system generates)
  const crdtOperations = [
    {
      id: 'op-001',
      type: 'box_add',
      target: {
        boxUuid: 'audio-file-123',
        boxType: 'AudioFileBox'
      },
      data: {
        fileName: 'drums.wav',
        duration: 30,
        sampleRate: 44100
      },
      userId: 'user-test',
      timestamp: Date.now(),
      vectorClock: { 'user-test': 1 },
      dependencies: []
    },
    {
      id: 'op-002', 
      type: 'box_add',
      target: {
        boxUuid: 'track-456',
        boxType: 'TrackBox'
      },
      data: {
        name: 'Drum Track',
        volume: 0.8,
        pan: 0.0
      },
      userId: 'user-test',
      timestamp: Date.now() + 1,
      vectorClock: { 'user-test': 2 },
      dependencies: ['op-001']
    },
    {
      id: 'op-003',
      type: 'field_update',
      target: {
        boxUuid: 'track-456',
        boxType: 'TrackBox',
        fieldAddress: 'track-456/volume'
      },
      data: {
        oldValue: 0.8,
        newValue: 0.9
      },
      userId: 'user-test',
      timestamp: Date.now() + 2,
      vectorClock: { 'user-test': 3 },
      dependencies: ['op-002']
    }
  ]

  console.log(`📝 Generated ${crdtOperations.length} CRDT operations`)

  // 3. Convert to UpdateTasks
  const updateTasks = generator.generateUpdateTasks(crdtOperations)
  
  console.log(`\n🔄 Generated UpdateTasks:`)
  updateTasks.forEach((task, index) => {
    console.log(`${index + 1}. Type: ${task.type}`)
    if (task.uuid) console.log(`   UUID: ${task.uuid}`)
    if (task.name) console.log(`   Name: ${task.name}`)  
    if (task.address) console.log(`   Address: ${task.address}`)
    if (task.value !== undefined) console.log(`   Value: ${task.value}`)
    if (task.buffer) console.log(`   Buffer: ${task.buffer.length} bytes`)
    console.log('')
  })

  // 4. Apply UpdateTasks to BoxGraph (simulating OpenDAW's sendUpdates)
  console.log(`\n🎯 Applying UpdateTasks to BoxGraph...`)
  generator.applyUpdateTasks(boxGraph, updateTasks)

  // 5. Verify results
  console.log(`\n📊 Final BoxGraph State:`)
  console.log(`   Total boxes: ${boxGraph.getBoxCount()}`)
  
  boxGraph.getAllBoxes().forEach(box => {
    console.log(`   - ${box.type} (${box.uuid})`)
  })

  // 6. Show generator stats
  console.log(`\n📈 Generator Statistics:`)
  const stats = generator.getStats()
  console.log(`   User ID: ${stats.userId}`)
  console.log(`   Room ID: ${stats.roomId}`)
  console.log(`   Cached boxes: ${stats.cachedBoxes}`)

  return {
    success: true,
    operationsProcessed: crdtOperations.length,
    updateTasksGenerated: updateTasks.length,
    finalBoxCount: boxGraph.getBoxCount()
  }
}

// Run the test
if (require.main === module) {
  testUpdateTaskGeneration().then(result => {
    console.log('\n🏁 UpdateTask Generation Test Result:', result)
    process.exit(0)
  }).catch(error => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
}

export { testUpdateTaskGeneration }
