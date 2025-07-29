-- Database cleanup script to remove invalid audio file records
-- Run this to clean up audio files that exist in database but missing on server

-- First, check which audio files might be problematic
SELECT 
    id,
    filename,
    original_name,
    file_path,
    created_at,
    file_size
FROM audio_files 
WHERE room_id = 'bd771cde-305c-4c44-bb48-7e826f0ffa56' -- Your specific room ID
ORDER BY created_at DESC;

-- If you want to remove the problematic record (550f6f77-4762-4fcf-8846-7c055a9285f7):
-- DELETE FROM audio_files WHERE id = '550f6f77-4762-4fcf-8846-7c055a9285f7';

-- Or remove all audio files for this room and start fresh:
-- DELETE FROM audio_files WHERE room_id = 'bd771cde-305c-4c44-bb48-7e826f0ffa56';

-- Check if there are orphaned records (audio files without corresponding physical files)
-- You would need to run this manually by checking which files actually exist on your server
