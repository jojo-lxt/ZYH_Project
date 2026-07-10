import { recordPublish } from "@/server/public/publicService";

export const runtime = "nodejs";

// 公开接口(无需登录):小程序确认发布后调用,把这一组素材引用 + 文案存成发布记录。
function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function toIntArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const recordId = await recordPublish(id, {
    body: typeof body.body === "string" ? body.body : "",
    channel: typeof body.channel === "string" && body.channel.trim() ? body.channel.trim() : "xhs",
    materialIds: toIntArray(body.materialIds),
    publisher: typeof body.publisher === "string" ? body.publisher.trim() : "",
    title: typeof body.title === "string" ? body.title : "",
    topics: toStringArray(body.topics),
  });

  if (recordId === null) {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }

  return Response.json({ id: recordId });
}
