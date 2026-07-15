import { requireConsoleUser } from "@/server/auth/guard";
import { deleteConsoleUser, updateConsoleUser } from "@/server/console/consoleService";
import { jsonError } from "@/server/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  try {
    const user = await updateConsoleUser(id, await request.json(), auth.user);

    if (!user) {
      return Response.json({ error: "用户不存在" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    return jsonError(error, "用户更新失败");
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
    return Response.json({ deleted: await deleteConsoleUser(id, auth.user) });
  } catch (error) {
    return jsonError(error, "用户删除失败");
  }
}
