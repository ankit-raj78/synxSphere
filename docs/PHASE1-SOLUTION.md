# Phase 1 错误解决方案

## 问题分析

### 错误现象
```
[UpdateSync] PrimitiveUpdate target box not found: 217,59,98,228,124,28,79,186,174,74,110,208,26,95,80,216
[UpdateSync] Final failure: {PrimitiveUpdate oldValue: 0, newValue: 1
Error: 58c68af0-b9c2-45bd-827d-a638cddaa5d2/20 could not be resolved
```

### 根本原因
1. **缺失核心 Box**：OpenDAW 在项目初始化时会创建一些"内部" Box（如 `UserInterfaceBox`、`AutomationBox`、`MixerBox`），但这些 Box 的创建不会被 `UpdateBasedTimelineSync` 捕获，因为监听器是在初始化之后才启动的。

2. **依赖关系**：当用户拖拽创建轨道时，会生成 5 个 `NewUpdate`（TrackBox、AudioUnitBox 等），紧接着还会有 `PrimitiveUpdate` 和 `PointerUpdate` 来更新这些内部 Box 的字段。

3. **接收端问题**：接收端没有这些内部 Box，导致 `PrimitiveUpdate` 和 `PointerUpdate` 无法找到目标，整个事务回滚。

## 解决方案：初始核心 Box 同步

### 实现步骤

1. **扩展 Box 类型列表**
   - 已更新 `isTimelineUpdate()` 方法，包含所有必要的 Box 类型
   - 特别添加了核心必需的 Box：`RootBox`、`UserInterfaceBox`、`SelectionBox`

2. **发送初始核心 Box**
   - 新增 `sendInitialBoxes()` 方法
   - 在 `requestInitialSync()` 中首先发送本地的核心 Box
   - 为每个核心 Box 创建 `NewUpdate` 并批量发送

3. **接收端处理**
   - 接收端会通过现有的 `applyRemoteUpdates` 逻辑创建这些核心 Box
   - 后续的 `PrimitiveUpdate` 和 `PointerUpdate` 就能正常解析

### 核心 Box 列表
```typescript
const coreBoxTypes = [
  'RootBox',           // 项目根
  'UserInterfaceBox',  // UI 状态
  'SelectionBox',      // 选择状态
  'TimelineBox',       // 时间线
  'AudioBusBox',       // 音频总线（Master Bus）
  'AudioUnitBox',      // 音频单元（Master Unit）
  'GrooveShuffleBox',  // Groove 设置
  'StepAutomationBox'  // 步进自动化
]
```

## 测试验证

### 测试步骤
1. 重启 Docker 容器
2. 打开两个浏览器窗口
3. 两个用户加入同一个房间
4. 第二个用户应该能看到第一个用户的完整项目状态
5. 任一用户拖拽音频，另一用户应该能看到并播放

### 预期结果
- 不再出现 "target box not found" 错误
- 不再出现 "could not be resolved" 错误
- BoxCount 正确增加
- 音频轨道正常同步和播放

## 调试命令

```javascript
// 检查核心 Box 是否存在
window.syncSphereDebug.listTimelineBoxes().filter(b => 
  ['RootBox', 'UserInterfaceBox', 'TimelineBox'].includes(b.name)
)

// 手动触发初始同步
window.syncSphereTimelineSync.sendInitialBoxes()

// 查看同步状态
window.syncSphereDebug.getTimelineSyncStatus()
```

## 注意事项

1. **性能考虑**：初始同步会发送较多的 `NewUpdate`，但只在连接时发送一次
2. **兼容性**：标记了 `isInitialSync: true` 以便将来可以优化处理
3. **错误处理**：如果某个核心 Box 序列化失败，不会影响其他 Box 的发送 