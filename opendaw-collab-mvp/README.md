# OpenDAW Collaboration MVP

A minimal viable product for adding collaborative editing capabilities to OpenDAW.

## 🎯 Features

- **Box Ownership**: Each AudioUnitBox (track) is owned by one user
- **Visual Indicators**: Clear UI showing who owns what
- **Edit Restrictions**: Only owners can edit their boxes
- **Real-time Sync**: Parameter changes sync across all users
- **Simple Locking**: Prevent conflicts with basic lock mechanism

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   SynxSphere    │────▶│   OpenDAW    │◀───▶│  WebSocket  │
│   (React App)   │     │  (iframe)    │     │   Server    │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │                      │
                               ▼                      ▼
                        ┌──────────────┐     ┌─────────────┐
                        │ Collab OPFS  │     │ PostgreSQL  │
                        │    Agent     │     │  Database   │
                        └──────────────┘     └─────────────┘
```

## 🚀 Quick Start

### 1. Set up the database

```bash
cd opendaw-collab-mvp
cp .env.example .env
docker-compose up -d postgres
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the collaboration server

```bash
npm run server
```

### 4. Modify OpenDAW's agents.ts

Replace the content of `openDAW/studio/src/service/agents.ts` with the code from `src/integration/OpenDAWPatch.ts`.

### 5. Start OpenDAW

```bash
cd ../openDAW/studio
npm run dev
```

### 6. Test collaboration

Open two browser windows:
- Window 1: `http://localhost:5173?projectId=test&userId=user1&collaborative=true`
- Window 2: `http://localhost:5173?projectId=test&userId=user2&collaborative=true`

## 📁 Project Structure

```
opendaw-collab-mvp/
├── src/
│   ├── collaboration/
│   │   └── CollaborativeOpfsAgent.ts    # Wraps OpenDAW's OPFS
│   ├── database/
│   │   ├── DatabaseService.ts           # PostgreSQL interface
│   │   └── schema.sql                   # Database schema
│   ├── websocket/
│   │   ├── WSServer.ts                  # WebSocket server
│   │   ├── WSClient.ts                  # WebSocket client
│   │   └── MessageTypes.ts              # Message protocols
│   ├── ui/
│   │   ├── OverlayManager.ts            # UI ownership indicators
│   │   └── styles/
│   │       └── collaboration.css        # Ownership styles
│   ├── integration/
│   │   └── OpenDAWPatch.ts              # Code to copy into OpenDAW
│   └── CollaborationManager.ts          # Main integration class
├── server/
│   └── index.ts                         # Express server
├── docker-compose.yml                   # PostgreSQL + Redis
├── package.json
└── README.md
```

## 🔧 How It Works

### 1. OPFS Interception

The `CollaborativeOpfsAgent` wraps OpenDAW's original OPFS agent:

```typescript
class CollaborativeOpfsAgent implements OpfsProtocol {
  async write(path: string, data: Uint8Array): Promise<void> {
    const boxUuid = this.extractBoxUuid(path);
    if (boxUuid) {
      // Check ownership before allowing write
      const owner = await this.db.getBoxOwner(this.projectId, boxUuid);
      if (owner && owner !== this.userId) {
        throw new Error('Not authorized');
      }
    }
    return this.localOpfs.write(path, data);
  }
}
```

### 2. Real-time Communication

WebSocket messages broadcast changes:

```typescript
interface CollabMessage {
  type: 'BOX_CREATED' | 'BOX_UPDATED' | 'BOX_OWNERSHIP_CLAIMED'
  projectId: string
  userId: string
  timestamp: number
  data: any
}
```

### 3. UI Ownership Indicators

CSS classes are applied to show ownership:

```css
.box-owned-by-me { 
  border-left: 4px solid #10b981; 
}
.box-owned-by-others { 
  border-left: 4px solid var(--owner-color); 
  opacity: 0.8;
}
```

### 4. Box Detection

MutationObserver detects new AudioUnitBox elements:

```typescript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (this.isBoxElement(node)) {
        this.applyOwnershipStyling(node);
      }
    });
  });
});
```

## 🔌 Integration with OpenDAW

### Minimal Modification Approach

Only one file in OpenDAW needs to be modified: `agents.ts`

```typescript
// In openDAW/studio/src/service/agents.ts
import { initializeCollaboration } from '../../../../opendaw-collab-mvp/src/CollaborationManager'

const createOpfsAgent = async () => {
    const baseAgent = Communicator.sender<OpfsProtocol>(/* ... */)
    return await initializeCollaboration(baseAgent)
}

export const OpfsAgent = await createOpfsAgent()
```

### URL Parameters

Collaboration is enabled via URL parameters:
- `projectId`: Unique project identifier
- `userId`: User identifier  
- `collaborative=true`: Enable collaboration mode
- `userName`: Optional display name

Example: `http://localhost:5173?projectId=song1&userId=alice&collaborative=true&userName=Alice`

## 🧪 Testing Scenarios

### 1. Basic Ownership

1. User A creates a new AudioUnitBox → User A owns it
2. User B sees the box with visual indicator
3. User B cannot edit the box (controls disabled)

### 2. Real-time Sync

1. User A changes a parameter
2. User B sees the change within 200ms
3. No conflicts or data loss

### 3. User Presence

1. User joins → Others see them in collaboration panel
2. User leaves → Others are notified
3. Connection lost → Automatic reconnection

## 📊 Database Schema

```sql
-- Box ownership tracking
CREATE TABLE box_ownership (
  project_id VARCHAR(255),
  box_uuid VARCHAR(255),
  owner_id VARCHAR(255),
  PRIMARY KEY (project_id, box_uuid)
);

-- Simple locking mechanism  
CREATE TABLE box_locks (
  project_id VARCHAR(255),
  box_uuid VARCHAR(255),
  locked_by VARCHAR(255),
  expires_at TIMESTAMP,
  PRIMARY KEY (project_id, box_uuid)
);
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down && docker-compose up -d postgres
```

### WebSocket Connection Issues

```bash
# Check server status
curl ws://localhost:3001

# View server logs
npm run server
```

### OpenDAW Integration Issues

1. **Build errors**: Make sure TypeScript paths are correct
2. **Import errors**: Check relative paths in OpenDAWPatch.ts
3. **Runtime errors**: Check browser console for detailed errors

### Box Detection Issues

The system tries multiple methods to detect AudioUnitBox elements:
- Data attributes: `[data-box-uuid]`, `[data-track-id]`
- Class names: `.audio-unit-box`, `.box`, `.track`
- ID patterns: UUIDs in element IDs

If boxes aren't detected, check the actual DOM structure in DevTools.

## 🚧 Current Limitations

1. **Box Type Detection**: Currently assumes all boxes are AudioUnitBox
2. **Offline Support**: No offline/conflict resolution
3. **Undo/Redo**: No collaborative undo/redo
4. **Permissions**: Simple owner-only model
5. **Performance**: No optimization for large projects

## 🎯 MVP Success Criteria

- ✅ **Functional**: Two users can see each other's boxes and changes
- ✅ **Performance**: Changes sync in <200ms
- ✅ **Reliability**: No data loss on refresh
- ✅ **UX**: Clear visual indicators of ownership
- ✅ **Simplicity**: <2000 lines of code total

## 🔮 Future Enhancements

1. **Advanced Permissions**: Role-based access, temporary sharing
2. **Conflict Resolution**: Operational transforms, CRDTs
3. **Voice Chat**: Built-in communication
4. **Session Recording**: Playback collaboration sessions
5. **Cloud Sync**: Persistent project storage
6. **Mobile Support**: Touch-friendly collaboration

## 📄 License

MIT License - see LICENSE file for details.
