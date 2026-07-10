import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TagBadge from "@/components/TagBadge";
import { getPostBySlug } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

async function loadPost(slug: string) {
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  const html = await renderMarkdown(post.content);

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {post.date}
        {post.updated && post.updated !== post.date ? ` · 更新于 ${post.updated}` : ""}
      </p>
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
      <div
        className="prose prose-neutral mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
