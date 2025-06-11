// 测试FFmpeg路径检测
const { execSync } = require('child_process')

const possibleFFmpegPaths = [
  'ffmpeg', // Try PATH first
  'C:\\Users\\10304\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe',
  'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe'
]

console.log('🔍 测试FFmpeg路径检测...')
console.log('==============================')

let ffmpegPath = null

for (const path of possibleFFmpegPaths) {
  try {
    console.log(`测试路径: ${path}`)
    const result = execSync(`"${path}" -version`, { stdio: 'pipe', encoding: 'utf8' })
    console.log(`✅ 成功! FFmpeg版本:`)
    console.log(result.split('\n')[0]) // 只显示第一行版本信息
    ffmpegPath = path
    break
  } catch (e) {
    console.log(`❌ 失败: ${e.message.split('\n')[0]}`)
    continue
  }
}

if (ffmpegPath) {
  console.log(`\n🎉 找到可用的FFmpeg路径: ${ffmpegPath}`)
  
  // 测试简单的音频处理命令
  try {
    console.log('\n🧪 测试音频处理能力...')
    const testCommand = `"${ffmpegPath}" -f lavfi -i "sine=frequency=440:duration=1" -f lavfi -i "sine=frequency=880:duration=1" -filter_complex "[0:0][1:0]amix=inputs=2:duration=longest" -t 1 -y test_ffmpeg_output.wav`
    execSync(testCommand, { stdio: 'pipe' })
    console.log('✅ FFmpeg音频处理测试成功!')
    
    // 清理测试文件
    try {
      const fs = require('fs')
      fs.unlinkSync('test_ffmpeg_output.wav')
      console.log('🧹 清理测试文件完成')
    } catch (e) {
      // 忽略清理错误
    }
    
  } catch (e) {
    console.log(`❌ 音频处理测试失败: ${e.message}`)
  }
} else {
  console.log('\n❌ 未找到可用的FFmpeg路径')
  console.log('请确保FFmpeg已正确安装并添加到系统PATH中')
}
