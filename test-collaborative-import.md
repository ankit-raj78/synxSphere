# Test Plan: Collaborative Import System

## Current Status
- ✅ Collaborative import system implemented in StudioService.ts
- ✅ Dual storage system (global + room-specific) implemented
- ✅ Server upload and UUID sync functionality added
- ✅ Error handling and fallback mechanisms in place
- ✅ **FIXED**: FormData field name changed from 'audioFiles' to 'files' to match server expectation

## Test Scenario 1: Manual Import in Collaborative Mode

### Prerequisites:
1. Open OpenDAW in collaborative mode (with room ID in URL)
2. Ensure authentication token is available
3. Backend server running on localhost:8000

### Test Steps:
1. Click "Browse for Samples" or drag-and-drop a file
2. Select an audio file (.wav, .mp3, etc.)
3. Observe console logs for our collaborative import flow

### Expected Console Output:
```
🔄 IMPORT: Collaborative mode detected, uploading 'filename.wav' to server...
📝 IMPORT-COLLAB: Step 1 - Importing to local OPFS...
✅ IMPORT-COLLAB: Local import complete, UUID: [local-uuid]
📡 IMPORT-COLLAB: Step 2 - Uploading to server database...
📡 UPLOAD: Uploading 'filename.wav' ([size] bytes) to room [room-id]
✅ UPLOAD: Server response: [response]
✅ IMPORT-COLLAB: Server upload complete, database UUID: [database-uuid]
```

### If UUIDs Different:
```
🔄 IMPORT-COLLAB: Step 3 - Re-importing with database UUID [database-uuid]...
🗑️ IMPORT-COLLAB: Removed local UUID version [local-uuid]
✅ IMPORT-COLLAB: Final import complete with database UUID: [database-uuid]
📁 IMPORT-COLLAB: Step 4 - Storing in room [room-id] for collaborative access...
✅ IMPORT-COLLAB: Successfully stored in room [room-id]
```

### If UUIDs Match:
```
✅ IMPORT-COLLAB: UUIDs match, using local sample
📁 IMPORT-COLLAB: Step 4 - Storing in room [room-id] for collaborative access...
✅ IMPORT-COLLAB: Successfully stored in room [room-id]
```

## Test Scenario 2: Verify Sample Browser Shows Imported Sample

### After Import:
1. Open sample browser/library
2. Verify imported sample appears with database UUID
3. Verify sample can be dragged to timeline
4. Verify sample plays correctly

## Test Scenario 3: Collaborative Access

### On Another Browser/Tab:
1. Open same room in different browser tab
2. Check if imported sample appears in sample browser
3. Verify other users can use the imported sample

## Troubleshooting

### If Upload Fails:
- Check authentication token in console
- Verify room ID extraction
- Check server logs for upload endpoint
- Verify FormData field names match server expectation

### If Sample Doesn't appear in Browser:
- Check database UUID consistency
- Verify dual storage (both global and room-specific)
- Check sample browser data source

### If Fallback Triggers:
- Check collaboration state detection
- Verify agents.ts getCollaborationState() function
- Check URL parameters and room ID extraction

## Success Criteria

✅ Sample uploads to server database
✅ Gets database UUID back
✅ Stores in both global and room-specific OPFS
✅ Appears in sample browser with database UUID
✅ Other collaborators can access the sample
✅ No UUID conflicts or isolation between local and collaborative samples
