import { getProjectImages } from "@/server/public/publicService";

export const runtime = "nodejs";

// 公开接口(无需登录):小程序/中间页据此拿「随机 N 张图」并秒显;AI 文案改由 /caption 异步补。
// 再调一次即刷新换一批。
function parseCount(value: string | null) {
  const count = Number(value);

  // 注意:缺省(null)或空串会让 Number 得到 0(而非 NaN),不能只靠 isFinite 兜底,
  // 否则 Math.max(0,1) 会把「没传 count」变成 1。显式判空 + 下限校验,缺省/非法时回退默认 5。
  if (!value || !Number.isFinite(count) || count < 1) {
    return 5;
  }

  return Math.min(Math.trunc(count), 20);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const count = parseCount(url.searchParams.get("count"));
  const images = await getProjectImages(id, count);

  if (!images) {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }

  return Response.json(images);
}
