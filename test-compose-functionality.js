// Test audio composition functionality
const testCompose = async () => {
  try {
    const token = localStorage.getItem('token') || 'test-token'
    
    // Use existing audio file IDs for testing
    const response = await fetch('/api/audio/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },      body: JSON.stringify({
        trackIds: ['track1', 'track2'], // Need to replace with actual track IDs
        roomId: 'test-room',
        settings: {
          format: 'mp3',
          bitrate: '192k',
          sampleRate: 44100
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('Composition successful:', result)
      console.log('Output file:', result.outputFile)
      console.log('File location: uploads/' + result.outputFile)
    } else {
      const error = await response.json()
      console.error('Composition failed:', error)
    }
  } catch (error) {
    console.error('Request failed:', error)
  }
}

// First get available audio files
const listAudioFiles = async () => {
  try {
    const token = localStorage.getItem('token') || 'test-token'
    const response = await fetch('/api/audio/files', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const files = await response.json()
      console.log('Available audio files:', files)
      return files
    }
  } catch (error) {
    console.error('Failed to get audio files:', error)
  }
}

console.log('Testing audio composition functionality')
console.log('First getting available files...')
// listAudioFiles()
