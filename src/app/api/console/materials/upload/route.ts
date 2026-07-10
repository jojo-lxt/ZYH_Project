import { createMaterialUpload } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function POST(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  try {
    const formData = await request.formData();

    return Response.json(await createMaterialUpload(formData, ctx.propertyId));
  } catch (error) {
    return jsonError(error, "素材上传失败");
  }
}
