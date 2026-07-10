import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function unauthorizedJson(): Promise<Response> {
  return Response.json({ error: "未登录" }, { status: 401 });
}
