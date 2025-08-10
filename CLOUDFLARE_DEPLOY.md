# CircuitsAI Cloudflare 部署指南

## 🚀 方案选择

### 推荐方案：Cloudflare Pages + Workers

- **前端**: Cloudflare Pages (免费)
- **后端**: Cloudflare Workers (免费额度 10万请求/月)
- **数据库**: D1 Database (免费额度 500万读取/月)

## 📋 部署步骤

### 1. 前端部署 (Cloudflare Pages)

```bash
# 1. 构建前端
npm run build:frontend

# 2. 推送到 GitHub
git add .
git commit -m "准备Cloudflare部署"
git push origin main

# 3. 在Cloudflare Dashboard操作：
# - 访问 https://dash.cloudflare.com/
# - 选择 "Pages" 
# - 点击 "Connect to Git"
# - 选择您的GitHub仓库
# - 构建命令: npm run build:frontend
# - 发布目录: frontend/dist
```

### 2. 后端部署 (Cloudflare Workers)

```bash
# 1. 安装Wrangler CLI
npm install -g wrangler

# 2. 登录Cloudflare
wrangler login

# 3. 创建D1数据库
wrangler d1 create circuitsai-db

# 4. 部署Worker
cd workers
wrangler deploy
```

### 3. 配置环境变量

在Cloudflare Workers Dashboard中设置：
- `OPENAI_API_KEY`: OpenAI API密钥
- `CLAUDE_API_KEY`: Claude API密钥
- `CORS_ORIGIN`: 前端域名

### 4. 更新前端API地址

在 `frontend/src/services/api.ts` 中：
```typescript
const API_BASE_URL = 'https://circuitsai-api.your-subdomain.workers.dev'
```

## 💰 成本估算

- **前端 (Pages)**: 完全免费
- **后端 (Workers)**: 
  - 免费额度: 10万请求/月
  - 超出后: $0.50 / 百万请求
- **数据库 (D1)**:
  - 免费额度: 500万读取/月，2.5万写入/月
  - 超出后: $0.001 / 1000次读取

## 🎯 预期效果

- ⚡ **访问速度**: 全球CDN，1-2秒加载
- 🔒 **安全性**: 自动HTTPS，DDoS防护
- 📈 **扩展性**: 自动伸缩，无需运维
- 💸 **成本**: 测试阶段完全免费

## 🔧 故障排除

### 常见问题：
1. **CORS错误**: 检查Worker中的CORS配置
2. **API调用失败**: 确认环境变量设置
3. **构建失败**: 检查Node.js版本兼容性

### 调试命令：
```bash
# 查看Worker日志
wrangler tail

# 本地测试Worker
wrangler dev

# 查看部署状态
wrangler deployments list
```

## 📞 支持

如遇问题，可以：
1. 查看Cloudflare文档: https://developers.cloudflare.com/
2. 检查项目issue: https://github.com/your-repo/issues
3. 联系开发团队
