import Link from "next/link";
import type { Post } from "@/lib/types";
import TagBadge from "./TagBadge";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="border-b border-gray-200 py-6">
      <h2 className="text-xl font-semibold">
        <Link href={`/posts/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-gray-500">{post.date}</p>
      {post.excerpt && <p className="mt-2 text-gray-700">{post.excerpt}</p>}
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
