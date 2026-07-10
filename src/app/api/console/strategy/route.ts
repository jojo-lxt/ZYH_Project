import { getConsoleStrategy } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import type {
  ConsoleContentType,
  ConsolePlatform,
  ConsoleStrategyQuery,
} from "@/shared/types/console";

function oneOf<T extends string>(value: string | null, options: readonly T[]) {
  return value && options.includes(value as T) ? (value as T) : undefined;
}

function getStrategyQuery(request: Request): ConsoleStrategyQuery {
  const searchParams = new URL(request.url).searchParams;

  return {
    contentType: oneOf<ConsoleContentType>(searchParams.get("contentType"), ["image", "video"]),
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    platform: oneOf<ConsolePlatform>(searchParams.get("platform"), ["wechat", "xhs"]),
  };
}

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getConsoleStrategy(ctx.propertyId, getStrategyQuery(request)));
}
