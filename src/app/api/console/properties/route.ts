import { createConsoleProperty, getConsoleProperties } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleProperties());
}

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    return Response.json({ property: await createConsoleProperty(await request.json()) });
  } catch (error) {
    return jsonError(error, "项目创建失败");
  }
}
