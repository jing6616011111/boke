import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Post, PostFrontmatter, PostInput } from "./types";
import { toPlainText } from "./markdown";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidSlugError extends Error {}
export class PostExistsError extends Error {}
export class PostNotFoundError extends Error {}

export function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new InvalidSlugError(
      `slug 只能包含小写字母、数字和短横线,且不能以短横线开头或结尾: "${slug}"`
    );
  }
}

function postFilePath(slug: string): string {
  assertValidSlug(slug);
  return path.join(POSTS_DIR, `${slug}.md`);
}

function toFrontmatter(input: {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  tags: string[];
  excerpt?: string;
  published: boolean;
  coverImage?: string;
  content: string;
}): PostFrontmatter {
  return {
    title: input.title,
    slug: input.slug,
    date: input.date,
    updated: input.updated,
    tags: input.tags,
    excerpt: input.excerpt?.trim() || toPlainText(input.content).slice(0, 140),
    published: input.published,
    coverImage: input.coverImage,
  };
}

function parsePostFile(slug: string, raw: string): Post {
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    updated: data.updated,
    tags: Array.isArray(data.tags) ? data.tags : [],
    excerpt: data.excerpt ?? toPlainText(content).slice(0, 140),
    published: Boolean(data.published),
    coverImage: data.coverImage,
    content: content.trim(),
  };
}

function cleanFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(frontmatter).filter(([, value]) => value !== undefined)
  );
}

async function writePostFile(slug: string, frontmatter: PostFrontmatter, content: string): Promise<void> {
  const { slug: _slug, ...frontmatterWithoutSlug } = frontmatter;
  void _slug;
  const fileContent = matter.stringify(content.trim() + "\n", {
    ...cleanFrontmatter(frontmatterWithoutSlug),
    slug,
  });
  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.writeFile(postFilePath(slug), fileContent, "utf-8");
}

export async function getAllPosts(options: { includeDrafts?: boolean } = {}): Promise<Post[]> {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const files = await fs.readdir(POSTS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const posts = await Promise.all(
    mdFiles.map(async (filename) => {
      const raw = await fs.readFile(path.join(POSTS_DIR, filename), "utf-8");
      const slug = filename.replace(/\.md$/, "");
      return parsePostFile(slug, raw);
    })
  );

  const filtered = options.includeDrafts ? posts : posts.filter((p) => p.published);
  return filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function getPostBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {}
): Promise<Post | null> {
  try {
    assertValidSlug(slug);
  } catch {
    return null;
  }

  let raw: string;
  try {
    raw = await fs.readFile(postFilePath(slug), "utf-8");
  } catch {
    return null;
  }

  const post = parsePostFile(slug, raw);
  if (!options.includeDrafts && !post.published) return null;
  return post;
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.tags.includes(tag));
}

export async function createPost(input: PostInput): Promise<Post> {
  assertValidSlug(input.slug);

  const exists = await fs
    .access(postFilePath(input.slug))
    .then(() => true)
    .catch(() => false);
  if (exists) {
    throw new PostExistsError(`slug "${input.slug}" 已存在`);
  }

  const frontmatter = toFrontmatter(input);
  await writePostFile(input.slug, frontmatter, input.content);
  return { ...frontmatter, content: input.content.trim() };
}

export async function updatePost(slug: string, input: PostInput): Promise<Post> {
  assertValidSlug(slug);
  assertValidSlug(input.slug);

  const exists = await fs
    .access(postFilePath(slug))
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new PostNotFoundError(`未找到文章 "${slug}"`);
  }

  if (input.slug !== slug) {
    const targetExists = await fs
      .access(postFilePath(input.slug))
      .then(() => true)
      .catch(() => false);
    if (targetExists) {
      throw new PostExistsError(`slug "${input.slug}" 已存在`);
    }
  }

  const frontmatter = toFrontmatter(input);
  await writePostFile(input.slug, frontmatter, input.content);

  if (input.slug !== slug) {
    await fs.unlink(postFilePath(slug));
  }

  return { ...frontmatter, content: input.content.trim() };
}

export async function deletePost(slug: string): Promise<void> {
  assertValidSlug(slug);
  const exists = await fs
    .access(postFilePath(slug))
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new PostNotFoundError(`未找到文章 "${slug}"`);
  }
  await fs.unlink(postFilePath(slug));
}
