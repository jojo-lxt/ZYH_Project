import * as consoleRepository from "@/server/console/consoleRepository";
import type { Role, AccessScope } from "@/server/console/consoleRepository";
import type { ConsoleOverviewQuery, ConsoleStrategyQuery } from "@/shared/types/console";
import type { AuthUser } from "@/shared/types/auth";

// 三级权限:超级管理员看全部;管理员看自己拥有的项目;员工看被分配的项目。
function scopeOf(user: AuthUser): AccessScope {
  return { role: user.role as Role, userId: user.id };
}

// 创建者能新建哪些角色(超级管理员账号只由 seed / SQL 维护,不在表单里创建)。
const CREATABLE: Record<Role, Role[]> = {
  超级管理员: ["管理员", "员工"],
  管理员: ["员工"],
  员工: [],
};

// 校验并收窄:员工的项目必须 ⊆ 其所属管理员名下项目,且至少 1 个。
async function resolveEmployeeProjects(managerId: string, wanted: string[]): Promise<string[]> {
  const owned = new Set(await consoleRepository.getProjectIdsOwnedBy(managerId));
  const picked = Array.from(new Set(wanted)).filter((id) => owned.has(id));
  if (picked.length === 0) {
    throw new Error("请至少为员工分配 1 个项目");
  }
  return picked;
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

export async function getConsoleUsers(user: AuthUser) {
  if (user.role === "员工") throw new Error("无权访问用户管理");
  return consoleRepository.getUsers(scopeOf(user));
}

export async function getConsoleUserProjectIds(id: string, user: AuthUser) {
  if (user.role === "员工") throw new Error("无权访问用户管理");
  return consoleRepository.getUserProjectIds(id);
}

export async function createConsoleUser(
  body: {
    name?: string;
    password?: string;
    phone?: string;
    role?: string;
    managerId?: string;
    projectIds?: string[];
  },
  creator: AuthUser,
) {
  if (creator.role === "员工") throw new Error("无权创建用户");

  const name = body.name?.trim();
  const phone = body.phone?.trim() ?? "";

  if (!name || !phone) {
    throw new Error("用户名和手机号不能为空");
  }
  if (!/^1\d{10}$/.test(phone)) {
    throw new Error("请输入 11 位手机号");
  }
  if (!body.password || body.password.length < 8) {
    throw new Error("新用户密码至少需要 8 位");
  }

  const creatorRole = creator.role as Role;
  let role: Role;
  let managerId: string | null;
  let projectIds: string[];

  if (creatorRole === "管理员") {
    role = "员工";
    managerId = creator.id;
    projectIds = await resolveEmployeeProjects(creator.id, body.projectIds ?? []);
  } else {
    // 超级管理员
    const wanted = (body.role?.trim() ?? "") as Role;
    if (!CREATABLE["超级管理员"].includes(wanted)) {
      throw new Error("角色只能是「管理员」或「员工」");
    }
    role = wanted;
    if (role === "员工") {
      const mgr = body.managerId?.trim();
      if (!mgr || (await consoleRepository.getUserRole(mgr)) !== "管理员") {
        throw new Error("请为员工指定一个所属管理员");
      }
      managerId = mgr;
      projectIds = await resolveEmployeeProjects(mgr, body.projectIds ?? []);
    } else {
      managerId = null;
      projectIds = [];
    }
  }

  return consoleRepository.createUser({ name, phone, password: body.password, role, managerId, projectIds });
}

export async function updateConsoleUser(
  id: string,
  body: {
    name?: string;
    password?: string;
    phone?: string;
    role?: string;
    status?: string;
    managerId?: string;
    projectIds?: string[];
  },
  editor: AuthUser,
) {
  if (editor.role === "员工") throw new Error("无权修改用户");

  const phone = body.phone?.trim();
  if (phone && !/^1\d{10}$/.test(phone)) {
    throw new Error("请输入 11 位手机号");
  }
  if (body.password && body.password.length < 8) {
    throw new Error("新密码至少需要 8 位");
  }

  if (editor.role === "管理员") {
    // 只能改自己名下员工;不能改角色/所属管理员;项目仍限自己名下
    const targetManager = await consoleRepository.getUserManagerId(id);
    if (targetManager !== editor.id) throw new Error("无权修改该用户");
    const projectIds = body.projectIds ? await resolveEmployeeProjects(editor.id, body.projectIds) : undefined;
    return consoleRepository.updateUser(
      id,
      { name: body.name?.trim(), phone, password: body.password || undefined, status: body.status?.trim() },
      projectIds,
    );
  }

  // 超级管理员:可改角色/所属/项目
  const role = body.role?.trim() ? (body.role.trim() as Role) : undefined;
  const managerId = body.managerId?.trim();
  const projectIds = body.projectIds
    ? await resolveEmployeeProjects(managerId ?? (await consoleRepository.getUserManagerId(id)) ?? "", body.projectIds)
    : undefined;
  return consoleRepository.updateUser(
    id,
    { name: body.name?.trim(), phone, password: body.password || undefined, status: body.status?.trim(), role, managerId },
    projectIds,
  );
}

export async function deleteConsoleUser(id: string, user: AuthUser) {
  if (user.role === "员工") throw new Error("无权删除用户");
  if (user.role === "管理员") {
    const targetManager = await consoleRepository.getUserManagerId(id);
    if (targetManager !== user.id) throw new Error("无权删除该用户");
  }
  return consoleRepository.deleteUser(id);
}
