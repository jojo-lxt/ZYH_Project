import * as consoleRepository from "@/server/console/consoleRepository";
import type { ConsoleOverviewQuery, ConsoleStrategyQuery } from "@/shared/types/console";
import type { AuthUser } from "@/shared/types/auth";

// 普通用户只操作自己创建的项目;管理员(role='管理员')可操作全部。
function scopeOf(user: AuthUser) {
  return { isAdmin: user.role === "管理员", userId: user.id };
}

// 角色只允许「管理员」「游客」两种(与数据库 CHECK 约束一致),缺省为「游客」。
const VALID_ROLES = ["管理员", "游客"] as const;

function normalizeRole(role?: string) {
  const value = role?.trim() || "游客";

  if (!VALID_ROLES.includes(value as (typeof VALID_ROLES)[number])) {
    throw new Error(`角色只能是「管理员」或「游客」`);
  }

  return value;
}

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

export async function getConsoleMaterialFile(id: number, user: AuthUser) {
  return consoleRepository.getMaterialFile(id, scopeOf(user));
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

export async function getConsoleProperties(user: AuthUser) {
  return consoleRepository.getProperties(scopeOf(user));
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
  ownerId: string,
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
    ownerId,
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
  user: AuthUser,
) {
  return consoleRepository.updateProperty(
    id,
    {
      address: body.address?.trim(),
      developer: body.developer?.trim(),
      name: body.name?.trim(),
      stage: body.stage?.trim(),
      type: body.type?.trim(),
    },
    scopeOf(user),
  );
}

export async function deleteConsoleProperty(id: string, user: AuthUser) {
  return consoleRepository.deleteProperty(id, scopeOf(user));
}

export async function getConsolePropertyDetail(id: string, user: AuthUser) {
  return consoleRepository.getPropertyDetail(id, scopeOf(user));
}

export async function getConsoleUsers() {
  return consoleRepository.getUsers();
}

export async function createConsoleUser(body: {
  name?: string;
  password?: string;
  phone?: string;
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
    role: normalizeRole(body.role),
  });
}

export async function updateConsoleUser(
  id: string,
  body: {
    name?: string;
    password?: string;
    phone?: string;
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
    role: body.role === undefined ? undefined : normalizeRole(body.role),
    status: body.status?.trim(),
  });
}

export async function deleteConsoleUser(id: string) {
  return consoleRepository.deleteUser(id);
}
