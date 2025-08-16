@echo off
echo 🚀 启动CircuitAI开发环境...
echo.

echo 📦 检查依赖安装...
if not exist "node_modules" (
    echo 安装根目录依赖...
    npm install
)

if not exist "frontend\node_modules" (
    echo 安装前端依赖...
    cd frontend && npm install && cd ..
)

if not exist "backend\node_modules" (
    echo 安装后端依赖...
    cd backend && npm install && cd ..
)

echo.
echo 🔧 启动服务...
echo 前端: http://localhost:3002
echo 后端: http://localhost:3003
echo.

start "CircuitAI Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
start "CircuitAI Frontend" cmd /k "cd frontend && npm run dev"

echo ✅ 服务启动中...
echo 请等待几秒钟让服务完全启动
pause