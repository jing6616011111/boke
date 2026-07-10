import { describe, expect, it } from "vitest";
import type { Post } from "./types";
import { searchPosts } from "./search-index";

const posts: Post[] = [
  {
    title: "Next.js 部署记录",
    slug: "next-deploy",
    date: "2026-07-02",
    tags: ["Next.js", "VPS"],
    excerpt: "把博客发布到自己的服务器。",
    published: true,
    content: "使用 PM2 和 Nginx 管理 standalone 输出。",
  },
  {
    title: "日常笔记",
    slug: "daily-notes",
    date: "2026-07-03",
    tags: ["随笔"],
    excerpt: "记录一些读书想法。",
    published: true,
    content: "今天主要整理 Markdown 写作流程。",
  },
  {
    title: "未发布草稿",
    slug: "draft",
    date: "2026-07-04",
    tags: ["草稿"],
    excerpt: "草稿内容。",
    published: false,
    content: "这个不应该出现在搜索结果里。",
  },
];

describe("searchPosts", () => {
  it("matches title, tags, excerpt, and markdown content without returning drafts", () => {
    expect(searchPosts(posts, "nginx").map((post) => post.slug)).toEqual(["next-deploy"]);
    expect(searchPosts(posts, "vps").map((post) => post.slug)).toEqual(["next-deploy"]);
    expect(searchPosts(posts, "读书").map((post) => post.slug)).toEqual(["daily-notes"]);
    expect(searchPosts(posts, "草稿")).toEqual([]);
  });

  it("returns more relevant title matches before body-only matches", () => {
    expect(searchPosts(posts, "笔记").map((post) => post.slug)).toEqual(["daily-notes"]);
  });
});
