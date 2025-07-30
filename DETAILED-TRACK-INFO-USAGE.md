# 详细轨道信息功能使用说明

## 功能说明

我已经在 `synxsphere-integration.ts` 中添加了 `printDetailedTrackInfo` 函数，它可以打印所有轨道的详细信息，包括：

- **AudioUnit** 信息（UUID、名称）
- **MIDI Effects** 设备（名称、类型、UUID、启用状态）
- **Audio Effects** 设备（名称、类型、UUID、启用状态）
- **Tracks** 信息（名称、UUID、类型、索引、启用状态）
- **Clips** 信息（名称、UUID、类型、索引、静音状态、持续时间）
- **Regions** 信息（名称、UUID、类型、位置、持续时间、静音状态）

## 自动调用

该函数会在以下情况自动调用：

1. **项目从 Bundle 加载成功后** - 延迟 1.5 秒自动打印
2. **项目从 JSON 加载成功后** - 延迟 1.5 秒自动打印

## 手动调用

您也可以在浏览器控制台手动调用：

```javascript
// 在控制台输入
printDetailedTrackInfo()
```

## 输出示例

```
==================================================
🎵 详细轨道信息（包括 Clips、Regions 和设备）
==================================================

📦 找到 3 个 AudioUnit

🎛️ AudioUnit #0: Master
   UUID: 12345678-1234-1234-1234-123456789012

   🎹 MIDI Effects (2):
      1. Arpeggiator
         Type: ArpeggioDeviceBox
         UUID: 23456789-2345-2345-2345-234567890123
         Enabled: true
      2. Pitch Shifter
         Type: PitchDeviceBox
         UUID: 34567890-3456-3456-3456-345678901234
         Enabled: false

   🔊 Audio Effects (1):
      1. Reverb
         Type: ReverbDeviceBox
         UUID: 45678901-4567-4567-4567-456789012345
         Enabled: true

   📍 Tracks (2):

   📍 Track #0: Lead Synth
      UUID: 56789012-5678-5678-5678-567890123456
      Type: Notes
      Index: 0
      Enabled: true

      🎬 Clips: None

      🎵 Regions (1):
         1. Intro Melody
            UUID: 67890123-6789-6789-6789-678901234567
            Type: NoteRegionBox
            Position: 0
            Duration: 7680
            Muted: false

   📍 Track #1: Drums
      UUID: 78901234-7890-7890-7890-789012345678
      Type: Audio
      Index: 1
      Enabled: true

      🎬 Clips (2):
         1. Kick Pattern
            UUID: 89012345-8901-8901-8901-890123456789
            Type: AudioClipBox
            Index: 0
            Muted: false
            Duration: 1920

      🎵 Regions: None

==================================================
📊 总计:
   🎛️ AudioUnits: 3
   📍 Tracks: 5
   🎬 Clips: 8
   🎵 Regions: 12
   🎹 Devices: 6
==================================================
```

## 用于调试权限系统

这个功能特别有用于调试轨道权限系统，因为它会显示：

1. 每个 Track 的 UUID（用于权限检查）
2. 每个 Clip/Region 的 UUID（用于追踪修改）
3. 每个设备的 UUID（用于设备权限管理）

您可以使用这些 UUID 来：
- 验证权限表中的记录
- 追踪哪个 Box 属于哪个 Track
- 调试权限检查逻辑 

## 修复记录

### 问题1：`adapters.values is not a function`
- **原因**：错误地使用了 `.adapters.values()` 
- **修复**：改为使用 `.adapters()`，这是正确的方法来获取适配器数组

### 问题2：`UUID is not defined`
- **原因**：`UUID.toString()` 需要从 'std' 库导入 UUID
- **修复**：使用已有的 `safeUuid()` 辅助函数，它能智能地从各种 Box 对象中提取 UUID 字符串

### 问题3：`audioUnitAdapter.tracks.adapters is not a function`
- **原因**：`AudioUnitTracks` 类使用 `.values()` 而不是 `.adapters()` 方法
- **修复**：将 `audioUnitAdapter.tracks.adapters()` 改为 `audioUnitAdapter.tracks.values()`

### 问题4：`trackAdapter.regions.adapters is not a function`
- **原因**：`trackAdapter.regions.adapters` 是一个属性（getter），返回 `SortedSet` 对象
- **修复**：需要调用 `SortedSet` 的 `values()` 方法：`trackAdapter.regions.adapters.values()`

### 问题5：UUID 显示为对象而不是字符串
- **原因**：UUID 在 OpenDAW 中可能是 Uint8Array 或其他对象格式
- **修复**：使用 `uuidToString` 辅助函数统一转换所有 UUID 为字符串格式
- **改进**：现在所有的 UUID 都会显示为标准的字符串格式（如 `12345678-1234-1234-1234-123456789012`）

### API 总结（更新）
- `rootBoxAdapter.audioUnits.adapters()` - 获取所有 AudioUnit 适配器
- `audioUnitAdapter.midiEffects.adapters()` - 获取 MIDI 效果设备
- `audioUnitAdapter.audioEffects.adapters()` - 获取音频效果设备
- `audioUnitAdapter.tracks.values()` - 获取轨道适配器（注意是 values 不是 adapters）
- `trackAdapter.clips.collection.adapters()` - 获取 Clip 适配器
- `trackAdapter.regions.adapters.values()` - 获取 Region 适配器（注意是 adapters.values()）

### 当前状态
函数现在应该可以正常工作。在浏览器控制台运行 `printDetailedTrackInfo()` 即可查看详细的轨道信息。所有的 UUID 都会以字符串格式显示。 