# Cloudflare Pages GitHub自动部署配置指南

## ✅ 已完成：代码已推送到GitHub

- **仓库地址**: https://github.com/peyoba/CircuitAI.git
- **分支**: master
- **最新提交**: a45d2ab - 添加对话记忆功能、SEO优化和站点地图

## 🚀 接下来配置Cloudflare Pages自动部署

### 步骤1：进入Cloudflare Pages控制台
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的账户
3. 转到 **Pages** 部分

### 步骤2：连接GitHub仓库
1. 点击 **"Create a project"** 或 **"Connect to Git"**
2. 选择 **GitHub**
3. 授权Cloudflare访问您的GitHub账户
4. 选择仓库: **peyoba/CircuitAI**

### 步骤3：配置构建设置
```
项目名称: circuitai
生产分支: master
构建命令: cd frontend && npm install && npm run build
构建输出目录: frontend/dist
环境变量: (暂时不需要)
```

### 步骤4：配置自定义域名
在项目设置中添加：
- **主域名**: circuitai.top
- **www域名**: www.circuitai.top

### 步骤5：配置DNS
在您的域名注册商处设置：
```
A记录: circuitai.top -> Cloudflare Pages IP
CNAME记录: www.circuitai.top -> circuitai.pages.dev
```

## 📋 配置检查清单

- [ ] GitHub仓库已连接
- [ ] 构建设置正确配置
- [ ] 自定义域名已添加
- [ ] DNS记录已配置
- [ ] SSL证书已生成
- [ ] 首次部署成功

## 🔄 自动部署流程

配置完成后：
1. **代码推送** → GitHub仓库
2. **自动触发** → Cloudflare Pages构建
3. **自动部署** → 生产环境
4. **通知完成** → 部署状态

## ⚠️ 重要注意事项

1. **停用手动部署**：删除本地的wrangler pages deploy命令
2. **分支保护**：确保只有经过审核的代码才能合并到master
3. **环境变量**：在Cloudflare Pages控制台配置，而不是代码中
4. **构建日志**：定期检查构建日志确保无错误

## 🎯 预期结果

- ✅ 每次Git推送自动部署
- ✅ 构建失败时邮件通知
- ✅ 部署历史记录可查看
- ✅ 回滚功能可用
- ✅ 团队协作更顺畅
