// 营销阶段的唯一事实来源:项目管理 + 图片素材的下拉、以及各处默认值都引用这里。
// 后续增删阶段只改这一个文件(纯前端,不动后端/数据库)。
export const MARKETING_STAGES = [
  "亮相开放前",
  "诚意登记期",
  "强销期",
  "现房在售",
  "交付和口碑期",
  "尾盘与清盘期",
  "专项营销活动",
] as const;

export const DEFAULT_MARKETING_STAGE = MARKETING_STAGES[0];
