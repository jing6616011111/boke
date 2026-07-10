import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";
import { searchPosts } from "@/lib/search-index";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const posts = await getAllPosts();
  return NextResponse.json(searchPosts(posts, query));
}
