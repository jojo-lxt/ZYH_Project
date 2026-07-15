# 三级权限 + 营销阶段统一 + 文案风格档案 —— 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把后台从两级权限升到「超级管理员 / 管理员 / 员工」三级,统一「营销阶段」下拉的单一来源,并给每个项目加一份 AI 文案风格档案(注入生成 + 降温)。

**Architecture:** 三级权限用「统一访问谓词」实现——`role='超级管理员' OR owner_id=自己 OR 员工被分配(user_project_access)」;项目**内容**访问(素材/配置/概览/策略/图片)走此谓词,项目**管理**(改/删/详情/新建)只放行 超管+归属管理员。营销阶段抽成一个前端共享常量。文案档案存 `caption_profiles`(每项目 1 行),生成时注入 system prompt。

**Tech Stack:** Next.js 16 App Router(route handler = Web `Request`,`params` 是 Promise)、PostgreSQL(`pg`:`query`/`queryOne`/`queryRows`/`withTransaction`)、RTK Query、Ant Design、TypeScript。

## Global Constraints

- **Next 版本特殊**:AGENTS.md 要求——动 Next 相关写法前先读 `node_modules/next/dist/docs/`,遵守弃用提示。`next start` 服务的是构建产物,改完必须 `next build` 才生效。
- **无单测框架**(用户已否掉 vitest):每个 task 的验证 = `npx tsc --noEmit`,涉及页面/构建产物的再加 `npm run build`;DB/角色行为由用户在真机手动验收(助手连不到远程库 10.10.94.63)。
- **文档同步**(既定约定):代码逻辑改完,同一轮内同步 `README.md` / `PROJECT_CONTEXT.md` / `SERVER_SETUP.md`(见 Task 12)。
- **Git**:用户习惯「让提交时才提交」,且当前在默认分支 `main`。执行前先建特性分支 `feat/rbac-stages-caption`;各 task 末尾的 commit 需用户点头(或用户一次性授权按计划提交)。commit message 结尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。
- **角色字面量**:全库统一用 `超级管理员` / `管理员` / `员工` 三个中文串,勿引入别名。
- **营销阶段规范值**(单一来源,勿再散落):`亮相开放前` `诚意登记期` `强销期` `现房在售` `交付和口碑期` `尾盘与清盘期` `专项营销活动`。

---

## 阶段 A —— 营销阶段统一(最独立,先做)

### Task 1: 营销阶段共享常量 + 三处下拉接入

**Files:**
- Create: `src/features/console/shared/marketingStages.ts`
- Modify: `src/features/console/properties/PropertyPages.tsx`(删内联 `["现房在售","交付和口碑期","强销期"]` 与默认值)
- Modify: `src/features/console/materials/UploadImagePage.tsx`(删局部 `materialStageOptions`)
- Modify: `src/features/console/materials/MaterialsPage.tsx`(删局部 `materialStageOptions`)

**Interfaces:**
- Produces: `export const MARKETING_STAGES: readonly string[]`;`export const DEFAULT_MARKETING_STAGE: string`(= `MARKETING_STAGES[0]`)。

- [ ] **Step 1: 建常量模块**

```ts
// src/features/console/shared/marketingStages.ts
// 营销阶段的唯一事实来源:项目管理 + 图片素材的下拉、以及各处默认值都引用这里。
// 后续增删阶段只改这一个文件(纯前端,不动后端/数据库)。
export const MARKETING_STAGES = [
  "亮相开放前",
  "诚意登记期",
  "强销期",
  "现房在售",
  "交付和口碑期",
  "尾盘与清盘期",
  "专项营销活动",
] as const;

export const DEFAULT_MARKETING_STAGE = MARKETING_STAGES[0];
```

- [ ] **Step 2: PropertyPages 接入**

- 顶部 import:`import { MARKETING_STAGES } from "@/features/console/shared/marketingStages";`
- 把 `stageOptions`(`PropertyPages.tsx:82` 附近)里内联的 `"现房在售","交付和口碑期","强销期"` 换成展开 `...MARKETING_STAGES`,保留 `[...properties.map((p) => p.stage), ...MARKETING_STAGES]` 去重写法,让历史数据的旧值仍出现在筛选里。
- `emptyPropertyDraft.stage`(`:45`)保持一个合法值即可(仍可用 `"现房在售"`,它在清单内)。

- [ ] **Step 3: UploadImagePage 接入**

- 删除 `UploadImagePage.tsx:17` 的 `const materialStageOptions = [...]` 整块。
- import:`import { MARKETING_STAGES } from "@/features/console/shared/marketingStages";`
- 用到处(`options={materialStageOptions.map(...)}`,`:366`)改用 `MARKETING_STAGES`。`useState("待配置")` 的初值保留(表示「未选择」占位,提交时映射逻辑不变)。

- [ ] **Step 4: MaterialsPage 接入**

- 删除 `MaterialsPage.tsx:55` 的 `const materialStageOptions = [...]` 整块。
- import 同上。
- `:430` 的 `options={materialStageOptions.map(...)}` 改 `MARKETING_STAGES`;`:743` 的 `Array.from(new Set([...materials.map(i=>i.stage), ...materialStageOptions]))` 改为 `...MARKETING_STAGES`。

- [ ] **Step 5: 验证**

Run: `npx tsc --noEmit` → 期望 exit 0
Run: `npm run build` → 期望成功(路由表输出)

- [ ] **Step 6: Commit**

```bash
git add src/features/console/shared/marketingStages.ts src/features/console/properties/PropertyPages.tsx src/features/console/materials/UploadImagePage.tsx src/features/console/materials/MaterialsPage.tsx
git commit -m "refactor(stages): 营销阶段抽成单一共享常量并接入三处下拉"
```

---

## 阶段 B —— 三级权限:数据层

### Task 2: schema + seed(角色约束 / manager_id / 授权表 / 文案表)

**Files:**
- Modify: `database/schema.sql`(结尾追加/更新)
- Modify: `database/seed-admin.sql`
- Modify: `database/reset-dev.sql`(TRUNCATE 列表补两张新表)

**Interfaces:**
- Produces: 表 `user_project_access(user_id, property_id)`;列 `console_users.manager_id`;`console_users_role_check` 改为三值;表 `caption_profiles`(供阶段 E 用,这里一并建)。

- [ ] **Step 1: schema.sql —— 更新角色约束 + manager_id + 授权表**

把上一轮加的 `console_users` 清理段(role check 那几行)替换/追加为:

```sql
ALTER TABLE IF EXISTS console_users DROP COLUMN IF EXISTS property;
ALTER TABLE IF EXISTS console_users DROP CONSTRAINT IF EXISTS console_users_role_check;
ALTER TABLE IF EXISTS console_users
  ADD CONSTRAINT console_users_role_check
  CHECK (role IN ('超级管理员', '管理员', '员工'));

-- 员工归属的管理员(超管/管理员为 NULL)
ALTER TABLE IF EXISTS console_users
  ADD COLUMN IF NOT EXISTS manager_id text NULL REFERENCES console_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_console_users_manager ON console_users (manager_id);

-- 员工 ↔ 项目 多对多授权(仅员工使用)
CREATE TABLE IF NOT EXISTS user_project_access (
  user_id     text NOT NULL REFERENCES console_users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_upa_user     ON user_project_access (user_id);
CREATE INDEX IF NOT EXISTS idx_upa_property ON user_project_access (property_id);
```

- [ ] **Step 2: schema.sql —— caption_profiles(阶段 E 一并建)**

```sql
-- 每个项目一份文案风格档案(1:1);只存风格与范例,不复制图片字节
CREATE TABLE IF NOT EXISTS caption_profiles (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  style_spec  text  NOT NULL DEFAULT '',
  examples    jsonb NOT NULL DEFAULT '[]',
  constraints jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: seed-admin.sql —— 种子管理员改超级管理员**

把 `VALUES (...) '管理员' ...` 里的角色串改为 `'超级管理员'`(ON CONFLICT 分支无需动,它取 `EXCLUDED.role`)。

- [ ] **Step 4: reset-dev.sql —— 补新表**

在 `TRUNCATE TABLE ...` 列表里加入 `user_project_access`、`caption_profiles`(放在依赖被清的表里即可,`CASCADE` 已在)。

- [ ] **Step 5: 验证(静态)**

助手连不到远程库;本 task 只做**语法自检**:通读 SQL 无拼写/引用错误。真机应用由用户执行(见 Task 12 的迁移说明)。

- [ ] **Step 6: Commit**

```bash
git add database/schema.sql database/seed-admin.sql database/reset-dev.sql
git commit -m "feat(rbac): schema 三级角色约束 + manager_id + user_project_access + caption_profiles 表"
```

### Task 3: 统一 scope 类型 + 共享类型字段

**Files:**
- Modify: `src/server/console/consoleRepository.ts`(定义并导出 `Role`/`AccessScope`,替换 `PropertyScope`)
- Modify: `src/shared/types/console.ts`(`PropertyRow` += owner 字段;`UserRow` += manager/projects 字段)

**Interfaces:**
- Produces:
  - `export type Role = "超级管理员" | "管理员" | "员工";`
  - `export type AccessScope = { role: Role; userId: string };`
  - `PropertyRow.ownerId: string`、`PropertyRow.ownerName: string`
  - `UserRow.managerId: string | null`、`UserRow.managerName: string | null`、`UserRow.projectKeys: string[]`、`UserRow.projectNames: string[]`
- Consumes: 无。

- [ ] **Step 1: 定义 Role / AccessScope,替换 PropertyScope**

在 `consoleRepository.ts` 把 `export type PropertyScope = { isAdmin: boolean; userId: string };` 替换为:

```ts
export type Role = "超级管理员" | "管理员" | "员工";
export type AccessScope = { role: Role; userId: string };
```

暂时把文件内其余 `PropertyScope` 的类型引用改成 `AccessScope`(具体查询体在 Task 4/5 改;这一步只让类型编过——把 `scope.isAdmin` 的用法先留着会报错,所以本 step 连同 Task 4 的查询改动一起提交更稳,见下)。

> 说明:Task 3 与 Task 4 对同一文件强耦合(改类型必然要改用到 `isAdmin` 的查询),因此**合并为一次提交**;Step 里仍分开描述,便于按顺序落键。

- [ ] **Step 2: 共享类型加字段**

```ts
// src/shared/types/console.ts —— PropertyRow 增加 owner 展示字段
export type PropertyRow = {
  key: string;
  developer: string;
  name: string;
  type: string;
  stage: string;
  address: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
};

// UserRow 增加 manager / 已分配项目
export type UserRow = {
  key: string;
  name: string;
  phone: string;
  role: string;
  status?: string;
  createdAt: string;
  managerId: string | null;
  managerName: string | null;
  projectKeys: string[];
  projectNames: string[];
};
```

（本 task 不单独验证/提交,与 Task 4 合并。）

### Task 4: 项目访问查询三级化

**Files:**
- Modify: `src/server/console/consoleRepository.ts`

**Interfaces:**
- Consumes:`AccessScope`(Task 3)。
- Produces(签名不变、语义三级化):
  - `getProperties(scope: AccessScope)` —— 返回项含 `ownerId/ownerName`
  - `userCanAccessProject(projectId: string, scope: AccessScope): Promise<boolean>`
  - `getMaterialFile(id: number, scope: AccessScope)`
  - `updateProperty(id, input, scope)` / `deleteProperty(id, scope)` / `getPropertyDetail(id, scope)`
  - 新增 `getProjectIdsOwnedBy(ownerId: string): Promise<string[]>`
  - 新增 `getUserRole(id: string): Promise<Role | null>`

- [ ] **Step 1: getProperties —— 三级谓词 + owner 字段**

```ts
export async function getProperties(scope: AccessScope): Promise<ConsolePropertiesResponse> {
  // 内容可见:超管全放;管理员看自己拥有的;员工看被分配的。
  const where = `
    ($1 = '超级管理员')
    OR (p.owner_id = $2)
    OR EXISTS (SELECT 1 FROM user_project_access upa WHERE upa.user_id = $2 AND upa.property_id = p.id)
  `;
  const params = [scope.role, scope.userId];
  const [properties, total] = await Promise.all([
    queryRows<PropertyDbRow>(
      `SELECT p.id, p.developer, p.name, p.type, p.stage, p.address, p.created_at,
              p.owner_id, COALESCE(o.name, '') AS owner_name
         FROM properties p
         LEFT JOIN console_users o ON o.id = p.owner_id
        WHERE ${where}
        ORDER BY p.created_at DESC, p.id`,
      params,
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM properties p WHERE ${where}`,
      params,
    ),
  ]);
  return { properties: properties.map(mapProperty), total: Number(total?.count ?? properties.length) };
}
```

同步:`PropertyDbRow` 加 `owner_id: string; owner_name: string;`;`mapProperty` 增 `ownerId: row.owner_id, ownerName: row.owner_name`。

- [ ] **Step 2: userCanAccessProject —— 内容访问谓词**

```ts
export async function userCanAccessProject(projectId: string, scope: AccessScope): Promise<boolean> {
  if (scope.role === "超级管理员") return true;
  const row = await queryOne<{ ok: number }>(
    `SELECT 1 AS ok
       FROM properties p
      WHERE p.id = $1
        AND ( p.owner_id = $2
              OR EXISTS (SELECT 1 FROM user_project_access upa
                          WHERE upa.user_id = $2 AND upa.property_id = p.id) )
      LIMIT 1`,
    [projectId, scope.userId],
  );
  return Boolean(row);
}
```

- [ ] **Step 3: getMaterialFile —— 同一内容谓词**

把现有 `WHERE f.material_id = $1 AND (p.owner_id = $2 OR $3)` 改为:

```ts
// 参数:[id, scope.role, scope.userId]
WHERE f.material_id = $1
  AND ( $2 = '超级管理员'
        OR p.owner_id = $3
        OR EXISTS (SELECT 1 FROM user_project_access upa
                    WHERE upa.user_id = $3 AND upa.property_id = p.id) )
```

- [ ] **Step 4: 项目管理类查询——只放行 超管+归属管理员(不含员工)**

`updateProperty` / `deleteProperty` / `getPropertyDetail` 里现有的 `(owner_id = $ OR $isAdmin)` 改为 `(owner_id = $userId OR $role = '超级管理员')`,参数换成 `scope.userId` / `scope.role`。**不加**员工分支——员工不能改/删/看项目详情。

- [ ] **Step 5: 新增两个辅助查询**

```ts
// 某管理员名下的项目 id(用于给员工分配项目时的子集校验)
export async function getProjectIdsOwnedBy(ownerId: string): Promise<string[]> {
  const rows = await queryRows<{ id: string }>(
    "SELECT id FROM properties WHERE owner_id = $1",
    [ownerId],
  );
  return rows.map((r) => r.id);
}

// 取某账号角色(校验 managerId 是否为管理员)
export async function getUserRole(id: string): Promise<Role | null> {
  const row = await queryOne<{ role: Role }>(
    "SELECT role FROM console_users WHERE id = $1 LIMIT 1",
    [id],
  );
  return row?.role ?? null;
}
```

- [ ] **Step 6: 验证**

Run: `npx tsc --noEmit` → exit 0(此时调用方 guard/service 仍是旧 scope,会报类型错——所以本文件改动与 Task 5、Task 6 的 guard/service 改动**同一提交**;若单独跑 tsc 未过属预期,完成 Task 6 后再统一验证)。

> 为保证「每次提交可编译」,阶段 B 的 Task 3+4+5 与阶段 C 的 Task 6 合并为**一次提交**(它们跨 repository/guard/service 强耦合于 scope 形状)。分 task 只为分段落键与审阅。

### Task 5: 用户管理 + 项目授权仓库函数

**Files:**
- Modify: `src/server/console/consoleRepository.ts`

**Interfaces:**
- Consumes:`AccessScope`。
- Produces:
  - `getUsers(scope: AccessScope): Promise<ConsoleUsersResponse>`(超管全部 / 管理员看名下员工;行含 manager_name + project_ids + project_names)
  - `createUser(input: { name; password; phone; role: Role; managerId: string | null; projectIds: string[] }): Promise<UserRow | null>`
  - `updateUser(id, input: { name?; password?; phone?; role?: Role; status?; managerId?: string | null }, projectIds?: string[]): Promise<UserRow | null>`
  - `setUserProjectAccess(userId: string, propertyIds: string[]): Promise<void>`
  - `getUserProjectIds(userId: string): Promise<string[]>`
  - `getUserManagerId(id: string): Promise<string | null>`
  - `deleteUser(id: string): Promise<number>`(不变;级联清 upa)

- [ ] **Step 1: UserDbRow 扩展 + mapUser**

`UserDbRow` 加:`manager_id: string | null; manager_name: string | null; project_ids: string[]; project_names: string[];`
`mapUser` 增:`managerId: row.manager_id, managerName: row.manager_name, projectKeys: row.project_ids ?? [], projectNames: row.project_names ?? []`。

- [ ] **Step 2: getUsers(scope) —— 作用域 + 聚合**

```ts
export async function getUsers(scope: AccessScope): Promise<ConsoleUsersResponse> {
  // 超管看全部;管理员只看自己名下员工(manager_id = 自己)。
  const where = `($1 = '超级管理员') OR (u.manager_id = $2)`;
  const params = [scope.role, scope.userId];
  const [users, total] = await Promise.all([
    queryRows<UserDbRow>(
      `SELECT u.id, u.name, u.phone, u.role, u.status, u.created_at, u.manager_id,
              m.name AS manager_name,
              COALESCE(array_agg(p.id)   FILTER (WHERE p.id   IS NOT NULL), '{}') AS project_ids,
              COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS project_names
         FROM console_users u
         LEFT JOIN console_users m   ON m.id = u.manager_id
         LEFT JOIN user_project_access upa ON upa.user_id = u.id
         LEFT JOIN properties p      ON p.id = upa.property_id
        WHERE ${where}
        GROUP BY u.id, m.name
        ORDER BY u.created_at DESC, u.id`,
      params,
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM console_users u WHERE ${where}`,
      params,
    ),
  ]);
  return { total: Number(total?.count ?? users.length), users: users.map(mapUser) };
}
```

- [ ] **Step 3: createUser —— 事务插入 user + 授权行**

```ts
export async function createUser(input: {
  name: string; password: string; phone: string;
  role: Role; managerId: string | null; projectIds: string[];
}) {
  const passwordHash = await hashPassword(input.password);
  return withTransaction(async (client) => {
    const id = randomUUID();
    const res = await client.query<UserDbRow>(
      `INSERT INTO console_users (id, name, phone, role, manager_id, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, name, phone, role, status, created_at, manager_id,
                 NULL::text AS manager_name, '{}'::text[] AS project_ids, '{}'::text[] AS project_names`,
      [id, input.name, input.phone, input.role, input.managerId, passwordHash],
    );
    for (const pid of input.projectIds) {
      await client.query(
        "INSERT INTO user_project_access (user_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, pid],
      );
    }
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  });
}
```

> `withTransaction(cb)` 的回调参数是**原生 pg `PoolClient`**(只有 `.query()`,返回 `{ rows }`),没有本模块的 `queryOne/queryRows` 包装。事务内一律用 `client.query<T>(...)` 再取 `.rows[0]`。

- [ ] **Step 4: updateUser —— 字段更新(可选重置授权)**

```ts
export async function updateUser(
  id: string,
  input: { name?: string; password?: string; phone?: string; role?: Role; status?: string; managerId?: string | null },
  projectIds?: string[],
) {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  return withTransaction(async (client) => {
    const res = await client.query<UserDbRow>(
      `UPDATE console_users SET
         name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         role = COALESCE($4, role),
         status = COALESCE($5, status),
         manager_id = COALESCE($6, manager_id),
         password_hash = COALESCE($7, password_hash)
       WHERE id = $1
       RETURNING id, name, phone, role, status, created_at, manager_id,
                 NULL::text AS manager_name, '{}'::text[] AS project_ids, '{}'::text[] AS project_names`,
      [id, input.name ?? null, input.phone ?? null, input.role ?? null, input.status ?? null, input.managerId ?? null, passwordHash],
    );
    if (projectIds) {
      await client.query("DELETE FROM user_project_access WHERE user_id = $1", [id]);
      for (const pid of projectIds) {
        await client.query("INSERT INTO user_project_access (user_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, pid]);
      }
    }
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  });
}
```

> 返回行的 `manager_name/project_*` 用占位;前端保存后会 `invalidatesTags(['Users'])` 重新拉 `getUsers` 拿到完整聚合,故此处占位可接受。

- [ ] **Step 5: setUserProjectAccess + getUserProjectIds**

```ts
export async function setUserProjectAccess(userId: string, propertyIds: string[]): Promise<void> {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM user_project_access WHERE user_id = $1", [userId]);
    for (const pid of propertyIds) {
      await client.query("INSERT INTO user_project_access (user_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, pid]);
    }
  });
}

export async function getUserProjectIds(userId: string): Promise<string[]> {
  const rows = await queryRows<{ property_id: string }>(
    "SELECT property_id FROM user_project_access WHERE user_id = $1",
    [userId],
  );
  return rows.map((r) => r.property_id);
}

// Task 6 更新/删除用户时校验「该员工是否归当前管理员」
export async function getUserManagerId(id: string): Promise<string | null> {
  const row = await queryOne<{ manager_id: string | null }>(
    "SELECT manager_id FROM console_users WHERE id = $1 LIMIT 1",
    [id],
  );
  return row?.manager_id ?? null;
}
```

（阶段 B 验证/提交随 Task 6 一起。）

---

## 阶段 C —— 三级权限:服务 + 接口层

### Task 6: guard / service / API 路由 / RTK payload

**Files:**
- Modify: `src/server/auth/guard.ts`
- Modify: `src/server/console/consoleService.ts`
- Modify: `src/app/api/console/users/route.ts`、`src/app/api/console/users/[id]/route.ts`
- Modify: `src/app/api/console/properties/route.ts`(新建项目挡员工)
- Modify: `src/store/consoleApi.ts`

**Interfaces:**
- Consumes:Task 3–5 的 repo 导出。
- Produces:
  - `scopeOf(user: AuthUser): AccessScope`
  - service:`getConsoleUsers(user)`、`createConsoleUser(body, creator)`、`updateConsoleUser(id, body, editor)`、`deleteConsoleUser(id, user)`,其余项目/素材接口的 scope 由 `scopeOf` 泛化。

- [ ] **Step 1: guard.ts —— 用新 scope 调 userCanAccessProject**

把 `requireConsoleProject` 里:

```ts
const canAccess = await userCanAccessProject(propertyId, {
  role: auth.user.role as Role,
  userId: auth.user.id,
});
```

（`import type { Role } from "@/server/console/consoleRepository";`;删掉旧的 `isAdmin` 构造。）

- [ ] **Step 2: consoleService.ts —— scopeOf + 角色校验工具**

```ts
import type { AuthUser } from "@/shared/types/auth";
import type { Role, AccessScope } from "@/server/console/consoleRepository";

function scopeOf(user: AuthUser): AccessScope {
  return { role: user.role as Role, userId: user.id };
}

const ALL_ROLES: Role[] = ["超级管理员", "管理员", "员工"];
// 创建者能新建哪些角色
const CREATABLE: Record<Role, Role[]> = {
  超级管理员: ["管理员", "员工"],
  管理员: ["员工"],
  员工: [],
};
```

把原来基于 `isAdmin` 的 `scopeOf` 全部替换;`getConsoleProperties/createConsoleProperty/updateConsoleProperty/deleteConsoleProperty/getConsolePropertyDetail/getConsoleMaterialFile` 改用新 `scopeOf`(签名不变,内部把 `{isAdmin}` 换成 `{role,userId}`)。删除上一轮加的旧 `normalizeRole`(两值),换成下面的三值校验。

- [ ] **Step 3: service —— 用户管理(创建)**

```ts
export async function getConsoleUsers(user: AuthUser) {
  if (user.role === "员工") throw new Error("无权访问用户管理");
  return consoleRepository.getUsers(scopeOf(user));
}

export async function createConsoleUser(
  body: { name?: string; phone?: string; password?: string; role?: string; managerId?: string; projectIds?: string[] },
  creator: AuthUser,
) {
  if (creator.role === "员工") throw new Error("无权创建用户");
  const name = body.name?.trim();
  const phone = body.phone?.trim() ?? "";
  if (!name || !phone) throw new Error("用户名和手机号不能为空");
  if (!/^1\d{10}$/.test(phone)) throw new Error("请输入 11 位手机号");
  if (!body.password || body.password.length < 8) throw new Error("新用户密码至少需要 8 位");

  const creatorRole = creator.role as Role;
  let role: Role;
  let managerId: string | null;
  let projectIds: string[];

  if (creatorRole === "管理员") {
    role = "员工";
    managerId = creator.id;
    projectIds = await resolveEmployeeProjects(creator.id, body.projectIds ?? []);
  } else {
    // 超管
    const wanted = (body.role?.trim() ?? "") as Role;
    if (!CREATABLE["超级管理员"].includes(wanted)) throw new Error("角色只能是「管理员」或「员工」");
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

// 校验并收窄:员工的项目必须 ⊆ 其管理员名下项目,且至少 1 个
async function resolveEmployeeProjects(managerId: string, wanted: string[]): Promise<string[]> {
  const owned = new Set(await consoleRepository.getProjectIdsOwnedBy(managerId));
  const picked = Array.from(new Set(wanted)).filter((id) => owned.has(id));
  if (picked.length === 0) throw new Error("请至少为员工分配 1 个项目");
  return picked;
}
```

- [ ] **Step 4: service —— 用户管理(更新 / 删除)**

```ts
export async function updateConsoleUser(
  id: string,
  body: { name?: string; phone?: string; password?: string; role?: string; status?: string; managerId?: string; projectIds?: string[] },
  editor: AuthUser,
) {
  if (editor.role === "员工") throw new Error("无权修改用户");
  const phone = body.phone?.trim();
  if (phone && !/^1\d{10}$/.test(phone)) throw new Error("请输入 11 位手机号");
  if (body.password && body.password.length < 8) throw new Error("新密码至少需要 8 位");

  if (editor.role === "管理员") {
    // 只能改自己名下员工;不能改角色/所属管理员;项目仍限自己名下
    const targetManager = await consoleRepository.getUserManagerId(id);
    if (targetManager !== editor.id) throw new Error("无权修改该用户");
    const projectIds = body.projectIds ? await resolveEmployeeProjects(editor.id, body.projectIds) : undefined;
    return consoleRepository.updateUser(id, {
      name: body.name?.trim(), phone, password: body.password || undefined, status: body.status?.trim(),
    }, projectIds);
  }

  // 超管:可改角色/所属/项目
  const role = body.role?.trim() as Role | undefined;
  const projectIds = body.projectIds
    ? await resolveEmployeeProjects(body.managerId?.trim() ?? (await consoleRepository.getUserManagerId(id)) ?? "", body.projectIds)
    : undefined;
  return consoleRepository.updateUser(id, {
    name: body.name?.trim(), phone, password: body.password || undefined, status: body.status?.trim(),
    role, managerId: body.managerId?.trim(),
  }, projectIds);
}

export async function deleteConsoleUser(id: string, user: AuthUser) {
  if (user.role === "员工") throw new Error("无权删除用户");
  if (user.role === "管理员") {
    const targetManager = await consoleRepository.getUserManagerId(id);
    if (targetManager !== user.id) throw new Error("无权删除该用户");
  }
  return consoleRepository.deleteUser(id);
}
```

新增仓库辅助 `getUserManagerId(id): Promise<string | null>`(SELECT manager_id …)——加到 Task 5 的函数集里(实现时补上;与 `getUserRole` 并列)。

- [ ] **Step 5: API 路由接线**

- `users/route.ts`:`GET` → `getConsoleUsers(auth.user)`;`POST` → `createConsoleUser(await request.json(), auth.user)`。
- `users/[id]/route.ts`:`PATCH` → `updateConsoleUser(id, await request.json(), auth.user)`;`DELETE` → `deleteConsoleUser(id, auth.user)`。
- `properties/route.ts` `POST`:开头加 `if (auth.user.role === "员工") return Response.json({ error: "无权新建项目" }, { status: 403 });`(其余不变,仍 `ownerId = auth.user.id`)。

- [ ] **Step 6: consoleApi.ts payload**

- `createUser` mutation 入参加 `managerId?: string; projectIds?: string[];`。
- `updateUser` 入参(`Partial<Omit<UserRow,...>> & {...}`)加 `managerId?: string; projectIds?: string[]; password?: string;`(注意 `UserRow` 现含 `managerId/projectKeys` 等,`Partial<Omit<...,'createdAt'|'key'>>` 会带出这些——按需显式挑字段,避免把 `projectNames` 之类只读展示字段当入参提交)。建议显式声明入参对象而非 `Partial<Omit<...>>`,列出:`{ id; name?; phone?; password?; role?; status?; managerId?; projectIds?: string[] }`。

- [ ] **Step 7: 验证(阶段 B+C 合并提交点)**

Run: `npx tsc --noEmit` → exit 0
Run: `npm run build` → 成功

- [ ] **Step 8: Commit**

```bash
git add src/server/console/consoleRepository.ts src/server/console/consoleService.ts src/server/auth/guard.ts src/shared/types/console.ts src/app/api/console/users src/app/api/console/properties/route.ts src/store/consoleApi.ts
git commit -m "feat(rbac): 三级访问谓词 + 用户管理作用域 + 员工项目授权(服务/接口/仓库)"
```

---

## 阶段 D —— 三级权限:前端

### Task 7: 当前用户上下文 + 菜单收窄

**Files:**
- Create: `src/features/console/components/CurrentUserContext.tsx`
- Modify: `src/features/console/components/ConsoleShell.tsx`

**Interfaces:**
- Produces:`export function useCurrentUser(): AuthUser`(在 Provider 内使用)、`CurrentUserProvider`。
- Consumes:`ConsoleShell` 已有的 `currentUser` prop。

- [ ] **Step 1: 建 Context**

```tsx
// src/features/console/components/CurrentUserContext.tsx
"use client";
import { createContext, useContext } from "react";
import type { AuthUser } from "@/shared/types/auth";

const CurrentUserContext = createContext<AuthUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): AuthUser {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser 必须在 CurrentUserProvider 内使用");
  return user;
}
```

- [ ] **Step 2: ConsoleShell 包 Provider + 菜单按角色收窄**

- import `CurrentUserProvider`;把渲染 `children` 的地方包上 `<CurrentUserProvider user={currentUser}>{children}</CurrentUserProvider>`。
- `sideItems`(`:129`)按角色过滤:员工去掉「功能配置」整组(含 `项目管理`+`用户管理`)。即:

```tsx
const isStaff = currentUser.role === "员工";
const sideItems: MenuProps["items"] = [
  { icon: <BarChartOutlined />, key: "overview", label: <Link href="/overview">概览</Link> },
  { children: [{ icon: <PictureOutlined />, key: "materials", label: <Link href="/materials">图片素材管理</Link> }],
    icon: <AppstoreOutlined />, key: "module", label: "模块管理" },
  ...(isStaff ? [] : [{
    children: [
      { icon: <ProjectOutlined />, key: "properties", label: <Link href="/properties">项目管理</Link> },
      { icon: <TeamOutlined />, key: "users", label: <Link href="/users">用户管理</Link> },
    ],
    icon: <FolderOpenOutlined />, key: "config", label: "功能配置",
  }]),
];
```

- [ ] **Step 3: 验证 + Commit**

Run: `npx tsc --noEmit` → 0;`npm run build` → 成功

```bash
git add src/features/console/components/CurrentUserContext.tsx src/features/console/components/ConsoleShell.tsx
git commit -m "feat(rbac): 当前用户上下文 + 员工隐藏项目/用户管理菜单"
```

### Task 8: 用户管理页三级化(角色/所属管理员/可访问项目)

**Files:**
- Modify: `src/features/console/properties/PropertyPages.tsx`(`UsersPage` 及其 `UserDraft`/`emptyUserDraft`)

**Interfaces:**
- Consumes:`useCurrentUser()`、`useGetPropertiesQuery`(返回含 `ownerId/ownerName`)、`useGetUsers/Create/Update/DeleteUserMutation`。

- [ ] **Step 1: draft 结构 + 当前角色**

- `UserDraft` 加:`managerId?: string; projectIds: string[];`(去掉已删的 property)。`emptyUserDraft` 增 `projectIds: []`,`role: "员工"`。
- `UsersPage` 顶部:`const me = useCurrentUser();` `const isSuper = me.role === "超级管理员";`

- [ ] **Step 2: 角色下拉按创建者收窄**

```tsx
const roleOptions = isSuper
  ? [{ label: "管理员", value: "管理员" }, { label: "员工", value: "员工" }]
  : [{ label: "员工", value: "员工" }];
```

（管理员创建时锁死「员工」。）

- [ ] **Step 3: 表单新增「所属管理员」(仅超管、且 role=员工 时显示)+「可访问项目」多选**

- 所属管理员选项:超管需要一份管理员列表。用 `useGetUsersQuery()` 结果里 `role==='管理员'` 过滤成 `{label:name, value:key}`。
- 可访问项目选项:`propertiesData.properties` 过滤——超管按所选 `draft.managerId` 的 `ownerId` 过滤;管理员用自己全部(`useGetPropertiesQuery` 已只返回自己的)。至少选 1。

```tsx
const managerOptions = (usersData?.users ?? [])
  .filter((u) => u.role === "管理员")
  .map((u) => ({ label: u.name, value: u.key }));

const assignableProjects = (propertiesData?.properties ?? [])
  .filter((p) => (isSuper ? p.ownerId === draft.managerId : true))
  .map((p) => ({ label: p.name, value: p.key }));
```

表单里(仅当 `draft.role === "员工"`)渲染:
- 超管:`所属管理员` Select(`value=draft.managerId`,onChange 同时清空 `projectIds`);
- 所有创建者:`可访问项目` 多选 `mode="multiple"`(`value=draft.projectIds`,options=`assignableProjects`)。

- [ ] **Step 4: 保存 payload + 编辑回填**

- `saveUser` 提交时带上 `role: draft.role, managerId: draft.managerId, projectIds: draft.projectIds`(管理员创建时 managerId 由后端填自己,可不传)。
- `openEditUser(user)`:回填 `role/status/...` 与 `projectIds: user.projectKeys ?? []`、`managerId: user.managerId ?? undefined`。

- [ ] **Step 5: 表格列 + 文案**

- 角色列 Tag 支持三色(如 超管=gold、管理员=success、员工=processing)。
- 加列:`所属管理员`(`managerName`)、`可访问项目`(`projectNames.join("、") || "-"`)。
- 全页「游客」字样改「员工」(校对 `emptyUserDraft.role`、任何 placeholder)。

- [ ] **Step 6: 验证 + Commit**

Run: `npx tsc --noEmit` → 0;`npm run build` → 成功

```bash
git add src/features/console/properties/PropertyPages.tsx
git commit -m "feat(rbac): 用户管理页三级化(角色/所属管理员/可访问项目分配)"
```

---

## 阶段 E —— 文案风格档案(Approach A)

### Task 9: caption_profiles 读取 + 注入生成 + 降温

**Files:**
- Modify: `src/server/public/publicRepository.ts`(新增 `getCaptionProfile`)
- Modify: `src/server/public/publicService.ts`(getProjectPreview 读取档案并传入)
- Modify: `src/server/ai/caption.ts`(`CaptionInput` 扩展 + `buildMessages` 注入 + temperature 0.5)

**Interfaces:**
- Produces:`getCaptionProfile(projectId): Promise<{ styleSpec: string; examples: XhsCaption[] } | null>`;`CaptionInput` 增 `styleSpec?: string; examples?: XhsCaption[]`。

- [ ] **Step 1: publicRepository.getCaptionProfile**

```ts
export async function getCaptionProfile(projectId: string): Promise<{ styleSpec: string; examples: XhsCaption[] } | null> {
  const row = await queryOne<{ style_spec: string; examples: unknown }>(
    "SELECT style_spec, examples FROM caption_profiles WHERE property_id = $1 LIMIT 1",
    [projectId],
  );
  if (!row) return null;
  const examples = Array.isArray(row.examples) ? (row.examples as XhsCaption[]) : [];
  return { styleSpec: row.style_spec ?? "", examples };
}
```

（`XhsCaption` 从 `@/server/ai/caption` import。）

- [ ] **Step 2: caption.ts —— 扩展入参 + 注入 + 降温**

- `CaptionInput` 加 `styleSpec?: string; examples?: XhsCaption[];`
- `buildMessages` 的 system 段追加(仅当有值时):

```ts
const styleBlock = input.styleSpec?.trim()
  ? `\n本项目文案风格规范(务必遵循):\n${input.styleSpec.trim()}`
  : "";
const exampleBlock = input.examples?.length
  ? `\n以下是本项目已认可的范例,请严格模仿其语气/结构/话题风格,但不要照抄内容:\n` +
    input.examples.slice(0, 4).map((e, i) =>
      `范例${i + 1} 标题:${e.title}\n正文:${e.body}\n话题:${(e.topics ?? []).join("、")}`).join("\n---\n")
  : "";
// system = 原有基础串 + styleBlock + exampleBlock
```

- 请求体 `temperature: 0.9` → `0.5`。

- [ ] **Step 3: publicService 接线**

`getProjectPreview` 里并行取档案,传入 `generateXhsCaption`:

```ts
const [materialIds, config, profile] = await Promise.all([
  getRandomMaterialIds(projectId, count),
  getProjectConfigNames(projectId),
  getCaptionProfile(projectId),
]);
const caption = await generateXhsCaption({
  projectName, sellingPoints: config.sellingPoints, tags: config.tags,
  styleSpec: profile?.styleSpec, examples: profile?.examples,
});
```

- [ ] **Step 4: 验证 + Commit**

Run: `npx tsc --noEmit` → 0;`npm run build` → 成功

```bash
git add src/server/public/publicRepository.ts src/server/public/publicService.ts src/server/ai/caption.ts
git commit -m "feat(caption): 每项目文案风格档案注入生成 + temperature 降到 0.5"
```

- [ ] **Step 5(交付说明,非代码):维护范例**

给用户一段可填的 SQL 模板(放进 SERVER_SETUP,见 Task 12):

```sql
INSERT INTO caption_profiles (property_id, style_spec, examples)
VALUES ('<项目id>', '<蒸馏后的风格/结构/硬约束>', '[{"title":"...","body":"...","topics":["...","..."]}]'::jsonb)
ON CONFLICT (property_id) DO UPDATE
  SET style_spec = EXCLUDED.style_spec, examples = EXCLUDED.examples, updated_at = now();
```

---

## 阶段 F —— 文档 + 验收

### Task 12: 同步 md 文档

**Files:** `README.md`、`PROJECT_CONTEXT.md`、`SERVER_SETUP.md`

- [ ] **Step 1:** PROJECT_CONTEXT —— 权限小节从「管理员/游客」改为三级模型(超管全放 / 管理员看自有 / 员工看被分配 `user_project_access`);营销阶段单一常量来源;文案风格档案表与注入。
- [ ] **Step 2:** SERVER_SETUP —— 种子账号是**超级管理员**;新增「已有库升级」步骤(先 `UPDATE console_users SET role='超级管理员' WHERE role='管理员'` 与 `... '员工' WHERE role='游客'`,再应用新 role CHECK;补 `manager_id` / `user_project_access`);附 `caption_profiles` 维护 SQL 模板。
- [ ] **Step 3:** README —— 角色与营销阶段常量、文案档案一句话说明。
- [ ] **Step 4: Commit**

```bash
git add README.md PROJECT_CONTEXT.md SERVER_SETUP.md
git commit -m "docs: 同步三级权限 / 营销阶段常量 / 文案风格档案"
```

### Task 13: 全量验证 + 人工验收清单

- [ ] `npx tsc --noEmit` 与 `npm run build` 全绿。
- [ ] 交给用户在真机(含远程库)按角色验收:
  - 超管:看到全部项目 + 用户管理可见全部账号 + 可建管理员/员工。
  - 管理员:只看自己项目;用户管理只见自己名下员工;建员工时项目多选仅限自己项目;能在自己项目里做全部内容操作。
  - 员工:左侧无「项目管理/用户管理」;顶栏只在被分配项目间切换;能对被分配项目做素材/配置/发布的完整操作;访问未分配项目的接口/图片被 403。
  - 文案:给某项目填 `caption_profiles` 后,小程序预览文案明显贴合范例风格;换一批仍有变化但不跑偏。

---

## 自查(计划 vs 规范)

- **覆盖**:三级角色(Task 2–8)、营销阶段统一(Task 1)、文案档案(Task 2 建表 + Task 9)、文档(Task 12)、迁移说明(Task 2/12)、超管建员工的项目按管理员过滤(Task 4 暴露 ownerId + Task 8 过滤 + Task 6 服务端子集校验)—— 均有对应 task。
- **无占位**:关键后端逻辑均给出完整代码;前端给出新增片段与精确插入点(存量 JSX 不整体复述,避免过期)。
- **类型一致**:`AccessScope{role,userId}` 贯穿 guard/service/repo;`Role` 三值贯穿;`PropertyRow.ownerId/ownerName`、`UserRow.managerId/managerName/projectKeys/projectNames` 在 Task 3 定义、Task 4/5/8 消费,一致。
- **已核实**:`withTransaction(cb)` 回调是原生 pg `PoolClient`(仅 `.query()` → `{rows}`),事务代码已按此写(不用 `queryOne`);`getUserManagerId` 已在 Task 5 定义、Task 6 消费。
- **执行注意**:阶段 B(Task 3/4/5)与阶段 C(Task 6)跨文件强耦合于 scope 形状,**单独跑 tsc 未过属预期**,合并到 Task 6 Step 7 统一验证与提交。
