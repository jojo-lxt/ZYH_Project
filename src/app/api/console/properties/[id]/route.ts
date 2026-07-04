import { getConsolePropertyDetail } from "@/server/console/consoleService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const detail = await getConsolePropertyDetail(id);

  if (!detail) {
    return Response.json({ error: "楼盘不存在" }, { status: 404 });
  }

  return Response.json(detail);
}
