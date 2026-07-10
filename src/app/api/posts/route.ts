import { NextResponse } from "next/server";
import {
  createPost,
  getAllPosts,
  InvalidSlugError,
  PostExistsError,
} from "@/lib/posts";
import { rebuildSearchIndex } from "@/lib/search-index";
import { hasAdminSession } from "@/lib/session";
import type { PostInput } from "@/lib/types";

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeDrafts = searchParams.get("includeDrafts") === "true";
  const posts = await getAllPosts({ includeDrafts });
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: Partial<PostInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.slug?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "title、slug、content 为必填项" }, { status: 400 });
  }

  const input: PostInput = {
    title: body.title.trim(),
    slug: body.slug.trim(),
    date: body.date || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(body.tags) ? body.tags : [],
    excerpt: body.excerpt,
    published: Boolean(body.published),
    coverImage: body.coverImage,
    content: body.content,
  };

  try {
    const post = await createPost(input);
    await rebuildSearchIndex();
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PostExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
