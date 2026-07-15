export type ConsoleStat = {
  label: string;
  trend: string;
  value: string;
};

export type ConsolePlatform = "wechat" | "xhs";

export type ConsoleContentType = "image" | "video";

export type ConsoleOwnerType = "agent" | "guest" | "personal";

export type RankItem = {
  count: number;
  name: string;
};

export type OverviewTrendPoint = {
  collects: number;
  comments: number;
  date: string;
  exposureCount: number;
  interactions: number;
  likes: number;
  noteCount: number;
  shares: number;
};

export type MaterialItem = {
  accent: string;
  attributeTags: string[];
  id: number;
  title: string;
  category: string;
  color: string;
  fileSizeBytes: number;
  imageUrl?: string | null;
  platforms: string[];
  size: string;
  stage: string;
  sellingTags: string[];
  tone: string;
  updatedAt: string;
  uploadedAt: string;
  uploader: string;
};

export type NoteRow = {
  key: string;
  title: string;
  author: string;
  params: string[];
  publishedAt: string;
  collects: number;
  comments: number;
  exposureCount: number;
  likes: number;
  shares: number;
};

export type PropertyRow = {
  key: string;
  developer: string;
  name: string;
  type: string;
  stage: string;
  address: string;
  createdAt: string;
  ownerId?: string;
  ownerName?: string;
};

export type UserRow = {
  key: string;
  name: string;
  phone: string;
  role: string;
  status?: string;
  createdAt: string;
  managerId?: string | null;
  managerName?: string | null;
  projectKeys?: string[];
  projectNames?: string[];
};

export type ConfigGroup = {
  name: string;
  items: string[];
};

export type ConfigTreeItem = {
  id: string;
  name: string;
  description?: string;
  count?: number;
  children?: ConfigTreeItem[];
  modes?: string[];
};

export type ConfigStat = {
  label: string;
  value: number;
};

export type ConsoleOverviewResponse = {
  notes: NoteRow[];
  rankAuthors: RankItem[];
  rankInteractions: RankItem[];
  stats: ConsoleStat[];
  trend: OverviewTrendPoint[];
};

export type ConsoleStrategyResponse = {
  heatRows: Array<{
    label: string;
    left: string;
    leftWidth: string;
    right: string;
    rightWidth: string;
  }>;
  keywords: Array<{
    count: number;
    label: string;
    noteCount?: number;
    rate?: number;
  }>;
  heatmap: {
    columns: string[];
    rows: string[];
    values: Array<[number, number, number]>;
  };
  keywordHeat: Array<{
    label: string;
    segments: Array<{
      label: string;
      value: number;
    }>;
  }>;
  modeEffect: Array<{
    collects: number;
    comments: number;
    label: string;
    likes: number;
    shares: number;
  }>;
  personaEffect: Array<{
    interactionRate: number;
    label: string;
    noteCount: number;
  }>;
  sentimentEffect: Array<{
    count: number;
    label: string;
  }>;
};

export type ConsoleOverviewQuery = {
  contentType?: ConsoleContentType;
  dateFrom?: string;
  dateTo?: string;
  ownerType?: ConsoleOwnerType;
  platform?: ConsolePlatform;
};

export type ConsoleStrategyQuery = Omit<ConsoleOverviewQuery, "ownerType">;

export type ConsoleMaterialsResponse = {
  filterGroups: string[];
  materials: MaterialItem[];
  total: number;
};

export type ConsoleConfigResponse = {
  allowPrimaryCreate: boolean;
  groups?: ConfigGroup[];
  modeOptions?: string[];
  stats: ConfigStat[];
  title: string;
  tree: ConfigTreeItem[];
};

export type QuickTagGroup = {
  name: string;
  options: string[];
};

export type MaterialUploadResponse = {
  attributeGroups: QuickTagGroup[];
  sellingPointGroups: QuickTagGroup[];
};

export type ConsolePropertiesResponse = {
  properties: PropertyRow[];
  total: number;
};

export type PropertyDetailChannel = {
  label: string;
  qrValue: string;
  updatedAt: string;
};

export type ConsolePropertyDetailResponse = {
  channels: PropertyDetailChannel[];
  property: PropertyRow & {
    description: string;
  };
};

export type ConsoleUsersResponse = {
  total: number;
  users: UserRow[];
};
