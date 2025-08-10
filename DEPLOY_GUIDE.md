# 🚀 CircuitsAI Cloudflare 部署指南

## 📋 部署前准备

### ✅ 必需账号
1. **GitHub账号** - 代码托管
2. **Cloudflare账号** (免费) - 部署平台

### ✅ 环境要求
- Node.js 18+
- Git
- 网络连接

## 🎯 快速部署步骤

### 第1步：准备GitHub仓库

```bash
# 1. 初始化Git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit for Cloudflare deployment"

# 2. 添加远程仓库
git remote add origin https://github.com/你的用户名/circuitsai.git
git push -u origin main
```

### 第2步：配置Cloudflare Pages

1. **登录Cloudflare Dashboard**
   - 访问: https://dash.cloudflare.com/
   - 注册/登录账号

2. **创建Pages项目**
   - 点击 "Pages" → "Create a project"
   - 选择 "Connect to Git"
   - 授权GitHub并选择你的仓库

3. **配置构建设置**
   ```
   项目名称: circuitsai
   生产分支: main
   构建命令: npm run build:frontend
   构建输出目录: frontend/dist
   ```

4. **环境变量**（可选）
   ```
   NODE_VERSION = 18
   NPM_VERSION = 9
   ```

### 第3步：配置Cloudflare Workers

1. **安装Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录Cloudflare**
   ```bash
   wrangler login
   ```

3. **部署Workers**
   ```bash
   cd workers
   npm install
   wrangler deploy
   ```

### 第4步：更新API地址

部署完成后，您会得到两个URL：
- **前端**: `https://circuitsai.pages.dev`
- **Workers**: `https://circuitsai-api.你的用户名.workers.dev`

更新以下文件中的API地址：

**frontend/src/services/api.ts**:
```typescript
return window.location.hostname === 'localhost' 
  ? 'http://localhost:3003/api'
  : 'https://circuitsai-api.你的用户名.workers.dev/api'
```

**workers/wrangler.toml**:
```toml
[vars]
CORS_ORIGIN = "https://circuitsai.pages.dev"
```

### 第5步：重新部署

```bash
# 提交更改
git add .
git commit -m "Update API URLs for production"
git push

# 重新部署Workers
cd workers
wrangler deploy
```

## 🎉 部署完成

您的应用现在应该可以通过以下地址访问：
- **前端**: https://circuitsai.pages.dev
- **API**: https://circuitsai-api.你的用户名.workers.dev

## 🔧 故障排除

### 常见问题

1. **构建失败**
   - 检查Node.js版本是否为18+
   - 确认所有依赖都已安装

2. **API调用失败**
   - 检查CORS配置
   - 确认Workers已正确部署
   - 验证API地址是否正确

3. **环境变量问题**
   - 在Cloudflare Dashboard中设置环境变量
   - 重新部署生效

### 调试命令

```bash
# 查看Workers日志
wrangler tail

# 本地测试Workers
wrangler dev

# 查看Pages构建日志
# 在Cloudflare Dashboard → Pages → 项目 → 部署历史
```

## 📞 支持

如遇问题：
1. 查看Cloudflare文档
2. 检查GitHub Actions日志
3. 联系开发团队

## 💰 成本说明

**完全免费**，直到超出以下限制：
- Pages: 无限制
- Workers: 10万请求/月
- D1数据库: 500万读取/月

超出后按使用量付费，成本极低。
