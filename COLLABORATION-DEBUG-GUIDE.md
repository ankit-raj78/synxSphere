# 🔍 SyncSphere 协作功能调试指南

## 🚀 已完成的功能

✅ **轨道拖拽协作** - Mixer.tsx 中的 Channel Strip 拖拽同步  
✅ **音量调节协作** - VolumeSlider.tsx 中的音量参数同步  
✅ **声相调节协作** - RelativeUnitValueDragging.tsx 中的旋钮参数同步  
✅ **30秒自动快照** - CollaborativeOpfsAgent.ts 中的定期保存功能  
✅ **全面调试日志** - 所有关键组件都添加了详细的调试信息  
✅ **WebSocket 全局暴露** - CollaborationManager.ts 将 wsClient 暴露到 window.wsClient  

## 🧪 测试步骤

### 1. 启动服务
```bash
# 1. 启动主应用
npm run opendaw:start

# 2. 启动协作服务器
cd opendaw-collab-mvp
npm start
```

### 2. 打开多个浏览器窗口
```
窗口1: http://localhost:3000/studio/opendaw?projectId=test&userId=user1&collaborative=true&userName=Alice
窗口2: http://localhost:3000/studio/opendaw?projectId=test&userId=user2&collaborative=true&userName=Bob
```

### 3. 检查调试日志

打开浏览器开发者工具 (F12) -> Console，应该能看到以下日志：

#### 连接成功的日志：
```
[Collaboration] ✅ Collaboration layer initialized successfully
[Collaboration] ✅ WebSocket client exposed globally as window.wsClient
```

#### 拖拽轨道时的日志：
```
[ChannelStrip] Creating drag data: {uuid: "...", type: "channelstrip", start_index: 0}
[Mixer] Drag event detected: {type: "channelstrip", dragData: {...}}
[Mixer] Drop event triggered: {type: "channelstrip", dragData: {...}}
[Mixer] Broadcasting dragTrack: {trackId: "...", newIndex: 1}
[Mixer] ✅ Sending dragTrack message...
[Mixer] ✅ dragTrack message sent successfully!
```

#### 调节音量时的日志：
```
[VolumeSlider] Volume change finalised: {parameterId: "...", value: 0.75}
[VolumeSlider] ✅ Sending volume update: {parameterId: "...", parameterType: "volume", value: 0.75}
[VolumeSlider] ✅ Volume update sent successfully!
```

#### 服务器端日志：
```
[WSServer] Received message: DRAG_TRACK from user1 {trackId: "...", newIndex: 1}
[WSServer] ✅ Event DRAG_TRACK saved to database
[WSServer] Broadcasting DRAG_TRACK to project test
```

## 🔧 故障排除

### 问题1: 没有看到拖拽日志
**可能原因：**
- Channel Strip 没有被正确识别为可拖拽元素
- DragAndDrop.installSource 没有被调用

**检查方法：**
```javascript
// 在控制台中检查
console.log('wsClient exists:', !!window.wsClient)
console.log('wsClient connected:', window.wsClient?.isConnected)
```

### 问题2: WebSocket 连接失败
**可能原因：**
- 协作服务器没有启动
- URL 参数不正确

**检查方法：**
```javascript
// 检查 WebSocket 状态
console.log('WebSocket status:', {
  exists: !!window.wsClient,
  isConnected: window.wsClient?.isConnected,
  connectionState: window.wsClient?.connectionState
})
```

### 问题3: 消息发送失败
**可能原因：**
- wsClient 没有正确暴露到 window 对象
- WebSocket 连接断开

**检查方法：**
```javascript
// 手动测试发送消息
if (window.wsClient?.isConnected) {
  window.wsClient.sendDragTrack('test-track-id', 2)
  console.log('Test message sent')
} else {
  console.log('WebSocket not ready')
}
```

## 📊 数据库验证

### 检查 PostgreSQL 数据
```sql
-- 查看所有协作事件
SELECT * FROM collaboration_events ORDER BY timestamp DESC LIMIT 10;

-- 查看特定项目的事件
SELECT * FROM collaboration_events WHERE project_id = 'test' ORDER BY timestamp DESC;

-- 统计事件类型
SELECT event_type, COUNT(*) FROM collaboration_events GROUP BY event_type;
```

## 🎯 预期行为

### 轨道拖拽同步：
1. 用户1在 Mixer 中拖拽 Channel Strip
2. 控制台显示拖拽和发送日志
3. 用户2的窗口中轨道立即移动到相同位置

### 参数调节同步：
1. 用户1调节音量滑块或声相旋钮
2. 控制台显示参数更新日志
3. 用户2的窗口中相应参数立即更新

### 自动快照：
1. 每30秒自动保存项目状态
2. 控制台显示保存成功日志
3. 刷新浏览器后状态恢复

## 💡 调试技巧

### 1. 实时监控 WebSocket 消息
```javascript
// 在控制台中运行，监控所有 WebSocket 消息
const originalSend = window.wsClient.send.bind(window.wsClient)
window.wsClient.send = function(message) {
  console.log('🚀 Sending WebSocket message:', message)
  return originalSend(message)
}
```

### 2. 检查协作管理器状态
```javascript
// 获取协作管理器实例
const collabManager = window.getCollaborationManager?.()
if (collabManager) {
  console.log('Collaboration active:', collabManager.isActive())
  console.log('Connection status:', collabManager.getConnectionStatus())
}
```

### 3. 手动触发同步
```javascript
// 手动请求同步
if (window.wsClient?.isConnected) {
  window.wsClient.sendSyncRequest()
  console.log('Sync request sent')
}
```

## 📝 常见问题解答

**Q: 为什么我看不到任何拖拽日志？**
A: 确保你在 Mixer 面板中拖拽 Channel Strip 的图标部分，而不是其他区域。

**Q: 为什么参数更改没有同步？**
A: 检查控制台是否有 WebSocket 相关的错误信息，确保协作服务器正在运行。

**Q: 如何确认消息已发送到服务器？**
A: 查看服务器控制台，应该能看到 "[WSServer] Received message" 的日志。

**Q: 如何重置协作状态？**
A: 关闭所有浏览器窗口，重启协作服务器，然后重新打开窗口。