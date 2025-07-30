# 测试 Box 所有权功能

## 功能概述

当用户创建新的 TrackBox 或 AudioUnitBox 时，系统会自动：
1. 检测到 `new` 类型的更新
2. 如果是 TrackBox 或 AudioUnitBox，将其 UUID 和用户 ID 发送到数据库
3. 在数据库中记录所有权信息
4. 通知其他客户端所有权变更

## 测试步骤

### 1. 准备工作

1. 确保数据库已应用最新的迁移（参见 `opendaw-collab-mvp/DATABASE_MIGRATION.md`）
2. 启动 WebSocket 服务器和 Next.js 服务器
3. 登录 OpenDAW

### 2. 测试创建 TrackBox

1. 在 OpenDAW 中创建一个新轨道
2. 观察控制台日志，应该看到：
   ```
   [UpdateSync] 🎯 New TrackBox detected, registering ownership...
   [UpdateSync] 📤 Registering TrackBox ownership: { projectId: ..., userId: ..., boxUuid: ... }
   [UpdateSync] ✅ TrackBox ownership registered successfully
   ```

3. 检查数据库：
   ```sql
   SELECT project_id, trackbox_uuid, owner_id, room_id, owned_at 
   FROM box_ownership WHERE trackbox_uuid IS NOT NULL;
   ```

### 3. 测试创建 AudioUnitBox

1. 在 OpenDAW 中创建一个新的音频单元
2. 观察控制台日志，应该看到类似的所有权注册消息
3. 检查数据库：
   ```sql
   SELECT project_id, audiounitbox_uuid, owner_id, room_id, owned_at 
   FROM box_ownership WHERE audiounitbox_uuid IS NOT NULL;
   ```

### 4. 测试权限检查

1. 用户 A 创建一个轨道
2. 切换到用户 B
3. 尝试修改用户 A 的轨道
4. 应该看到权限拒绝的提示

### 5. 验证 API 端点

使用 curl 或 Postman 测试 API：

```bash
# 获取项目的所有权信息
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/box-ownership?projectId=YOUR_PROJECT_ID

# 手动注册所有权（通常由系统自动完成）
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "userId": "YOUR_USER_ID",
    "boxType": "TrackBox",
    "boxUuid": "TRACK_UUID"
  }' \
  http://localhost:8000/api/box-ownership
```

## 调试提示

1. 在浏览器控制台中查看 `[UpdateSync]` 前缀的日志
2. 检查 WebSocket 服务器日志
3. 查看数据库中的 `box_ownership` 表
4. 确保认证令牌正确传递

## 已知限制

1. 目前只支持 TrackBox 和 AudioUnitBox 的所有权
2. 所有权一旦设置就不能更改（除非直接修改数据库）
3. 删除 Box 时不会自动清理所有权记录 