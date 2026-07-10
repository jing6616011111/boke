"use client";

import { useEffect, useState } from "react";
import type { Post, PostInput } from "@/lib/types";
import { parseTagInput } from "@/lib/post-form";

type EditorState = {
  title: string;
  slug: string;
  date: string;
  tags: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  content: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyEditorState(): EditorState {
  return {
    title: "",
    slug: "",
    date: today(),
    tags: "",
    excerpt: "",
    coverImage: "",
    published: false,
    content: "",
  };
}

function postToEditorState(post: Post): EditorState {
  return {
    title: post.title,
    slug: post.slug,
    date: post.date,
    tags: post.tags.join(", "),
    excerpt: post.excerpt,
    coverImage: post.coverImage ?? "",
    published: post.published,
    content: post.content,
  };
}

function toPayload(form: EditorState): PostInput {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    date: form.date,
    tags: parseTagInput(form.tags),
    excerpt: form.excerpt.trim() || undefined,
    coverImage: form.coverImage.trim() || undefined,
    published: form.published,
    content: form.content,
  };
}

export default function AdminDashboard({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialPosts[0]?.slug ?? null
  );
  const selectedPost = posts.find((post) => post.slug === selectedSlug) ?? null;
  const [form, setForm] = useState<EditorState>(
    selectedPost ? postToEditorState(selectedPost) : emptyEditorState()
  );
  const [isNew, setIsNew] = useState(!selectedPost);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const res = await fetch("/api/markdown/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: form.content }),
        signal: controller.signal,
      }).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { html?: string };
      setPreviewHtml(data.html ?? "");
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.content]);

  async function refreshPosts(nextSlug?: string) {
    const res = await fetch("/api/posts?includeDrafts=true");
    if (!res.ok) throw new Error("刷新文章列表失败");
    const nextPosts = (await res.json()) as Post[];
    const nextPost = nextPosts.find((post) => post.slug === nextSlug) ?? nextPosts[0] ?? null;
    setPosts(nextPosts);
    setSelectedSlug(nextPost?.slug ?? null);
    setForm(nextPost ? postToEditorState(nextPost) : emptyEditorState());
  }

  function createNewPost() {
    setIsNew(true);
    setSelectedSlug(null);
    setForm(emptyEditorState());
    setMessage("");
    setError("");
  }

  function selectPost(slug: string) {
    const post = posts.find((item) => item.slug === slug);
    if (!post) return;
    setIsNew(false);
    setSelectedSlug(slug);
    setForm(postToEditorState(post));
    setMessage("");
    setError("");
  }

  async function savePost() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = toPayload(form);
      if (!payload.title || !payload.slug || !payload.content.trim()) {
        throw new Error("标题、slug 和正文不能为空");
      }

      const url = isNew ? "/api/posts" : `/api/posts/${selectedSlug}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      await refreshPosts(payload.slug);
      setIsNew(false);
      setMessage("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedPost() {
    if (!selectedSlug || !window.confirm("确定删除这篇文章吗?")) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/posts/${selectedSlug}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "删除失败");
      await refreshPosts();
      setIsNew(false);
      setMessage("已删除");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0 border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h1 className="font-semibold">文章管理</h1>
            <p className="text-xs text-gray-500">{posts.length} 篇文章</p>
          </div>
          <button
            type="button"
            onClick={createNewPost}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700"
          >
            新建
          </button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-auto">
          {posts.map((post) => (
            <button
              key={post.slug}
              type="button"
              onClick={() => selectPost(post.slug)}
              className={`block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                selectedSlug === post.slug && !isNew ? "bg-gray-50" : ""
              }`}
            >
              <span className="block truncate text-sm font-medium">{post.title}</span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-500">
                <span className="truncate">{post.slug}</span>
                <span>{post.published ? "已发布" : "草稿"}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            退出登录
          </button>
        </div>
      </aside>

      <section className="min-w-0 border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="font-semibold">{isNew ? "新建文章" : "编辑文章"}</h2>
            <p className="text-xs text-gray-500">Markdown 文件会保存到 content/posts/</p>
          </div>
          <div className="flex items-center gap-2">
            {message && <span className="text-sm text-green-700">{message}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            {!isNew && selectedSlug && (
              <button
                type="button"
                onClick={deleteSelectedPost}
                disabled={saving}
                className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                删除
              </button>
            )}
            <button
              type="button"
              onClick={savePost}
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-4 xl:grid-cols-2">
          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">标题</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Slug</span>
                <input
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  placeholder="my-first-post"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">日期</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">标签</span>
              <input
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="Next.js, 随笔"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">摘要</span>
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                rows={3}
                className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">封面图 URL</span>
              <input
                value={form.coverImage}
                onChange={(event) => setForm({ ...form, coverImage: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm({ ...form, published: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              发布到前台
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">正文 Markdown</span>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={22}
                className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>
          </form>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">实时预览</h3>
              <span className="text-xs text-gray-400">保存前仅预览,不写入文件</span>
            </div>
            <div
              className="prose prose-neutral min-h-[520px] max-w-none overflow-auto border border-gray-200 bg-gray-50 p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml || "<p>暂无内容</p>" }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
