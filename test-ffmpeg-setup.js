// 测试FFmpeg音频合成功能
console.log('🎵 测试FFmpeg音频合成功能')
console.log('================================')

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 1. 检查FFmpeg是否可用
console.log('1️⃣ 检查FFmpeg安装...')
try {
  const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' })
  console.log('✅ FFmpeg已安装')
  const firstLine = ffmpegVersion.split('\n')[0]
  console.log(`   版本: ${firstLine}`)
} catch (error) {
  console.log('❌ FFmpeg未安装或无法访问')
  console.log('   错误:', error.message)
  process.exit(1)
}

// 2. 创建测试音频文件
console.log('\n2️⃣ 创建测试音频文件...')
const uploadsDir = path.join(__dirname, 'uploads')

// 确保uploads目录存在
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('✅ 创建uploads目录')
}

// 创建两个简单的测试音频文件（使用ffmpeg生成）
const testAudio1 = path.join(uploadsDir, 'test_tone_440hz.wav')
const testAudio2 = path.join(uploadsDir, 'test_tone_880hz.wav')

try {
  // 生成440Hz音调 - 2秒
  execSync(`ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -y "${testAudio1}"`, { stdio: 'pipe' })
  console.log('✅ 创建测试音频1 (440Hz)')
  
  // 生成880Hz音调 - 2秒
  execSync(`ffmpeg -f lavfi -i "sine=frequency=880:duration=2" -y "${testAudio2}"`, { stdio: 'pipe' })
  console.log('✅ 创建测试音频2 (880Hz)')
} catch (error) {
  console.log('❌ 创建测试音频失败:', error.message)
  process.exit(1)
}

// 3. 测试音频合成
console.log('\n3️⃣ 测试音频合成...')
const outputFile = path.join(uploadsDir, 'test_composition.mp3')

try {
  const ffmpegCommand = `ffmpeg -i "${testAudio1}" -i "${testAudio2}" -filter_complex "[0:0][1:0]amix=inputs=2:duration=longest:dropout_transition=2" -ac 2 -ar 44100 -b:a 192k -y "${outputFile}"`
  
  console.log('   执行命令:', ffmpegCommand)
  execSync(ffmpegCommand, { stdio: 'pipe' })
  console.log('✅ 音频合成成功')
  
  // 检查输出文件
  const stats = fs.statSync(outputFile)
  console.log(`   输出文件: ${path.basename(outputFile)}`)
  console.log(`   文件大小: ${Math.round(stats.size / 1024)} KB`)
  console.log(`   完整路径: ${outputFile}`)
  
} catch (error) {
  console.log('❌ 音频合成失败:', error.message)
  process.exit(1)
}

// 4. 验证结果
console.log('\n4️⃣ 验证结果...')
const files = fs.readdirSync(uploadsDir)
const compositionFiles = files.filter(file => file.includes('composition') || file.includes('test_'))

console.log(`📁 uploads文件夹总文件数: ${files.length}`)
console.log(`🎼 测试文件数量: ${compositionFiles.length}`)

if (compositionFiles.length > 0) {
  console.log('\n📋 测试文件列表:')
  compositionFiles.forEach((file, index) => {
    const filePath = path.join(uploadsDir, file)
    const stats = fs.statSync(filePath)
    console.log(`${index + 1}. ${file}`)
    console.log(`   大小: ${Math.round(stats.size / 1024)} KB`)
  })
}

console.log('\n🎉 FFmpeg音频合成测试完成！')
console.log('💡 现在可以在SyncSphere应用中使用Compose功能了')
