import { createConsoleProperty, getConsoleProperties } from "@/server/console/consoleService";
import { resolveDetailBaseUrl } from "@/server/console/propertyDetailUrl";
import { requireConsoleUser } from "@/server/auth/guard";
import { jsonError } from "@/server/http";

export async function GET() {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  return Response.json(await getConsoleProperties(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireConsoleUser();
  if (auth.response) return auth.response;

  try {
    const detailBaseUrl = resolveDetailBaseUrl(request);
    return Response.json({
      property: await createConsoleProperty(await request.json(), detailBaseUrl, auth.user.id),
    });
  } catch (error) {
    return jsonError(error, "项目创建失败");
  }
}
