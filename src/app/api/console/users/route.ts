import { getConsoleUsers } from "@/server/console/consoleService";

export async function GET() {
  return Response.json(await getConsoleUsers());
}
