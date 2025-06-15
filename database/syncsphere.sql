-- SyncSphere Database Schema and Sample Data
-- This file contains the complete database structure and sample data for SyncSphere

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with sample data
INSERT INTO users (id, email, username, password_hash, profile) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john.doe@example.com', 'johndoe', '$2b$10$rOo7QcR8XKJVwq9qM1q4Se9.3L8eJ2K4L5N6M7O8P9Q0R1S2T3U4V', '{"role": "admin", "bio": "Music producer and audio engineer", "avatar": ""}'),
('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@example.com', 'janesmith', '$2b$10$rOo7QcR8XKJVwq9qM1q4Se9.3L8eJ2K4L5N6M7O8P9Q0R1S2T3U5W', '{"role": "user", "bio": "Singer and songwriter", "avatar": ""}'),
('550e8400-e29b-41d4-a716-446655440003', 'mike.wilson@example.com', 'mikewilson', '$2b$10$rOo7QcR8XKJVwq9qM1q4Se9.3L8eJ2K4L5N6M7O8P9Q0R1S2T3U6X', '{"role": "user", "bio": "Drummer and percussionist", "avatar": ""}'),
('550e8400-e29b-41d4-a716-446655440004', 'sarah.johnson@example.com', 'sarahjohnson', '$2b$10$rOo7QcR8XKJVwq9qM1q4Se9.3L8eJ2K4L5N6M7O8P9Q0R1S2T3U7Y', '{"role": "user", "bio": "Bassist and music arranger", "avatar": ""}'),
('550e8400-e29b-41d4-a716-446655440005', 'alex.brown@example.com', 'alexbrown', '$2b$10$rOo7QcR8XKJVwq9qM1q4Se9.3L8eJ2K4L5N6M7O8P9Q0R1S2T3U8Z', '{"role": "user", "bio": "Guitarist and composer", "avatar": ""}');

-- Rooms with sample data
INSERT INTO rooms (id, name, description, genre, is_live, creator_id, playback_position, settings) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Rock Collaboration', 'Working on a new rock track with multiple instruments', 'Rock', true, '550e8400-e29b-41d4-a716-446655440001', 0, '{"tempo": 120, "key": "Em", "time_signature": "4/4"}'),
('650e8400-e29b-41d4-a716-446655440002', 'Jazz Fusion Project', 'Experimental jazz fusion with modern elements', 'Jazz', false, '550e8400-e29b-41d4-a716-446655440002', 0, '{"tempo": 140, "key": "Dm", "time_signature": "7/8"}'),
('650e8400-e29b-41d4-a716-446655440003', 'Electronic Beats', 'Creating electronic music with synthesizers', 'Electronic', true, '550e8400-e29b-41d4-a716-446655440003', 0, '{"tempo": 128, "key": "Am", "time_signature": "4/4"}'),
('650e8400-e29b-41d4-a716-446655440004', 'Acoustic Sessions', 'Intimate acoustic arrangements', 'Acoustic', false, '550e8400-e29b-41d4-a716-446655440004', 0, '{"tempo": 90, "key": "G", "time_signature": "3/4"}'),
('650e8400-e29b-41d4-a716-446655440005', 'Hip Hop Studio', 'Urban beats and rap collaborations', 'Hip Hop', true, '550e8400-e29b-41d4-a716-446655440005', 0, '{"tempo": 85, "key": "Cm", "time_signature": "4/4"}');

-- Room participants
INSERT INTO room_participants (room_id, user_id, role, permissions, joined_at) VALUES
-- Rock Collaboration participants
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'owner', '{"can_edit": true, "can_delete": true, "can_invite": true}', NOW()),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),

-- Jazz Fusion Project participants
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'owner', '{"can_edit": true, "can_delete": true, "can_invite": true}', NOW()),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),

-- Electronic Beats participants
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'owner', '{"can_edit": true, "can_delete": true, "can_invite": true}', NOW()),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),

-- Acoustic Sessions participants
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'owner', '{"can_edit": true, "can_delete": true, "can_invite": true}', NOW()),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),

-- Hip Hop Studio participants
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'owner', '{"can_edit": true, "can_delete": true, "can_invite": true}', NOW()),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW()),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'collaborator', '{"can_edit": true, "can_delete": false, "can_invite": false}', NOW());

-- Sample audio files
INSERT INTO audio_files (id, user_id, filename, original_name, file_path, file_size, mime_type, duration, sample_rate, channels, bit_rate, format, is_processed) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'guitar_track_1.wav', 'Electric Guitar - Main Riff.wav', '/uploads/750e8400-e29b-41d4-a716-446655440001.wav', 8547200, 'audio/wav', 120.5, 44100, 2, 1411, 'WAV', true),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'vocals_lead.wav', 'Lead Vocals - Verse 1.wav', '/uploads/750e8400-e29b-41d4-a716-446655440002.wav', 7234560, 44100, 2, 1411, 'WAV', true),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'drums_full.wav', 'Full Drum Kit.wav', '/uploads/750e8400-e29b-41d4-a716-446655440003.wav', 12845760, 'audio/wav', 180.2, 44100, 2, 1411, 'WAV', true),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'bass_line.wav', 'Bass Line - Groove.wav', '/uploads/750e8400-e29b-41d4-a716-446655440004.wav', 6789120, 'audio/wav', 95.8, 44100, 2, 1411, 'WAV', true),
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'synth_pad.wav', 'Ambient Synth Pad.wav', '/uploads/750e8400-e29b-41d4-a716-446655440005.wav', 9876540, 'audio/wav', 200.0, 44100, 2, 1411, 'WAV', true);

-- Room audio files associations
INSERT INTO room_audio_files (room_id, file_id, track_position, is_muted, volume_level, effects_chain, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 1, false, 0.8, '{"reverb": 0.2, "eq": {"low": 0, "mid": 0.1, "high": -0.1}}', NOW()),
('650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 2, false, 0.9, '{"reverb": 0.3, "eq": {"low": 0.1, "mid": 0.2, "high": 0.1}}', NOW()),
('650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 3, false, 0.7, '{"reverb": 0.1, "eq": {"low": 0.2, "mid": 0, "high": 0}}', NOW()),
('650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440004', 1, false, 0.75, '{"reverb": 0.4, "eq": {"low": 0.1, "mid": 0, "high": -0.2}}', NOW()),
('650e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440005', 1, false, 0.85, '{"reverb": 0.5, "eq": {"low": 0, "mid": 0, "high": 0.2}}', NOW());

-- Join requests
INSERT INTO join_requests (id, room_id, user_id, message, status, created_at, responded_at, response_message) VALUES
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'I would love to contribute bass to this rock track!', 'pending', NOW() - INTERVAL '2 hours', NULL, NULL),
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'Can I add some guitar work to your jazz project?', 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours', 'Welcome! Looking forward to your contributions.'),
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Interested in adding some live drums to the electronic mix', 'pending', NOW() - INTERVAL '30 minutes', NULL, NULL);

-- Compositions (mixed tracks)
INSERT INTO compositions (id, room_id, creator_id, name, description, file_path, file_size, duration, format, settings, is_public, created_at) VALUES
('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Rock Collaboration Mix v1', 'First mix of the rock collaboration with guitar, vocals, and drums', '/compositions/950e8400-e29b-41d4-a716-446655440001.wav', 15678900, 200.5, 'WAV', '{"master_volume": 0.9, "compression": true, "limiting": true}', false, NOW() - INTERVAL '3 hours'),
('950e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Jazz Fusion Demo', 'Experimental jazz fusion demo track', '/compositions/950e8400-e29b-41d4-a716-446655440002.wav', 12345678, 156.2, 'WAV', '{"master_volume": 0.85, "compression": false, "limiting": false}', true, NOW() - INTERVAL '1 day'),
('950e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Electronic Ambient', 'Ambient electronic composition', '/compositions/950e8400-e29b-41d4-a716-446655440003.wav', 18900000, 300.0, 'WAV', '{"master_volume": 0.8, "compression": true, "limiting": true}', true, NOW() - INTERVAL '6 hours');

-- Audio analysis data
INSERT INTO audio_analysis (id, file_id, duration, sample_rate, channels, bit_rate, codec, format, size) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 120.5, 44100, 2, 1411, 'PCM', 'WAV', 8547200),
('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 135.3, 44100, 2, 1411, 'PCM', 'WAV', 7234560),
('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 180.2, 44100, 2, 1411, 'PCM', 'WAV', 12845760),
('a50e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', 95.8, 44100, 2, 1411, 'PCM', 'WAV', 6789120),
('a50e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440005', 200.0, 44100, 2, 1411, 'PCM', 'WAV', 9876540);
