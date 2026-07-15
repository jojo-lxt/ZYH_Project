# 按项目隔离 + 扫码中间页 + 小程序随机预览 设计文档

日期:2026-07-09
项目:content-publisher-console (next_react_ts_tailwind)

## 1. 目标(用户需求)

1. 用户手动在数据库注册;登录后可创建多个项目,项目归创建者所有(`properties.owner_id`)。

   > 注:本文档是 2026-07-09 的点位设计。早期版本注册时需绑定一个 `console_users.property`,后续已移除该字段;账号角色从两级演进为三级(超级管理员 / 管理员 / 员工),详见 `docs/superpowers/specs/2026-07-15-rbac-stages-caption-design.md`。
2. 顶栏左上角可切换项目;**每个项目的图片素材、标签、卖点、以及概览/策略看板数据都相互隔离**。
3. 扫描项目自带的二维码 → 匿名公开中间页(手机)→ 跳转到小红书小程序 → 预览 → 发布到小红书。小程序展示的是**当前项目素材库里随机抽取的 5 张图**,可刷新换一批;文案由 AI 生成。

## 2. 现状(审计结论,为什么要改)

- `materials`、`config_nodes`(标签+卖点)、`notes`、`strategy_*` **都没有项目字段**,全局共享。
- 顶栏切换器存在(`ConsoleShell.tsx`),但 `currentProject` 只做显示,**从不传给后端**;所有查询无项目过滤。切换器目前是「摆设」。
- 二维码目前指向 `/properties/detail`(登录态项目详情页),**没有接到小程序流程**。
- `/drafts/[id]` + `DraftPlatformBridge` 已经是「中间页 → 跳小程序」的雏形,但小程序按 `draftId` 拉的是 **冻结快照**(`draft_images` 自带图片字节),与「从素材库随机取、可刷新」是两套逻辑。

## 3. 设计决策(已锁定)

| 项 | 决定 |
|---|---|
| 隔离范围 | 给 `materials`、`config_nodes`、`notes`、`strategy_heat_rows`、`strategy_keywords` 加 `property_id`(外键 → `properties.id`)。子表(`material_files`/`material_tags`/`config_node_modes`)随父表级联,不单独加。概览是 `notes` 的聚合,自动隔离。 |
| 隔离键 | 按 `properties.id`(外键),不用项目名。 |
| 当前项目传递 | `currentProject` 改为存**项目 id**;RTK Query baseQuery 注入请求头 `X-Project-Id`;后端读它做过滤/写入。 |
| 存量数据 | **全部清空(开发阶段,含 `console_users`/`properties`),只保留结构**。整库 TRUNCATE 后加 `NOT NULL` 列,再用 `seed-admin.sql` 重建管理员,项目重新创建。 |
| 扫码流程 | 项目二维码 → 公开中间页 `/p/<projectId>`(无需登录)→ 跳小程序,带 `projectId` + 预览接口 URL。 |
| 随机预览接口 | `GET /api/public/projects/<id>/preview?count=5`,公开;从该项目 `materials` 随机取 ≤5 张 + AI 文案;返回 `{ images, caption }`;刷新=再调一次。 |
| AI 文案 | 服务端;OpenAI 兼容国内大模型,厂商用 env 配(`LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`);**文本方案**(项目名+标签+卖点)→ `{ title, body, topics[] }`;失败兜底模板文案。密钥只在服务端。 |
| 发布存档 | 新表 `publish_records`,**存引用不存图**(`property_id` + `material_ids int[]` + `title`/`body`/`topics` + `published_at`)。 |
| 二维码指向 | 改 `buildPropertyDetailUrl` → 生成公开中间页 URL(`<base>/p/<projectId>`)。`APP_BASE_URL` 仍是基础域名。 |
| 旧快照 | `drafts`/`draft_images` 及 `/drafts/[id]` 快照流程本流程不再用;保留表结构(按「只保留结构」),代码入口后续清理。 |

## 4. 数据模型变更

- 加列:`ALTER TABLE <t> ADD COLUMN property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE`(先 TRUNCATE 保证空表);建索引 `(property_id, ...)`。对象:materials、config_nodes、notes、strategy_heat_rows、strategy_keywords。
- 新表:`publish_records(id, property_id FK, material_ids int[], title, body, topics text[], publisher text, channel text, created_at)`。
- 清空(开发阶段整库重置,`database/reset-dev.sql`):`TRUNCATE` 所有表 `RESTART IDENTITY CASCADE`,随后 `schema.sql` + `seed-admin.sql` 重建。
- `schema.sql` 的 CREATE TABLE 同步补 `property_id`,让新部署一步到位。

## 5. 接口清单

新增(公开,无鉴权):
- `GET /api/public/projects/[id]/preview?count=5` → `{ images, caption }`
- `GET /api/public/projects/[id]/images/[filename]`(公开图片,替代 draft 图片路径)
- `POST /api/public/projects/[id]/publish` → 写 `publish_records`

改动(登录态,加项目过滤):
- `/api/console/materials`、`/materials/[id]`、`/materials/upload`、`/config/*`、`/overview`、`/strategy` 等——读写都按 `X-Project-Id` 过滤/落库。

## 6. 前端 / 小程序变更

- `consoleSlice`:`currentProject` 语义改为项目 id;`ConsoleShell` 切换器用 id,初始值 = 用户绑定项目对应的 id(或第一个项目)。
- RTK `consoleApi` baseQuery:注入 `X-Project-Id`。
- 新公开页 `/p/[projectId]`:复用 `DraftPlatformBridge` 的中间页 UI,按 projectId 跳小程序。
- 小程序 `xhs-miniprogram/pages/draft/index.js`:改成按 projectId 调 `/preview`,渲染图+文案,加「刷新」重新拉一批;发布调 `/publish`。

## 7. 分步实现计划(每步可独立验证)

- **P1 地基:按项目隔离**
  - schema 加列 + TRUNCATE + 索引;`consoleSlice`/`ConsoleShell` 用项目 id;baseQuery 注 `X-Project-Id`;后端所有 materials/config/notes/strategy 查询与写入按 `property_id`。
  - 验证:建两个项目,切换,确认素材/标签/卖点/概览/策略互相看不到。
- **P2 公开随机预览 + AI 文案**
  - `/api/public/projects/[id]/preview`(随机 materials)+ AI 文案模块(env 配 + 兜底);公开图片路由。
  - 验证:请求接口拿到 5 张随机图 + 文案;刷新换一批。
- **P3 扫码流程接线**
  - 公开中间页 `/p/[projectId]`;改 `buildPropertyDetailUrl` → 中间页 URL。
  - 验证:打开二维码 URL → 中间页 → 跳小程序链接参数正确。
- **P4 小程序改造**:按 projectId 拉预览、刷新、渲染;发布调用。
- **P5 发布存档**:`publish_records` 表 + `/publish` 接口。验证:发布后落一行引用数据、无图片字节。
- **P6 清理**:退役 `drafts`/`draft_images` 代码入口(表结构保留)。

每步完成后同步更新 `README.md` / `PROJECT_CONTEXT.md` / `SERVER_SETUP.md`(用户要求)。

## 8. 已确认(2026-07-09)

1. **清空边界**:开发阶段,**整库全清**(含 `console_users`/`properties`),`seed-admin.sql` 重建管理员,项目重新创建。
2. **公开中间页路径**:新路径 `/p/[projectId]`。
3. **发布存档字段**:`material_ids` + `title`/`body`/`topics` + 发布人 `publisher` + 渠道 `channel` + 时间。
