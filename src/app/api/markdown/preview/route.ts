import { NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/markdown";
import { hasAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const markdown = typeof body?.markdown === "string" ? body.markdown : "";
  const html = await renderMarkdown(markdown);
  return NextResponse.json({ html });
}
