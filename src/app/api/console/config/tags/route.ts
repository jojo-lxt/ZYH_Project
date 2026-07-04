import { createConsoleConfigItem, getConsoleTagConfig } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleTagConfig());
}

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = await createConsoleConfigItem("tag", body);

    return Response.json({ id });
  } catch (error) {
    return jsonError(error, "标签创建失败");
  }
}
