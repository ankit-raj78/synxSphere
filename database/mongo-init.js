// MongoDB initialization for flexible data

db = db.getSiblingDB('syncsphere');

// Audio files collection with GridFS metadata
db.createCollection('audio_files');
db.audio_files.createIndex({ "userId": 1 });
db.audio_files.createIndex({ "uploadedAt": -1 });
db.audio_files.createIndex({ "analysisStatus": 1 });

// Musical analysis results
db.createCollection('audio_analysis');
db.audio_analysis.createIndex({ "fileId": 1 });
db.audio_analysis.createIndex({ "userId": 1 });
db.audio_analysis.createIndex({ "features.tempo": 1 });
db.audio_analysis.createIndex({ "features.key": 1 });

// Room collaboration data
db.createCollection('room_sessions');
db.room_sessions.createIndex({ "roomId": 1 });
db.room_sessions.createIndex({ "participants.userId": 1 });
db.room_sessions.createIndex({ "createdAt": -1 });

// Real-time events log
db.createCollection('collaboration_events');
db.collaboration_events.createIndex({ "roomId": 1, "timestamp": -1 });
db.collaboration_events.createIndex({ "userId": 1, "timestamp": -1 });
db.collaboration_events.createIndex({ "eventType": 1 });

// AI recommendation cache
db.createCollection('recommendation_cache');
db.recommendation_cache.createIndex({ "userId": 1 });
db.recommendation_cache.createIndex({ "generatedAt": 1 }, { expireAfterSeconds: 3600 });

print('MongoDB collections and indexes created successfully');
