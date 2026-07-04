import "server-only";

function getDatabaseErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";
}

function isValidationMessage(message: string) {
  return (
    message.includes("不能为空") ||
    message.includes("至少需要") ||
    message.includes("请输入") ||
    message.includes("不存在")
  );
}

export function jsonError(error: unknown, fallback = "请求处理失败") {
  const code = getDatabaseErrorCode(error);

  if (code === "23505") {
    return Response.json({ error: "数据已存在，请检查唯一字段" }, { status: 409 });
  }

  const message = error instanceof Error && error.message ? error.message : fallback;
  const status = isValidationMessage(message) ? 400 : 500;

  if (status >= 500) {
    console.error(error);
  }

  return Response.json({ error: status >= 500 ? fallback : message }, { status });
}
