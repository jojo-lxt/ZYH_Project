import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/server/auth/password";
import { query, queryOne, queryRows, withTransaction } from "@/server/db";
import type {
  ConfigTreeItem,
  ConsoleContentType,
  ConsoleConfigResponse,
  ConsoleMaterialsResponse,
  ConsoleOverviewQuery,
  ConsoleOverviewResponse,
  ConsoleOwnerType,
  ConsolePlatform,
  ConsolePropertiesResponse,
  ConsolePropertyDetailResponse,
  ConsoleStrategyQuery,
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
  attribute_tags: string[];
  category: string;
  color: string;
  file_size_bytes: number;
  id: number;
  image_url: string | null;
  platforms: string[];
  selling_tags: string[];
  size: string;
  stage: string;
  title: string;
  tone: string;
  updated_at: Date | string;
  uploaded_at: Date | string;
  uploader: string;
};

type MaterialFileRow = {
  bytes: Buffer;
  mime_type: string;
  original_name: string;
  size_bytes: number;
};

type NoteMetricsRow = {
  author: string;
  collects: number;
  comments: number;
  exposure_count: number;
  id: string;
  likes: number;
  params: string[];
  published_at: Date | string;
  shares: number;
  title: string;
};

type NoteStrategyRow = Pick<
  NoteMetricsRow,
  "collects" | "comments" | "exposure_count" | "likes" | "params" | "shares"
>;

type NotesColumnInfo = {
  collects?: string;
  comments?: string;
  contentType?: string;
  ownerType?: string;
  platform?: string;
  shares?: string;
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
  status: string;
};

type ConfigType = "selling_point" | "tag";

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

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatExposure(value: number) {
  if (value >= 10000) {
    const wan = value / 10000;
    const formatted = Number.isInteger(wan) ? String(wan) : wan.toFixed(1);

    return `${formatted}W`;
  }

  return formatInteger(value);
}

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function metricExpression(column?: string) {
  return column ? `COALESCE(${quoteIdent(column)}, 0)` : "0";
}

function interactionExpression(columns: NotesColumnInfo) {
  return [
    "COALESCE(likes, 0)",
    metricExpression(columns.comments),
    metricExpression(columns.collects),
    metricExpression(columns.shares),
  ].join(" + ");
}

function findColumn(columnNames: Set<string>, candidates: string[]) {
  return candidates.find((column) => columnNames.has(column));
}

async function getNotesColumnInfo(): Promise<NotesColumnInfo> {
  const rows = await queryRows<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'notes'
    `,
  );
  const columnNames = new Set(rows.map((row) => row.column_name));

  return {
    collects: findColumn(columnNames, ["collects", "collect_count", "favorites", "favorite_count"]),
    comments: findColumn(columnNames, ["comments", "comment_count"]),
    contentType: findColumn(columnNames, ["content_type", "note_type", "media_type"]),
    ownerType: findColumn(columnNames, ["owner_type", "author_type", "sender_type"]),
    platform: findColumn(columnNames, ["platform", "channel", "channel_type"]),
    shares: findColumn(columnNames, ["shares", "share_count"]),
  };
}

function platformValues(platform: ConsolePlatform) {
  return platform === "xhs" ? ["xhs", "小红书", "redbook"] : ["wechat", "微信"];
}

function contentTypeValues(contentType: ConsoleContentType) {
  return contentType === "image"
    ? ["image", "图文", "图文笔记", "article"]
    : ["video", "视频", "视频脚本"];
}

function ownerTypeValues(ownerType: ConsoleOwnerType) {
  const values = {
    agent: ["agent", "中介", "中介笔记"],
    guest: ["guest", "游客", "游客笔记"],
    personal: ["personal", "个人", "个人笔记"],
  } satisfies Record<ConsoleOwnerType, string[]>;

  return values[ownerType];
}

function isDateText(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function buildNotesWhere(filters: ConsoleOverviewQuery, columns: NotesColumnInfo) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  function addArrayFilter(column: string | undefined, filterValues: string[]) {
    if (!column) {
      return;
    }

    values.push(filterValues);
    clauses.push(`${quoteIdent(column)} = ANY($${values.length}::text[])`);
  }

  if (filters.platform) {
    addArrayFilter(columns.platform, platformValues(filters.platform));
  }

  if (filters.contentType) {
    addArrayFilter(columns.contentType, contentTypeValues(filters.contentType));
  }

  if (filters.ownerType) {
    addArrayFilter(columns.ownerType, ownerTypeValues(filters.ownerType));
  }

  if (isDateText(filters.dateFrom)) {
    values.push(filters.dateFrom);
    clauses.push(`published_at >= $${values.length}::date`);
  }

  if (isDateText(filters.dateTo)) {
    values.push(filters.dateTo);
    clauses.push(`published_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  return {
    values,
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

function getParamValue(params: string[], key: "人设" | "情绪" | "模式") {
  for (const item of params) {
    const normalized = item.replace("：", ":");
    const prefix = `${key}:`;

    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length).trim() || "未标注";
    }
  }

  return "未标注";
}

function toInteractionTotal(note: NoteStrategyRow) {
  return note.likes + note.comments + note.collects + note.shares;
}

function mapMaterial(row: MaterialRow): MaterialItem {
  return {
    accent: row.accent,
    attributeTags: row.attribute_tags ?? [],
    category: row.category,
    color: row.color,
    fileSizeBytes: row.file_size_bytes,
    id: row.id,
    imageUrl: row.image_url,
    platforms: row.platforms ?? [],
    sellingTags: row.selling_tags ?? [],
    size: row.size,
    stage: row.stage,
    title: row.title,
    tone: row.tone,
    updatedAt: formatDateTime(row.updated_at),
    uploadedAt: formatDateTime(row.uploaded_at),
    uploader: row.uploader,
  };
}

function getTextFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getUploadPlatforms(formData: FormData) {
  const values = formData
    .getAll("platforms")
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length ? values : ["小红书", "微信"];
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
    status: row.status,
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

async function getConfigRows(configType: ConfigType) {
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

export async function getOverview(filters: ConsoleOverviewQuery = {}): Promise<ConsoleOverviewResponse> {
  const columns = await getNotesColumnInfo();
  const { values, where } = buildNotesWhere(filters, columns);
  const commentsExpr = metricExpression(columns.comments);
  const collectsExpr = metricExpression(columns.collects);
  const sharesExpr = metricExpression(columns.shares);
  const interactionsExpr = interactionExpression(columns);
  const notes = await queryRows<NoteMetricsRow>(
    `
      SELECT
        id,
        title,
        author,
        params,
        published_at,
        COALESCE(likes, 0)::int AS likes,
        COALESCE(exposure_count, 0)::int AS exposure_count,
        ${commentsExpr}::int AS comments,
        ${collectsExpr}::int AS collects,
        ${sharesExpr}::int AS shares
      FROM notes
      ${where}
      ORDER BY published_at DESC
      LIMIT 10
    `,
    values,
  );
  const [noteCount, exposureCount, interactionCount, rankAuthors, rankInteractions, trend] = await Promise.all([
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM notes ${where}`, values),
    queryOne<{ count: string }>(
      `SELECT COALESCE(SUM(exposure_count), 0)::text AS count FROM notes ${where}`,
      values,
    ),
    queryOne<{ count: string }>(
      `SELECT COALESCE(SUM(${interactionsExpr}), 0)::text AS count FROM notes ${where}`,
      values,
    ),
    queryRows<{ count: number; name: string }>(
      `
        SELECT author AS name, COUNT(*)::int AS count
        FROM notes
        ${where}
        GROUP BY author
        ORDER BY count DESC, author
        LIMIT 5
      `,
      values,
    ),
    queryRows<{ count: number; name: string }>(
      `
        SELECT author AS name, COALESCE(SUM(${interactionsExpr}), 0)::int AS count
        FROM notes
        ${where}
        GROUP BY author
        ORDER BY count DESC, author
        LIMIT 5
      `,
      values,
    ),
    queryRows<{
      collects: number;
      comments: number;
      date: string;
      exposure_count: number;
      interactions: number;
      likes: number;
      note_count: number;
      shares: number;
    }>(
      `
        SELECT
          to_char(date_trunc('day', published_at), 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS note_count,
          COALESCE(SUM(exposure_count), 0)::int AS exposure_count,
          COALESCE(SUM(likes), 0)::int AS likes,
          COALESCE(SUM(${commentsExpr}), 0)::int AS comments,
          COALESCE(SUM(${collectsExpr}), 0)::int AS collects,
          COALESCE(SUM(${sharesExpr}), 0)::int AS shares,
          COALESCE(SUM(${interactionsExpr}), 0)::int AS interactions
        FROM notes
        ${where}
        GROUP BY date_trunc('day', published_at)
        ORDER BY date_trunc('day', published_at)
      `,
      values,
    ),
  ]);
  const noteCountValue = Number(noteCount?.count ?? 0);
  const exposureCountValue = Number(exposureCount?.count ?? 0);
  const interactionCountValue = Number(interactionCount?.count ?? 0);

  return {
    notes: notes.map((note) => ({
      author: note.author,
      collects: note.collects,
      comments: note.comments,
      exposureCount: note.exposure_count,
      key: note.id,
      likes: note.likes,
      params: note.params ?? [],
      publishedAt: formatDateTime(note.published_at),
      shares: note.shares,
      title: note.title,
    })),
    rankAuthors,
    rankInteractions,
    stats: [
      { label: "总笔记数量", trend: "来自数据库", value: formatInteger(noteCountValue) },
      { label: "总曝光量", trend: "来自数据库", value: formatExposure(exposureCountValue) },
      { label: "总互动数", trend: "点赞/评论/收藏/分享", value: formatInteger(interactionCountValue) },
    ],
    trend: trend.map((point) => ({
      collects: point.collects,
      comments: point.comments,
      date: point.date,
      exposureCount: point.exposure_count,
      interactions: point.interactions,
      likes: point.likes,
      noteCount: point.note_count,
      shares: point.shares,
    })),
  };
}

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function getFallbackHeatmap(heatRows: ConsoleStrategyResponse["heatRows"]) {
  return {
    columns: ["模拟客户", "置业顾问"],
    rows: heatRows.map((row) => row.label),
    values: heatRows.flatMap((row, yIndex) => [
      [0, yIndex, Number.parseFloat(row.left) || 0] as [number, number, number],
      [1, yIndex, Number.parseFloat(row.right) || 0] as [number, number, number],
    ]),
  };
}

function getGeneratedHeatRows(
  columns: string[],
  rows: string[],
  values: Array<[number, number, number]>,
): ConsoleStrategyResponse["heatRows"] {
  return rows.map((label, yIndex) => {
    const left = values.find(([x, y]) => x === 0 && y === yIndex)?.[2] ?? 0;
    const right = values.find(([x, y]) => x === 1 && y === yIndex)?.[2] ?? 0;

    return {
      label,
      left: columns[0] ? formatPercent(left) : "-",
      leftWidth: `${Math.max(left, 8)}%`,
      right: columns[1] ? formatPercent(right) : "-",
      rightWidth: `${Math.max(right, 8)}%`,
    };
  });
}

function buildStrategyResponse(
  notes: NoteStrategyRow[],
  fallbackHeatRows: ConsoleStrategyResponse["heatRows"],
  keywords: ConsoleStrategyResponse["keywords"],
): ConsoleStrategyResponse {
  const personaMap = new Map<string, { exposure: number; interactions: number; noteCount: number }>();
  const modeMap = new Map<string, { collects: number; comments: number; likes: number; shares: number }>();
  const sentimentMap = new Map<string, number>();
  const comboMap = new Map<string, Map<string, number>>();

  notes.forEach((note) => {
    const params = note.params ?? [];
    const persona = getParamValue(params, "人设");
    const mode = getParamValue(params, "模式");
    const sentiment = getParamValue(params, "情绪");
    const rowKey = `${mode}-${sentiment}`;
    const interactions = toInteractionTotal(note);
    const personaValue = personaMap.get(persona) ?? { exposure: 0, interactions: 0, noteCount: 0 };
    const modeValue = modeMap.get(mode) ?? { collects: 0, comments: 0, likes: 0, shares: 0 };
    const comboValue = comboMap.get(rowKey) ?? new Map<string, number>();

    personaMap.set(persona, {
      exposure: personaValue.exposure + note.exposure_count,
      interactions: personaValue.interactions + interactions,
      noteCount: personaValue.noteCount + 1,
    });
    modeMap.set(mode, {
      collects: modeValue.collects + note.collects,
      comments: modeValue.comments + note.comments,
      likes: modeValue.likes + note.likes,
      shares: modeValue.shares + note.shares,
    });
    sentimentMap.set(sentiment, (sentimentMap.get(sentiment) ?? 0) + 1);
    comboValue.set(persona, (comboValue.get(persona) ?? 0) + interactions);
    comboMap.set(rowKey, comboValue);
  });

  const personaEffect = Array.from(personaMap.entries())
    .map(([label, value]) => ({
      interactionRate: value.exposure > 0
        ? Number(((value.interactions / value.exposure) * 100).toFixed(2))
        : Number((value.interactions / Math.max(value.noteCount, 1)).toFixed(2)),
      label,
      noteCount: value.noteCount,
    }))
    .sort((a, b) => b.noteCount - a.noteCount)
    .slice(0, 6);
  const modeEffect = Array.from(modeMap.entries())
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => (b.likes + b.collects + b.comments + b.shares) - (a.likes + a.collects + a.comments + a.shares))
    .slice(0, 6);
  const sentimentEffect = Array.from(sentimentMap.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count);
  const columns = personaEffect.map((item) => item.label).slice(0, 4);
  const rows = Array.from(comboMap.entries())
    .map(([label, values]) => ({
      label,
      total: Array.from(values.values()).reduce((sum, value) => sum + value, 0),
      values,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const heatmap = rows.length && columns.length
    ? {
      columns,
      rows: rows.map((row) => row.label),
      values: rows.flatMap((row, yIndex) => {
        const rowMax = Math.max(...columns.map((column) => row.values.get(column) ?? 0), 1);

        return columns.map((column, xIndex) => [
          xIndex,
          yIndex,
          Number((((row.values.get(column) ?? 0) / rowMax) * 100).toFixed(1)),
        ] as [number, number, number]);
      }),
    }
    : getFallbackHeatmap(fallbackHeatRows);

  return {
    heatRows: rows.length
      ? getGeneratedHeatRows(heatmap.columns, heatmap.rows, heatmap.values)
      : fallbackHeatRows,
    heatmap,
    keywordHeat: keywords.slice(0, 5).map((item) => ({
      label: item.label,
      segments: [{ label: "互动数", value: item.count }],
    })),
    keywords,
    modeEffect,
    personaEffect,
    sentimentEffect,
  };
}

export async function getStrategy(filters: ConsoleStrategyQuery = {}): Promise<ConsoleStrategyResponse> {
  const columns = await getNotesColumnInfo();
  const { values, where } = buildNotesWhere(filters, columns);
  const commentsExpr = metricExpression(columns.comments);
  const collectsExpr = metricExpression(columns.collects);
  const sharesExpr = metricExpression(columns.shares);
  const [heatRows, keywords, notes] = await Promise.all([
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
    queryRows<NoteStrategyRow>(
      `
        SELECT
          params,
          COALESCE(likes, 0)::int AS likes,
          COALESCE(exposure_count, 0)::int AS exposure_count,
          ${commentsExpr}::int AS comments,
          ${collectsExpr}::int AS collects,
          ${sharesExpr}::int AS shares
        FROM notes
        ${where}
        ORDER BY published_at DESC
      `,
      values,
    ),
  ]);

  return buildStrategyResponse(
    notes,
    heatRows.map((row) => ({
      label: row.label,
      left: row.left,
      leftWidth: row.left_width,
      right: row.right,
      rightWidth: row.right_width,
    })),
    keywords,
  );
}

export async function getMaterials(): Promise<ConsoleMaterialsResponse> {
  const [materials, total, filterGroups] = await Promise.all([
    queryRows<MaterialRow>(
      `
        SELECT
          m.id,
          m.title,
          m.category,
          m.platforms,
          m.size_text AS size,
          m.file_size_bytes,
          m.image_url,
          m.stage,
          m.tone,
          m.uploader,
          m.color,
          m.accent,
          m.uploaded_at,
          m.updated_at,
          COALESCE(array_remove(array_agg(t.tag) FILTER (WHERE t.kind = 'attribute'), NULL), '{}') AS attribute_tags,
          COALESCE(array_remove(array_agg(t.tag) FILTER (WHERE t.kind = 'selling'), NULL), '{}') AS selling_tags
        FROM materials m
        LEFT JOIN material_tags t ON t.material_id = m.id
        GROUP BY m.id
        ORDER BY m.updated_at DESC, m.id DESC
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
  const category = getTextFormValue(formData, "category") || "内页图";
  const stage = getTextFormValue(formData, "stage") || "待配置";
  const platforms = getUploadPlatforms(formData);

  const uploadedFiles = [];

  for (const [index, file] of files.entries()) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const title = file.name || `upload-${Date.now()}-${index}`;
    const result = await withTransaction(async (client) => {
      const materialResult = await client.query<{ id: number }>(
        `
          INSERT INTO materials (
            title, category, platforms, size_text, file_size_bytes, image_url, stage, tone, uploader,
            color, accent, uploaded_at, updated_at
          )
          VALUES ($1, $2, $3, '-', $4, '', $5, '-', '系统上传', '#d8dee9', '#64748b', now(), now())
          RETURNING id
        `,
        [title, category, platforms, file.size, stage],
      );
      const id = materialResult.rows[0]?.id;

      if (!id) {
        throw new Error("素材写入失败");
      }

      await client.query(
        `
          INSERT INTO material_files (material_id, original_name, mime_type, size_bytes, bytes)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [id, title, mimeType, file.size, bytes],
      );
      await client.query(
        "UPDATE materials SET image_url = $2 WHERE id = $1",
        [id, `/api/console/materials/${id}/image`],
      );

      return { id };
    });

    uploadedFiles.push({
      id: result.id,
      imageUrl: `/api/console/materials/${result.id}/image`,
      name: title,
      size: file.size,
      status: "uploaded",
      type: mimeType,
    });
  }

  return {
    files: uploadedFiles,
    total: uploadedFiles.length,
  };
}

export async function getMaterialFile(id: number) {
  return queryOne<MaterialFileRow>(
    `
      SELECT original_name, mime_type, size_bytes, bytes
      FROM material_files
      WHERE material_id = $1
    `,
    [id],
  );
}

export async function updateMaterial(
  id: number,
  patch: {
    category?: string;
    platforms?: string[];
    stage?: string;
  },
) {
  const row = await queryOne<MaterialRow>(
    `
      UPDATE materials
      SET
        category = COALESCE($2, category),
        platforms = COALESCE($3, platforms),
        stage = COALESCE($4, stage),
        updated_at = now()
      WHERE id = $1
      RETURNING id, title, category, platforms, size_text AS size, file_size_bytes, image_url,
        stage, tone, uploader, color, accent, uploaded_at, updated_at,
        '{}'::text[] AS attribute_tags,
        '{}'::text[] AS selling_tags
    `,
    [id, patch.category ?? null, patch.platforms ?? null, patch.stage ?? null],
  );

  return row ? mapMaterial(row) : null;
}

export async function deleteMaterials(ids: number[]) {
  if (ids.length === 0) {
    return 0;
  }

  const result = await query("DELETE FROM materials WHERE id = ANY($1::int[])", [ids]);
  return result.rowCount ?? 0;
}

export async function setMaterialTags(id: number, kind: "attribute" | "selling", tags: string[]) {
  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM material_tags WHERE material_id = $1 AND kind = $2",
      [id, kind],
    );

    for (const tag of tags.filter(Boolean)) {
      await client.query(
        `
          INSERT INTO material_tags (material_id, kind, tag)
          VALUES ($1, $2, $3)
          ON CONFLICT (material_id, kind, tag) DO NOTHING
        `,
        [id, kind, tag],
      );
    }

    await client.query("UPDATE materials SET updated_at = now() WHERE id = $1", [id]);
  });
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
    allowPrimaryCreate: true,
    modeOptions: ["对比式", "晒单式", "盘点式", "求助式", "种草式"],
    stats: getConfigStats(tree),
    title: "图片卖点配置",
    tree,
  };
}

export async function createConfigItem({
  configType,
  description,
  modes = [],
  name,
  parentId,
}: {
  configType: ConfigType;
  description?: string;
  modes?: string[];
  name: string;
  parentId: string | null;
}) {
  const id = `${configType === "selling_point" ? "sell" : "attr"}-${randomUUID()}`;

  await withTransaction(async (client) => {
    const sortResult = await client.query<{ sort_order: number }>(
      `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order
        FROM config_nodes
        WHERE config_type = $1 AND parent_id IS NOT DISTINCT FROM $2
      `,
      [configType, parentId],
    );

    await client.query(
      `
        INSERT INTO config_nodes (id, config_type, parent_id, name, description, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [id, configType, parentId, name, description ?? null, sortResult.rows[0]?.sort_order ?? 1],
    );

    for (const mode of modes) {
      await client.query(
        "INSERT INTO config_node_modes (node_id, mode) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, mode],
      );
    }
  });

  return id;
}

export async function updateConfigItem(
  id: string,
  patch: {
    description?: string;
    modes?: string[];
    name?: string;
  },
) {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE config_nodes
        SET
          name = COALESCE($2, name),
          description = $3,
          updated_at = now()
        WHERE id = $1
      `,
      [id, patch.name ?? null, patch.description ?? null],
    );

    if (patch.modes) {
      await client.query("DELETE FROM config_node_modes WHERE node_id = $1", [id]);

      for (const mode of patch.modes) {
        await client.query(
          "INSERT INTO config_node_modes (node_id, mode) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, mode],
        );
      }
    }
  });
}

export async function deleteConfigItem(id: string) {
  const result = await query("DELETE FROM config_nodes WHERE id = $1", [id]);
  return result.rowCount ?? 0;
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

export async function createProperty(input: Omit<PropertyRow, "createdAt" | "key">) {
  const row = await queryOne<PropertyDbRow>(
    `
      INSERT INTO properties (id, developer, name, type, stage, address, description)
      VALUES ($1, $2, $3, $4, $5, $6, '-')
      RETURNING id, developer, name, type, stage, address, description, created_at
    `,
    [randomUUID(), input.developer, input.name, input.type, input.stage, input.address],
  );

  return row ? mapProperty(row) : null;
}

export async function updateProperty(id: string, input: Partial<Omit<PropertyRow, "createdAt" | "key">>) {
  const row = await queryOne<PropertyDbRow>(
    `
      UPDATE properties
      SET
        developer = COALESCE($2, developer),
        name = COALESCE($3, name),
        type = COALESCE($4, type),
        stage = COALESCE($5, stage),
        address = COALESCE($6, address)
      WHERE id = $1
      RETURNING id, developer, name, type, stage, address, description, created_at
    `,
    [id, input.developer ?? null, input.name ?? null, input.type ?? null, input.stage ?? null, input.address ?? null],
  );

  return row ? mapProperty(row) : null;
}

export async function deleteProperty(id: string) {
  const result = await query("DELETE FROM properties WHERE id = $1", [id]);
  return result.rowCount ?? 0;
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
        SELECT id, name, phone, role, property, status, created_at
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

export async function createUser(input: {
  name: string;
  password: string;
  phone: string;
  property: string;
  role: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const row = await queryOne<UserDbRow>(
    `
      INSERT INTO console_users (id, name, phone, role, property, password_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, name, phone, role, property, status, created_at
    `,
    [randomUUID(), input.name, input.phone, input.role, input.property, passwordHash],
  );

  return row ? mapUser(row) : null;
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    password?: string;
    phone?: string;
    property?: string;
    role?: string;
    status?: string;
  },
) {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const row = await queryOne<UserDbRow>(
    `
      UPDATE console_users
      SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        role = COALESCE($4, role),
        property = COALESCE($5, property),
        status = COALESCE($6, status),
        password_hash = COALESCE($7, password_hash)
      WHERE id = $1
      RETURNING id, name, phone, role, property, status, created_at
    `,
    [
      id,
      input.name ?? null,
      input.phone ?? null,
      input.role ?? null,
      input.property ?? null,
      input.status ?? null,
      passwordHash,
    ],
  );

  return row ? mapUser(row) : null;
}

export async function deleteUser(id: string) {
  const result = await query("DELETE FROM console_users WHERE id = $1", [id]);
  return result.rowCount ?? 0;
}
