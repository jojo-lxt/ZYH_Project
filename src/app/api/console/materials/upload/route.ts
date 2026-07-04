import { createMaterialUpload } from "@/server/console/consoleService";

export async function POST(request: Request) {
  const formData = await request.formData();

  return Response.json(await createMaterialUpload(formData));
}
