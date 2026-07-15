# 三级权限 + 营销阶段统一 + 文案风格档案 —— 设计文档

- 日期:2026-07-15
- 状态:设计已定稿(含开放项决策),进入实现计划
- 范围:三项改动打包一起做。**权限**是大头(牵动最多文件);**营销阶段**、**文案风格档案**相对独立。

## 背景与目标

1. **权限从两级升到三级**:当前只有「管理员(看全部)/ 游客」。需要 **超级管理员 / 管理员 / 员工** 三级,支持「一个平台方 → 多个开发商(管理员)→ 各自的员工」这种层级,员工只在被分配的项目里干活。
2. **营销阶段下拉统一**:项目管理与图片素材两处的「营销阶段」下拉目前各用一套硬编码值(还各复制了一份、且值都对不齐)。合并成**一份前端共享常量**,改一处即处处生效。
3. **小红书文案可控**:一次性 AI 生成的文案风格漂。给每个项目一份**风格档案(风格 spec + 认可范例)**注入生成、并降低 temperature,让文案「风格稳定、内容有变化」。本期做最小落地(Approach A:建表 + 注入,用 SQL 维护,不做编辑 UI)。

---

## 第一部分:三级权限(RBAC)

### 1.1 角色定义与迁移

| 新角色 | 定位 | 可见项目 | 关键权限 | 迁移自 |
|---|---|---|---|---|
| **超级管理员** | 平台方 | 全部 | 所有项目/账号的增删查改 | 旧「管理员」 |
| **管理员** | 开发商,拥有自己的一批项目 | `owner_id = 自己` | 在自己项目里全权;创建/管理**自己名下**员工;把自己名下项目分配给员工 | 新增 |
| **员工** | 归某个管理员 | `user_project_access` 分给自己的 | 在被分配项目里**完整内容操作**;不能建/删项目,不能管理用户 | 旧「游客」重命名 |

「完整内容操作」= 上传/编辑/删除素材、编辑标签与卖点配置、发起发布。全站「游客」字样一律改为「员工」。

### 1.2 数据模型

`database/schema.sql`:

```sql
-- 角色约束从 (管理员/游客) 改为三级(更新上一步刚加的 console_users_role_check)
ALTER TABLE IF EXISTS console_users DROP CONSTRAINT IF EXISTS console_users_role_check;
ALTER TABLE IF EXISTS console_users
  ADD CONSTRAINT console_users_role_check
  CHECK (role IN ('超级管理员', '管理员', '员工'));

-- 员工归属的管理员(超管/管理员为 NULL)
ALTER TABLE IF EXISTS console_users
  ADD COLUMN IF NOT EXISTS manager_id text NULL REFERENCES console_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_console_users_manager ON console_users (manager_id);

-- 员工 ↔ 项目 的多对多授权(只对员工使用)
CREATE TABLE IF NOT EXISTS user_project_access (
  user_id     text NOT NULL REFERENCES console_users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_upa_user     ON user_project_access (user_id);
CREATE INDEX IF NOT EXISTS idx_upa_property ON user_project_access (property_id);
```

- `properties.owner_id` 语义变为「归属的管理员」(超管建的归超管),表结构不变。
- `database/seed-admin.sql`:管理员种子的 `role` 从 `'管理员'` 改为 `'超级管理员'`。

### 1.3 访问范围解析(统一入口)

统一 scope 形状(替换现有 `{ isAdmin, userId }`):

```ts
type Role = "超级管理员" | "管理员" | "员工";
type AccessScope = { role: Role; userId: string };
const isSuperAdmin = (r: Role) => r === "超级管理员";
```

- `userCanAccessProject(projectId, scope)`(`consoleRepository.ts`):
  - 超级管理员 → `true`
  - 管理员 → `EXISTS (SELECT 1 FROM properties WHERE id = projectId AND owner_id = userId)`
  - 员工 → `EXISTS (SELECT 1 FROM user_project_access WHERE user_id = userId AND property_id = projectId)`
- `getProperties(scope)`:
  - 超级管理员 → 全部
  - 管理员 → `WHERE owner_id = userId`
  - 员工 → `WHERE id IN (SELECT property_id FROM user_project_access WHERE user_id = userId)`
- `getMaterialFile(id, scope)`(图片接口,`<img>` 带 cookie 不带头,只能按用户归属判权):同样按上面三分支放行(超管全放;管理员限自己项目;员工限被分配项目)。
- `guard.ts` 的 `requireConsoleProject` 改为构造新的 `AccessScope` 并调 `userCanAccessProject`;越权返回 403「无权访问该项目」。

### 1.4 用户管理规则(服务端强校验,不靠前端)

- **getUsers(scope)**:超管→全部;管理员→`WHERE manager_id = userId`(只看自己名下员工);员工→接口 403(页面也不给入口)。展示需带上:角色、所属管理员名(join)、已分配项目(聚合)。
- **createUser(input, creatorScope)**:
  - 创建者=管理员:强制 `role='员工'`、`manager_id=创建者`、`projectIds ⊆ 创建者自己的项目`且**至少 1 个**。
  - 创建者=超管:`role ∈ {管理员, 员工}`;若建员工则必须指定 `managerId`(某个管理员)+ `projectIds ⊆ 该管理员的项目`且至少 1 个;若建管理员则无需 manager/项目。
  - 超管账号本身由 `seed-admin.sql` / SQL 维护,创建表单不提供「超级管理员」选项。
- **updateUser(id, input, editorScope)**:超管可改任何人;管理员只能改自己名下员工(姓名/手机/密码/状态 + 重新分配项目,项目仍限自己名下),不能把员工改成管理员、不能转移给别的管理员。
- **deleteUser(id, editorScope)**:超管删任意;管理员只能删自己名下员工。
  - 删除行为:删管理员会因 `properties.owner_id ON DELETE CASCADE` 连带删掉其名下项目(再级联素材等),其员工的 `manager_id` 置 NULL、`user_project_access` 行随外键清除 —— 员工变「无归属、无项目」的孤儿账号,由超管清理或改派。本期接受此行为,不额外做「删管理员前必须先处理员工」的拦截。
- 新增仓库函数:`setUserProjectAccess(userId, propertyIds)`(事务内先删后插)、`getUserProjectIds(userId)`(编辑表单回填)。

### 1.5 API 变更(`src/app/api/console/...`)

- `users` POST / `users/[id]` PATCH·DELETE:把 `auth.user`(创建者/编辑者)传进 service 做范围校验;`GET /users` 按 scope 过滤。
- payload(`consoleApi.ts`):`createUser` / `updateUser` 增加可选 `managerId`、`projectIds: string[]`。
- 其余 materials/config/overview/strategy/properties 路由已走 `requireConsoleProject` / `requireConsoleUser`,随 1.3 的 scope 泛化自动生效,无需逐一改。

### 1.6 前端变更(`PropertyPages.tsx` / `ConsoleShell.tsx`)

- **角色下拉**按当前登录者收窄:超管→`[管理员, 员工]`;管理员→`[员工]`(且禁用切换)。角色 Tag 支持三色。
- **员工表单**新增两项:①「所属管理员」下拉(仅超管可见可选;管理员建员工时隐藏、后端填自己);②「可访问项目」多选(选项 = 所属管理员的项目;至少选 1)。编辑时用 `getUserProjectIds` 回填。
  - 管理员建员工:选项直接取 `useGetPropertiesQuery`(已按 owner 收窄为自己的项目)。
  - 超管建员工:需按「所选管理员」过滤可访问项目 —— 需在项目列表数据里暴露归属管理员(如 `PropertyRow.ownerId/ownerName`),或提供「按管理员取项目」的接口;具体在实现计划里定。服务端始终校验 `projectIds ⊆ 该管理员的项目`。
- **用户表**列:角色、所属管理员、已分配项目(数量/名称)、状态、创建时间。搜索/筛选沿用姓名/手机(不恢复已删的「有权限的项目」旧列)。
- **菜单收窄**(`ConsoleShell` 已有 `currentUser.role`):`用户管理` 与 `项目管理` 均对**员工隐藏**(员工工作区 = 概览 + 图片素材;顶栏项目切换器仍可在被分配项目间切换)。两者对超管+管理员可见。
- 「游客」文案全站改「员工」。

---

## 第二部分:营销阶段统一(纯前端)

- 新建共享常量模块 **`src/features/console/shared/marketingStages.ts`**,导出规范清单(单一事实来源;后续改这一个文件即可)。
- 三处下拉改为 import 它,并**删除各自的硬编码**:
  - `properties/PropertyPages.tsx`:内联的 `["现房在售","交付和口碑期","强销期"]` 与表单默认值。
  - `materials/UploadImagePage.tsx`:局部 `const materialStageOptions = [...]`。
  - `materials/MaterialsPage.tsx`:局部 `const materialStageOptions = [...]`。
- 保留 `MaterialsPage` 里 `Array.from(new Set([...已有数据的 stage, ...共享清单]))` 的做法,让历史数据里的旧值仍能出现在筛选中。
- 后端与数据库**不动**(继续按自由文本存 stage,现有默认值 `现房在售` 保留)。
- **规范清单(已确认)**(已剔除混进来的项目专题名如「横沔和泗青公园专题笔记 / 张江金茂府品质交付 / 区域价值」,并合并「现房在售 / 现房在售期」;后续改这一个常量文件即可):

  ```
  亮相开放前 · 诚意登记期 · 强销期 · 现房在售 · 交付和口碑期 · 尾盘与清盘期 · 专项营销活动
  ```

---

## 第三部分:文案风格档案(Approach A · 最小落地)

### 3.1 数据模型

`database/schema.sql`:

```sql
-- 每个项目一份文案风格档案(1:1);不复制图片,只存风格与范例
CREATE TABLE IF NOT EXISTS caption_profiles (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  style_spec  text  NOT NULL DEFAULT '',   -- 风格/结构/硬约束的自然语言描述
  examples    jsonb NOT NULL DEFAULT '[]', -- 认可范例数组:[{title, body, topics[]}]
  constraints jsonb NOT NULL DEFAULT '{}', -- 可选:{maxLen, requiredTopics[], bannedWords[]}
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### 3.2 生成逻辑(`src/server/ai/caption.ts`)

- `CaptionInput` 增加可选 `styleSpec?: string`、`examples?: XhsCaption[]`(以及可选 constraints)。
- `buildMessages` 注入:system 里追加「本项目风格规范」(styleSpec)与「以下为本项目认可范例,风格/结构照此、内容不要照抄」(few-shot examples)。
- **temperature 0.9 → 0.5**(降漂;仍保留一定变化,满足「换一批」)。
- `fallbackCaption` 兜底保留:未配大模型/超时/解析失败仍返回可用文案。

### 3.3 接线与维护

- `publicRepository.ts` 新增 `getCaptionProfile(projectId)`;`publicService.getProjectPreview` 读取档案并传入 `generateXhsCaption`。
- 无档案(未维护)时 `styleSpec=''`、`examples=[]`,行为与现在一致。
- **维护方式(本期)**:用你与 DeepSeek 对话产出的**蒸馏档案**(风格 spec + 2~4 条范例),用 SQL `INSERT ... ON CONFLICT (property_id) DO UPDATE` 写入 `caption_profiles`。结构预留将来升级到控制台编辑 UI(Approach B),届时只加界面、无返工。

---

## 跨切面

### 文档同步(既定约定)

代码逻辑改动后同步更新 `README.md` / `PROJECT_CONTEXT.md` / `SERVER_SETUP.md`:三级角色模型与迁移、`SERVER_SETUP` 里种子管理员改为超级管理员、营销阶段单一来源、文案风格档案表与维护方式。

### 迁移 / 升级注意

- 开发库按既定做法整库清空 + 重新 seed:`seed-admin.sql` 产出**超级管理员**,其余账号/项目重建。
- 若对**已有库**升级:先 `UPDATE console_users SET role='超级管理员' WHERE role='管理员'; UPDATE console_users SET role='员工' WHERE role='游客';`**再**应用新的 role CHECK(否则旧值违反约束);已有员工需补 `manager_id` 与 `user_project_access`,否则登录后看不到任何项目。

### 验证

- `npx tsc --noEmit` 与 `next build` 必须绿。
- 手动:分别以超管/管理员/员工登录,核对「可见项目范围」「项目新建/删除是否被挡」「用户管理可见性与名下员工范围」「员工内容增删改可用」。
- 注:助手无法直连远程库(10.10.94.63),DB 相关只能靠上述 SQL + 本地构建校验,真机联调由用户执行。

### 非目标(本期不做)

- 员工的**逐人不同操作级别**(本期所有员工统一「完整内容操作」;按项目只有「可见/不可见」这一维度)。
- 员工归属**多个管理员**。
- 文案**多模态「看图写」**运行时生成;文案**控制台编辑 UI**(Approach B)。

### 建议实现顺序

1. 营销阶段共享常量(最独立,低风险,先落地)。
2. 三级权限:schema/seed → repository scope 泛化 + 用户管理/授权 → guard/service/api → 前端表单与菜单 → 文案。
3. 文案风格档案:schema → caption.ts 注入 + 降温 → public 接线。
4. 三份 md 文档同步。
5. `tsc` + `build` 校验。

---

## 决策记录(已定稿)

- 营销阶段规范清单:采用上面第二部分列出的 7 个值。
- 员工不看 `项目管理` 页(与 `用户管理` 一并对员工隐藏)。
