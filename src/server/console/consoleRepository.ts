import "server-only";
import { queryOne, queryRows } from "@/server/db";
import type {
  ConfigTreeItem,
  ConsoleConfigResponse,
  ConsoleMaterialsResponse,
  ConsoleOverviewResponse,
  ConsolePropertiesResponse,
  ConsolePropertyDetailResponse,
  ConsoleStrategyResponse,
  ConsoleUsersResponse,
  MaterialItem,
  MaterialUploadResponse,
  PropertyRow,
  QuickTagGroup,
  UserRow,
} from "@/shared/types/console";

type MaterialRow = {
  accent: string;
  category: string;
  color: string;
  id: number;
  platforms: string[];
  size: string;
  stage: string;
  title: string;
  tone: string;
  updated_at: Date | string;
  uploaded_at: Date | string;
  uploader: string;
};

type NoteRow = {
  author: string;
  id: string;
  likes: number;
  params: string[];
  published_at: Date | string;
  title: string;
};

type ConfigNodeRow = {
  count: number | null;
  description: string | null;
  id: string;
  modes: string[] | null;
  name: string;
  parent_id: string | null;
};

type PropertyDbRow = {
  address: string;
  created_at: Date | string;
  description?: string | null;
  developer: string;
  id: string;
  name: string;
  stage: string;
  type: string;
};

type UserDbRow = {
  created_at: Date | string;
  id: string;
  name: string;
  phone: string;
  property: string;
  role: string;
};

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}

function mapMaterial(row: MaterialRow): MaterialItem {
  return {
    accent: row.accent,
    category: row.category,
    color: row.color,
    id: row.id,
    platforms: row.platforms ?? [],
    size: row.size,
    stage: row.stage,
    title: row.title,
    tone: row.tone,
    updatedAt: formatDateTime(row.updated_at),
    uploadedAt: formatDateTime(row.uploaded_at),
    uploader: row.uploader,
  };
}

function mapProperty(row: PropertyDbRow): PropertyRow {
  return {
    address: row.address,
    createdAt: formatDateTime(row.created_at),
    developer: row.developer,
    key: row.id,
    name: row.name,
    stage: row.stage,
    type: row.type,
  };
}

function mapUser(row: UserDbRow): UserRow {
  return {
    createdAt: formatDateTime(row.created_at),
    key: row.id,
    name: row.name,
    phone: row.phone,
    property: row.property,
    role: row.role,
  };
}

function buildConfigTree(rows: ConfigNodeRow[]) {
  const byId = new Map<string, ConfigTreeItem>();
  const roots: ConfigTreeItem[] = [];

  rows.forEach((row) => {
    byId.set(row.id, {
      count: row.count ?? undefined,
      description: row.description ?? undefined,
      id: row.id,
      modes: row.modes?.filter(Boolean) ?? undefined,
      name: row.name,
    });
  });

  rows.forEach((row) => {
    const item = byId.get(row.id);

    if (!item) {
      return;
    }

    if (!row.parent_id) {
      roots.push(item);
      return;
    }

    const parent = byId.get(row.parent_id);

    if (!parent) {
      roots.push(item);
      return;
    }

    parent.children = [...(parent.children ?? []), item];
    parent.count = parent.children.length;
  });

  return roots;
}

async function getConfigRows(configType: "selling_point" | "tag") {
  return queryRows<ConfigNodeRow>(
    `
      SELECT
        n.id,
        n.parent_id,
        n.name,
        n.description,
        n.count,
        COALESCE(array_remove(array_agg(m.mode ORDER BY m.mode), NULL), '{}') AS modes
      FROM config_nodes n
      LEFT JOIN config_node_modes m ON m.node_id = n.id
      WHERE n.config_type = $1
      GROUP BY n.id
      ORDER BY COALESCE(n.parent_id, n.id), n.parent_id NULLS FIRST, n.sort_order, n.name
    `,
    [configType],
  );
}

function getConfigStats(tree: ConfigTreeItem[]) {
  const primaryCount = tree.length;
  const childCount = tree.reduce((total, item) => total + (item.children?.length ?? 0), 0);

  return [
    { label: "一级分类", value: primaryCount },
    { label: "二级分类", value: childCount },
    { label: "总标签数", value: primaryCount + childCount },
  ];
}

function toQuickGroups(tree: ConfigTreeItem[]): QuickTagGroup[] {
  return tree.map((item) => ({
    name: item.name,
    options: (item.children ?? []).map((child) => child.name),
  }));
}

export async function getOverview(): Promise<ConsoleOverviewResponse> {
  const notes = await queryRows<NoteRow>(
    `
      SELECT id, title, author, params, published_at, likes
      FROM notes
      ORDER BY published_at DESC
      LIMIT 10
    `,
  );
  const [noteCount, interactionCount, rankAuthors, rankInteractions] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM notes"),
    queryOne<{ count: string }>("SELECT COALESCE(SUM(likes), 0)::text AS count FROM notes"),
    queryRows<{ count: number; name: string }>(
      `
        SELECT author AS name, COUNT(*)::int AS count
        FROM notes
        GROUP BY author
        ORDER BY count DESC, author
        LIMIT 5
      `,
    ),
    queryRows<{ count: number; name: string }>(
      `
        SELECT author AS name, COALESCE(SUM(likes), 0)::int AS count
        FROM notes
        GROUP BY author
        ORDER BY count DESC, author
        LIMIT 5
      `,
    ),
  ]);

  return {
    notes: notes.map((note) => ({
      author: note.author,
      key: note.id,
      likes: note.likes,
      params: note.params ?? [],
      publishedAt: formatDateTime(note.published_at),
      title: note.title,
    })),
    rankAuthors,
    rankInteractions,
    stats: [
      { label: "总笔记数量", trend: "来自数据库", value: noteCount?.count ?? "0" },
      { label: "总曝光量", trend: "待接入平台数据", value: "0" },
      { label: "总互动数", trend: "来自点赞汇总", value: interactionCount?.count ?? "0" },
    ],
  };
}

export async function getStrategy(): Promise<ConsoleStrategyResponse> {
  const [heatRows, keywords] = await Promise.all([
    queryRows<{
      label: string;
      left: string;
      left_width: string;
      right: string;
      right_width: string;
    }>(
      `
        SELECT label, left_label AS left, left_width, right_label AS right, right_width
        FROM strategy_heat_rows
        ORDER BY sort_order, label
      `,
    ),
    queryRows<{ count: number; label: string }>(
      `
        SELECT label, count
        FROM strategy_keywords
        ORDER BY sort_order, count DESC, label
      `,
    ),
  ]);

  return {
    heatRows: heatRows.map((row) => ({
      label: row.label,
      left: row.left,
      leftWidth: row.left_width,
      right: row.right,
      rightWidth: row.right_width,
    })),
    keywords,
  };
}

export async function getMaterials(): Promise<ConsoleMaterialsResponse> {
  const [materials, total, filterGroups] = await Promise.all([
    queryRows<MaterialRow>(
      `
        SELECT id, title, category, platforms, size_text AS size, stage, tone,
          uploader, color, accent, uploaded_at, updated_at
        FROM materials
        ORDER BY updated_at DESC, id DESC
      `,
    ),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM materials"),
    queryRows<{ name: string }>(
      `
        SELECT name
        FROM config_nodes
        WHERE config_type = 'tag' AND parent_id IS NULL
        ORDER BY sort_order, name
      `,
    ),
  ]);

  return {
    filterGroups: filterGroups.map((item) => item.name),
    materials: materials.map(mapMaterial),
    total: Number(total?.count ?? materials.length),
  };
}

export async function getMaterialUploadOptions(): Promise<MaterialUploadResponse> {
  const [attributeTree, sellingPointTree] = await Promise.all([
    getConfigRows("tag"),
    getConfigRows("selling_point"),
  ]);

  return {
    attributeGroups: toQuickGroups(buildConfigTree(attributeTree)),
    sellingPointGroups: toQuickGroups(buildConfigTree(sellingPointTree)),
  };
}

export async function createMaterialUpload(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  const uploadedFiles = [];

  for (const [index, file] of files.entries()) {
    const result = await queryOne<{ id: number }>(
      `
        INSERT INTO materials (
          title, category, platforms, size_text, stage, tone, uploader,
          color, accent, uploaded_at, updated_at
        )
        VALUES ($1, '未分类', '{}', '-', '待配置', '-', '系统上传', '#d8dee9', '#64748b', now(), now())
        RETURNING id
      `,
      [file.name || `upload-${Date.now()}-${index}`],
    );

    uploadedFiles.push({
      id: result?.id ? `material-${result.id}` : `upload-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      status: "uploaded",
      type: file.type || "application/octet-stream",
    });
  }

  return {
    files: uploadedFiles,
    total: uploadedFiles.length,
  };
}

export async function getTagConfig(): Promise<ConsoleConfigResponse> {
  const tree = buildConfigTree(await getConfigRows("tag"));

  return {
    allowPrimaryCreate: true,
    stats: getConfigStats(tree),
    title: "图片标签配置",
    tree,
  };
}

export async function getSellingPointConfig(): Promise<ConsoleConfigResponse> {
  const tree = buildConfigTree(await getConfigRows("selling_point"));

  return {
    allowPrimaryCreate: false,
    modeOptions: ["对比式", "晒单式", "盘点式", "求助式", "种草式"],
    stats: getConfigStats(tree),
    title: "图片卖点配置",
    tree,
  };
}

export async function getProperties(): Promise<ConsolePropertiesResponse> {
  const [properties, total] = await Promise.all([
    queryRows<PropertyDbRow>(
      `
        SELECT id, developer, name, type, stage, address, created_at
        FROM properties
        ORDER BY created_at DESC, id
      `,
    ),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM properties"),
  ]);

  return {
    properties: properties.map(mapProperty),
    total: Number(total?.count ?? properties.length),
  };
}

export async function getPropertyDetail(id: string): Promise<ConsolePropertyDetailResponse | null> {
  const property = await queryOne<PropertyDbRow>(
    `
      SELECT id, developer, name, type, stage, address, description, created_at
      FROM properties
      WHERE id = $1
    `,
    [id],
  );

  if (!property) {
    return null;
  }

  const channels = await queryRows<{
    label: string;
    qr_value: string;
    updated_at: Date | string;
  }>(
    `
      SELECT label, qr_value, updated_at
      FROM property_channels
      WHERE property_id = $1
      ORDER BY sort_order, label
    `,
    [id],
  );

  return {
    channels: channels.map((channel) => ({
      label: channel.label,
      qrValue: channel.qr_value,
      updatedAt: formatDateTime(channel.updated_at),
    })),
    property: {
      ...mapProperty(property),
      description: property.description ?? "-",
    },
  };
}

export async function getUsers(): Promise<ConsoleUsersResponse> {
  const [users, total] = await Promise.all([
    queryRows<UserDbRow>(
      `
        SELECT id, name, phone, role, property, created_at
        FROM console_users
        ORDER BY created_at DESC, id
      `,
    ),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM console_users"),
  ]);

  return {
    total: Number(total?.count ?? users.length),
    users: users.map(mapUser),
  };
}
