// Test FFmpeg audio composition functionality
console.log('🎵 Testing FFmpeg Audio Composition Functionality')
console.log('================================================')

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 1. Check if FFmpeg is available
console.log('1️⃣ Checking FFmpeg installation...')
try {
  const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' })
  console.log('✅ FFmpeg is installed')
  const firstLine = ffmpegVersion.split('\n')[0]
  console.log(`   Version: ${firstLine}`)
} catch (error) {
  console.log('❌ FFmpeg is not installed or inaccessible')
  console.log('   Error:', error.message)
  process.exit(1)
}

// 2. Create test audio files
console.log('\n2️⃣ Creating test audio files...')
const uploadsDir = path.join(__dirname, 'uploads')

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('✅ Created uploads directory')
}

// Create two simple test audio files (generated using ffmpeg)
const testAudio1 = path.join(uploadsDir, 'test_tone_440hz.wav')
const testAudio2 = path.join(uploadsDir, 'test_tone_880hz.wav')

try {
  // Generate 440Hz tone - 2 seconds
  execSync(`ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -y "${testAudio1}"`, { stdio: 'pipe' })
  console.log('✅ Created test audio 1 (440Hz)')
  
  // Generate 880Hz tone - 2 seconds
  execSync(`ffmpeg -f lavfi -i "sine=frequency=880:duration=2" -y "${testAudio2}"`, { stdio: 'pipe' })
  console.log('✅ Created test audio 2 (880Hz)')
} catch (error) {
  console.log('❌ Failed to create test audio:', error.message)
  process.exit(1)
}

// 3. Test audio composition
console.log('\n3️⃣ Testing audio composition...')
const outputFile = path.join(uploadsDir, 'test_composition.mp3')

try {
  const ffmpegCommand = `ffmpeg -i "${testAudio1}" -i "${testAudio2}" -filter_complex "[0:0][1:0]amix=inputs=2:duration=longest:dropout_transition=2" -ac 2 -ar 44100 -b:a 192k -y "${outputFile}"`
  
  console.log('   Executing command:', ffmpegCommand)
  execSync(ffmpegCommand, { stdio: 'pipe' })
  console.log('✅ Audio composition successful')
  
  // Check output file
  const stats = fs.statSync(outputFile)
  console.log(`   Output file: ${path.basename(outputFile)}`)
  console.log(`   File size: ${Math.round(stats.size / 1024)} KB`)
  console.log(`   Full path: ${outputFile}`)
  
} catch (error) {
  console.log('❌ Audio composition failed:', error.message)
  process.exit(1)
}

// 4. Verify results
console.log('\n4️⃣ Verifying results...')
const files = fs.readdirSync(uploadsDir)
const compositionFiles = files.filter(file => file.includes('composition') || file.includes('test_'))

console.log(`📁 Total files in uploads folder: ${files.length}`)
console.log(`🎼 Number of test files: ${compositionFiles.length}`)

if (compositionFiles.length > 0) {
  console.log('\n📋 Test files list:')
  compositionFiles.forEach((file, index) => {
    const filePath = path.join(uploadsDir, file)
    const stats = fs.statSync(filePath)
    console.log(`${index + 1}. ${file}`)
    console.log(`   Size: ${Math.round(stats.size / 1024)} KB`)
  })
}

console.log('\n🎉 FFmpeg audio composition test completed!')
console.log('💡 Now you can use the Compose feature in SyncSphere application')
