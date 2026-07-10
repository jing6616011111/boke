import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const valid = await verifyCredentials(username, password);
  if (!valid) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ ok: true });
}
