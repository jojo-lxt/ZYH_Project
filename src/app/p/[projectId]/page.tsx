import { ProjectPreviewBridge } from "@/features/public/ProjectPreviewBridge";

// 公开扫码中间页(不在 (console) 登录态内):二维码/NFC 指向 /p/<项目id>,
// 用户扫码进入 → 选平台 → 跳转小程序按 projectId 拉随机素材 + AI 文案预览。
export const dynamic = "force-dynamic";

export default async function ProjectScanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectPreviewBridge projectId={projectId} />;
}
