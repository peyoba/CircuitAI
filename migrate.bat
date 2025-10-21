@echo off
echo 🚀 CircuitAI 迁移脚本 - Cloudflare to Vercel
echo =============================================

REM 检查环境
echo 📋 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)

REM 安装 Vercel CLI
echo 📦 安装 Vercel CLI...
npm install -g vercel

REM 构建项目
echo 🔨 构建项目...
npm run build

if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

REM 部署到 Vercel
echo 🚀 开始部署到 Vercel...
echo 请按照提示登录 Vercel 账号并配置项目

vercel --prod

echo ✅ 迁移完成！
echo 📌 下一步：
echo    1. 在 Vercel 控制台配置自定义域名
echo    2. 更新 DNS 记录
echo    3. 测试所有功能
echo    4. 更新环境变量（API密钥等）

pause