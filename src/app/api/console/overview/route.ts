import { getConsoleOverview } from "@/server/console/consoleService";
import { requireConsoleProject } from "@/server/auth/guard";
import type {
  ConsoleContentType,
  ConsoleOverviewQuery,
  ConsoleOwnerType,
  ConsolePlatform,
} from "@/shared/types/console";

function oneOf<T extends string>(value: string | null, options: readonly T[]) {
  return value && options.includes(value as T) ? (value as T) : undefined;
}

function getOverviewQuery(request: Request): ConsoleOverviewQuery {
  const searchParams = new URL(request.url).searchParams;

  return {
    contentType: oneOf<ConsoleContentType>(searchParams.get("contentType"), ["image", "video"]),
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    ownerType: oneOf<ConsoleOwnerType>(searchParams.get("ownerType"), ["agent", "guest", "personal"]),
    platform: oneOf<ConsolePlatform>(searchParams.get("platform"), ["wechat", "xhs"]),
  };
}

export async function GET(request: Request) {
  const ctx = await requireConsoleProject(request);
  if (ctx.response) return ctx.response;

  return Response.json(await getConsoleOverview(ctx.propertyId, getOverviewQuery(request)));
}
