# SyncSphere Sample Data

This directory contains comprehensive sample data for the SyncSphere audio collaboration platform.

## 📋 What's Included

### 👥 Sample Users (5)
- **john.doe@example.com** (johndoe) - Admin, Music producer and audio engineer
- **jane.smith@example.com** (janesmith) - Singer and songwriter  
- **mike.wilson@example.com** (mikewilson) - Drummer and percussionist
- **sarah.johnson@example.com** (sarahjohnson) - Bassist and music arranger
- **alex.brown@example.com** (alexbrown) - Guitarist and composer

*Default password for all users: `password123`*

### 🏠 Collaboration Rooms (5)
1. **Rock Collaboration** - Working on a new rock track (Creator: John Doe)
2. **Jazz Fusion Project** - Experimental jazz fusion (Creator: Jane Smith)
3. **Electronic Beats** - Electronic music with synthesizers (Creator: Mike Wilson)
4. **Acoustic Sessions** - Intimate acoustic arrangements (Creator: Sarah Johnson)
5. **Hip Hop Studio** - Urban beats and rap collaborations (Creator: Alex Brown)

### 🎵 Audio Files (5)
- Electric Guitar - Main Riff (WAV, 120.5s)
- Lead Vocals - Verse 1 (WAV, 135.3s)
- Full Drum Kit (WAV, 180.2s)
- Bass Line - Groove (WAV, 95.8s)
- Ambient Synth Pad (WAV, 200.0s)

### 🤝 Room Collaborations
- Multiple users participating in different rooms
- Various permission levels (owner, collaborator)
- Realistic collaboration scenarios

### 📨 Join Requests (3)
- Sample pending and approved join requests
- Demonstrates the request-approval workflow
- Includes request messages and responses

### 🎼 Compositions (3)
- **Rock Collaboration Mix v1** - First mix with guitar, vocals, and drums
- **Jazz Fusion Demo** - Experimental jazz fusion demo track
- **Electronic Ambient** - Ambient electronic composition

## 🚀 How to Import

### Method 1: Using npm script (Recommended)
```bash
# Setup database with sample data
npm run db:setup-with-data

# Or just import sample data (if database already exists)
npm run db:import-sample
```

### Method 2: Using PowerShell (Windows)
```powershell
# Set environment variables if needed
$env:DB_PASSWORD = "your_password"
$env:DB_NAME = "syncsphere"

# Run the import script
.\import-sample-data.ps1
```

### Method 3: Using Node.js directly
```bash
# Set environment variables
export DB_PASSWORD=your_password
export DB_NAME=syncsphere

# Run the import script
node import-sample-data.js
```

### Method 4: Manual PostgreSQL import
```bash
# Connect to your database
psql -h localhost -U postgres -d syncsphere

# Import the sample data
\i database/syncsphere.sql
```

## 🔧 Environment Variables

The import scripts support the following environment variables:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: syncsphere)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (required)

## 📊 Database Structure

The sample data populates the following tables:
- `users` - User accounts and profiles
- `rooms` - Collaboration rooms with settings
- `room_participants` - User-room relationships
- `audio_files` - Audio file metadata
- `room_audio_files` - Audio files associated with rooms
- `join_requests` - Room join request history
- `compositions` - Mixed/rendered audio compositions
- `audio_analysis` - Technical audio analysis data

## 🎯 Testing Scenarios

After importing the sample data, you can test:

1. **User Authentication**
   - Login with any sample user account
   - Test password reset functionality

2. **Room Management**
   - Browse existing collaboration rooms
   - Join rooms as different users
   - Create new rooms

3. **Audio Collaboration**
   - Upload new audio files to rooms
   - Test audio mixing and playback
   - Experiment with volume and effects

4. **Join Requests**
   - Send join requests to rooms
   - Approve/reject requests as room owners
   - Test notification system

5. **Compositions**
   - View existing mixed compositions
   - Create new mixes from room audio files
   - Download and share compositions

## 🔄 Resetting Data

To reset and re-import the sample data:

```bash
# Drop and recreate the database
dropdb syncsphere
createdb syncsphere

# Re-import all data
npm run db:setup-with-data
```

## 🛠️ Customization

You can modify `database/syncsphere.sql` to:
- Add more sample users
- Create additional rooms with different genres
- Include more audio files
- Add custom collaboration scenarios
- Modify user profiles and permissions

## 📝 Notes

- All audio file paths in the sample data point to `/uploads/` directory
- Actual audio files are not included - only metadata
- UUIDs are consistent across related records
- Timestamps use realistic intervals for testing
- All passwords are hashed using bcrypt with salt rounds of 10

## 🚨 Security Notice

**Important**: This sample data is for development and testing only. Never use these credentials or data in a production environment. Always use strong, unique passwords and proper security measures in production.
