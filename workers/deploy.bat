@echo off
:: CircuitAI Workers 部署脚本 (Windows版本)
:: 用于快速部署后端API到Cloudflare Workers

echo 🚀 开始部署 CircuitAI Workers API...

:: 检查是否在正确的目录
if not exist wrangler.toml (
    echo ❌ 错误：请在workers目录中运行此脚本
    pause
    exit /b 1
)

:: 检查Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

:: 安装依赖
echo 📦 安装依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

:: 检查wrangler登录状态
echo 🔐 检查Cloudflare登录状态...
npx wrangler whoami >nul 2>nul
if errorlevel 1 (
    echo ❌ 未登录Cloudflare，请先运行: npx wrangler login
    pause
    exit /b 1
)

:: 部署Workers
echo 🚀 部署到Cloudflare Workers...
npx wrangler deploy
if errorlevel 1 (
    echo ❌ 部署失败
    pause
    exit /b 1
)

echo.
echo ✅ 部署完成！
echo 🌐 API地址: https://circuitai-api.peyoba660703.workers.dev
echo 🔧 查看日志: npx wrangler tail circuitai-api  
echo 🧪 测试健康状态: powershell -Command "Invoke-RestMethod 'https://circuitai-api.peyoba660703.workers.dev/api/health'"
echo.
pause