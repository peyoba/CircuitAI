# 🚀 CircuitAI 部署指南

## 📋 部署架构

CircuitAI 采用现代化的 JAMstack 架构：

- **前端**: React + TypeScript → Cloudflare Pages（自动部署）
- **后端**: Cloudflare Workers（手动部署）
- **部署方式**: GitHub Actions + Wrangler CLI

## 🎯 快速部署流程

### 第1步：准备GitHub仓库

确保代码已推送到GitHub：
```bash
git add .
git commit -m "feat: 准备部署到生产环境"
git push origin master
```

### 第2步：配置Cloudflare Workers（后端API）

#### 安装和登录Wrangler
```bash
# 全局安装 wrangler（如果还没有）
npm install -g wrangler

# 登录Cloudflare
wrangler login
```

#### 部署Workers
```bash
cd workers
npm install
wrangler deploy
```

部署后会得到Workers URL：`https://circuitai-api.peyoba660703.workers.dev`

### 第3步：配置GitHub Actions（前端自动部署）

#### 设置GitHub Secrets

在GitHub仓库设置中添加以下secrets：

1. 访问：`https://github.com/peyoba/CircuitAI/settings/secrets/actions`
2. 添加secrets：
   ```
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   ```

#### 获取Cloudflare API Token
1. 访问：https://dash.cloudflare.com/profile/api-tokens
2. 创建Token，权限包括：
   - Zone:Zone:Read
   - Zone:Page Rules:Edit  
   - Zone:Zone Settings:Edit
   - Zone:Analytics:Read
   - Account:Cloudflare Pages:Edit

### 第4步：自动化部署

#### 前端自动部署
- **触发条件**：推送到`master`分支
- **部署目标**：Cloudflare Pages
- **访问地址**：https://circuitai.pages.dev 和 https://circuitai.top

```bash
# 触发前端自动部署
git push origin master
```

#### Workers手动部署
```bash
cd workers
wrangler deploy
```

## 🎉 部署完成

部署完成后，可以通过以下地址访问：

- **生产网站**: https://circuitai.top
- **备用地址**: https://circuitai.pages.dev  
- **API地址**: https://circuitai-api.peyoba660703.workers.dev

## 🔧 部署管理

### 查看部署状态
```bash
# 查看Pages项目
wrangler pages project list

# 查看Workers状态
wrangler tail circuitai-api

# 查看Pages部署历史
wrangler pages deployment list --project-name=circuitai
```

### 更新部署

#### 更新前端
- 直接推送代码到GitHub master分支即可自动部署
- GitHub Actions会自动构建并部署到Cloudflare Pages

#### 更新后端
```bash
cd workers
# 修改代码后
wrangler deploy
```

## 📱 环境配置

### 生产环境变量

**Workers环境变量** (在wrangler.toml中):
```toml
[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "*"
```

**前端环境检测** (自动配置):
- 本地开发：`http://localhost:3003/api`
- 生产环境：`https://circuitai-api.peyoba660703.workers.dev/api`

## 🚨 故障排除

### 常见问题

1. **GitHub Actions失败**
   - 检查Secrets配置
   - 确认Cloudflare API Token权限
   - 查看Actions日志详细错误

2. **Workers部署失败**  
   - 检查wrangler.toml配置
   - 确认登录状态：`wrangler whoami`
   - 更新wrangler：`npm install -g wrangler@latest`

3. **前端访问API失败**
   - 检查CORS配置
   - 确认Workers API正常：`curl https://circuitai-api.peyoba660703.workers.dev/api/health`
   - 检查浏览器网络面板错误

### 调试命令

```bash
# 本地测试Workers
cd workers
wrangler dev

# 查看Workers实时日志
wrangler tail circuitai-api

# 测试API健康状态
curl https://circuitai-api.peyoba660703.workers.dev/api/health

# 检查前端构建
npm run build:frontend
```

## 💰 成本说明

**完全免费**，在免费限额内：
- **Cloudflare Pages**: 无限制静态页面
- **Cloudflare Workers**: 10万请求/天
- **GitHub Actions**: 2000分钟/月

## 🔐 安全注意事项

1. **API Token安全**
   - 定期轮换Cloudflare API Token
   - 最小权限原则设置Token权限

2. **CORS配置**
   - Workers已配置允许的域名
   - 生产环境避免使用通配符`*`

3. **环境隔离**  
   - 生产和开发环境严格隔离
   - 敏感配置通过环境变量管理

---

## 📞 部署支持

### 部署流程总结
1. ✅ Workers手动部署（后端API）
2. ✅ GitHub推送触发自动部署（前端）
3. ✅ 通过自定义域名访问

### 获取帮助
- GitHub Issues: 报告部署问题
- Cloudflare文档: 查看官方指南
- 项目文档: 查看CLAUDE.md获取更多信息

*本部署指南确保CircuitAI的ASCII电路图修复能够快速上线到生产环境。*
