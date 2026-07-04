# 内容发布控制台

这是一个基于 Next.js App Router 的内容发布控制台，包含后台管理页面、素材管理、发布平台选择中间页，以及供小程序读取草稿内容的 API。

## 开发命令

```bash
pnpm dev
pnpm lint
pnpm build
```

## 目录结构

```text
src/
  app/                    Next.js 路由、布局和 API route handlers
    (console)/            控制台前端页面路由组，不影响 URL
    api/                  后端 API 入口
    drafts/[id]/          手机扫码后的平台选择中间页
  features/               前端业务模块
    console/
      materials/          图片素材、标签配置、卖点配置、图片上传
      overview/           数据看板
      properties/         项目和用户管理
      video/              视频上传占位页
      components/         控制台外壳和导航
    drafts/               发布平台选择中间页
  server/                 后端服务层
    console/              控制台接口服务和数据库查询
    drafts/               草稿读取和图片读取逻辑
  shared/                 前后端共享代码
    lib/                  通用工具
    mock/                 固定假数据
    types/                共享类型
```

## 当前 API

- `GET /api/console/overview`
- `GET /api/console/strategy`
- `GET /api/console/materials`
- `GET /api/console/config/tags`
- `GET /api/console/config/selling-points`
- `GET /api/console/properties`
- `GET /api/console/properties/:id`
- `GET /api/console/users`
- `GET /api/drafts/:id`
- `GET /api/drafts/:id/images/:filename`

控制台 API 和草稿 API 通过 `src/server` 下的服务层访问 PostgreSQL。`src/shared/mock/consoleData.ts` 仍保留为前端兜底数据，确认数据库数据完整后可再删除。
