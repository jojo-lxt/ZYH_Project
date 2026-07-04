import "server-only";
import { getCurrentUser } from "@/server/auth/session";

export async function requireConsoleUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: Response.json({ error: "未登录" }, { status: 401 }),
      user: null,
    };
  }

  return {
    response: null,
    user,
  };
}
