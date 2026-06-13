# 小红书小程序草稿确认页

这是一份独立的小程序源码骨架，用于承接网页二维码跳转后的草稿确认流程。

## 流程

1. H5 二维码打开 `/drafts/[id]`。
2. `/drafts/[id]` 使用 `NEXT_PUBLIC_XHS_MINI_PROGRAM_URL` 打开小红书小程序。
3. 小程序页面从 query 获取 `draftId` 或 `apiUrl`。
4. 小程序请求 Next 后端 `/api/drafts/[id]`。
5. 用户确认内容后点击“打开小红书发布页”。
6. `utils/xhsPublish.js` 调用小红书开放平台发布能力。

## 配置

先修改 `utils/config.js`：

```js
const API_BASE_URL = "https://your-domain.example.com";
```

后台 H5 配置：

```bash
NEXT_PUBLIC_XHS_MINI_PROGRAM_URL="xhsmini://draft?draftId={draftId}&apiUrl={apiUrl}"
```

这里的 URL 模板需要替换成小红书开放平台实际生成的小程序 URL Link。

## 待接入

`utils/xhsPublish.js` 里目前只集中封装了发布入口。小红书开放平台审核通过后，把其中的 `openXhsPublish` / `openNotePublish` / `publishNote` 占位调用替换为官方文档里的真实 API。
