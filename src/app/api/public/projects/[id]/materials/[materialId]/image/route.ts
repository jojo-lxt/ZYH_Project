import { getPublicMaterialFile } from "@/server/public/publicRepository";

export const runtime = "nodejs";

// 公开图片接口(无需登录):供扫码中间页 / 小程序展示素材图。按 (项目, 素材) 校验归属。
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; materialId: string }> },
) {
  const { id, materialId } = await context.params;
  const file = await getPublicMaterialFile(id, Number(materialId));

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.original_name)}"`,
      "Content-Length": String(file.size_bytes),
      "Content-Type": file.mime_type,
    },
  });
}
