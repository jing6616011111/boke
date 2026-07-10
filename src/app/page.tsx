import Link from "next/link";
import PostList from "@/components/PostList";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const allPosts = await getAllPosts();
  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE));
  const posts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">最新文章</h1>
      <PostList posts={posts} />

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/?page=${page - 1}`} className="hover:underline">
              ← 上一页
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages ? (
            <Link href={`/?page=${page + 1}`} className="hover:underline">
              下一页 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
