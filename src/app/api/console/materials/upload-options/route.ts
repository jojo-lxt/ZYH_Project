import { getMaterialUploadOptions } from "@/server/console/consoleService";

export async function GET() {
  return Response.json(await getMaterialUploadOptions());
}
