# 内容发布控制台

基于 Next.js App Router 的内容发布控制台，面向“小红书/微信内容草稿生成”场景。后台支持账号登录、项目/用户管理、图片素材上传和打标、标签/卖点配置、概览数据看板，以及草稿扫码后的平台选择中间页。

## 开发命令

```bash
pnpm dev
pnpm lint
pnpm build
```

本项目依赖 PostgreSQL。运行页面前需要配置：

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/content_publisher"
```

初始化或补充数据库结构：

```bash
psql -h localhost -p 5432 -U <user> -d content_publisher -f database/schema.sql
```

`database/schema.sql` 使用 `CREATE IF NOT EXISTS` / `ALTER ... ADD COLUMN IF NOT EXISTS`，重复执行不会清空已有数据。

## 目录结构

```text
src/
  app/                    Next.js 路由、布局和 API route handlers
    (console)/            控制台前端页面路由组，不影响 URL
    api/                  后端 API 入口
    drafts/[id]/          手机扫码后的平台选择中间页
  features/               前端业务模块
    auth/                 登录页
    console/
      components/         控制台外壳和导航
      materials/          图片素材、标签配置、卖点配置、图片上传
      overview/           数据看板
      properties/         项目和用户管理
      video/              视频上传占位页
    drafts/               发布平台选择中间页
  server/                 后端服务层
    auth/                 密码校验和 session
    console/              控制台接口服务和数据库查询
    drafts/               草稿读取和图片读取逻辑
  shared/                 前后端共享代码
    mock/                 早期 mock/兜底数据
    types/                共享类型
```

## 当前 API

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

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

## 当前完成度

已经形成数据库闭环的主要功能：

- 账号密码登录、退出和 session 校验
- 项目管理增删改查
- 用户管理增删改查
- 图片上传入库、保存原图、素材缩略图读取
- 素材类型/阶段/平台配置
- 素材卖点标签和属性标签编辑
- 图片标签配置增删改
- 图片卖点分类/卖点增删改
- 概览和策略看板基础数据展示，图表使用 ECharts
- 控制台视觉已调整为偏科技感的蓝/青/绿/橙/紫亮色体系，Ant Design 主题、全局 CSS 和 ECharts 配色已同步

仍未完整实现的功能：

- 视频上传页仍是占位
- 小红书/微信真实发布能力未接入
- 后台还没有“从素材生成草稿/二维码”的完整入口
- 概览页周报导出、笔记列表导出仍是提示
- 标签/卖点导入、导出、模板下载仍未接入
- 项目渠道二维码有读取展示，但没有管理入口或自动生成逻辑
- 微信登录、忘记密码、注册开通流程未接入

## 注意事项

- 修改 Next.js 路由、Route Handler 或配置前，先读 `node_modules/next/dist/docs/` 中的对应文档。项目根目录的 `AGENTS.md` 明确要求不要按旧版 Next.js 经验直接改。
- 腾讯云 Ubuntu 镜像默认使用 `ubuntu` 用户登录，服务器部署路径按 `/home/ubuntu/content-publisher-console` 维护；不要直接把 SSH 用户名改成未创建的其他用户。
- 视觉主题主要集中在 `src/app/providers.tsx`、`src/app/globals.css` 和 `src/features/console/overview/OverviewDashboard.tsx` 的 ECharts 配色中，后续新增页面应沿用这套主题。
- `src/shared/mock/consoleData.ts` 仍保留作为早期 mock/兜底数据，不代表当前主要数据来源。
- 小程序发布能力依赖平台官方开放能力和审核权限，普通 H5 无法绕过平台限制直接写入真实小红书草稿页。
