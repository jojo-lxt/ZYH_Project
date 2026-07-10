import { getMaterialUploadOptions } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getMaterialUploadOptions(ctx.propertyId));
}
