import { queryOne, queryRows } from "@/server/db";
import type { DraftImage, XhsDraft } from "@/shared/types/drafts";

type DraftRow = {
  caption: string;
  created_at: Date | string;
  id: string;
  tags: string[];
  topics: string;
};

type DraftImageRow = {
  bytes?: Buffer;
  filename: string;
  id: string;
  mime_type: string;
  original_name: string;
  score: number;
  selected: boolean;
  size_bytes: number;
};

function cleanId(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, "");
}

function serializeImage(image: DraftImageRow, draftId: string): DraftImage {
  return {
    filename: image.filename,
    id: image.id,
    mimeType: image.mime_type,
    originalName: image.original_name,
    score: image.score,
    selected: image.selected,
    size: image.size_bytes,
    url: `/api/drafts/${draftId}/images/${image.filename}`,
  };
}

function formatCreatedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function hydrateDraft(row: DraftRow) {
  const imageRows = await queryRows<DraftImageRow>(
    `
      SELECT id, filename, original_name, mime_type, size_bytes, selected, score
      FROM draft_images
      WHERE draft_id = $1
      ORDER BY sort_order, created_at
    `,
    [row.id],
  );
  const images = imageRows.map((image) => serializeImage(image, row.id));

  return {
    caption: row.caption,
    createdAt: formatCreatedAt(row.created_at),
    id: row.id,
    images,
    selectedImages: images.filter((image) => image.selected),
    tags: row.tags ?? [],
    topics: row.topics,
  };
}

export async function getDraft(id: string): Promise<XhsDraft | null> {
  const safeId = cleanId(id);

  if (!safeId || safeId !== id) {
    return null;
  }

  const draft = await queryOne<DraftRow>(
    `
      SELECT id, created_at, tags, caption, topics
      FROM drafts
      WHERE id = $1
    `,
    [id],
  );

  return draft ? hydrateDraft(draft) : null;
}

export async function getDraftImage(id: string, filename: string) {
  const safeId = cleanId(id);

  if (!safeId || safeId !== id || filename.includes("/") || filename.includes("\\")) {
    return null;
  }

  const image = await queryOne<DraftImageRow>(
    `
      SELECT id, filename, original_name, mime_type, size_bytes, selected, score, bytes
      FROM draft_images
      WHERE draft_id = $1 AND filename = $2
    `,
    [id, filename],
  );

  if (!image?.bytes) {
    return null;
  }

  return {
    bytes: image.bytes,
    image: serializeImage(image, id),
  };
}
