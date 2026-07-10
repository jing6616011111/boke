import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "blog_session";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isPostsApiWrite =
    pathname.startsWith("/api/posts") && WRITE_METHODS.has(request.method);
  const isPostsApiRead = pathname.startsWith("/api/posts") && request.method === "GET";
  const isMarkdownPreview = pathname === "/api/markdown/preview" && request.method === "POST";

  if (!isAdminPage && !isPostsApiWrite && !isPostsApiRead && !isMarkdownPreview) {
    return NextResponse.next();
  }

  if (await isAuthenticated(request)) {
    return NextResponse.next();
  }

  if (isAdminPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ error: "未登录" }, { status: 401 });
}

export const config = {
  matcher: ["/admin/:path*", "/api/posts/:path*", "/api/posts", "/api/markdown/preview"],
};
