---
title: "关于这个博客的技术栈"
slug: "about-this-stack"
date: "2026-07-02"
tags: ["Next.js", "技术"]
excerpt: "这个博客用 Next.js App Router + Markdown 文件搭建,没有引入数据库。"
published: true
---

这个博客的架构很简单:

1. 文章以 Markdown 文件的形式存放在 `content/posts/` 目录下
2. 后台管理界面通过 API 直接读写这些文件
3. 搜索功能基于 FlexSearch 在内存中构建索引

## 代码高亮示例

```python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

支持 `行内代码` 和普通段落文字。
