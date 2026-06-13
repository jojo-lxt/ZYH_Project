import { notFound } from "next/navigation";
import { connection } from "next/server";
import { XhsMiniProgramBridge } from "@/features/drafts/components/XhsMiniProgramBridge";
import { getDraft } from "@/server/drafts/draftStore";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const draft = await getDraft(id);

  if (!draft) {
    notFound();
  }

  return <XhsMiniProgramBridge draft={draft} />;
}
