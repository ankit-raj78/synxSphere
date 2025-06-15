// Test FFmpeg path detection
const { execSync } = require('child_process')

const possibleFFmpegPaths = [
  'ffmpeg', // Try PATH first
  'C:\\Users\\10304\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe',
  'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe'
]

console.log('🔍 Testing FFmpeg path detection...')
console.log('==============================')

let ffmpegPath = null

for (const path of possibleFFmpegPaths) {
  try {
    console.log(`Testing path: ${path}`)
    const result = execSync(`"${path}" -version`, { stdio: 'pipe', encoding: 'utf8' })
    console.log(`✅ Success! FFmpeg version:`)
    console.log(result.split('\n')[0]) // Show only first line version info
    ffmpegPath = path
    break
  } catch (e) {
    console.log(`❌ Failed: ${e.message.split('\n')[0]}`)
    continue
  }
}

if (ffmpegPath) {
  console.log(`\n🎉 Found available FFmpeg path: ${ffmpegPath}`)
  
  // Test simple audio processing command
  try {
    console.log('\n🧪 Testing audio processing capability...')
    const testCommand = `"${ffmpegPath}" -f lavfi -i "sine=frequency=440:duration=1" -f lavfi -i "sine=frequency=880:duration=1" -filter_complex "[0:0][1:0]amix=inputs=2:duration=longest" -t 1 -y test_ffmpeg_output.wav`
    execSync(testCommand, { stdio: 'pipe' })
    console.log('✅ FFmpeg audio processing test successful!')
    
    // Clean up test file
    try {
      const fs = require('fs')
      fs.unlinkSync('test_ffmpeg_output.wav')
      console.log('🧹 Test file cleanup completed')
    } catch (e) {
      // Ignore cleanup errors
    }
    
  } catch (e) {
    console.log(`❌ Audio processing test failed: ${e.message}`)
  }
} else {
  console.log('\n❌ No available FFmpeg path found')
  console.log('Please ensure FFmpeg is properly installed and added to system PATH')
}
