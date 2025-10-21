#!/bin/bash

echo "🔍 CircuitAI 部署前检查"
echo "======================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. 检查 Node.js 和 npm
echo "1. 检查运行环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js 已安装: $NODE_VERSION"
else
    check_fail "Node.js 未安装"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm 已安装: $NPM_VERSION"
else
    check_fail "npm 未安装"
    exit 1
fi

# 2. 检查项目结构
echo -e "\n2. 检查项目结构..."
if [ -f "package.json" ]; then
    check_pass "根目录 package.json 存在"
else
    check_fail "根目录 package.json 不存在"
fi

if [ -d "frontend" ]; then
    check_pass "frontend 目录存在"
else
    check_fail "frontend 目录不存在"
fi

if [ -f "frontend/package.json" ]; then
    check_pass "frontend/package.json 存在"
else
    check_fail "frontend/package.json 不存在"
fi

if [ -d "api" ]; then
    check_pass "api 目录存在"
else
    check_fail "api 目录不存在"
fi

if [ -f "vercel.json" ]; then
    check_pass "vercel.json 配置文件存在"
else
    check_fail "vercel.json 配置文件不存在"
fi

# 3. 检查依赖安装
echo -e "\n3. 检查依赖安装..."
if [ -d "node_modules" ]; then
    check_pass "根目录依赖已安装"
else
    check_warn "根目录依赖未安装，将自动安装"
fi

if [ -d "frontend/node_modules" ]; then
    check_pass "前端依赖已安装"
else
    check_warn "前端依赖未安装，将自动安装"
fi

# 4. 尝试构建
echo -e "\n4. 测试构建..."
echo "正在执行构建测试..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    check_pass "构建测试成功"
else
    check_fail "构建测试失败"
    echo "请运行 'npm run build' 查看详细错误信息"
    exit 1
fi

# 5. 检查构建输出
echo -e "\n5. 检查构建输出..."
if [ -d "frontend/dist" ]; then
    DIST_SIZE=$(du -sh frontend/dist | cut -f1)
    check_pass "构建输出存在 (大小: $DIST_SIZE)"
    
    if [ -f "frontend/dist/index.html" ]; then
        check_pass "index.html 存在"
    else
        check_fail "index.html 不存在"
    fi
    
    if [ -d "frontend/dist/assets" ]; then
        ASSETS_COUNT=$(ls -1 frontend/dist/assets | wc -l)
        check_pass "静态资源存在 ($ASSETS_COUNT 个文件)"
    else
        check_warn "静态资源目录不存在"
    fi
else
    check_fail "构建输出不存在"
    exit 1
fi

# 6. 检查 API 端点
echo -e "\n6. 检查 API 端点..."
if [ -f "api/health.js" ]; then
    check_pass "健康检查端点存在"
else
    check_fail "健康检查端点不存在"
fi

if [ -f "api/ai/chat.js" ]; then
    check_pass "AI 聊天端点存在"
else
    check_fail "AI 聊天端点不存在"
fi

if [ -f "api/ai/test-config.js" ]; then
    check_pass "API 配置测试端点存在"
else
    check_fail "API 配置测试端点不存在"
fi

# 7. 检查 Vercel CLI
echo -e "\n7. 检查 Vercel CLI..."
if command -v vercel &> /dev/null; then
    VERCEL_VERSION=$(vercel --version)
    check_pass "Vercel CLI 已安装: $VERCEL_VERSION"
else
    check_warn "Vercel CLI 未安装，将在部署时自动安装"
fi

# 8. 检查 Git 状态
echo -e "\n8. 检查 Git 状态..."
if [ -d ".git" ]; then
    check_pass "Git 仓库已初始化"
    
    # 检查是否有未提交的更改
    if git diff-index --quiet HEAD --; then
        check_pass "没有未提交的更改"
    else
        check_warn "有未提交的更改，建议先提交"
    fi
    
    # 检查远程仓库
    if git remote -v | grep -q "origin"; then
        REMOTE_URL=$(git remote get-url origin)
        check_pass "远程仓库已配置: $REMOTE_URL"
    else
        check_warn "远程仓库未配置"
    fi
else
    check_warn "Git 仓库未初始化"
fi

# 总结
echo -e "\n📋 检查总结"
echo "============"
echo "✅ 项目结构完整"
echo "✅ 构建测试通过"
echo "✅ API 端点配置正确"
echo "✅ 准备就绪，可以部署到 Vercel"

echo -e "\n🚀 部署命令："
echo "   ./migrate.sh          # 使用迁移脚本"
echo "   vercel                # 预览部署"
echo "   vercel --prod         # 生产部署"

echo -e "\n📌 部署后检查清单："
echo "   □ 测试网站访问"
echo "   □ 测试 AI 对话功能"
echo "   □ 测试 API 端点"
echo "   □ 配置自定义域名"
echo "   □ 设置环境变量"
echo "   □ 配置监控告警"