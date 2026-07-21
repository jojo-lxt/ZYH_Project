import { ProjectPreviewBridge } from "@/features/public/ProjectPreviewBridge";
import { parseChannel } from "@/shared/channels";

// 公开扫码中间页(不在 (console) 登录态内):二维码/NFC 指向 /p/<项目id>?channel=<身份>,
// 用户扫码进入 → 选平台 → 跳转小程序按 projectId + channel 拉随机素材 + 贴合身份的 AI 文案。
export const dynamic = "force-dynamic";

export default async function ProjectScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const { projectId } = await params;
  const { channel } = await searchParams;

  return <ProjectPreviewBridge channel={parseChannel(channel)} projectId={projectId} />;
}
