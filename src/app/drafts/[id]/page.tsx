import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DraftReview } from "@/features/drafts/components/DraftReview";
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

  return <DraftReview draft={draft} />;
}
