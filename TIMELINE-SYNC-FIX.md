# Timeline Sync修复指南

## 问题诊断

当前存在两个问题：
1. Timeline Sync未初始化（"updatesync完全没有了"）
2. projectBundle字段仍为NULL

## 已完成的修复

### 1. 修复了Timeline Sync初始化逻辑
- 原问题：条件判断`!wsClient.isConnected`导致初始化被跳过
- 修复：改为`wsClient.isConnected`，确保WebSocket连接后初始化
- 在两个地方添加了初始化：
  - BoxGraph加载后
  - WebSocket创建并连接后

### 2. 添加了详细日志
所有关键步骤都添加了console.log

## 测试步骤

### 1. 重启Docker容器
```bash
docker-compose -f docker-compose.dev.yml restart opendaw
```

### 2. 清除浏览器缓存
- Chrome: Ctrl+Shift+Delete → 清除缓存
- 或使用隐身模式

### 3. 加入房间并检查控制台
应该看到以下日志序列：
```
[SyncSphere] Initializing Timeline Update Sync...
[SyncSphere] Creating Timeline Update Sync...
[SyncSphere] Starting timeline synchronization...
[SyncSphere] ✅ Timeline Update Sync initialized successfully
```

### 4. 在控制台运行状态检查
复制粘贴以下代码到浏览器控制台：
```javascript
// 检查Timeline Sync状态
function checkStatus() {
    console.log('Timeline Sync:', !!window.syncSphereTimelineSync);
    console.log('WebSocket:', !!window.wsClient);
    if (window.syncSphereTimelineSync) {
        const boxCount = Array.from(window.syncSphereTimelineSync.service.project.boxGraph.boxes()).length;
        console.log('Box count:', boxCount);
    }
}
checkStatus();
```

### 5. 拖入轨道后检查日志
应该看到：
```
[UpdateSync] Local update detected: ...
[UpdateSync] handleLocalUpdate called
[UpdateSync] Current box count: 7, hasInitialContentSaved: false
[UpdateSync] 🎯 First content created, triggering BoxGraph save...
[UpdateSync] 🔥 Executing saveBoxGraphToServer...
[UpdateSync] 🚀 saveBoxGraphToServer called
```

### 6. 手动保存BoxGraph（如果自动保存失败）
```javascript
await window.syncSphereTimelineSync.triggerBoxGraphSave()
```

### 7. 验证数据库
```bash
docker exec -it opendaw_synxsphere_dev sh -c "cd /app && node check-project-bundle.js"
```

## 常见问题解决

### Q: Timeline Sync仍然未初始化
A: 检查是否有错误日志：
```
[SyncSphere] ❌ Failed to initialize Timeline Sync
```
如果有，查看具体错误信息

### Q: handleLocalUpdate没有被调用
A: 可能是subscribeToAllUpdates失败。检查：
1. BoxGraph是否正确初始化
2. 是否有其他错误阻止了订阅

### Q: saveBoxGraphToServer被调用但失败
A: 检查：
1. Network标签中的PUT请求
2. 响应状态码
3. 是否有CORS错误
4. Token是否有效

## 紧急修复脚本

如果Timeline Sync未初始化，在控制台运行：
```javascript
// 手动初始化Timeline Sync
async function emergencyInit() {
    if (window.syncSphereTimelineSync) {
        console.log('Already initialized');
        return;
    }
    
    const service = window.studioService;
    const wsClient = window.wsClient;
    
    if (!service || !wsClient) {
        console.error('Missing dependencies');
        return;
    }
    
    try {
        const timelineSync = new UpdateBasedTimelineSync(service, wsClient);
        await timelineSync.start();
        window.syncSphereTimelineSync = timelineSync;
        console.log('✅ Emergency init successful');
    } catch (error) {
        console.error('Emergency init failed:', error);
    }
}

emergencyInit();
```

## 下一步

如果问题仍然存在，请提供：
1. 完整的控制台日志
2. Network标签中的请求/响应
3. `checkStatus()`的输出结果 