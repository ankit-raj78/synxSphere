# FFmpeg Installation Guide

## Installing FFmpeg on Windows

### Method 1: Using Chocolatey (Recommended)
```powershell
# If Chocolatey is not installed, install it first
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install FFmpeg
choco install ffmpeg
```

### Method 2: Manual Installation
1. Visit https://ffmpeg.org/download.html
2. Download Windows version
3. Extract to a folder (e.g., C:\ffmpeg)
4. Add C:\ffmpeg\bin to system PATH environment variable

### Method 3: Using winget
```powershell
winget install "FFmpeg (Essentials Build)"
```

## Verify Installation
```powershell
ffmpeg -version
```

## Using Compose Feature
1. Ensure at least 2 audio files have been uploaded
2. Click "Compose Tracks" button in the music room
3. Select audio files to compose
4. Click "Compose Tracks" button
5. After composition is complete, files will be saved in uploads/ folder
