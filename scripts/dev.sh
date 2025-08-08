#!/bin/bash

# CircuitsAI 开发启动脚本

echo "🚀 启动 CircuitsAI 开发环境..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 检查必要的环境变量
if [ ! -f "backend/.env" ]; then
    echo "⚠️  后端环境文件不存在，正在复制示例文件..."
    cp backend/.env.example backend/.env
    echo "✅ 请编辑 backend/.env 文件配置必要的环境变量"
fi

# 创建日志目录
mkdir -p backend/logs

# 启动开发服务器
echo "🔧 启动前后端开发服务器..."
npm run dev