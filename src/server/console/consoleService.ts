import * as consoleRepository from "@/server/console/consoleRepository";
import type { ConsoleOverviewQuery, ConsoleStrategyQuery } from "@/shared/types/console";

export async function getConsoleOverview(propertyId: string, filters: ConsoleOverviewQuery = {}) {
  return consoleRepository.getOverview(propertyId, filters);
}

export async function getConsoleStrategy(propertyId: string, filters: ConsoleStrategyQuery = {}) {
  return consoleRepository.getStrategy(propertyId, filters);
}

export async function getConsoleMaterials(propertyId: string) {
  return consoleRepository.getMaterials(propertyId);
}

export async function updateConsoleMaterial(
  id: number,
  propertyId: string,
  patch: {
    category?: string;
    platforms?: string[];
    stage?: string;
  },
) {
  return consoleRepository.updateMaterial(id, propertyId, patch);
}

export async function deleteConsoleMaterials(ids: number[], propertyId: string) {
  return consoleRepository.deleteMaterials(ids, propertyId);
}

export async function setConsoleMaterialTags(
  id: number,
  propertyId: string,
  kind: "attribute" | "selling",
  tags: string[],
) {
  return consoleRepository.setMaterialTags(id, propertyId, kind, tags);
}

export async function getMaterialUploadOptions(propertyId: string) {
  return consoleRepository.getMaterialUploadOptions(propertyId);
}

export async function createMaterialUpload(formData: FormData, propertyId: string) {
  return consoleRepository.createMaterialUpload(formData, propertyId);
}

export async function getConsoleMaterialFile(id: number) {
  return consoleRepository.getMaterialFile(id);
}

export async function getConsoleTagConfig(propertyId: string) {
  return consoleRepository.getTagConfig(propertyId);
}

export async function getConsoleSellingPointConfig(propertyId: string) {
  return consoleRepository.getSellingPointConfig(propertyId);
}

export async function createConsoleConfigItem(
  configType: "selling_point" | "tag",
  propertyId: string,
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
    propertyId,
  });
}

export async function updateConsoleConfigItem(
  id: string,
  propertyId: string,
  body: {
    description?: string;
    modes?: string[];
    name?: string;
  },
) {
  return consoleRepository.updateConfigItem(id, propertyId, {
    description: body.description?.trim() || undefined,
    modes: body.modes,
    name: body.name?.trim(),
  });
}

export async function deleteConsoleConfigItem(id: string, propertyId: string) {
  return consoleRepository.deleteConfigItem(id, propertyId);
}

export async function getConsoleProperties() {
  return consoleRepository.getProperties();
}

export async function createConsoleProperty(
  body: {
    address?: string;
    developer?: string;
    name?: string;
    stage?: string;
    type?: string;
  },
  detailBaseUrl: string,
) {
  if (!body.developer?.trim() || !body.name?.trim()) {
    throw new Error("开发商和项目名称不能为空");
  }

  return consoleRepository.createProperty(
    {
      address: body.address?.trim() ?? "",
      developer: body.developer.trim(),
      name: body.name.trim(),
      stage: body.stage?.trim() || "现房在售",
      type: body.type?.trim() || "住宅",
    },
    detailBaseUrl,
  );
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
