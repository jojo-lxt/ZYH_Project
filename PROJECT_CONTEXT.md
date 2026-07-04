# 项目上下文交接文档

本文档用于在开启新的 AI 对话或交接给新开发者时，快速理解本项目的目标、现状、目录结构、技术栈、已完成需求、后续接入点和注意事项。

## 一句话概括

这是一个基于 Next.js App Router 的内容发布管理系统，主要面向“小红书/微信内容草稿生成”场景：后台管理图片素材、标签、卖点、项目和用户；用户扫码后进入平台选择页，再跳转到小红书/微信小程序确认内容，最终由小程序调用平台开放能力进入真实发布草稿页。

## 当前项目目标

最终目标是：

1. 后台用户上传图片素材并配置标签、卖点、类型、平台、营销阶段等信息。
2. 系统为既有草稿生成可扫码访问的 H5 中间页链接。
3. 手机扫码打开 H5 中间页。
4. H5 中间页选择小红书或微信。
5. 跳转对应小程序。
6. 小程序展示类似草稿页的预览内容。
7. 用户确认后点击“发小红书”或“发朋友圈”。
8. 小程序调用平台开放能力，把图片、文案和话题传给真实草稿发布页。
9. 用户在平台 App 中最终确认发布。

注意：第 9 步必须依赖小红书/微信官方开放能力。普通 H5 无法稳定、合规地把图片和文案写入小红书真实草稿页。

## 技术栈

核心依赖见 `package.json`：

- Next.js `16.2.7`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Ant Design `6.4.3`
- `@ant-design/icons`
- `@ant-design/nextjs-registry`
- Redux Toolkit
- React Redux
- RTK Query
- `qrcode.react`

开发命令：

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Next.js 特别注意

项目根目录存在 `AGENTS.md`，其中要求：

> This is NOT the Next.js you know. This version has breaking changes. Read relevant guide in `node_modules/next/dist/docs/` before writing code.

因此后续修改 Next.js 路由、Route Handler、配置等内容时，应优先阅读本地文档：

```text
node_modules/next/dist/docs/
```

当前 `next.config.ts`：

```ts
const nextConfig = {
  allowedDevOrigins: ["10.10.94.62"],
};
```

这是为了解决在 `10.10.94.62` 服务器上用浏览器访问 dev server 时，Next dev origin 被拦截的问题。

## 当前主要路由

### 登录

- `/login`

文件：

```text
src/app/login/page.tsx
src/features/auth/components/LoginPage.tsx
src/features/auth/lib/session.ts
```

当前登录是前端模拟：

- 登录成功后写入 `localStorage`
- 后台 Shell 进入时检查登录态
- 未登录会跳转 `/login`
- 右上角头像下拉菜单“退出登录”会清理登录态并跳回 `/login`

后续接后端登录时，应替换 `src/features/auth/lib/session.ts` 和 `LoginPage` 的 `submitLogin` 逻辑。

### 后台管理系统

路由组位于：

```text
src/app/(console)/
```

URL 不包含 `(console)`。

页面：

- `/overview` 数据看板
- `/materials` 图片素材管理
- `/materials/tag-config` 图片标签配置
- `/materials/selling-point-config` 图片卖点配置
- `/materials/upload-image` 上传图片
- `/materials/upload-video` 上传视频占位页
- `/properties` 项目管理
- `/properties/detail` 项目详情
- `/users` 用户管理

后台 Shell：

```text
src/features/console/components/ConsoleShell.tsx
```

使用 AntD：

- `Layout`
- `Sider`
- `Header`
- `Menu`
- `Dropdown`
- `Select`
- `Button`

左侧菜单、顶部菜单、头像下拉菜单都已换成 AntD 组件。

### 草稿扫码中间页

- `/drafts/[id]`

文件：

```text
src/app/drafts/[id]/page.tsx
src/features/drafts/components/DraftPlatformBridge.tsx
```

当前逻辑：

1. 使用 URL 中的 `id` 作为草稿标识。
2. 显示平台选择页。
3. 可选择“小红书笔记生成”或“微信图文笔记生成”。
4. 根据环境变量构造小程序跳转 URL，并把 `draftId` / `apiUrl` 传给小程序。

环境变量：

```bash
NEXT_PUBLIC_XHS_MINI_PROGRAM_URL="小红书小程序URL模板?draftId={draftId}&apiUrl={apiUrl}"
NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL="微信小程序URL模板?draftId={draftId}&apiUrl={apiUrl}"
```

如果模板包含 `{draftId}` 或 `{apiUrl}`，会替换占位符；否则会自动追加 query。

## 后台 API

Route Handler 位于：

```text
src/app/api/
```

当前 API：

```text
GET  /api/health

GET  /api/console/overview
GET  /api/console/strategy
GET  /api/console/materials
POST /api/console/materials/upload
GET  /api/console/materials/upload-options
GET  /api/console/config/tags
GET  /api/console/config/selling-points
GET  /api/console/properties
GET  /api/console/properties/[id]
GET  /api/console/users

GET  /api/drafts/[id]
GET  /api/drafts/[id]/images/[filename]
```

当前后端 API 通过 `src/server` 服务层读取 PostgreSQL。`src/shared/mock/consoleData.ts` 仍保留为前端兜底数据，等数据库数据完整后可手动删除。

后端服务层：

```text
src/server/console/consoleService.ts
src/server/console/consoleRepository.ts
src/server/drafts/draftStore.ts
src/server/db.ts
```

后续继续扩展数据库读写时，优先改 `src/server/**`，尽量保持 `src/app/api/**` 的 HTTP 入口和前端 RTK Query 调用不变。

## 状态管理

Redux Toolkit 文件：

```text
src/store/store.ts
src/store/hooks.ts
src/store/consoleSlice.ts
src/store/consoleApi.ts
```

当前约定：

- 业务数据和 CRUD 状态放 Redux Toolkit。
- API 请求使用 RTK Query。
- 弹窗开关、局部编辑草稿、输入框临时状态仍放组件本地 state。

`consoleSlice.ts` 管理：

- 当前项目
- 当前用户
- 图片素材列表
- 素材标签覆盖值
- 图片标签配置树
- 图片卖点配置树
- 项目列表
- 用户列表

已支持的本地 CRUD/交互：

- 素材删除
- 素材标签编辑
- 素材类型、平台、营销阶段配置
- 标签/卖点配置增删改
- 项目增删改查/筛选/排序/刷新
- 用户增删改查/筛选/分页/排序/刷新

## Mock 数据

主要假数据在：

```text
src/shared/mock/consoleData.ts
```

包括：

- 数据看板统计
- 策略看板
- 素材管理数据
- 上传图片配置项
- 标签配置树
- 卖点配置树
- 项目数据
- 项目详情
- 用户数据

接数据库时，可以先以这些类型为接口模型。

## 草稿读取逻辑

核心文件：

```text
src/server/drafts/draftStore.ts
```

当前行为：

- `GET /api/drafts/[id]` 从 PostgreSQL 的 `drafts` / `draft_images` 表读取草稿。
- `GET /api/drafts/[id]/images/[filename]` 从 `draft_images.bytes` 返回图片二进制。
- `POST /api/drafts` 已删除，当前项目不再提供上传图片生成草稿的后端入口。

返回数据类型：

```text
src/shared/types/drafts.ts
```

## 小程序源码

小红书小程序源码单独放在：

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

小程序说明见：

```text
xhs-miniprogram/README.md
```

小程序当前实现：

- 从 query 获取 `draftId` 或 `apiUrl`
- 请求草稿接口
- 展示图片、文案、话题
- 点击“发小红书”
- 调用 `utils/xhsPublish.js`

`xhsPublish.js` 目前是发布能力适配器，占位调用包括：

- `openXhsPublish`
- `openNotePublish`
- `publishNote`

这些并不是已确认的官方 API 名称。后续必须拿到小红书开放平台真实文档和权限后替换。

## 小红书 AppID 和开放能力

小红书小程序 AppID 不是通用固定值，需要在小红书小程序平台创建小程序后获得：

```text
https://miniapp.xiaohongshu.com/
```

拿到 AppID 后填入：

```text
xhs-miniprogram/project.config.json
```

重要区别：

- 小程序 AppID：小程序身份标识
- 发布/跳草稿页能力：需要另外申请并通过审核的开放能力

`AppSecret` 不要写入前端或小程序源码，只能放后端环境变量。

## 样式和 UI 约定

全局样式：

```text
src/app/globals.css
```

UI 主要使用 AntD，但不要照搬 AntD 官方默认风格。当前项目使用偏简约、干练、后台系统风格：

- 主色为深青绿色 `#0f766e`
- 辅助色为暖灰/米白背景
- 卡片圆角约 8px
- 尽量使用 AntD 组件和 `@ant-design/icons`
- 避免手写符号按钮，如 `↻`、`⚙`、`×` 等
- 后台页面应保持信息密度，不做营销站式大 Hero

登录页参考截图位于：

```text
public/example/4/
```

但实现时已做差异化配色和品牌，不完全复制截图中的蓝紫风格。

## 参考素材和截图目录

```text
public/example/1/  主体页面参考截图
public/example/2/  图片素材管理顶部菜单功能截图
public/example/3/  素材 card 内卖点/属性/详情弹窗截图
public/example/4/  登录页截图
```

注意：

- `.har` 文件可能包含 Cookie、Authorization、请求头等敏感信息。
- `.gitignore` 已配置 `*.har`。
- 不要把 HAR 文件提交到 GitHub。

## 当前 GitHub 远程

远程仓库：

```text
https://github.com/jojo-lxt/ZYH_Project.git
```

服务器上 SSH 到 GitHub 的 22/443 端口曾被拒绝，因此当前更推荐 HTTPS + GitHub Personal Access Token push。

GitHub 现在不支持账号密码推送；HTTPS push 时 Password 处需要粘贴 token。

## 常见环境问题

### 1. `pnpm build` 在普通沙箱里失败

普通沙箱里执行 `pnpm build` 可能出现：

```text
TurbopackInternalError
creating new process
binding to a port
Operation not permitted
```

这是 Turbopack 在沙箱中处理 CSS 时创建进程/绑定端口被拒绝，不代表代码错误。此前在非沙箱环境执行 `pnpm build` 是通过的。

### 2. `codex_apps` MCP 启动失败

曾出现：

```text
MCP client for `codex_apps` failed to start
https://chatgpt.com/backend-api/wham/apps
```

这通常是 Codex/ChatGPT Apps MCP 服务初始化时网络请求失败或传输握手失败。它影响的是外部 Apps/MCP 工具，不影响本项目 Next.js 运行、lint、build。

### 3. `allowedDevOrigins`

服务器地址是：

```text
10.10.94.62
```

`next.config.ts` 已配置：

```ts
allowedDevOrigins: ["10.10.94.62"]
```

不要随意删除，否则浏览器访问 dev server 时可能被 Next 拦截。

## 后续最重要的待办

1. 接入真实数据库。
   - 优先替换 `src/server/console/consoleService.ts`
   - 草稿存储替换 `src/server/drafts/draftStore.ts`
   - 保持 API 路由和前端调用尽量稳定

2. 接入真实登录。
   - 当前只是 localStorage 模拟
   - 后续需要后端 session/JWT
   - `ConsoleShell` 的登录态检查也要同步改造

3. 接入小红书小程序真实 AppID。
   - 修改 `xhs-miniprogram/project.config.json`
   - 配置服务器域名和业务域名

4. 申请小红书发布/分享开放能力。
   - 拿到官方 API 后替换 `xhs-miniprogram/utils/xhsPublish.js`
   - 当前 H5 和小程序只完成流程骨架，不能凭空绕过平台权限

5. 配置 H5 到小程序的正式跳转 URL。
   - `NEXT_PUBLIC_XHS_MINI_PROGRAM_URL`
   - `NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL`

6. 将 mock 数据替换为后端 API/数据库。
   - 当前 Redux CRUD 多为前端本地状态
   - 刷新页面后会回到 mock 初始数据

## 给后续 AI 的建议

开始新对话后，建议先让 AI 阅读：

```text
PROJECT_CONTEXT.md
AGENTS.md
package.json
src/app/providers.tsx
src/features/console/components/ConsoleShell.tsx
src/store/consoleSlice.ts
src/store/consoleApi.ts
src/shared/mock/consoleData.ts
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
