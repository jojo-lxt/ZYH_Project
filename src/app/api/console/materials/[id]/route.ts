import { requireConsoleProject } from "@/server/auth/guard";
import { updateConsoleMaterial } from "@/server/console/consoleService";
import { jsonError } from "@/server/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  const { id } = await context.params;
  try {
    const material = await updateConsoleMaterial(Number(id), ctx.propertyId, await request.json());

    if (!material) {
      return Response.json({ error: "素材不存在" }, { status: 404 });
    }

    return Response.json({ material });
  } catch (error) {
    return jsonError(error, "素材更新失败");
  }
}
