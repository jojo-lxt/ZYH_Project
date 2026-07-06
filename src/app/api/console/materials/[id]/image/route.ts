import { requireConsoleUser } from "@/server/auth/guard";
import { getConsoleMaterialFile } from "@/server/console/consoleService";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const file = await getConsoleMaterialFile(Number(id));

  if (!file) {
    return new Response("Not found", {
      status: 404,
    });
  }

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.original_name)}"`,
      "Content-Length": String(file.size_bytes),
      "Content-Type": file.mime_type,
    },
  });
}
