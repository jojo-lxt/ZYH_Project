import { deleteConsoleMaterials, getConsoleMaterials } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleMaterials());
}

export async function DELETE(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];

  try {
    return Response.json({ deleted: await deleteConsoleMaterials(ids) });
  } catch (error) {
    return jsonError(error, "素材删除失败");
  }
}
