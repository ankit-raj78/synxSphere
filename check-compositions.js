const fs = require('fs')
const path = require('path')

console.log('🎵 检查合成音频文件')
console.log('===================')

const uploadsDir = path.join(__dirname, 'uploads')

try {
  const files = fs.readdirSync(uploadsDir)
    // 查找以 composition_ 开头的文件或包含 composition 的文件
  const compositionFiles = files.filter(file => 
    file.startsWith('composition_') || file.includes('composition')
  )
  
  console.log(`📁 uploads 文件夹总文件数: ${files.length}`)
  console.log(`🎼 合成文件数量: ${compositionFiles.length}`)
  console.log()
  
  if (compositionFiles.length > 0) {
    console.log('📋 合成文件列表:')
    compositionFiles.forEach((file, index) => {
      const filePath = path.join(uploadsDir, file)
      const stats = fs.statSync(filePath)
      
      console.log(`${index + 1}. ${file}`)
      console.log(`   大小: ${Math.round(stats.size / 1024)} KB`)
      console.log(`   创建时间: ${stats.birthtime}`)
      console.log(`   完整路径: ${filePath}`)
      console.log()
    })
  } else {
    console.log('❌ 暂无合成文件')
    console.log('💡 请确保：')
    console.log('   1. 已上传至少2个音频文件')
    console.log('   2. 使用 Compose Tracks 功能进行合成')
    console.log('   3. FFmpeg 正确安装并可用')
  }
  
  console.log('📂 uploads文件夹中的所有文件:')
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`)
  })
  
} catch (error) {
  console.error('❌ 读取文件夹失败:', error.message)
}
