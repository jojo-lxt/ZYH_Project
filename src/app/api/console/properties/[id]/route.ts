import {
  deleteConsoleProperty,
  getConsolePropertyDetail,
  updateConsoleProperty,
} from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const detail = await getConsolePropertyDetail(id, auth.user);

  if (!detail) {
    return Response.json({ error: "楼盘不存在" }, { status: 404 });
  }

  return Response.json(detail);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  try {
    const property = await updateConsoleProperty(id, await request.json(), auth.user);

    if (!property) {
      return Response.json({ error: "楼盘不存在" }, { status: 404 });
    }

    return Response.json({ property });
  } catch (error) {
    return jsonError(error, "项目更新失败");
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
    return Response.json({ deleted: await deleteConsoleProperty(id, auth.user) });
  } catch (error) {
    return jsonError(error, "项目删除失败");
  }
}
