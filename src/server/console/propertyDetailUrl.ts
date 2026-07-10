import "server-only";

const SCAN_PATH = "/p";

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function firstHeaderValue(value: string | null) {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * 解析用于拼接项目详情分享链接(二维码 / NFC)的基础域名。
 *
 * 优先级:
 *   1. APP_BASE_URL 环境变量(显式、权威,能穿过 Nginx 反代)
 *   2. 请求转发来源:x-forwarded-proto + x-forwarded-host(Nginx 反代时会设置)
 *   3. 请求的 Host 头
 *   4. 请求 URL 的 origin(兜底,可能是内网地址)
 *
 * 返回不带结尾斜杠的基础地址,例如 "https://example.com"。
 */
export function resolveDetailBaseUrl(request: Request) {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    return stripTrailingSlashes(configured);
  }

  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));

  if (host) {
    const proto =
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return stripTrailingSlashes(`${proto}://${host}`);
  }

  return stripTrailingSlashes(new URL(request.url).origin);
}

/**
 * 拼出渠道二维码 / NFC 指向的公开扫码中间页绝对地址(/p/<项目id>)。
 * 用户扫码进入该页 → 选平台 → 跳转小红书 / 微信小程序预览。
 * 例:buildProjectScanUrl("https://x.com/", "a b") -> "https://x.com/p/a%20b"
 */
export function buildProjectScanUrl(baseUrl: string, propertyId: string) {
  return `${stripTrailingSlashes(baseUrl)}${SCAN_PATH}/${encodeURIComponent(propertyId)}`;
}
