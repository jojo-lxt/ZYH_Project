import { getDraftImage } from "@/server/drafts/draftStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await context.params;
  const result = await getDraftImage(id, filename);

  if (!result) {
    return new Response("Not found", {
      status: 404,
    });
  }

  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(result.bytes.byteLength),
      "Content-Type": result.image.mimeType,
    },
  });
}
