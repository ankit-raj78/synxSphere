# Event-Driven Architecture & WebSocket Implementation Guide

## 🎯 What We've Implemented

### **Step 7: Event-Driven Architecture** ✅
- **Domain Events**: Base `DomainEvent` class with proper serialization
- **Event Bus**: In-memory event publishing with optional persistence  
- **Event Store**: Prisma-based event persistence for event sourcing
- **Event Handlers**: Structured event handling with error isolation
- **Audio Events**: Complete audio lifecycle events (upload, analysis, playback)
- **Room Events**: Real-time room management events

### **Step 8: Improved WebSocket Architecture** ✅
- **Clean WebSocket Server**: Decoupled from business logic using events
- **Connection Manager**: Manages WebSocket connections and user sessions
- **Room Manager**: Handles room membership and broadcasting
- **Event Integration**: WebSocket listens to domain events for real-time updates
- **Authentication**: JWT-based WebSocket authentication

---

## 🏗️ Architecture Overview

```
Domain Events → Event Bus → Event Handlers → WebSocket Broadcast
                    ↓
                Event Store (Persistence)
```

### **Event Flow Example**:
```typescript
// 1. User joins room (HTTP request)
POST /api/v1/rooms/123/join

// 2. Use case publishes domain event
const event = new UserJoinedRoomEvent({ roomId, userId, username });
await eventBus.publish(event);

// 3. WebSocket handler receives event
class RoomJoinedEventHandler {
  async handle(event: UserJoinedRoomEvent) {
    io.to(event.data.roomId).emit('user_joined', event.data);
  }
}

// 4. All clients in room receive real-time update
socket.on('user_joined', (data) => {
  updateUI(data);
});
```

---

## 📁 **File Structure**

```
src/
├── domain/
│   └── events/                 # Domain events
│       ├── DomainEvent.ts     # Base event class
│       ├── AudioEvents.ts     # Audio-related events
│       └── RoomEvents.ts      # Room-related events
├── application/
│   └── interfaces/
│       └── IEventBus.ts       # Event bus contracts
├── infrastructure/
│   ├── events/
│   │   └── EventBus.ts        # Event bus implementation
│   └── websocket/             # WebSocket infrastructure
│       ├── interfaces.ts       # WebSocket interfaces
│       ├── ConnectionManager.ts # Connection management
│       ├── RoomManager.ts     # Room management
│       └── WebSocketServer.ts # Main WebSocket server
```

---

## 🚀 **Complete Integration Example**

### **1. Server Setup with Events & WebSocket**
```typescript
// server.ts
import { createServer } from 'http';
import { createApp } from './presentation/http/routes/RouteFactory';
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer';
import { container } from './infrastructure/container/Container';

const app = createApp(container);
const server = createServer(app);

// Initialize WebSocket server
const wsServer = container.get<WebSocketServer>(TYPES.WebSocketServer);
const authService = container.get(TYPES.TokenService);
wsServer.initialize(server, authService);

server.listen(3000, () => {
  console.log('Server running with Clean Architecture + Events + WebSocket!');
});
```

### **2. Event-Driven Use Case Example**
```typescript
// CreateRoomUseCase.ts (updated)
export class CreateRoomUseCase {
  async execute(dto: CreateRoomDto): Promise<RoomResponseDto> {
    // Create room entity
    const room = Room.create(dto);
    await this.roomRepository.save(room);

    // Publish domain event
    const event = new RoomCreatedEvent({
      roomId: room.getId(),
      name: room.getName(),
      creatorId: room.getCreatorId(),
      isPublic: room.isPublic(),
      maxParticipants: room.getMaxParticipants(),
      genres: room.getGenres()
    });
    
    await this.eventBus.publish(event);
    return RoomMapper.toResponseDto(room);
  }
}
```

### **3. WebSocket Event Handler**
```typescript
// Audio analysis completion
this.eventBus.subscribe('audio.analyzed', new AudioAnalyzedEventHandler(io));

class AudioAnalyzedEventHandler implements EventHandler<AudioAnalyzedEvent> {
  async handle(event: AudioAnalyzedEvent): Promise<void> {
    // Notify specific user about analysis completion
    io.to(event.data.userId).emit('audio_analysis_complete', {
      fileId: event.data.fileId,
      analysisId: event.data.analysisId,
      bpm: event.data.bpm,
      key: event.data.key,
      energy: event.data.energy
    });
  }
}
```

### **4. Client-Side WebSocket Integration**
```typescript
// Client connects to WebSocket
const socket = io('ws://localhost:3000', {
  auth: { token: authToken }
});

// Join a room
socket.emit('join_room', { roomId: '123' });

// Listen for real-time updates
socket.on('user_joined', (data) => {
  console.log(`${data.username} joined the room`);
  updateParticipantsList(data);
});

socket.on('playback_sync', (data) => {
  syncAudioPlayback(data.position, data.isPlaying);
});

socket.on('audio_analysis_complete', (data) => {
  showAnalysisResults(data);
});
```

---

## 💡 **Key Benefits Achieved**

### **1. Loose Coupling**
- WebSocket server doesn't know about business logic
- Domain events provide clean integration points
- Components can be developed and tested independently

### **2. Real-Time Communication**
- Instant updates for all connected clients
- Event-driven real-time synchronization
- Scalable room-based communication

### **3. Event Sourcing Ready**
- All domain events are persisted
- Complete audit trail of system changes
- Replay capability for debugging and analytics

### **4. Testability**
```typescript
// Test event handling without WebSocket
const mockEventBus = { publish: jest.fn() };
const useCase = new CreateRoomUseCase(repository, mockEventBus);

await useCase.execute(roomData);
expect(mockEventBus.publish).toHaveBeenCalledWith(
  expect.objectContaining({ eventName: 'room.created' })
);
```

### **5. Scalability**
- Event bus can be replaced with Redis/RabbitMQ
- WebSocket can scale horizontally with Redis adapter
- Domain events enable microservice communication

---

## 🔧 **Event Types Implemented**

### **Audio Events**
```typescript
AudioUploadStartedEvent     // File upload begins
AudioUploadCompletedEvent   // File upload finishes  
AudioAnalyzedEvent         // Analysis complete with BPM, key, etc.
AudioProcessingFailedEvent // Analysis/processing errors
AudioPlaybackSyncedEvent   // Real-time playback sync
```

### **Room Events**
```typescript
RoomCreatedEvent           // New room created
UserJoinedRoomEvent        // User joins room
UserLeftRoomEvent          // User leaves room  
RoomSettingsUpdatedEvent   // Room settings changed
```

### **User Events** (existing)
```typescript
UserCreatedEvent           // New user registration
UserProfileUpdatedEvent    // Profile changes
MusicalPreferencesUpdatedEvent // Preference updates
```

---

## 🎵 **Real-Time Features Enabled**

### **1. Synchronized Audio Playback**
```typescript
// User seeks in audio
socket.emit('playback_seek', { roomId: '123', position: 45.2 });

// All room participants get synced
socket.on('playback_seek', (data) => {
  audioPlayer.seekTo(data.position);
});
```

### **2. Real-Time Chat**
```typescript
socket.emit('chat_message', { 
  roomId: '123', 
  message: 'This beat is fire! 🔥' 
});

socket.on('chat_message', (data) => {
  addMessageToChat(data.username, data.message);
});
```

### **3. File Sharing Notifications**
```typescript
// User shares a file
socket.emit('share_file', { 
  roomId: '123', 
  fileId: 'audio_123',
  fileName: 'my_beat.mp3' 
});

// Others see the shared file
socket.on('file_shared', (data) => {
  showFileSharedNotification(data);
});
```

---

## 🔄 **Migration Guide**

### **Phase 1: Add Event Bus to Existing Use Cases**
```typescript
// Update existing use cases to publish events
export class UpdateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private eventBus: IEventBus // Add this
  ) {}

  async execute(userId: string, updates: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    user.updateProfile(updates);
    await this.userRepository.save(user);

    // Add event publishing
    const event = new UserProfileUpdatedEvent({
      userId: user.getId(),
      changes: updates,
      updatedAt: new Date()
    });
    await this.eventBus.publish(event);

    return UserMapper.toResponseDto(user);
  }
}
```

### **Phase 2: Replace Existing WebSocket Code**
```typescript
// OLD: Tightly coupled WebSocket handling
app.post('/rooms/:id/join', (req, res) => {
  // Business logic mixed with WebSocket
  io.to(roomId).emit('user_joined', userData);
});

// NEW: Clean separation with events
app.post('/rooms/:id/join', (req, res) => {
  await joinRoomUseCase.execute(joinData);
  // Event handler will notify WebSocket clients
});
```

### **Phase 3: Add Event Persistence**
```sql
-- Add event store table
CREATE TABLE domain_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_version INTEGER NOT NULL,
  event_data JSONB NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  INDEX idx_aggregate_id (aggregate_id),
  INDEX idx_event_name (event_name),
  INDEX idx_occurred_at (occurred_at)
);
```

---

## 🧪 **Testing Examples**

### **Event Bus Testing**
```typescript
describe('EventBus', () => {
  it('should publish events to all subscribers', async () => {
    const handler1 = { handle: jest.fn() };
    const handler2 = { handle: jest.fn() };
    
    eventBus.subscribe('test.event', handler1);
    eventBus.subscribe('test.event', handler2);
    
    const event = new TestEvent('test-data');
    await eventBus.publish(event);
    
    expect(handler1.handle).toHaveBeenCalledWith(event);
    expect(handler2.handle).toHaveBeenCalledWith(event);
  });
});
```

### **WebSocket Testing**
```typescript
describe('WebSocketServer', () => {
  it('should handle room join events', async () => {
    const mockSocket = createMockSocket();
    const wsServer = new WebSocketServer(eventBus, logger);
    
    await wsServer.handleJoinRoom(mockSocket, { roomId: '123' });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('room_joined', 
      expect.objectContaining({ room: expect.any(Object) })
    );
  });
});
```

---

## 🎉 **Summary**

Your SynxSphere application now has:

✅ **Event-Driven Architecture**: Loose coupling between components  
✅ **Real-Time WebSocket**: Clean, scalable real-time communication  
✅ **Event Sourcing**: Complete audit trail of all domain changes  
✅ **Synchronized Playback**: Real-time audio synchronization across clients  
✅ **Room Management**: Scalable room-based communication  
✅ **Error Isolation**: Failed event handlers don't break the system  
✅ **Testing Support**: Easy to test with mocked dependencies  

The architecture is now ready for:
- **Microservice scaling**: Event bus can span multiple services
- **Advanced features**: Real-time collaboration, live mixing, etc.
- **Performance optimization**: Event batching, Redis clustering
- **Analytics**: Event stream analysis for user insights

**Next**: Consider implementing event replay, CQRS patterns, or distributed event streaming with Kafka/Redis! 🚀
