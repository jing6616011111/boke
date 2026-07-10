import type { Post } from "@/lib/types";
import PostCard from "./PostCard";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="py-6 text-gray-500">暂时没有文章。</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
