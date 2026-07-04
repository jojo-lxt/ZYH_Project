import { requireConsoleUser } from "@/server/auth/guard";
import {
  deleteConsoleConfigItem,
  updateConsoleConfigItem,
} from "@/server/console/consoleService";
import { jsonError } from "@/server/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  try {
    await updateConsoleConfigItem(id, await request.json());

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error, "卖点更新失败");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;

  try {
    return Response.json({ deleted: await deleteConsoleConfigItem(id) });
  } catch (error) {
    return jsonError(error, "卖点删除失败");
  }
}
