import { createConsoleConfigItem, getConsoleSellingPointConfig } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getConsoleSellingPointConfig(ctx.propertyId));
}

export async function POST(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  try {
    const body = await request.json();
    const id = await createConsoleConfigItem("selling_point", ctx.propertyId, body);

    return Response.json({ id });
  } catch (error) {
    return jsonError(error, "卖点创建失败");
  }
}
