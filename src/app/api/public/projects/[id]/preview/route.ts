import { getProjectPreview } from "@/server/public/publicService";

export const runtime = "nodejs";

// 公开接口(无需登录):小程序/中间页据此拿「随机 N 张图 + AI 文案」;再调一次即刷新换一批。
function parseCount(value: string | null) {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return 5;
  }

  return Math.min(Math.max(Math.trunc(count), 1), 20);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const count = parseCount(new URL(request.url).searchParams.get("count"));
  const preview = await getProjectPreview(id, count);

  if (!preview) {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }

  return Response.json(preview);
}
