import { NextResponse } from "next/server";
import {
  authCookieName,
  deleteSession,
  getAuthCookieOptions,
} from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${authCookieName}=`))
    ?.split("=")[1];

  await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", getAuthCookieOptions(0));

  return response;
}
