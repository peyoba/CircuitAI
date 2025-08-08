#!/bin/bash

# CircuitsAI 部署脚本

set -e

echo "🚀 开始部署 CircuitsAI..."

# 检查环境变量
if [ -z "$DEPLOY_ENV" ]; then
    echo "❌ 请设置 DEPLOY_ENV 环境变量 (staging/production)"
    exit 1
fi

echo "📦 部署环境: $DEPLOY_ENV"

# 运行测试
echo "🧪 运行测试..."
npm run test

# 运行代码检查
echo "🔍 运行代码检查..."
npm run lint

# 构建项目
echo "🏗️  构建项目..."
npm run build

# Docker 部署
echo "🐳 使用 Docker 部署..."
npm run docker:build
npm run docker:up

echo "✅ 部署完成！"
echo "🌐 应用已启动在: http://localhost:3000"