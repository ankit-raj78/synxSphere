# Phase 1 快速测试指南 (更新版)

## 1. 启动服务
```bash
# 重启 Docker 容器以应用更改
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up
```

## 2. 测试步骤

### 准备
1. 打开两个浏览器窗口（建议一个普通模式，一个隐私模式）
2. 都访问 `https://localhost:8080`
3. 用不同账号登录
4. 加入同一个房间

### 测试初始同步
在第二个用户的控制台运行：
```javascript
// 应该看到初始核心 Box 同步日志
// [UpdateSync] Sending initial core boxes...
// [UpdateSync] Found X core boxes to send
// [UpdateSync] Sent X initial core box updates
```

### 测试拖拽同步
1. **用户 A**：从 Sample 库拖拽音频到 Timeline
2. **用户 B**：应该立即看到新轨道出现

### 验证成功标志
- ✅ 不再出现 "target box not found" 错误
- ✅ 不再出现 "could not be resolved" 错误  
- ✅ Box count 正确增加（不再是 0→0）
- ✅ 两端都能播放音频

## 3. 调试命令

```javascript
// 检查核心 Box 是否存在
window.syncSphereDebug.listTimelineBoxes().filter(b => 
  ['RootBox', 'UserInterfaceBox', 'TimelineBox', 'AudioBusBox'].includes(b.name)
)

// 查看当前 Box 总数
window.syncSphereDebug.listTimelineBoxes().length

// 手动触发初始同步（如果需要）
window.syncSphereTimelineSync.sendInitialBoxes()

// 查看同步状态
window.syncSphereDebug.getTimelineSyncStatus()
```

## 4. 预期控制台输出

### 发送端（拖拽音频时）
```
[UpdateSync] Local update detected: new NewUpdate
[UpdateSync] Sending batch of X updates
[TimelineDragAndDrop] DEBUG - sample: {uuid: '...', name: '...'}
```

### 接收端（收到更新时）
```
[UpdateSync] Remote updates received: X
[UpdateSync] Phase 1: Applying X new updates
[UpdateSync] ✓ Box created successfully: AudioUnitBox
[UpdateSync] ✓ Box created successfully: TrackBox
[UpdateSync] Successfully applied dependent update: {PointerUpdate ...}
[UpdateSync] Post-transaction box count: X (应该大于0)
```

## 5. 常见问题

### 如果仍然出现错误
1. 确保 Docker 容器已重启
2. 清除浏览器缓存
3. 检查是否有其他错误日志
4. 尝试手动触发初始同步：
   ```javascript
   window.syncSphereTimelineSync.sendInitialBoxes()
   ```

### 如果音频不能播放
- 检查音频文件是否已下载（Phase 3 功能）
- 暂时只测试 Online Sample（已在服务器上的音频） 