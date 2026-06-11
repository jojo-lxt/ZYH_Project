import { createDraftFromFormData } from "@/server/drafts/draftStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const draft = await createDraftFromFormData(formData);
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const draftUrl = new URL(`/drafts/${draft.id}`, origin).toString();

    return Response.json({
      draft,
      draftUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成草稿失败";

    return Response.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
