import type { Post } from "./types";
import { toPlainText } from "./markdown";

function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function scorePost(post: Post, terms: string[]): number {
  const title = post.title.toLowerCase();
  const tags = post.tags.join(" ").toLowerCase();
  const excerpt = post.excerpt.toLowerCase();
  const content = toPlainText(post.content).toLowerCase();

  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (title.includes(term)) termScore += 8;
    if (tags.includes(term)) termScore += 5;
    if (excerpt.includes(term)) termScore += 3;
    if (content.includes(term)) termScore += 1;
    if (termScore === 0) return 0;
    score += termScore;
  }

  return score;
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const terms = normalizeQuery(query);
  if (terms.length === 0) return [];

  return posts
    .filter((post) => post.published)
    .map((post) => ({ post, score: scorePost(post, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.post.date < b.post.date ? 1 : a.post.date > b.post.date ? -1 : 0;
    })
    .map((item) => item.post);
}

export async function rebuildSearchIndex(): Promise<void> {
  // Markdown 文件很少时按请求搜索更稳妥;保留这个钩子给写操作调用。
}
