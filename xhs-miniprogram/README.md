# 小红书小程序

这是一份独立的小红书小程序源码，用于接收 H5 中间页传入的草稿参数，在小程序内展示图片、文案和话题，并将确认后的内容交给小红书发布能力。

原生小红书小程序页面使用 `.xhsml` 描述结构、`.css` 描述样式，页面逻辑和配置仍使用 `.js` / `.json`。

## 流程

1. H5 中间页打开小红书小程序。
2. 小程序从 query 获取 `projectId` + `channel`（或中间页直接传入的完整 `apiUrl`，已带 `?channel=<身份>`）。
3. 小程序**分两段**请求，让图片秒显、慢的文案不拖住整页：
   - 先 `GET /preview` 拿「随机图」立即展示；
   - 再把 `apiUrl` 的 `/preview` 换成 `/caption`（`GET /caption?channel=<身份>`）异步拿「文案 + 话题」，未回前文案卡片显示「AI 文案生成中…」占位、复制/发布按钮禁用。
   - 「换一批」重新拉两段，靠 `loadSeq` 递增序号丢弃上一批过期文案，避免串台。
4. 用户确认内容后点击“发小红书”。
5. `utils/xhsPublish.js` 调用小红书开放平台发布能力。

## 配置

`utils/config.js` 只用于缺省接口地址：

```js
const API_BASE_URL = "https://your-domain.example.com";
```

如果 H5 中间页跳转小程序时传入了 `apiUrl`（已带 `?channel=<身份>`），小程序会优先使用 `apiUrl`。否则用 `projectId` + `channel` 自己拼（`channel` 缺省 `visitor`）：

```text
${API_BASE_URL}/api/public/projects/${projectId}/preview?channel=${channel}
```

H5 中间页的小红书跳转模板示例：

```bash
NEXT_PUBLIC_XHS_MINI_PROGRAM_URL="xhsmini://draft?projectId={projectId}&channel={channel}&apiUrl={apiUrl}"
```

这里的 URL 模板需要替换成小红书开放平台实际生成的小程序 URL Link。

## 待接入

`utils/xhsPublish.js` 里目前只集中封装了发布入口。小红书开放平台审核通过后，把其中的 `openXhsPublish` / `openNotePublish` / `publishNote` 占位调用替换为官方文档里的真实 API。
