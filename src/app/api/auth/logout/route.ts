import { NextResponse } from "next/server";
import { authCookieName, deleteSession } from "@/server/auth/session";

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
  response.cookies.set(authCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
