export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "next_react_ts_tailwind",
    runtime,
    timestamp: new Date().toISOString(),
  });
}
