# BoxGraph保存调试指南

## 问题诊断

当前问题：创建房间后，projectBundle字段始终为空，说明BoxGraph没有被保存到数据库。

## 调试步骤

### 1. 重启Docker容器
```bash
docker-compose -f docker-compose.dev.yml restart opendaw
```

### 2. 打开浏览器开发者工具
- Chrome: F12
- 切换到Console标签

### 3. 创建或加入房间
- 创建新房间或加入现有房间
- 拖入一个音频轨道

### 4. 查看控制台日志
应该看到以下日志序列：
```
[UpdateSync] Local update detected: ...
[UpdateSync] handleLocalUpdate called
[UpdateSync] Current box count: 7, hasInitialContentSaved: false
[UpdateSync] 🎯 First content created, triggering BoxGraph save...
[UpdateSync] 🔥 Executing saveBoxGraphToServer...
[UpdateSync] 🚀 saveBoxGraphToServer called
[UpdateSync] ✅ BoxGraph saved to server successfully
```

### 5. 手动触发保存（如果自动保存未触发）
在浏览器控制台运行：
```javascript
// 检查Timeline Sync是否可用
window.syncSphereTimelineSync

// 查看当前Box数量
Array.from(window.syncSphereTimelineSync.service.project.boxGraph.boxes()).length

// 手动触发BoxGraph保存
await window.syncSphereTimelineSync.triggerBoxGraphSave()
```

### 6. 验证数据库
```bash
docker exec -it opendaw_synxsphere_dev sh -c "cd /app && node check-project-bundle.js"
```

### 7. 测试加载
- 使用另一个浏览器或隐身模式
- 加入同一个房间
- 查看控制台是否有：
  - `📊 AUTOMATIC IMPORT: Found BoxGraph data...`
  - `✅ AUTOMATIC IMPORT: BoxGraph loaded successfully`

## 常见问题

### Q: 看不到任何[UpdateSync]日志
A: Timeline Sync可能未初始化。确保：
1. 已加入房间
2. WebSocket已连接
3. 检查是否有错误日志

### Q: 看到"No auth token found"
A: 认证令牌丢失。尝试：
1. 重新登录
2. 刷新页面

### Q: 保存成功但数据库仍为空
A: 可能是API端点问题。检查：
1. Network标签中的PUT请求
2. 响应状态码
3. 服务器日志

## 调试命令集合
```javascript
// 完整调试脚本
async function debugBoxGraphSave() {
  const sync = window.syncSphereTimelineSync;
  if (!sync) {
    console.error('Timeline Sync not initialized');
    return;
  }
  
  const boxCount = Array.from(sync.service.project.boxGraph.boxes()).length;
  console.log(`Current box count: ${boxCount}`);
  
  if (boxCount > 6) {
    console.log('Triggering BoxGraph save...');
    await sync.triggerBoxGraphSave();
  } else {
    console.log('No content to save (only base boxes)');
  }
}

// 运行调试
debugBoxGraphSave()
``` 