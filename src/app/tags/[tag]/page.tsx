import { notFound } from "next/navigation";
import PostList from "@/components/PostList";
import { getPostsByTag } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const posts = await getPostsByTag(tag);

  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">标签: #{tag}</h1>
      <PostList posts={posts} />
    </div>
  );
}
