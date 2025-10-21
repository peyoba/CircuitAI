# GSC验证文件部署指南

## 步骤1：获取验证文件
1. 在GSC中选择"HTML文件"验证方法
2. 下载提供的HTML文件（如：google123abc.html）

## 步骤2：上传到项目
将下载的验证文件放到：
```
frontend/public/google123abc.html
```

## 步骤3：部署到Cloudflare Pages
```bash
# 进入前端目录
cd frontend

# 构建项目
npm run build

# 部署到Cloudflare Pages
cd ../
npx wrangler pages deploy frontend/dist --project-name circuitai --branch main
```

## 步骤4：验证
1. 访问 https://circuitai.top/google123abc.html 确认文件可访问
2. 在GSC中点击"验证"按钮

## 常见问题

### Q: 验证失败怎么办？
A: 
- 确认文件已正确部署
- 检查文件URL是否可访问
- 等待几分钟后重试

### Q: 站点地图提交后显示"无法获取"？
A: 
- 检查sitemap.xml文件格式
- 确认文件可以通过URL访问
- 验证XML语法是否正确

### Q: 多个域名怎么处理？
A: 
- 主域名：circuitai.top
- 备用域名：circuitai.pages.dev
- 分别添加为独立属性或使用域名属性
