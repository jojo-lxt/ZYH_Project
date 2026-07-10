# 项目上下文交接文档

本文档用于新对话或交接时快速理解项目目标、当前实现状态、已知缺口和修改注意事项。

## 一句话概括

这是一个基于 Next.js App Router 的内容发布管理系统，主要面向“小红书/微信内容草稿生成”场景：后台管理图片素材、标签、卖点、项目和用户；用户扫码进入 H5 中间页选择平台；小程序读取草稿内容并承接后续平台发布能力。

## 当前目标

最终业务流程：

1. 后台用户上传图片素材并配置标签、卖点、类型、平台、营销阶段。
2. 后台基于素材生成草稿和可扫码访问的 H5 中间页链接。
3. 手机扫码打开 H5 中间页。
4. 用户选择小红书或微信。
5. H5 跳转对应小程序。
6. 小程序展示草稿预览。
7. 用户确认后点击“发小红书”或“发朋友圈”。
8. 小程序调用平台开放能力，把图片、文案和话题交给真实草稿发布页。
9. 用户在平台 App 中最终确认发布。

注意：真实发布能力必须依赖小红书/微信官方开放能力和审核权限。普通 H5 不能稳定、合规地把图片和文案写入真实平台草稿页。

## 技术栈

- Next.js `16.2.7`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Ant Design `6.4.3`
- `@ant-design/icons`
- `@ant-design/nextjs-registry`
- Redux Toolkit / RTK Query / React Redux
- PostgreSQL / `pg`
- ECharts
- `qrcode.react`

开发命令：

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Next.js 注意事项

项目根目录 `AGENTS.md` 要求：

> This is NOT the Next.js you know. This version has breaking changes. Read relevant guide in `node_modules/next/dist/docs/` before writing code.

修改 Next.js 路由、Route Handler、Server/Client Component 边界、配置项前，应先阅读本地文档：

```text
node_modules/next/dist/docs/
```

当前 `next.config.ts`：

```ts
const nextConfig = {
  allowedDevOrigins: ["10.10.94.62"],
};
```

不要随意删除 `allowedDevOrigins`，否则在服务器 IP 访问 dev server 时可能被 Next 拦截。

## 服务器登录和部署用户

当前腾讯云服务器使用 Ubuntu 镜像默认用户登录：

```bash
ssh ubuntu@<服务器公网IP>
```

部署文档里的项目目录按 `ubuntu` 用户维护：

```text
/home/ubuntu/content-publisher-console
```

不要把 SSH 用户名直接改成 `zyh`。如果未来要改用 `zyh` 用户，需要先在 Linux 系统里创建该用户、配置 sudo 权限、SSH key、PM2 startup 和项目目录权限。

## 主要路由

控制台页面位于 `src/app/(console)/`，URL 不包含 `(console)`。

```text
/login                              登录
/overview                           数据看板
/materials                          图片素材管理
/materials/tag-config               图片标签配置
/materials/selling-point-config     图片卖点配置
/materials/upload-image             上传图片
/materials/upload-video             上传视频，占位
/properties                         项目管理
/properties/detail                  项目详情
/users                              用户管理
/p/[projectId]                      项目扫码中间页(公开,二维码指向这里 → 跳小程序)
/drafts/[id]                        旧:单条草稿平台选择中间页(将退役)
```

后台 Shell：

```text
src/features/console/components/ConsoleShell.tsx
```

顶栏项目切换按**项目 id**工作,当前项目 id 放在 **URL 查询参数 `?project=`** 里(刷新后仍停在同一项目;`ConsoleShell` 用 `useSearchParams` 读、切换时 `router.replace` 改),默认取用户的第一个项目。**项目按创建者归属**:`properties.owner_id` 指向创建者,`getProperties` 只返回当前用户的项目(`role='管理员'` 看全部),`requireConsoleProject` 校验用户能否访问该项目、防止用请求头越权;图片接口(`<img>` 带不了头但带 cookie)改按**用户归属**过滤(`getMaterialFile`)。选中的项目 id 通过 RTK Query baseQuery 注入的 `X-Project-Id` 请求头发给后端;`materials`、`config_nodes`(标签/卖点)、`notes`、`strategy_*` 的读写都按 `property_id` 隔离,切换项目即切换数据。图片走 `<img>` 加载、无法带请求头,所以图片接口只做登录校验、不按项目过滤(见 `getMaterialFile` 注释)。服务端用 `requireConsoleProject(request)` 统一校验登录态 + 取当前项目 id。**注意**:项目 id 虽然是通过 `X-Project-Id` 头传的,但每个按项目隔离的 RTK Query 都把当前项目 id 作为**参数**传入(从而进入缓存键),并在项目未选定时 `skip` 不发请求 —— 这样切换项目会因缓存键变化自动重拉,首次也不会发出不带项目 id 的空请求(见 `ConfigPage`/`MaterialsPage`/`OverviewDashboard`/`UploadImagePage` 里的 `useGet*Query(currentProject, { skip: !currentProject })`)。**不要**改回用 `resetApiState` 清缓存:它会把刚拉到的数据一并清掉、导致「接口返回了数据但页面不显示」。

## 登录和鉴权

当前登录已经接入后端数据库，不再是前端 `localStorage` 模拟。

相关文件：

```text
src/features/auth/components/LoginPage.tsx
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
src/server/auth/session.ts
src/server/auth/password.ts
src/server/auth/guard.ts
```

机制：

- 登录接口校验 `console_users.password_hash`
- 成功后写入 `auth_sessions`
- 浏览器持有 `zyh_console_session` HttpOnly cookie
- 控制台布局和 API route 通过 `requireConsoleUser()` 校验登录态

未完成：

- 微信登录未接入
- 忘记密码只是提示联系管理员
- 自助注册/开通账号未接入

## 后台 API

Route Handler 位于：

```text
src/app/api/
```

主要 API：

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/public/projects/[id]/preview                随机5张图 + AI文案(公开,扫码用)
GET  /api/public/projects/[id]/materials/[mid]/image  素材图(公开,扫码用)
POST /api/public/projects/[id]/publish                发布存档(公开,小程序调)

GET  /api/console/overview
GET  /api/console/strategy

GET  /api/console/materials
PATCH /api/console/materials/[id]
PUT  /api/console/materials/[id]/tags
GET  /api/console/materials/[id]/image
POST /api/console/materials/upload
GET  /api/console/materials/upload-options

GET  /api/console/config/tags
POST /api/console/config/tags
PATCH /api/console/config/tags/[id]
DELETE /api/console/config/tags/[id]

GET  /api/console/config/selling-points
POST /api/console/config/selling-points
PATCH /api/console/config/selling-points/[id]
DELETE /api/console/config/selling-points/[id]

GET  /api/console/properties
POST /api/console/properties
PATCH /api/console/properties/[id]
DELETE /api/console/properties/[id]

GET  /api/console/users
POST /api/console/users
PATCH /api/console/users/[id]
DELETE /api/console/users/[id]

GET  /api/drafts/[id]
GET  /api/drafts/[id]/images/[filename]
```

后端服务层：

```text
src/server/console/consoleService.ts
src/server/console/consoleRepository.ts
src/server/drafts/draftStore.ts
src/server/db.ts
```

扩展数据库读写时，优先改 `src/server/**`，尽量保持 `src/app/api/**` 的 HTTP 入口和前端 RTK Query 调用稳定。

## 数据库

建表/补字段脚本：

```text
database/schema.sql
```

该脚本使用 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`，重复执行不会清空数据。

管理员初始化脚本：

```text
database/seed-admin.sql
```

它使用 `ON CONFLICT (phone) DO UPDATE`，可重复执行。

核心表：

```text
materials
material_files
material_tags
config_nodes
config_node_modes
notes
strategy_heat_rows
strategy_keywords
properties
property_channels
publish_records
console_users
auth_sessions
drafts
draft_images
```

## 已形成闭环的功能

- 账号密码登录、退出、session 鉴权
- 项目管理增删改查
- 新建项目自动生成默认渠道二维码（写入 `property_channels`）
- 素材/标签/卖点/概览/策略按项目 `property_id` 隔离（顶栏切换项目,前端 `X-Project-Id` 头,后端 `requireConsoleProject`）
- 项目按创建者归属（`properties.owner_id`）:普通用户只看/操作自己的项目,管理员(`role='管理员'`)看全部;当前项目存在 URL `?project=`,刷新后保持
- 建用户时不再要求填默认项目(登录后自建,项目归本人);上传图片可逐张自定义名称(留空用文件名)
- `console_users` 已移除废弃的 `property` 字段(权限改由 `properties.owner_id` 决定);`role` 仅允许「管理员」「游客」两种,数据库有 `CHECK` 约束、服务层 `normalizeRole` 也会校验,应用只把「管理员」当管理员、其余按普通用户处理
- 扫码公开预览:`/p/<项目id>` 中间页 → 小程序按 projectId 拉「随机 5 张图 + AI 文案」(可换一批;文案走 OpenAI 兼容国内大模型 `LLM_*`,未配置/失败则用卖点兜底)
- 发布存档:小程序确认发布写 `publish_records`（只存 material_ids 引用 + 文案 + 发布人/渠道,不复制图片字节）
- 用户管理增删改查
- 图片上传入库，原图存入 `material_files`
- 上传图片的类型、平台、营销阶段写入 `materials`
- 素材列表读取真实缩略图 `/api/console/materials/[id]/image`
- 素材标签编辑写入 `material_tags`
- 素材类型/平台/阶段配置写入数据库
- 图片标签配置增删改
- 图片卖点一级分类和二级卖点增删改
- 概览和策略看板基础展示，图表使用 ECharts
- 控制台视觉已刷新为偏科技感的蓝/青/绿/橙/紫亮色体系

## 未完整实现的功能

高优先级：

- 「从素材生成内容」已改为扫码公开预览(随机取图 + AI 文案),但后台还没有「发布记录查看 / 渠道增删改」的管理界面
- 小程序已接入预览接口 + 发布存档,但「真正写入小红书草稿页」仍未接入(`xhs-miniprogram/utils/xhsPublish.js` 是占位);小程序改动需在小红书/微信 IDE 里自测
- `/materials/upload-video` 仍是占位页
- 项目渠道二维码读取 `property_channels`；新建项目时会自动生成一条默认渠道，但仍没有后续增删改渠道的管理入口

中优先级：

- 概览页 `导出周报`、笔记列表 `导出` 只是提示，没有生成文件
- 概览页笔记列表的个人/游客/中介、用户选择、列表日期筛选还没有真正驱动接口
- 标签/卖点配置的导入、导出、模板下载未接入
- 素材详情里的“发布详情”未接入发布记录
- 用户管理里的“小红书账号链接”固定显示 `-`

低优先级：

- 上传图片页里的“选择单张图片 / 选择文件夹”按钮只是提示；实际文件选择依赖 Upload Dragger 区域
- README、上下文文档需要随着功能变更持续同步

## 状态管理

Redux Toolkit 文件：

```text
src/store/store.ts
src/store/hooks.ts
src/store/consoleSlice.ts
src/store/consoleApi.ts
```

当前约定：

- API 请求和缓存使用 RTK Query
- `consoleSlice.ts` 只保留跨页面的轻量 UI 状态，例如当前项目
- 弹窗开关、编辑草稿、筛选条件等局部状态放组件本地 state

## Mock 数据

早期 mock/兜底数据仍保留在：

```text
src/shared/mock/consoleData.ts
```

当前主要页面已经通过 API 读取 PostgreSQL。mock 数据不要再当作真实业务来源；确认不再需要兜底后可以逐步删除。

## 草稿读取逻辑

核心文件：

```text
src/server/drafts/draftStore.ts
```

当前行为：

- `GET /api/drafts/[id]` 从 PostgreSQL 的 `drafts` / `draft_images` 读取草稿
- `GET /api/drafts/[id]/images/[filename]` 从 `draft_images.bytes` 返回图片二进制
- 当前没有后台 UI 生成草稿，也没有 `POST /api/drafts` 入口

返回类型：

```text
src/shared/types/drafts.ts
```

## 小程序源码

小红书小程序源码位于：

```text
xhs-miniprogram/
```

当前文件：

```text
xhs-miniprogram/app.js
xhs-miniprogram/app.json
xhs-miniprogram/app.css
xhs-miniprogram/project.config.json
xhs-miniprogram/pages/draft/index.js
xhs-miniprogram/pages/draft/index.json
xhs-miniprogram/pages/draft/index.xhsml
xhs-miniprogram/pages/draft/index.css
xhs-miniprogram/utils/config.js
xhs-miniprogram/utils/mockDraft.js
xhs-miniprogram/utils/platform.js
xhs-miniprogram/utils/xhsPublish.js
```

当前小程序行为：

- 从 query 获取 `draftId` 或 `apiUrl`
- 请求草稿接口
- 展示图片、文案、话题
- 点击“发小红书”后调用 `openXhsDraftPublisher`
- 若平台发布 API 不存在，则复制文案并弹出“发布能力待接入”

小红书 AppID 需要在小红书小程序平台创建小程序后获得：

```text
https://miniapp.xiaohongshu.com/
```

`AppSecret` 不能写入前端或小程序源码，只能放后端环境变量。

## 样式和 UI 约定

全局样式：

```text
src/app/globals.css
```

Ant Design 主题入口：

```text
src/app/providers.tsx
```

控制台外壳：

```text
src/features/console/components/ConsoleShell.tsx
```

约定：

- 后台系统风格，保持信息密度
- 主视觉为科技感亮色体系：主色 `#006bff`，辅助色 `#00b8ff`、`#18c964`、`#ff6b4a`、`#7c3aed`
- 侧栏使用深色科技风，内容区使用浅色网格背景和轻量玻璃感卡片
- 卡片圆角约 8px
- 优先使用 AntD 和 `@ant-design/icons`
- 控件主题优先改 `src/app/providers.tsx`，跨页面视觉优先改 `src/app/globals.css`
- 不做营销站式大 Hero
- 图表统一使用 ECharts，不用 CSS/SVG 伪图表；ECharts 配色当前集中在 `src/features/console/overview/OverviewDashboard.tsx`

参考截图目录：

```text
public/example/1/  概览和策略看板
public/example/2/  图片素材管理顶部菜单功能
public/example/3/  素材 card 内卖点/属性/详情弹窗
public/example/4/  登录页
```

## 常见环境问题

### `pnpm build` 在普通沙箱里失败

普通沙箱里执行 `pnpm build` 可能出现：

```text
TurbopackInternalError
creating new process
binding to a port
Operation not permitted
```

这是 Turbopack 在沙箱中处理 CSS 时创建进程/绑定端口被拒绝，不代表代码错误。非沙箱环境执行 `pnpm build` 可通过。

### pnpm 11 依赖脚本审批

项目使用 `packageManager: pnpm@11.10.0`。pnpm 11 使用 `allowBuilds` 审批依赖安装脚本，项目根目录的 `pnpm-workspace.yaml` 当前显式拒绝下面两个依赖的安装脚本：

```yaml
allowBuilds:
  sharp: false
  unrs-resolver: false
```

如果服务器执行 `pnpm build` 前自动检查依赖并报：

```text
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: sharp@0.34.5, unrs-resolver@1.12.2
```

通常是服务器代码还停留在旧的 `ignoredBuiltDependencies` 写法。更新代码后重新执行 `pnpm install --frozen-lockfile` 和 `pnpm build`。

### 缺少 `DATABASE_URL`

如果没有配置 `DATABASE_URL`，访问控制台页面会在鉴权或数据读取时抛出：

```text
DATABASE_URL is not configured
```

本地和生产环境都需要配置 PostgreSQL 连接串。

### 登录成功后又回到登录页

登录接口成功后会通过 `zyh_console_session` HttpOnly cookie 保存会话，控制台布局再读取该 cookie 鉴权。如果浏览器没有保存或发送这个 cookie，页面会被重定向回 `/login`。

常见原因：

- 生产环境默认给 cookie 加 `Secure`，但正在用 `http://<服务器公网IP>:3000` 直接测试，浏览器不会保存/发送 Secure cookie
- 正式域名 HTTPS、HTTP、IP、端口混用，导致 cookie 写在一个 host 下，访问另一个 host 时没有带上

项目支持 `AUTH_COOKIE_SECURE` 环境变量：

```env
AUTH_COOKIE_SECURE="true"
```

正式 HTTPS 环境保持 `true`；临时 HTTP 直连 3000 测试可短暂设为 `false`，改完后需要 `pm2 restart content-publisher-console --update-env`。测试完成后应改回 `true`，并优先通过 Nginx HTTPS 访问。

### 新建项目的二维码链接域名

新建项目时会在 `property_channels` 自动插入一条「默认渠道」。二维码 / NFC 指向**公开扫码中间页** `<base>/p/<项目id>`(用户扫码 → 选平台 → 跳小程序;由 `buildProjectScanUrl` 生成),`<base>` 的来源优先级:

1. `APP_BASE_URL` 环境变量（推荐，例如 `https://your-domain.com`；运行时读取，改了只需 `pm2 restart content-publisher-console --update-env`，不用 rebuild）
2. 未配置时回退到请求来源域名（Nginx 反代下取 `X-Forwarded-Host` / `X-Forwarded-Proto`，否则 `Host`）

相关代码:`propertyDetailUrl.ts`(`buildProjectScanUrl`)、`consoleRepository.createProperty`、公开页 `src/app/p/[projectId]/page.tsx` + `ProjectPreviewBridge`。已有项目不会自动补渠道,需要时用 SQL 手动插入。

## 给后续 AI 的建议

开始新对话后建议先读：

```text
AGENTS.md
PROJECT_CONTEXT.md
package.json
database/schema.sql
src/app/providers.tsx
src/features/console/components/ConsoleShell.tsx
src/store/consoleApi.ts
src/server/console/consoleRepository.ts
```

如果要改 Next.js 路由或 API，还需要读取：

```text
node_modules/next/dist/docs/
```

如果要改小程序发布流程，优先看：

```text
xhs-miniprogram/README.md
xhs-miniprogram/pages/draft/index.js
xhs-miniprogram/utils/xhsPublish.js
```
