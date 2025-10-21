#!/bin/bash

# CircuitAI Workers 部署脚本
# 用于快速部署后端API到Cloudflare Workers

set -e

echo "🚀 开始部署 CircuitAI Workers API..."

# 检查是否在正确的目录
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 错误：请在workers目录中运行此脚本"
    exit 1
fi

# 检查wrangler登录状态
echo "🔐 检查Cloudflare登录状态..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo "❌ 未登录Cloudflare，请先运行: wrangler login"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 验证配置
echo "🔍 验证配置文件..."
if ! npx wrangler validate; then
    echo "❌ wrangler.toml配置文件有误"
    exit 1
fi

# 部署Workers
echo "🚀 部署到Cloudflare Workers..."
npx wrangler deploy

echo "✅ 部署完成！"
echo "🌐 API地址: https://circuitai-api.peyoba660703.workers.dev"
echo "🔧 查看日志: wrangler tail circuitai-api"
echo "🧪 测试健康状态: curl https://circuitai-api.peyoba660703.workers.dev/api/health"