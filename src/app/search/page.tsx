import Link from "next/link";
import PostList from "@/components/PostList";
import { getAllPosts } from "@/lib/posts";
import { searchPosts } from "@/lib/search-index";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const posts = query.trim() ? searchPosts(await getAllPosts(), query) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">搜索</h1>
          <p className="mt-2 text-sm text-gray-500">
            {query ? `“${query}” 找到 ${posts.length} 篇文章` : "输入关键词搜索标题、标签和正文。"}
          </p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          返回首页
        </Link>
      </div>
      <div className="mt-6">
        <PostList posts={posts} />
      </div>
    </div>
  );
}
