# 改进的日志功能说明

## UpdateBasedTimelineSync 日志改进

我已经改进了 `UpdateBasedTimelineSync.ts` 中的日志输出，现在会显示更详细的信息。

### 1. onUpdate 日志改进

现在每个更新都会显示：

```
==================================================
[UpdateSync] 📦 Local update detected!
[UpdateSync] Type: primitive
[UpdateSync] Box UUID: 12345678-1234-1234-1234-123456789012
[UpdateSync] Field: 2,0
[UpdateSync] Old Value: 0
[UpdateSync] New Value: 1920
==================================================
```

### 2. 权限检查流程日志

完整的权限检查流程现在会显示：

```
[PermissionCheck] Getting track UUID from update...
[PermissionCheck] Base UUID from primitive address: 12345678-1234-1234-1234-123456789012
[PermissionCheck] Found box: NoteRegionBox (12345678-1234-1234-1234-123456789012)
[PermissionCheck] Finding nearest TrackBox for: NoteRegionBox
[PermissionCheck]   Depth 0: NoteRegionBox (12345678-1234-1234-1234-123456789012)
[PermissionCheck]   Found NoteRegionBox, looking for parent TrackBox...
[PermissionCheck]   ✅ Found parent TrackBox: 87654321-4321-4321-4321-210987654321
[PermissionCheck] Nearest TrackBox UUID: 87654321-4321-4321-4321-210987654321
[UpdateSync] Track UUID found: 87654321-4321-4321-4321-210987654321
```

### 3. 不同更新类型的详细信息

#### NewUpdate (新建 Box)
- Box 名称
- Box UUID

#### PrimitiveUpdate (原始值更新)
- Box UUID
- 字段路径
- 旧值
- 新值

#### PointerUpdate (指针更新)
- Box UUID
- 字段路径
- 旧目标 UUID
- 新目标 UUID

#### DeleteUpdate (删除 Box)
- Box 名称
- Box UUID

### 4. UUID 格式统一

所有的 UUID 现在都会显示为标准字符串格式，例如：
- `12345678-1234-1234-1234-123456789012`

而不是：
- `[object Uint8Array]`
- `18,52,86,120,18,52,18,52,18,52,18,52,86,120,144,18`

### 5. 调试建议

1. **查看完整的更新流程**：观察从更新检测到权限检查的完整日志
2. **识别 Box 层级**：通过 depth 信息了解 Box 的嵌套关系
3. **追踪 UUID 映射**：查看哪个 Box 属于哪个 TrackBox
4. **权限检查结果**：观察权限是否被允许或拒绝

这些改进的日志将帮助您更好地调试轨道权限系统！ 