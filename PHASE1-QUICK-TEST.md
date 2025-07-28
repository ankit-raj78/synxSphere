# Phase 1 Timeline Sync - 快速测试指南

## 🚀 快速开始

1. 启动服务（如果还没启动）：
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. 打开两个浏览器窗口：
   - 窗口 1: 普通模式
   - 窗口 2: 隐身模式

3. 两个窗口都访问 https://localhost:8443

4. 用不同账号登录并加入同一个房间

## 🧪 测试 Phase 1 功能

### 在浏览器控制台中验证初始化

打开 F12 控制台，运行：

```javascript
// 检查同步状态
syncSphereDebug.getTimelineSyncStatus()
```

应该看到：
- timelineSync: "Initialized"
- audioSync: "Initialized"  
- wsClient: "Connected"

### 测试 1: 创建轨道同步

**窗口 1:**
```javascript
// 手动创建测试轨道
syncSphereDebug.sendTestUpdate()
```

**窗口 2:**
- 应该看到新轨道出现
- 控制台应显示: `[UpdateSync] Remote updates received`

### 测试 2: 查看 Timeline Boxes

```javascript
// 列出所有 Timeline 相关的 Box
syncSphereDebug.listTimelineBoxes()
```

### 测试 3: 参数修改同步

**窗口 1:**
1. 调整任意轨道的音量滑块
2. 观察控制台: `[UpdateSync] Local update detected: primitive AudioUnitBox`

**窗口 2:**
1. 音量应该自动同步
2. 控制台: `[UpdateSync] Applying update: primitive`

### 测试 4: 手动请求快照

```javascript
// 请求完整的 Timeline 状态
syncSphereDebug.requestTimelineSnapshot()
```

## 📊 监控同步活动

在控制台中观察这些关键日志：

- `[UpdateSync] Local update detected` - 本地修改被检测到
- `[UpdateSync] Sending batch of X updates` - 批量发送更新
- `[UpdateSync] Remote updates received` - 接收到远程更新
- `[UpdateSync] Applying update` - 应用远程更新

## 🔍 调试命令

```javascript
// 查看 Timeline 同步实例
window.syncSphereTimelineSync

// 查看音频同步管理器
window.syncSphereAudioSync

// 查看 WebSocket 客户端
window.wsClient

// 查看所有调试工具
window.syncSphereDebug
```

## ⚠️ 注意事项

1. **音频文件**: Phase 1 只同步 BoxGraph 结构，音频文件需要 Phase 3
2. **UI 状态**: 轨道高度等 UI 状态需要 Phase 4
3. **权限**: 目前所有用户都可以修改任何内容

## ✅ 成功标志

如果以下情况都正常，说明 Phase 1 工作正常：
- 创建轨道能在其他用户界面显示
- 修改音量/声相/静音能实时同步
- 删除轨道能同步
- 控制台没有报错 