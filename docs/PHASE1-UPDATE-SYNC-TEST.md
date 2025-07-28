# Phase 1: Update System 测试指南

## 概述

Phase 1 实现了基于 OpenDAW 原生 Update 系统的 Timeline 同步机制。所有对 BoxGraph 的修改都会生成 Update 对象，这些 Update 会被序列化并通过 WebSocket 同步到其他用户。

## 已实现的功能

### 1. Update 监听和过滤
- ✅ 监听所有 BoxGraph 的 Update
- ✅ 过滤 Timeline 相关的 Box 类型
- ✅ 批处理队列（100ms 内的更新会合并发送）

### 2. Update 序列化/反序列化
- ✅ NewUpdate - 创建新 Box（如创建轨道、添加 Region）
- ✅ PrimitiveUpdate - 修改基础属性（如音量、声相、静音）
- ✅ PointerUpdate - 修改引用关系（如 Region 引用音频文件）
- ✅ DeleteUpdate - 删除 Box（如删除轨道、删除 Region）

### 3. WebSocket 通信
- ✅ TIMELINE_UPDATE 消息类型
- ✅ TIMELINE_SNAPSHOT_REQUEST/RESPONSE（初始同步）
- ✅ 批量发送和接收

### 4. 远程 Update 应用
- ✅ 在 editing.modify 事务中应用
- ✅ 避免循环（不发送由远程触发的本地更新）

## 测试步骤

### 准备工作

1. 启动服务：
```bash
cd /d/SyncSphere
docker-compose -f docker-compose.dev.yml up -d
```

2. 打开两个浏览器窗口（建议一个普通窗口，一个隐身窗口）

3. 两个窗口都访问：https://localhost:8443

4. 使用不同账号登录并加入同一个房间

### 测试场景

#### 场景 1: 轨道创建同步（NewUpdate）

**Browser 1 操作：**
1. 打开浏览器控制台（F12）
2. 从左侧拖拽一个音频样本到 Timeline
3. 观察控制台输出：
   - `[UpdateSync] Local update detected: new TrackBox`
   - `[UpdateSync] Local update detected: new AudioUnitBox`
   - `[UpdateSync] Sending batch of X updates`

**Browser 2 验证：**
1. 应该看到控制台输出：
   - `[WSClient] Timeline update received`
   - `[UpdateSync] Remote updates received: X`
   - `[UpdateSync] Applying update: new TrackBox`
   - `[UpdateSync] Successfully applied remote updates`
2. Timeline 中应该出现新轨道

#### 场景 2: 参数修改同步（PrimitiveUpdate）

**Browser 1 操作：**
1. 调整轨道音量滑块
2. 切换静音按钮
3. 调整声相旋钮
4. 观察控制台输出：
   - `[UpdateSync] Local update detected: primitive AudioUnitBox`
   - `[UpdateSync] Checking primitive update for AudioUnitBox: true`

**Browser 2 验证：**
1. 轨道的音量、静音、声相应该实时同步
2. 控制台应该显示接收和应用更新的日志

#### 场景 3: Region 操作同步

**Browser 1 操作：**
1. 在轨道上创建 Region（拖拽音频）
2. 移动 Region 位置
3. 调整 Region 长度
4. 删除 Region

**Browser 2 验证：**
1. Region 的创建、移动、调整、删除都应该同步

#### 场景 4: 初始同步测试

**步骤：**
1. Browser 1 先创建一些轨道和 Region
2. Browser 2 刷新页面
3. Browser 2 应该通过 TIMELINE_SNAPSHOT_REQUEST 获取当前状态

## 调试工具

在浏览器控制台中可用的调试命令：

```javascript
// 查看同步实例
window.syncSphereTimelineSync

// 手动触发初始同步
window.syncSphereTimelineSync.requestInitialSync()

// 查看当前 BoxGraph 中的所有 Box
window.studioService.project.boxGraph.boxes()

// 查看特定类型的 Box
window.studioService.project.boxGraph.boxes()
  .filter(box => box.name === 'TrackBox')
```

## 已知限制

1. **音频文件同步**：Update 只同步 BoxGraph 结构，实际音频文件需要单独处理（Phase 3）
2. **UI 状态**：轨道高度、折叠状态等 UI 特定状态不会同步（Phase 4）
3. **权限控制**：目前所有用户都可以修改任何内容（Phase 2）
4. **性能优化**：大量 Update 可能造成性能问题，需要进一步优化

## 常见问题

### Q: 为什么 Region 创建了但没有声音？
A: Region 引用的音频文件可能在其他用户的 OPFS 中不存在。需要 Phase 3 的音频同步功能。

### Q: 为什么有些修改没有同步？
A: 检查控制台是否有 `[UpdateSync] Checking XXX update for YYY: false` 的日志。可能该 Box 类型不在过滤列表中。

### Q: 如何确认 Update 是否发送成功？
A: 查看控制台的 `[UpdateSync] Sending batch of X updates` 日志，以及网络面板中的 WebSocket 消息。

## 下一步

- Phase 2: 实现轨道所有权和权限控制
- Phase 3: 实现 OPFS 音频文件同步
- Phase 4: 实现 UI 状态同步 