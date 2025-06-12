const fs = require('fs')
const path = require('path')

console.log('🎵 Check composed audio files')
console.log('=============================')

const uploadsDir = path.join(__dirname, 'uploads')

try {
  const files = fs.readdirSync(uploadsDir)
  // Find files starting with composition_ or containing composition
  const compositionFiles = files.filter(file => 
    file.startsWith('composition_') || file.includes('composition')
  )
  
  console.log(`📁 Total files in uploads folder: ${files.length}`)
  console.log(`🎼 Number of composition files: ${compositionFiles.length}`)
  console.log()
  
  if (compositionFiles.length > 0) {
    console.log('📋 Composition files list:')
    compositionFiles.forEach((file, index) => {
      const filePath = path.join(uploadsDir, file)
      const stats = fs.statSync(filePath)
      
      console.log(`${index + 1}. ${file}`)
      console.log(`   Size: ${Math.round(stats.size / 1024)} KB`)
      console.log(`   Created: ${stats.birthtime}`)
      console.log(`   Full path: ${filePath}`)
      console.log()
    })
  } else {
    console.log('❌ No composition files found')
    console.log('💡 Please ensure:')
    console.log('   1. At least 2 audio files have been uploaded')
    console.log('   2. Use Compose Tracks feature to create compositions')
    console.log('   3. FFmpeg is properly installed and available')
  }
  
  console.log('📂 All files in uploads folder:')
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`)
  })
  
} catch (error) {
  console.error('❌ Failed to read folder:', error.message)
}
