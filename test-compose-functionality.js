// 测试音频合成功能
const testCompose = async () => {
  try {
    const token = localStorage.getItem('token') || 'test-token'
    
    // 使用现有的音频文件ID进行测试
    const response = await fetch('/api/audio/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        trackIds: ['track1', 'track2'], // 这里需要替换为实际的track ID
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
      console.log('合成成功:', result)
      console.log('输出文件:', result.outputFile)
      console.log('文件位置: uploads/' + result.outputFile)
    } else {
      const error = await response.json()
      console.error('合成失败:', error)
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
}

// 首先获取可用的音频文件
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
      console.log('可用音频文件:', files)
      return files
    }
  } catch (error) {
    console.error('获取音频文件失败:', error)
  }
}

console.log('测试音频合成功能')
console.log('首先获取可用文件...')
// listAudioFiles()
