#!/bin/bash

# 启动实时协作测试脚本
echo "🚀 启动 SyncSphere 实时协作测试"
echo "=================================="

# 检查依赖
echo "📋 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 安装依赖（如果需要）
echo "📦 安装依赖..."
if [ ! -d "node_modules" ]; then
    npm install
fi

# 检查WebSocket依赖
if ! npm list ws &> /dev/null; then
    echo "📦 安装 WebSocket 依赖..."
    npm install ws uuid
fi

echo ""
echo "🧪 运行实时协作功能测试..."
echo "-----------------------------------"

# 运行测试
node test-realtime-collaboration.js

echo ""
echo "📊 测试完成！"
echo ""
echo "💡 完整协作测试步骤："
echo "   1. 启动服务器: npm run opendaw:start"
echo "   2. 启动协作服务器: cd opendaw-collab-mvp && npm start"
echo "   3. 在两个浏览器窗口中打开:"
echo "      - http://localhost:3000/studio/opendaw?projectId=test&userId=user1&collaborative=true"
echo "      - http://localhost:3000/studio/opendaw?projectId=test&userId=user2&collaborative=true"
echo ""
echo "🧪 测试功能:"
echo "   ✅ 轨道拖拽同步 (Mixer中拖拽Channel Strip)"
echo "   ✅ 音量调节同步 (调节Volume Slider)"
echo "   ✅ 声相调节同步 (调节Pan Knob)"
echo "   ✅ 30秒自动快照保存"
echo "   ✅ 刷新后状态恢复"
echo ""
echo "📝 数据库验证:"
echo "   - 打开 PostgreSQL: SELECT * FROM collaboration_events;"
echo "   - 事件数量应随操作递增"
echo ""
echo "🔍 调试指南:"
echo "   - 详细调试信息请查看: COLLABORATION-DEBUG-GUIDE.md"
echo "   - 打开浏览器开发者工具 (F12) 查看控制台日志"
echo "   - 寻找 [Mixer], [VolumeSlider], [WSServer] 等前缀的日志"
echo ""
echo "🚨 故障排除:"
echo "   - 如果没有拖拽日志：检查是否在 Mixer 中拖拽 Channel Strip 图标"
echo "   - 如果 WebSocket 连接失败：确保协作服务器已启动"
echo "   - 如果参数不同步：检查控制台是否有错误信息"