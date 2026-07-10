import "server-only";
import { getCurrentUser } from "@/server/auth/session";
import { userCanAccessProject } from "@/server/console/consoleRepository";

export async function requireConsoleUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: Response.json({ error: "未登录" }, { status: 401 }),
      user: null,
    };
  }

  return {
    response: null,
    user,
  };
}

type ConsoleProjectContext =
  | { propertyId: null; response: Response }
  | { propertyId: string; response: null };

/**
 * 校验登录态 + 当前项目。前端 RTK Query 会在每个 /api/console 请求带上 X-Project-Id 头。
 * 需要按项目隔离数据的接口用它,拿到确定非空的 propertyId(判空后 TS 会收窄为 string)。
 */
export async function requireConsoleProject(request: Request): Promise<ConsoleProjectContext> {
  const auth = await requireConsoleUser();

  if (auth.response) {
    return { propertyId: null, response: auth.response };
  }

  const propertyId = request.headers.get("x-project-id")?.trim();

  if (!propertyId) {
    return {
      propertyId: null,
      response: Response.json({ error: "未选择项目" }, { status: 400 }),
    };
  }

  // 校验该用户能否访问这个项目(管理员放行,否则须为归属人),防止用请求头越权访问别人的项目。
  const canAccess = await userCanAccessProject(propertyId, {
    isAdmin: auth.user.role === "管理员",
    userId: auth.user.id,
  });

  if (!canAccess) {
    return {
      propertyId: null,
      response: Response.json({ error: "无权访问该项目" }, { status: 403 }),
    };
  }

  return { propertyId, response: null };
}
