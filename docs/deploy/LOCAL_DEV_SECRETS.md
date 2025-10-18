# 本地开发注入密钥指南（Workers）

本文档指导你在本地开发环境为 Cloudflare Workers 注入 AI 密钥，支持两种模式：本地模式（.dev.vars）与远程模式（Cloudflare Secrets）。

## 前提

- 目录：在仓库根目录有 `workers/` 子项目
- 已安装 Wrangler（推荐 v4+）
  ```bash
  npm i -g wrangler
  ```

## 方式一：本地模式（.dev.vars）

适合离线或不依赖 Cloudflare 账号的场景。密钥仅保存在本地文件，不会提交到仓库。

1) 在 `workers/` 目录创建 `.dev.vars`：
   ```
   DEFAULT_GEMINI_API_KEY="在此粘贴你的密钥"
   ```

2) 确保该文件不会被提交（本仓库已在 .gitignore 中忽略 `workers/.dev.vars`）

3) 启动本地 Workers（端口固定为 3003，便于与前端联调）：
   ```bash
   cd workers
   npm run dev:local
   # 等价于：wrangler dev --local --port=3003
   ```

4) 验证：
   ```bash
   curl http://127.0.0.1:3003/api/health
   ```

备注：
- 后端会通过 `c.env.DEFAULT_GEMINI_API_KEY` 读取你的密钥。
- 前端在开发环境会请求 `http://localhost:3003/api`，可直接联调。

## 方式二：远程模式（Cloudflare Secrets）

适合你已经登录 Cloudflare，并希望 dev 时直接使用云端密钥。

1) 登录 Cloudflare 并进入 workers 目录：
   ```bash
   cd workers
   wrangler login
   ```

2) 注入 Secret（按提示粘贴你的密钥）：
   ```bash
   wrangler secret put DEFAULT_GEMINI_API_KEY
   ```

3) 启动 dev（使用远程运行环境，端口同样映射到本地 3003）：
   ```bash
   npm run dev:remote
   # 等价于：wrangler dev --remote --port=3003
   ```

4) 验证：
   ```bash
   curl http://127.0.0.1:3003/api/health
   ```

## 常见问题

- 提示“系统未配置默认AI密钥”
  - 本地模式：检查 `workers/.dev.vars` 是否存在且键名正确；是否使用了 `npm run dev:local`
  - 远程模式：确认已 `wrangler secret put DEFAULT_GEMINI_API_KEY`，并使用 `npm run dev:remote`

- 前端请求不到后端
  - 确保 Workers 监听在 3003 端口（本仓库提供的脚本已固定端口）
  - 启动命令参考：
    - 本地：`npm run dev:local`
    - 远程：`npm run dev:remote`

- 如何切换模式
  - 本地模式：`npm run dev:local`
  - 远程模式：`npm run dev:remote`

## 相关脚本（workers/package.json）

```json
{
  "scripts": {
    "dev": "wrangler dev --port=3003",
    "dev:local": "wrangler dev --local --port=3003",
    "dev:remote": "wrangler dev --remote --port=3003"
  }
}
```

现在你可以安全且便捷地在本地注入密钥并进行联调了。