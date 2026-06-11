import { getConsoleProperties } from "@/server/console/consoleService";

export async function GET() {
  return Response.json(getConsoleProperties());
}
