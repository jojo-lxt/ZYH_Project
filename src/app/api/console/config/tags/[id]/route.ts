import { requireConsoleProject } from "@/server/auth/guard";
import {
  deleteConsoleConfigItem,
  updateConsoleConfigItem,
} from "@/server/console/consoleService";
import { jsonError } from "@/server/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  const { id } = await context.params;
  try {
    await updateConsoleConfigItem(id, ctx.propertyId, await request.json());

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error, "标签更新失败");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  const { id } = await context.params;

  try {
    return Response.json({ deleted: await deleteConsoleConfigItem(id, ctx.propertyId) });
  } catch (error) {
    return jsonError(error, "标签删除失败");
  }
}
