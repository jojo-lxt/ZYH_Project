export type ConsoleStat = {
  label: string;
  trend: string;
  value: string;
};

export type RankItem = {
  count: number;
  name: string;
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
  likes: number;
};

export type PropertyRow = {
  key: string;
  developer: string;
  name: string;
  type: string;
  stage: string;
  address: string;
  createdAt: string;
};

export type UserRow = {
  key: string;
  name: string;
  phone: string;
  role: string;
  property: string;
  status?: string;
  createdAt: string;
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
  }>;
};

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
