import { createConsoleUser, getConsoleUsers } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleUsers());
}

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    return Response.json({ user: await createConsoleUser(await request.json()) });
  } catch (error) {
    return jsonError(error, "用户创建失败");
  }
}
