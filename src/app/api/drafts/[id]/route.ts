import { getDraft } from "@/server/drafts/draftStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const draft = await getDraft(id);

  if (!draft) {
    return Response.json(
      {
        error: "草稿不存在",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json({
    draft,
  });
}
