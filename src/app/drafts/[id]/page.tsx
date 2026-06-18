import { connection } from "next/server";
import { DraftPlatformBridge } from "@/features/drafts/components/DraftPlatformBridge";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  return <DraftPlatformBridge draftId={id} />;
}
