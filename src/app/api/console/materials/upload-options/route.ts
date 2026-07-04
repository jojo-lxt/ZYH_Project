import { getMaterialUploadOptions } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getMaterialUploadOptions());
}
