# 🎵 Timeline 协作功能实现指南

## 🌟 已实现的 Timeline 协作功能

### ✅ 核心功能
1. **Clip 拖拽移动** - ClipMoveModifier.ts 中的 approve 方法添加协作广播
2. **Region 拖拽移动** - RegionMoveModifier.ts 中的 approve 方法添加协作广播  
3. **Clip 创建** - ClipSampleDragAndDrop.ts 中的 handleSample 方法添加协作广播
4. **Region 创建** - RegionSampleDragAndDrop.ts 中的 handleSample 方法添加协作广播
5. **Clip/Region 删除** - CollaborationManager.ts 中监听 boxGraph.deleteBox 操作
6. **事件同步应用** - CollaborationManager.ts 中的 applyEvent 方法处理所有 timeline 事件

### ✅ 新增消息类型
- `CLIP_CREATED` - 新建 clip 时广播
- `CLIP_DELETED` - 删除 clip 时广播  
- `CLIP_MOVED` - 移动 clip 时广播
- `CLIP_RESIZED` - 调整 clip 大小时广播
- `REGION_CREATED` - 新建 region 时广播
- `REGION_DELETED` - 删除 region 时广播
- `REGION_MOVED` - 移动 region 时广播
- `REGION_RESIZED` - 调整 region 大小时广播
- `TIMELINE_CHANGE` - 通用 timeline 属性变更广播

## 🧪 测试步骤

### 1. 启动服务
```bash
# 启动主应用
npm run opendaw:start

# 启动协作服务器
cd opendaw-collab-mvp
npm start
```

### 2. 打开两个浏览器窗口
```
窗口1: http://localhost:3000/studio/opendaw?projectId=timeline-test&userId=user1&collaborative=true
窗口2: http://localhost:3000/studio/opendaw?projectId=timeline-test&userId=user2&collaborative=true
```

### 3. Timeline 协作测试场景

#### 🎯 Clip 操作同步测试
1. **创建 Clip**
   - 在窗口1中从 Sample Library 拖拽音频文件到 timeline
   - 控制台应显示: `[ClipSampleDragAndDrop] Broadcasting clip creation`
   - 窗口2中应立即显示相同的 clip

2. **移动 Clip**
   - 在窗口1中拖拽已创建的 clip 到新位置
   - 控制台应显示: `[ClipMoveModifier] Broadcasting clip move`
   - 窗口2中的 clip 应立即移动到相同位置

3. **删除 Clip**
   - 在窗口1中选中 clip 并按 Delete 键
   - 控制台应显示: `[Collaboration] Broadcasting clip deletion`
   - 窗口2中的 clip 应立即消失

#### 🎯 Region 操作同步测试
1. **创建 Region**
   - 在窗口1中从 Sample Library 拖拽音频文件到 region 区域
   - 控制台应显示: `[RegionSampleDragAndDrop] Broadcasting region creation`
   - 窗口2中应立即显示相同的 region

2. **移动 Region**
   - 在窗口1中拖拽已创建的 region 到新位置
   - 控制台应显示: `[RegionMoveModifier] Broadcasting region move`
   - 窗口2中的 region 应立即移动到相同位置

3. **删除 Region**
   - 在窗口1中选中 region 并按 Delete 键
   - 控制台应显示: `[Collaboration] Broadcasting region deletion`
   - 窗口2中的 region 应立即消失

## 🔍 调试日志

打开浏览器开发者工具 (F12) -> Console，寻找以下前缀的日志：

### 客户端日志
```
[ClipSampleDragAndDrop] - Clip 创建相关
[RegionSampleDragAndDrop] - Region 创建相关
[ClipMoveModifier] - Clip 移动相关
[RegionMoveModifier] - Region 移动相关
[Collaboration] - 事件应用和删除监听
```

### 服务器端日志
```
[WSServer] Received message: CLIP_CREATED from user1
[WSServer] ✅ Event CLIP_CREATED saved to database
[WSServer] Broadcasting CLIP_CREATED to project timeline-test
```

## 📊 数据库验证

查看 PostgreSQL 中的协作事件：

```sql
-- 查看所有 timeline 相关事件
SELECT * FROM collaboration_events 
WHERE event_type IN ('CLIP_CREATED', 'CLIP_MOVED', 'CLIP_DELETED', 'REGION_CREATED', 'REGION_MOVED', 'REGION_DELETED')
ORDER BY timestamp DESC;

-- 统计各类型事件数量
SELECT event_type, COUNT(*) as count 
FROM collaboration_events 
WHERE project_id = 'timeline-test' 
GROUP BY event_type;
```

## 🚨 已知限制

1. **Clip/Region Resize** - 目前尚未实现调整大小的协作同步
2. **Selection Sync** - 选择状态不同步（这是设计决定，每个用户可以有不同的选择）
3. **Undo/Redo** - 撤销重做操作的协作同步需要额外实现
4. **Real-time Cursor** - 播放位置光标不同步（每个用户可以有不同的播放状态）

## 💡 实现原理

### 事件流程
1. **用户操作** → 触发相应的 Modifier 或 DragAndDrop 类
2. **本地应用** → 修改本地项目状态
3. **协作广播** → 通过 WebSocket 发送事件到服务器
4. **服务器转发** → 保存到数据库并广播给其他用户
5. **远程应用** → 其他用户收到事件并应用到本地状态

### 核心架构
- **消息类型定义** - MessageTypes.ts 中定义所有协作消息格式
- **WebSocket 客户端** - WSClient.ts 提供发送各类 timeline 事件的 helper 方法
- **事件应用器** - CollaborationManager.ts 中的 applyEvent 方法处理远程事件
- **删除监控** - 通过拦截 boxGraph.deleteBox 方法监听删除操作

## 🎯 预期同步效果

当用户在一个窗口中：
- 创建 clip/region → 其他窗口立即显示相同的元素
- 移动 clip/region → 其他窗口中的元素立即移动到相同位置  
- 删除 clip/region → 其他窗口中的元素立即消失
- 所有操作都会保存到数据库，确保断线重连后状态一致

## 🔧 故障排除

### 问题1: Clip 创建不同步
**检查:** 是否从 Sample Library 正确拖拽到 timeline clip 区域
**日志:** 寻找 `[ClipSampleDragAndDrop]` 相关日志

### 问题2: 移动操作不同步  
**检查:** 确保拖拽的是 clip/region 本身，不是选择框
**日志:** 寻找 `[ClipMoveModifier]` 或 `[RegionMoveModifier]` 日志

### 问题3: 删除操作不同步
**检查:** 确保使用键盘 Delete 键或右键菜单删除
**日志:** 寻找 `[Collaboration] Broadcasting * deletion` 日志

### 问题4: WebSocket 连接问题
**检查:** 
```javascript
console.log('Timeline collab status:', {
  wsExists: !!window.wsClient,
  wsConnected: window.wsClient?.isConnected,
  hasTimelineHelpers: !!(window.wsClient?.sendClipCreated)
})
```