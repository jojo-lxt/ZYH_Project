import { deleteConsoleMaterials, getConsoleMaterials } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getConsoleMaterials(ctx.propertyId));
}

export async function DELETE(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];

  try {
    return Response.json({ deleted: await deleteConsoleMaterials(ids, ctx.propertyId) });
  } catch (error) {
    return jsonError(error, "素材删除失败");
  }
}
