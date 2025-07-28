# Debug Project Bundle Format

在浏览器控制台中运行以下代码来检查 projectBundle 的格式：

```javascript
// 1. 获取当前房间的项目数据
const roomId = window.location.pathname.split('/').pop()
const token = sessionStorage.getItem('synxsphere_token') || localStorage.getItem('synxsphere_token')

// 2. 获取项目数据
fetch(`/api/rooms/${roomId}/studio-project`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('项目数据:', data)
  
  if (data.boxGraphData) {
    console.log('boxGraphData 长度:', data.boxGraphData.length)
    
    // 检查前4个字节
    const bytes = new Uint8Array(data.boxGraphData)
    const signature = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    console.log('前4个字节 (hex):', signature)
    
    // 检查是否是 ZIP 格式 (PK = 0x50 0x4B)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      console.log('✅ 这是 ZIP 格式 (.odb)')
    } else {
      console.log('❌ 这不是 ZIP 格式，可能是原始 BoxGraph 数据')
      console.log('前20个字节:', Array.from(bytes.slice(0, 20)))
    }
  } else {
    console.log('⚠️ 没有找到 boxGraphData')
  }
})
.catch(err => console.error('错误:', err))
```

## 如果发现不是 ZIP 格式

如果数据不是 ZIP 格式，说明是旧的 BoxGraph 数据。需要：

1. 删除当前房间并重新创建
2. 或者在控制台运行以下命令触发保存新格式：

```javascript
// 触发保存新的 .odb 格式
if (window.syncSphereDebug && window.syncSphereDebug.triggerBoxGraphSave) {
  window.syncSphereDebug.triggerBoxGraphSave()
  console.log('已触发保存，请等待几秒后刷新页面')
} else {
  console.log('Timeline sync 尚未初始化')
}
``` 