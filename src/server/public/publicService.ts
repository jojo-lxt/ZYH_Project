import "server-only";
import { generateXhsCaption, type XhsCaption } from "@/server/ai/caption";
import {
  createPublishRecord,
  getCaptionProfile,
  getProjectConfigNames,
  getProjectName,
  getRandomMaterialIds,
} from "@/server/public/publicRepository";

export type ProjectPreview = {
  caption: XhsCaption;
  images: Array<{ id: number; url: string }>;
  projectName: string;
};

// 扫码中间页 / 小程序用的公开预览:随机取该项目 count 张图 + AI 文案。
// 项目不存在返回 null(路由据此 404)。
export async function getProjectPreview(projectId: string, count: number): Promise<ProjectPreview | null> {
  const projectName = await getProjectName(projectId);

  if (projectName === null) {
    return null;
  }

  const [materialIds, config, profile] = await Promise.all([
    getRandomMaterialIds(projectId, count),
    getProjectConfigNames(projectId),
    getCaptionProfile(projectId),
  ]);

  const caption = await generateXhsCaption({
    projectName,
    sellingPoints: config.sellingPoints,
    tags: config.tags,
    styleSpec: profile?.styleSpec,
    examples: profile?.examples,
  });

  return {
    caption,
    images: materialIds.map((id) => ({
      id,
      url: `/api/public/projects/${encodeURIComponent(projectId)}/materials/${id}/image`,
    })),
    projectName,
  };
}

export type PublishInput = {
  body: string;
  channel: string;
  materialIds: number[];
  publisher: string;
  title: string;
  topics: string[];
};

// 用户在小程序确认发布后调用:把这一组(引用式)存进 publish_records。项目不存在返回 null。
export async function recordPublish(projectId: string, input: PublishInput) {
  const projectName = await getProjectName(projectId);

  if (projectName === null) {
    return null;
  }

  return createPublishRecord({ projectId, ...input });
}
