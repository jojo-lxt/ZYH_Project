import { createConsoleConfigItem, getConsoleTagConfig } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getConsoleTagConfig(ctx.propertyId));
}

export async function POST(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  try {
    const body = await request.json();
    const id = await createConsoleConfigItem("tag", ctx.propertyId, body);

    return Response.json({ id });
  } catch (error) {
    return jsonError(error, "标签创建失败");
  }
}
