import { NextResponse } from "next/server";
import {
  authCookieName,
  getAuthCookieOptions,
  loginWithPassword,
} from "@/server/auth/session";

export const runtime = "nodejs";

function normalizePhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "").trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = Boolean(body?.remember);

  if (!/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "请输入有效的 11 位手机号" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "密码至少需要 8 位" }, { status: 400 });
  }

  const result = await loginWithPassword({ password, phone, remember });

  if (!result) {
    return NextResponse.json({ error: "手机号或密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ user: result.user });

  response.cookies.set(authCookieName, result.token, getAuthCookieOptions(result.maxAge));

  return response;
}
