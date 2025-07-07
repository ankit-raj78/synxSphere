# OpenDAW Iframe Integration

This document explains how the OpenDAW iframe integration works within the SyncSphere React application.

## Overview

The iframe integration solves the conflict between OpenDAW's custom JSX implementation and React by running them in complete isolation. OpenDAW runs in its own iframe with its own development server, while your React app communicates with it through postMessage APIs.

## Architecture

```
┌─────────────────────────────────────┐
│         React App (SyncSphere)      │
│  ┌─────────────────────────────────┐ │
│  │         OpenDAW Iframe          │ │
│  │   (localhost:5173)              │ │
│  │                                 │ │
│  │  ┌─────────────────────────────┐│ │
│  │  │   OpenDAW Custom JSX        ││ │
│  │  │   Implementation            ││ │
│  │  └─────────────────────────────┘│ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
        ↑ postMessage communication
```

## Components

### 1. `OpenDAWIntegration.tsx`
The main React component that handles:
- Iframe creation and management
- Server status checking
- Loading states
- Error handling
- Communication bridge

### 2. `app/studio/opendaw/page.tsx`
The dedicated page for the iframe integration with:
- Status monitoring
- Control panel
- Fullscreen support
- Integration management

### 3. `scripts/opendaw-server.sh`
Management script for the OpenDAW development server:
- Start/stop/restart server
- Status checking
- Log management
- Environment setup

## Usage

### Starting the Integration

1. **Start OpenDAW Server**:
   ```bash
   npm run opendaw:start
   # or manually:
   cd openDAW && npm run web
   ```

2. **Start React App**:
   ```bash
   npm run dev
   ```

3. **Access the Integration**:
   - Navigate to `/studio` in your React app
   - Choose "OpenDAW Studio" option
   - The iframe will load OpenDAW from `http://localhost:5173`

### Full Development Setup

Start both servers at once:
```bash
npm run dev:full
```

## Server Management

### Available Commands

```bash
# Start OpenDAW server
npm run opendaw:start

# Stop OpenDAW server  
npm run opendaw:stop

# Restart OpenDAW server
npm run opendaw:restart

# Check server status
npm run opendaw:status

# Setup OpenDAW environment
npm run opendaw:setup
```

### Manual Management

```bash
# Check if server is running
curl -s http://localhost:5173

# View server logs
tail -f /tmp/opendaw-server.log

# Kill server process
pkill -f "vite.*openDAW"
```

## Communication

### Message Types

The iframe integration supports these message types:

#### From React → OpenDAW
```javascript
{
  type: 'USER_INFO',
  userInfo: {
    id: 'user123',
    email: 'user@example.com',
    username: 'username'
  }
}
```

#### From OpenDAW → React
```javascript
{
  type: 'opendaw-ready'
}

{
  type: 'opendaw-error',
  error: 'Error message'
}

{
  type: 'SAVE_PROJECT',
  projectData: { ... }
}

{
  type: 'LOAD_PROJECT',
  projectId: 'project123'
}
```

### Adding Custom Messages

To add new message types:

1. **In OpenDAWIntegration.tsx**:
   ```typescript
   useEffect(() => {
     const handleMessage = (event: MessageEvent) => {
       if (event.origin === 'http://localhost:5173') {
         switch (event.data.type) {
           case 'custom-message':
             // Handle your custom message
             break;
         }
       }
     };
     // ...
   }, []);
   ```

2. **In OpenDAW**:
   ```javascript
   // Send message to parent React app
   window.parent.postMessage({
     type: 'custom-message',
     data: { ... }
   }, window.location.origin);
   ```

## Security

### Iframe Sandbox

The iframe uses these sandbox permissions:
- `allow-scripts` - Allow JavaScript execution
- `allow-same-origin` - Allow same-origin requests
- `allow-forms` - Allow form submission
- `allow-popups` - Allow popups (for downloads, etc.)
- `allow-downloads` - Allow file downloads

### Additional Permissions

The iframe allows these features:
- `microphone` - Audio input access
- `midi` - MIDI device access
- `camera` - Video input access (if needed)
- `display-capture` - Screen recording (if needed)

## Troubleshooting

### Common Issues

1. **OpenDAW server not starting**:
   ```bash
   cd openDAW
   npm install
   npm run web
   ```

2. **Iframe not loading**:
   - Check server status: `npm run opendaw:status`
   - Check logs: `tail -f /tmp/opendaw-server.log`
   - Verify server is running: `curl http://localhost:5173`

3. **Communication not working**:
   - Check browser console for postMessage errors
   - Verify origins match in message handlers
   - Check CSP headers aren't blocking communication

4. **Performance issues**:
   - Use "Direct Studio Access" for maximum performance
   - Check browser dev tools for iframe resource usage
   - Consider increasing iframe dimensions

### Port Conflicts

If port 5173 is in use:

1. **Change OpenDAW port**:
   ```bash
   cd openDAW/studio
   # Edit vite.config.ts or package.json to use different port
   ```

2. **Update integration**:
   ```typescript
   // In OpenDAWIntegration.tsx
   const openDAWUrl = 'http://localhost:YOUR_NEW_PORT';
   ```

## Benefits

### ✅ Advantages
- **No JSX conflicts**: Complete isolation between React and OpenDAW
- **Easy integration**: Drop-in component for React apps
- **Independent updates**: Update OpenDAW without affecting React
- **Security**: Sandboxed execution environment
- **Flexibility**: Switch between iframe and direct access

### ⚠️ Considerations
- **Performance**: Slight overhead from iframe
- **Communication**: Limited to postMessage API
- **Development**: Requires two servers during development
- **Debugging**: More complex debugging across iframe boundary

## Future Enhancements

Potential improvements:
- WebRTC for direct peer-to-peer audio streaming
- Shared file system access for project files
- Service worker for offline capability
- WebAssembly for performance-critical audio processing
- Real-time collaboration features

## Support

For issues with:
- **React integration**: Check SyncSphere issues
- **OpenDAW core**: Check OpenDAW repository issues
- **Server management**: Check server logs and process status
