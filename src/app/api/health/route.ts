export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "content-publisher-console",
    runtime,
    timestamp: new Date().toISOString(),
  });
}
