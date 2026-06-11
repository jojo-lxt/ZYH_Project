# 内容中台前端原型

这是一个基于 Next.js App Router 的内容中台项目，当前已包含控制台页面、素材上传生成草稿二维码流程，以及暂时使用固定假数据的后端 API。

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
    drafts/[id]/          手机扫码后的草稿确认页
  features/               前端业务模块
    console/              控制台页面组件和前端请求 hook
    drafts/               图片上传、二维码、草稿确认组件
  server/                 后端服务层
    console/              控制台接口服务，目前返回固定假数据
    drafts/               草稿生成和本地文件存储逻辑
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
- `POST /api/drafts`
- `GET /api/drafts/:id`
- `GET /api/drafts/:id/images/:filename`

后续接数据库时，优先替换 `src/server` 下的服务实现；页面组件和 `app/api` 的 HTTP 入口可以保持相对稳定。
