import { createMaterialUpload } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();

    return Response.json(await createMaterialUpload(formData));
  } catch (error) {
    return jsonError(error, "素材上传失败");
  }
}
