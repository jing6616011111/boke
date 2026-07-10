# 我的博客

一个自用的 Next.js + Markdown 个人博客系统。文章以 Markdown 文件存放在 `content/posts/`，后台通过网页界面直接读写文件，适合部署在自己的 VPS 上长期运行。

## Getting Started

先配置 `.env.local`：

```bash
ADMIN_USERNAME=your-name
ADMIN_PASSWORD_HASH=your-bcrypt-hash
JWT_SECRET=change-me-to-a-long-random-secret
```

生成 bcrypt 密码哈希：

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('你的密码', 12).then(console.log)"
```

安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。后台地址是 `/login`，登录后进入 `/admin`。

## 功能

- 首页文章列表、文章详情页、标签页
- 站内搜索，匹配标题、标签、摘要和 Markdown 正文
- 单管理员登录，使用 bcrypt 密码哈希和 httpOnly JWT cookie
- 后台文章列表、新建、编辑、删除、发布/草稿切换
- Markdown textarea 编辑器和实时预览
- Markdown + GFM 渲染，代码块使用 Shiki 高亮

## 内容格式

文章文件位于 `content/posts/*.md`：

```md
---
title: "文章标题"
slug: "post-slug"
date: "2026-07-10"
tags: ["Next.js", "随笔"]
excerpt: "摘要"
published: true
---

正文 Markdown
```

## 验证

```bash
npm test
npm run lint
npm run build
```

## VPS 部署

项目已配置 `output: "standalone"`。推荐直接在 VPS 上构建并用 PM2 管理 Node 进程：

```bash
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r content .next/standalone/content
cd .next/standalone
PORT=3000 pm2 start server.js --name personal-blog
```

Nginx 反向代理示例：

```nginx
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

部署后，`content/posts/` 是后台写入文章的持久化目录。备份时优先备份 `content/` 和 `.env.local`。

## 常用脚本

```bash
npm run dev
npm test
npm run lint
npm run build
npm start
```
