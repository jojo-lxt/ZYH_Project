import { requireConsoleUser } from "@/server/auth/guard";
import { setConsoleMaterialTags } from "@/server/console/consoleService";
import { jsonError } from "@/server/http";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = await request.json();
  const kind = body.kind === "selling" ? "selling" : "attribute";
  const tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [];

  try {
    await setConsoleMaterialTags(Number(id), kind, tags);

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error, "素材标签保存失败");
  }
}
