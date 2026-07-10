import "server-only";
import { queryOne, queryRows } from "@/server/db";

type PublicMaterialFileRow = {
  bytes: Buffer;
  mime_type: string;
  original_name: string;
  size_bytes: number;
};

// 项目存在则返回名字,否则 null(用于 404 判断 + 文案里用)。
export async function getProjectName(projectId: string) {
  const row = await queryOne<{ name: string }>("SELECT name FROM properties WHERE id = $1", [projectId]);

  return row?.name ?? null;
}

// 从该项目素材库随机取 count 张(不足则全部)。ORDER BY random() 实现「刷新换一批」。
export async function getRandomMaterialIds(projectId: string, count: number) {
  const rows = await queryRows<{ id: number }>(
    `
      SELECT id
      FROM materials
      WHERE property_id = $1
      ORDER BY random()
      LIMIT $2
    `,
    [projectId, count],
  );

  return rows.map((row) => row.id);
}

// 该项目的标签 / 卖点名字,喂给文案生成。
export async function getProjectConfigNames(projectId: string) {
  const rows = await queryRows<{ config_type: string; name: string }>(
    `
      SELECT config_type, name
      FROM config_nodes
      WHERE property_id = $1
      ORDER BY sort_order, name
    `,
    [projectId],
  );

  return {
    sellingPoints: rows.filter((row) => row.config_type === "selling_point").map((row) => row.name),
    tags: rows.filter((row) => row.config_type === "tag").map((row) => row.name),
  };
}

// 公开图片:按 (项目, 素材) 取字节,JOIN materials 确保素材属于该项目,防止跨项目取图。
export async function getPublicMaterialFile(projectId: string, materialId: number) {
  return queryOne<PublicMaterialFileRow>(
    `
      SELECT f.original_name, f.mime_type, f.size_bytes, f.bytes
      FROM material_files f
      JOIN materials m ON m.id = f.material_id
      WHERE f.material_id = $1 AND m.property_id = $2
    `,
    [materialId, projectId],
  );
}

// 发布存档:只记引用(material_ids)+ 文案 + 发布人/渠道,不复制图片字节。
export async function createPublishRecord(input: {
  body: string;
  channel: string;
  materialIds: number[];
  projectId: string;
  publisher: string;
  title: string;
  topics: string[];
}) {
  const row = await queryOne<{ id: number }>(
    `
      INSERT INTO publish_records (property_id, material_ids, title, body, topics, publisher, channel)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      input.projectId,
      input.materialIds,
      input.title,
      input.body,
      input.topics,
      input.publisher,
      input.channel,
    ],
  );

  return row?.id ?? null;
}
