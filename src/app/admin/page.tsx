import AdminDashboard from "@/components/AdminDashboard";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const posts = await getAllPosts({ includeDrafts: true });
  return <AdminDashboard initialPosts={posts} />;
}
