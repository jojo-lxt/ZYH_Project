import { getProjectCaption } from "@/server/public/publicService";
import { parseChannel } from "@/shared/channels";

export const runtime = "nodejs";

// 公开接口(无需登录):小程序拿到图片后再单独调这里取贴合渠道身份的 AI 文案。
// 单独成一个请求,是为了让图片先秒显、文案慢的部分不再拖住整页。
// 兜底时响应里带 captionSource=fallback + captionReason(原因码),前端 devtools 可直接自查。
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const channel = parseChannel(url.searchParams.get("channel"));
  const caption = await getProjectCaption(id, channel);

  if (!caption) {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }

  return Response.json(caption);
}
