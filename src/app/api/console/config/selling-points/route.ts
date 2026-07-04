import { createConsoleConfigItem, getConsoleSellingPointConfig } from "@/server/console/consoleService";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleSellingPointConfig());
}

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = await createConsoleConfigItem("selling_point", body);

    return Response.json({ id });
  } catch (error) {
    return jsonError(error, "卖点创建失败");
  }
}
