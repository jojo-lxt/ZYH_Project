import * as consoleRepository from "@/server/console/consoleRepository";
import type { ConsoleOverviewQuery, ConsoleStrategyQuery } from "@/shared/types/console";

export async function getConsoleOverview(filters: ConsoleOverviewQuery = {}) {
  return consoleRepository.getOverview(filters);
}

export async function getConsoleStrategy(filters: ConsoleStrategyQuery = {}) {
  return consoleRepository.getStrategy(filters);
}

export async function getConsoleMaterials() {
  return consoleRepository.getMaterials();
}

export async function updateConsoleMaterial(
  id: number,
  patch: {
    category?: string;
    platforms?: string[];
    stage?: string;
  },
) {
  return consoleRepository.updateMaterial(id, patch);
}

export async function deleteConsoleMaterials(ids: number[]) {
  return consoleRepository.deleteMaterials(ids);
}

export async function setConsoleMaterialTags(
  id: number,
  kind: "attribute" | "selling",
  tags: string[],
) {
  return consoleRepository.setMaterialTags(id, kind, tags);
}

export async function getMaterialUploadOptions() {
  return consoleRepository.getMaterialUploadOptions();
}

export async function createMaterialUpload(formData: FormData) {
  return consoleRepository.createMaterialUpload(formData);
}

export async function getConsoleMaterialFile(id: number) {
  return consoleRepository.getMaterialFile(id);
}

export async function getConsoleTagConfig() {
  return consoleRepository.getTagConfig();
}

export async function getConsoleSellingPointConfig() {
  return consoleRepository.getSellingPointConfig();
}

export async function createConsoleConfigItem(
  configType: "selling_point" | "tag",
  body: {
    description?: string;
    modes?: string[];
    name?: string;
    parentId?: string | null;
  },
) {
  const name = body.name?.trim();

  if (!name) {
    throw new Error("名称不能为空");
  }

  return consoleRepository.createConfigItem({
    configType,
    description: body.description?.trim() || undefined,
    modes: body.modes ?? [],
    name,
    parentId: body.parentId ?? null,
  });
}

export async function updateConsoleConfigItem(
  id: string,
  body: {
    description?: string;
    modes?: string[];
    name?: string;
  },
) {
  return consoleRepository.updateConfigItem(id, {
    description: body.description?.trim() || undefined,
    modes: body.modes,
    name: body.name?.trim(),
  });
}

export async function deleteConsoleConfigItem(id: string) {
  return consoleRepository.deleteConfigItem(id);
}

export async function getConsoleProperties() {
  return consoleRepository.getProperties();
}

export async function createConsoleProperty(body: {
  address?: string;
  developer?: string;
  name?: string;
  stage?: string;
  type?: string;
}) {
  if (!body.developer?.trim() || !body.name?.trim()) {
    throw new Error("开发商和项目名称不能为空");
  }

  return consoleRepository.createProperty({
    address: body.address?.trim() ?? "",
    developer: body.developer.trim(),
    name: body.name.trim(),
    stage: body.stage?.trim() || "现房在售",
    type: body.type?.trim() || "住宅",
  });
}

export async function updateConsoleProperty(
  id: string,
  body: {
    address?: string;
    developer?: string;
    name?: string;
    stage?: string;
    type?: string;
  },
) {
  return consoleRepository.updateProperty(id, {
    address: body.address?.trim(),
    developer: body.developer?.trim(),
    name: body.name?.trim(),
    stage: body.stage?.trim(),
    type: body.type?.trim(),
  });
}

export async function deleteConsoleProperty(id: string) {
  return consoleRepository.deleteProperty(id);
}

export async function getConsolePropertyDetail(id: string) {
  return consoleRepository.getPropertyDetail(id);
}

export async function getConsoleUsers() {
  return consoleRepository.getUsers();
}

export async function createConsoleUser(body: {
  name?: string;
  password?: string;
  phone?: string;
  property?: string;
  role?: string;
}) {
  const phone = body.phone?.trim() ?? "";

  if (!body.name?.trim() || !phone) {
    throw new Error("用户名和手机号不能为空");
  }

  if (!/^1\d{10}$/.test(phone)) {
    throw new Error("请输入 11 位手机号");
  }

  if (!body.password || body.password.length < 8) {
    throw new Error("新用户密码至少需要 8 位");
  }

  return consoleRepository.createUser({
    name: body.name.trim(),
    password: body.password,
    phone,
    property: body.property?.trim() || "-",
    role: body.role?.trim() || "游客",
  });
}

export async function updateConsoleUser(
  id: string,
  body: {
    name?: string;
    password?: string;
    phone?: string;
    property?: string;
    role?: string;
    status?: string;
  },
) {
  const phone = body.phone?.trim();

  if (phone && !/^1\d{10}$/.test(phone)) {
    throw new Error("请输入 11 位手机号");
  }

  if (body.password && body.password.length < 8) {
    throw new Error("新密码至少需要 8 位");
  }

  return consoleRepository.updateUser(id, {
    name: body.name?.trim(),
    password: body.password || undefined,
    phone,
    property: body.property?.trim(),
    role: body.role?.trim(),
    status: body.status?.trim(),
  });
}

export async function deleteConsoleUser(id: string) {
  return consoleRepository.deleteUser(id);
}
