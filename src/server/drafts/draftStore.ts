import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DraftImage, XhsDraft } from "@/shared/types/drafts";

type StoredImage = Omit<DraftImage, "url">;

type StoredDraft = Omit<XhsDraft, "images" | "selectedImages"> & {
  images: StoredImage[];
};

const draftRoot = path.join(process.cwd(), ".data", "xhs-drafts");
const maxImages = 12;
const maxImageSize = 12 * 1024 * 1024;

function getDraftDir(id: string) {
  return path.join(draftRoot, id);
}

function getDraftJsonPath(id: string) {
  return path.join(getDraftDir(id), "draft.json");
}

function cleanId(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, "");
}

function normalizeTag(value: string) {
  return value.replace(/^#+/, "").replace(/\s+/g, "").trim();
}

export function normalizeTags(values: string[]) {
  const seen = new Set<string>();

  return values
    .flatMap((value) => value.split(/[，,]/))
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function getImageExtension(file: File) {
  const fromMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  }[file.type];

  if (fromMime) {
    return fromMime;
  }

  const originalExtension = path.extname(file.name).toLowerCase();
  return originalExtension || ".jpg";
}

function serializeImage(image: StoredImage, draftId: string): DraftImage {
  return {
    ...image,
    url: `/api/drafts/${draftId}/images/${image.filename}`,
  };
}

function hydrateDraft(draft: StoredDraft): XhsDraft {
  const images = draft.images.map((image) => serializeImage(image, draft.id));

  return {
    ...draft,
    images,
    selectedImages: images.filter((image) => image.selected),
  };
}

function buildTopics(tags: string[]) {
  return tags.map((tag) => `#${tag}`).join(" ");
}

function buildCaption(tags: string[], selectedCount: number) {
  const primaryTag = tags[0] ?? "今日灵感";
  const secondaryTag = tags[1] ?? "值得记录";
  const topicText = buildTopics(tags);

  const lines = [
    `这组图很适合用来分享「${primaryTag}」的氛围。`,
    `画面里最打动人的是细节和整体感觉都很自然，${secondaryTag}的主题也比较突出。`,
    `我从素材里选了${selectedCount}张更适合发小红书的图片，适合配一条轻松但有推荐感的笔记。`,
  ];

  return topicText ? `${lines.join("\n\n")}\n\n${topicText}` : lines.join("\n\n");
}

function scoreImage(file: File, index: number) {
  const mimeBonus = file.type === "image/jpeg" || file.type === "image/png" ? 200_000 : 0;
  return file.size + mimeBonus - index;
}

export async function createDraftFromFormData(formData: FormData) {
  const uploadedImages = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File)
    .slice(0, maxImages);

  if (uploadedImages.length === 0) {
    throw new Error("至少需要上传一张图片");
  }

  const tags = normalizeTags(
    formData
      .getAll("tags")
      .filter((value): value is string => typeof value === "string"),
  );

  const id = randomUUID();
  const draftDir = getDraftDir(id);

  await mkdir(draftDir, { recursive: true });

  const scoredImages = uploadedImages.map((file, index) => ({
    file,
    index,
    score: scoreImage(file, index),
  }));

  const selectedIndexes = new Set(
    scoredImages
      .toSorted((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.index),
  );

  const images: StoredImage[] = [];

  for (const [index, file] of uploadedImages.entries()) {
    if (!file.type.startsWith("image/")) {
      throw new Error("只能上传图片文件");
    }

    if (file.size > maxImageSize) {
      throw new Error("单张图片不能超过 12MB");
    }

    const filename = `${String(index + 1).padStart(2, "0")}-${randomUUID()}${getImageExtension(file)}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(draftDir, filename), bytes);

    images.push({
      id: randomUUID(),
      filename,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      selected: selectedIndexes.has(index),
      score: scoredImages[index]?.score ?? 0,
    });
  }

  const selectedCount = images.filter((image) => image.selected).length;
  const draft: StoredDraft = {
    id,
    createdAt: new Date().toISOString(),
    tags,
    topics: buildTopics(tags),
    caption: buildCaption(tags, selectedCount),
    images,
  };

  await writeFile(getDraftJsonPath(id), JSON.stringify(draft, null, 2), "utf8");

  return hydrateDraft(draft);
}

export async function getDraft(id: string) {
  const safeId = cleanId(id);

  if (!safeId || safeId !== id) {
    return null;
  }

  try {
    const rawDraft = await readFile(getDraftJsonPath(id), "utf8");
    return hydrateDraft(JSON.parse(rawDraft) as StoredDraft);
  } catch {
    return null;
  }
}

export async function getDraftImage(id: string, filename: string) {
  const draft = await getDraft(id);

  if (!draft) {
    return null;
  }

  const image = draft.images.find((item) => item.filename === filename);

  if (!image) {
    return null;
  }

  const filePath = path.join(getDraftDir(id), image.filename);

  if (!filePath.startsWith(getDraftDir(id))) {
    return null;
  }

  return {
    image,
    bytes: await readFile(filePath),
  };
}
