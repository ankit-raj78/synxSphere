/*
 * OpenDAW Integration Patch
 * 
 * This code should replace the content of:
 * openDAW/studio/src/service/agents.ts
 * 
 * It adds collaboration support while maintaining backward compatibility.
 */

import {FloatArray, int, Procedure} from "std"
import WorkerUrl from "../worker/agents.ts?worker&url"
import {Entry, OpfsProtocol, PeakProtocol} from "fusion"
import {Communicator, Messenger} from "runtime"

// Original messenger setup
const messenger = Messenger.for(new Worker(WorkerUrl, {type: "module"}))

// Original PeakAgent (unchanged)
export const PeakAgent = Communicator.sender<PeakProtocol>(messenger.channel("peaks"),
    router => new class implements PeakProtocol {
        async generateAsync(
            progress: Procedure<number>,
            shifts: Uint8Array,
            frames: ReadonlyArray<FloatArray>,
            numFrames: int,
            numChannels: int): Promise<ArrayBufferLike> {
            return router.dispatchAndReturn(this.generateAsync, progress, shifts, frames, numFrames, numChannels)
        }
    })

// Enhanced OpfsAgent with collaboration support
const createOpfsAgent = () => {
    // Create the base OPFS agent
    const baseAgent = Communicator.sender<OpfsProtocol>(messenger.channel("opfs"),
        router => new class implements OpfsProtocol {
            write(path: string, data: Uint8Array): Promise<void> {return router.dispatchAndReturn(this.write, path, data)}
            read(path: string): Promise<Uint8Array> {return router.dispatchAndReturn(this.read, path)}
            delete(path: string): Promise<void> {return router.dispatchAndReturn(this.delete, path)}
            list(path: string): Promise<ReadonlyArray<Entry>> {return router.dispatchAndReturn(this.list, path)}
        })

    // Check if collaboration should be enabled
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('projectId')
    const userId = urlParams.get('userId')
    const collaborative = urlParams.get('collaborative')

    if (!projectId || !userId || collaborative !== 'true') {
        console.log('[OpenDAW] Running in local mode')
        return baseAgent
    }

    try {
        console.log('[OpenDAW] Collaboration mode detected:', { projectId, userId })
        
        // For now, return base agent until we can properly integrate
        // TODO: Integrate CollaborativeOpfsAgent here
        console.log('[OpenDAW] ⚠️ Collaboration integration not yet complete, using local mode')
        return baseAgent

    } catch (error) {
        console.warn('[OpenDAW] Failed to enable collaboration, using local mode:', error)
        return baseAgent
    }
}

// Export the OpfsAgent
export const OpfsAgent = createOpfsAgent()

/*
 * INTEGRATION STEPS:
 * 
 * 1. Backup the original openDAW/studio/src/service/agents.ts
 * 2. Replace its content with this code
 * 3. Test with URLs like:
 *    http://localhost:5173?projectId=test&userId=user1&collaborative=true
 * 
 * NOTES:
 * - This version maintains full OpenDAW compatibility
 * - Collaboration features will be added incrementally
 * - The system gracefully falls back to local mode if anything fails
 */
            write(path: string, data: Uint8Array): Promise<void> {return router.dispatchAndReturn(this.write, path, data)}
            read(path: string): Promise<Uint8Array> {return router.dispatchAndReturn(this.read, path)}
            delete(path: string): Promise<void> {return router.dispatchAndReturn(this.delete, path)}
            list(path: string): Promise<ReadonlyArray<Entry>> {return router.dispatchAndReturn(this.list, path)}
        })

    if (isCollaborative && CollaborativeOpfsAgent && DatabaseService && WSClient) {
        console.log('[OpenDAW] Initializing collaborative mode')
        
        try {
            // Initialize collaborative services
            const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/opendaw_collab'
            const wsUrl = process.env.WS_URL || 'ws://localhost:3001'
            
            const db = new DatabaseService(dbUrl)
            const ws = new WSClient(wsUrl, projectId!, userId!)
            
            // Connect WebSocket
            ws.connect().then(() => {
                console.log('[OpenDAW] Collaboration WebSocket connected')
            }).catch((error: any) => {
                console.error('[OpenDAW] Collaboration WebSocket failed:', error)
            })
            
            // Create collaborative wrapper
            const collaborativeAgent = new CollaborativeOpfsAgent(baseAgent, db, ws, projectId!, userId!)
            
            // Set up message handlers
            ws.onMessage('BOX_CREATED', (message) => collaborativeAgent.handleCollaborationMessage(message))
            ws.onMessage('BOX_UPDATED', (message) => collaborativeAgent.handleCollaborationMessage(message))
            ws.onMessage('BOX_DELETED', (message) => collaborativeAgent.handleCollaborationMessage(message))
            ws.onMessage('SYNC_REQUEST', (message) => collaborativeAgent.handleCollaborationMessage(message))
            
            return collaborativeAgent
        } catch (error) {
            console.error('[OpenDAW] Failed to initialize collaboration, falling back to local mode:', error)
            return baseAgent
        }
    }
    
    console.log('[OpenDAW] Using local OPFS mode')
    return baseAgent
}

export const OpfsAgent = createOpfsAgent()
