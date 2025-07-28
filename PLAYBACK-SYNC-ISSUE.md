# 播放同步问题分析

## 问题描述
在实时协作中，只有最后上传音频的用户能够播放音乐。其他用户按下播放按钮后，播放头不会移动。

## 根本原因
播放状态（play/pause）没有在用户之间同步。当前的协作系统只同步了以下内容：
- 音频文件
- 轨道创建/更新
- 区域/片段操作
- 用户加入/离开

**但没有同步播放控制状态！**

## 技术细节

### 1. 播放控制代码位置
在 `openDAW/studio/src/service/Shortcuts.ts` 第20-22行：
```typescript
} else if (code === "Space") {
    event.preventDefault()
    const playing = service.engine.isPlaying()
    playing.setValue(!playing.getValue())
}
```

### 2. 缺失的消息类型
在 `opendaw-collab-mvp/src/websocket/MessageTypes.ts` 中没有定义播放状态同步的消息类型，如：
- `TRANSPORT_PLAY`
- `TRANSPORT_PAUSE`
- `TRANSPORT_STOP`
- `TRANSPORT_POSITION_CHANGED`

### 3. AudioContext 状态问题
另一个可能的问题是 AudioContext 的状态。在 `main.ts` 中：
```typescript
if (context.state === "suspended") {
    window.addEventListener("click",
        async () => await context.resume().then(() =>
            console.debug(`AudioContext resumed (${context.state})`)), {capture: true, once: true})
}
```

每个用户的 AudioContext 可能处于不同的状态（running/suspended），这也会影响播放。

## 解决方案

### 1. 添加播放状态消息类型
在 `MessageTypes.ts` 中添加：
```typescript
export type CollabMessageType = 
  // ... existing types
  | 'TRANSPORT_PLAY'
  | 'TRANSPORT_PAUSE'
  | 'TRANSPORT_STOP'
  | 'TRANSPORT_SEEK'
```

### 2. 修改播放控制逻辑
在触发播放时，需要：
1. 本地改变播放状态
2. 通过 WebSocket 广播播放状态
3. 确保所有用户的 AudioContext 都是 running 状态

### 3. 实现播放状态同步处理器
```typescript
// 在 CollaborationManager 中添加
case 'TRANSPORT_PLAY':
    // 确保 AudioContext 是活跃的
    await service.context.resume()
    // 设置播放状态
    service.engine.isPlaying().setValue(true)
    break

case 'TRANSPORT_PAUSE':
    service.engine.isPlaying().setValue(false)
    break
```

### 4. 修改快捷键处理
```typescript
} else if (code === "Space") {
    event.preventDefault()
    const playing = service.engine.isPlaying()
    const newState = !playing.getValue()
    playing.setValue(newState)
    
    // 广播播放状态变化
    if (wsClient && wsClient.isConnected) {
        wsClient.send({
            type: newState ? 'TRANSPORT_PLAY' : 'TRANSPORT_PAUSE',
            projectId: roomId,
            userId: userId,
            timestamp: Date.now(),
            data: { position: service.engine.position().getValue() }
        })
    }
}
```

## 临时解决方法
在修复代码之前，可以尝试：
1. 让所有用户刷新页面
2. 确保所有用户都点击一次页面（激活 AudioContext）
3. 由一个指定的用户控制播放

## 需要修改的文件
1. `opendaw-collab-mvp/src/websocket/MessageTypes.ts` - 添加播放消息类型
2. `openDAW/studio/src/service/Shortcuts.ts` - 修改播放控制逻辑
3. `openDAW/studio/src/collaboration/CollaborationManager.ts` - 添加播放消息处理
4. `opendaw-collab-mvp/src/websocket/WSServer.ts` - 确保服务器转发播放消息 