# CircuitsAI Cloudflare 部署指南

## 🚀 方案选择

### 推荐方案：Cloudflare Pages + Workers

- **前端**: Cloudflare Pages (免费) - **自动从GitHub部署**
- **后端**: Cloudflare Workers (免费额度 10万请求/月)
- **数据库**: D1 Database (免费额度 500万读取/月)

## 📋 部署步骤

### 1. 前端部署 (Cloudflare Pages) - GitHub自动部署

**重要**: Cloudflare Pages直接从GitHub仓库自动构建和部署，无需本地构建！

```bash
# 1. 推送最新代码到GitHub（这会触发自动部署）
git add .
git commit -m "更新前端代码"
git push origin master

# 2. 在Cloudflare Dashboard中配置（只需配置一次）：
# - 访问 https://dash.cloudflare.com/
# - 选择 "Pages" 
# - 点击 "Connect to Git"
# - 选择GitHub仓库: peyoba/CircuitAI
# - 构建命令: npm run build:frontend
# - 发布目录: frontend/dist
# - 环境变量：NODE_VERSION=18
```

**部署流程**：
1. 推送代码到GitHub master分支
2. Cloudflare Pages自动检测到更新
3. 在Cloudflare环境中执行 `npm run build:frontend`
4. 自动发布到生产环境

**当前状态**：
- ✅ GitHub代码已推送 (最新提交: d4db9ea)
- ✅ Cloudflare Pages会自动检测并部署

### 2. 后端部署 (Cloudflare Workers)

```bash
# 1. 安装Wrangler CLI
npm install -g wrangler

# 2. 登录Cloudflare
wrangler login

# 3. 部署Worker（从项目根目录）
cd workers
npm run deploy
```

**当前状态**：
- ✅ Workers已部署成功
- ✅ API地址: https://circuitai-api.peyoba660703.workers.dev
- ✅ 版本ID: 37d4259b-535e-4644-8745-0752ae134b67

### 3. 配置环境变量

#### Cloudflare Pages 环境变量
在 Cloudflare Dashboard > Pages > CircuitAI > Settings > Environment variables：

```
NODE_VERSION=18
VITE_API_URL=https://circuitai-api.peyoba660703.workers.dev
```

#### Cloudflare Workers 环境变量
在 `workers/wrangler.toml`：

```toml
[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "*"
```

### 4. 验证部署

```bash
# 检查Workers状态
curl https://circuitai-api.peyoba660703.workers.dev/api/health

# 检查前端页面（需要等待Cloudflare Pages构建完成）
# https://circuitai.pages.dev（或自定义域名）
```

## 🔄 更新部署

### 前端更新
```bash
git add .
git commit -m "前端功能更新"
git push origin master
# Cloudflare Pages会自动构建和部署
```

### 后端更新
```bash
cd workers
npm run deploy
```

## 📊 部署记录

### 最新部署状态 (2025-08-27)
- **Workers**: ✅ 已部署 (Version: 37d4259b)
- **前端**: ⏳ GitHub代码已推送，等待Cloudflare Pages自动构建
- **API地址**: https://circuitai-api.peyoba660703.workers.dev

### 部署历史
- 2025-08-27 12:59: Workers部署成功，修复ESLint问题和优化AI服务
- 2025-08-27 12:58: 推送最新代码到GitHub，包含代码质量修复

## 🛠️ 故障排除

### 前端部署问题
- 检查Cloudflare Pages构建日志
- 确认构建命令：`npm run build:frontend`
- 确认发布目录：`frontend/dist`

### Workers部署问题
- 确认wrangler已登录：`wrangler whoami`
- 检查wrangler.toml配置
- 查看部署日志：`wrangler tail`

### API连接问题
- 确认CORS配置
- 检查API地址配置
- 验证Workers健康检查端点