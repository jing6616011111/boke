import { NextResponse } from "next/server";
import {
  deletePost,
  getPostBySlug,
  InvalidSlugError,
  PostExistsError,
  PostNotFoundError,
  updatePost,
} from "@/lib/posts";
import { rebuildSearchIndex } from "@/lib/search-index";
import { hasAdminSession } from "@/lib/session";
import type { PostInput } from "@/lib/types";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { slug } = await context.params;
  const post = await getPostBySlug(slug, { includeDrafts: true });
  if (!post) {
    return NextResponse.json({ error: "未找到文章" }, { status: 404 });
  }
  return NextResponse.json(post);
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { slug } = await context.params;

  let body: Partial<PostInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const existing = await getPostBySlug(slug, { includeDrafts: true });
  if (!existing) {
    return NextResponse.json({ error: "未找到文章" }, { status: 404 });
  }

  // 支持部分更新:未提供的字段沿用现有值(如列表页只切换 published)
  const input: PostInput = {
    title: body.title?.trim() || existing.title,
    slug: body.slug?.trim() || existing.slug,
    date: body.date || existing.date,
    updated: new Date().toISOString().slice(0, 10),
    tags: Array.isArray(body.tags) ? body.tags : existing.tags,
    excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
    published: body.published !== undefined ? Boolean(body.published) : existing.published,
    coverImage: body.coverImage !== undefined ? body.coverImage : existing.coverImage,
    content: body.content !== undefined ? body.content : existing.content,
  };

  try {
    const post = await updatePost(slug, input);
    await rebuildSearchIndex();
    return NextResponse.json(post);
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PostExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof PostNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { slug } = await context.params;
  try {
    await deletePost(slug);
    await rebuildSearchIndex();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PostNotFoundError || err instanceof InvalidSlugError) {
      return NextResponse.json({ error: "未找到文章" }, { status: 404 });
    }
    throw err;
  }
}
