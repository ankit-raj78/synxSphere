# Project Bundle 初始化问题分析

## 问题描述
Project bundle 有时会意外地被初始化（重置），导致用户丢失当前的工作进度。

## 根本原因
在 `openDAW/studio/src/synxsphere-integration.ts` 文件中，有**11处**调用 `service.cleanSlate()` 的地方，这个方法会创建一个全新的空项目。

## 触发初始化的场景

### 1. 强制项目创建（第266行）
```typescript
// FORCE PROJECT CREATION FIRST - ensure we always have a working project
console.log('🚀 FORCE PROJECT CREATION: Creating new project immediately')
service.cleanSlate()
```
**问题**：当检测到 roomId 和 userId 时，会立即创建新项目，不检查是否已有项目存在。

### 2. 没有音频文件时（第366行）
```typescript
console.warn('⚠️ No audio files found in database for room:', roomId)
// Create empty project
service.cleanSlate()
```

### 3. 获取音频文件失败时（第375行）
```typescript
console.error('❌ Failed to fetch audio files from database:', audioFilesResponse.status)
// Create empty project
service.cleanSlate()
```

### 4. 项目数据格式错误时（第440行）
```typescript
console.log('⚠️ Project bundle is not in ZIP format, skipping import')
console.log('📝 Creating new project instead')
service.cleanSlate()
```

### 5. 项目导入失败时（第487行）
```typescript
console.error('❌ Falling back to creating new project')
// Fall back to creating new project
service.cleanSlate()
```

### 6. 没有 BoxGraph 数据时（第499行）
```typescript
console.log('📊 No BoxGraph data found, creating new project')
service.cleanSlate() // This creates a fresh session
```

## 核心问题

1. **缺少项目存在性检查**：代码在多处直接调用 `cleanSlate()`，没有检查当前是否已有项目在编辑中。

2. **错误处理过于激进**：任何错误都会导致创建新项目，而不是保留现有项目。

3. **没有用户确认**：在重置项目前没有询问用户是否要保存当前工作。

## 建议的解决方案

### 1. 添加项目存在性检查
```typescript
// 在调用 cleanSlate() 前检查
const sessionOpt = service.sessionService.getValue()
if (sessionOpt.isEmpty()) {
    // 只有在没有现有项目时才创建新项目
    service.cleanSlate()
} else {
    console.log('✅ Project already exists, skipping cleanSlate')
}
```

### 2. 改进错误处理
- 不要在每个错误情况下都创建新项目
- 保持现有项目，只显示错误信息
- 让用户决定是否要创建新项目

### 3. 添加项目状态标志
```typescript
let projectLoadedFromBundle = false
// 在成功加载项目后设置为 true
// 在其他地方检查这个标志来避免重复初始化
```

### 4. 实现更智能的项目加载逻辑
- 首先尝试从数据库加载项目
- 如果失败，检查是否有本地项目
- 只有在确实没有项目时才创建新项目

## 临时解决方案

在修复代码之前，用户可以：
1. 定期手动保存项目
2. 避免刷新页面
3. 在加载房间前先导出项目备份

## 需要修改的文件
- `openDAW/studio/src/synxsphere-integration.ts` - 主要的初始化逻辑
- `openDAW/studio/src/service/StudioService.ts` - cleanSlate 方法的实现 