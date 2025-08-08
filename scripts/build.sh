#!/bin/bash

# CircuitsAI 构建脚本

echo "🏗️  开始构建 CircuitsAI..."

# 清理之前的构建
echo "🧹 清理之前的构建文件..."
rm -rf frontend/dist
rm -rf backend/dist

# 构建共享模块
echo "📦 构建共享模块..."
cd shared && npm run build && cd ..

# 构建后端
echo "⚙️  构建后端..."
cd backend && npm run build && cd ..

# 构建前端
echo "🎨 构建前端..."
cd frontend && npm run build && cd ..

echo "✅ 构建完成！"
echo "📁 前端构建文件: frontend/dist"
echo "📁 后端构建文件: backend/dist"