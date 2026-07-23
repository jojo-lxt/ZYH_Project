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
5. `utils/xhsPublish.js` 做「半自动闭环」:把图片存进手机相册、文案复制到剪贴板,再弹窗引导用户打开小红书发布(选相册图 + 粘贴文案)。

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

## 发布(半自动闭环)

小红书**不支持「带图文预填」发布**(scheme 只能跳页面、不注入内容)，但**可以跳转**到发布器，所以 `utils/xhsPublish.js` 采用半自动闭环:

1. `saveImageToPhotosAlbum` 把选中的图片逐张下载(`downloadFile`)后存进手机相册；首次会用 `getSetting` / `authorize('scope.writePhotosAlbum')` / `openSetting` 申请相册权限。
2. `setClipboardData` 把文案复制到剪贴板。
3. `openXhsDeeplink`(带 `xhsdiscover://post_note/`)直接跳进小红书发布器，用户选刚存的图 + 粘贴文案即可；`openXhsDeeplink` 不存在 / 被白名单拦 / 报错时，自动退回「弹窗引导用户手动打开小红书发布」。

注意:

- `downloadFile` 的图片域名要加进小红书小程序后台的「合法域名(downloadFile)」白名单(即接口所在域名)，真机上才能下载。
- IDE 模拟器不支持存相册，需用「真机预览」测试。
- `openXhsDeeplink` **可能有 deeplink 白名单**，未必放行发布类 scheme；`openXhsDeeplink` 的**入参字段名**也未在官方文档中确认(现同时传 `deeplink/link/url`)。真机需逐个验证 `xhsdiscover://post_note/`(图文创作)、`xhsdiscover://post/`(相册选择)、`xhsdiscover://hey_home_feed/`(日常发布入口)哪个能跳、落点最好，再裁定 `PUBLISH_DEEPLINK` 与字段名。

### 未来升级为「一键预填」

- 若官方放开小程序端原生发布跳转 → 在 `openXhsDraftPublisher` 里替换成该 API。
- 若改用原生 App 承载 → 接小红书分享 SDK(`XhsShareSDK` / `XhsNote`)，可带图文拉起发布页、用户一点即发到自己账号。
