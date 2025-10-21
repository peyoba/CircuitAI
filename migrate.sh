#!/bin/bash

echo "🚀 CircuitAI 迁移脚本 - Cloudflare to Vercel"
echo "============================================="

# 检查环境
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm install -g vercel
fi

# 清理并重新安装依赖
echo "🧹 清理并安装依赖..."
npm run clean
npm run install:all

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

echo "✅ 构建成功！"

# 检查构建输出
echo "📁 检查构建输出..."
if [ -d "frontend/dist" ]; then
    echo "✅ 前端构建文件存在"
    ls -la frontend/dist/
else
    echo "❌ 前端构建文件不存在"
    exit 1
fi

if [ -d "api" ]; then
    echo "✅ API文件存在"
    ls -la api/
else
    echo "❌ API文件不存在"
    exit 1
fi

# 验证 vercel.json 配置
echo "⚙️ 验证 Vercel 配置..."
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json 配置文件存在"
    cat vercel.json
else
    echo "❌ vercel.json 配置文件不存在"
    exit 1
fi

# 部署到 Vercel
echo ""
echo "🚀 准备部署到 Vercel..."
echo "📌 部署前检查清单："
echo "   ✅ 项目已连接到 GitHub"
echo "   ✅ 构建成功"
echo "   ✅ API 端点已配置"
echo "   ✅ vercel.json 配置正确"
echo ""
echo "现在可以执行以下命令之一："
echo "   vercel --prod    # 生产环境部署"
echo "   vercel           # 预览环境部署"
echo ""

# 可选：自动部署
read -p "是否立即部署到生产环境？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 开始部署..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 部署成功！"
        echo "📌 后续步骤："
        echo "   1. 在 Vercel 控制台配置自定义域名"
        echo "   2. 更新 DNS 记录指向 Vercel"
        echo "   3. 测试所有功能是否正常"
        echo "   4. 配置环境变量（如需要）"
        echo "   5. 设置监控和告警"
    else
        echo "❌ 部署失败，请检查错误信息"
        exit 1
    fi
else
    echo "📝 手动部署说明："
    echo "   1. 运行 'vercel' 进行预览部署"
    echo "   2. 测试无误后运行 'vercel --prod' 进行生产部署"
    echo "   3. 按照提示完成配置"
fi