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
5. footer 里是小红书内置的 `<post-note-button>` 原生组件:点击即带图片原生跳转到小红书发布页。经接口带过去的标题/正文会被 AI 笔记治理清空(图片不受影响),故点击时已把文案复制到剪贴板,用户在发布页长按正文「粘贴」补回文案后再点发布。`utils/xhsPublish.js` 只负责把 draft 转成组件入参。

## 无参数打开(示例模式 / 过审关键)

小程序**只有 `pages/draft/index` 一个页面**,正常靠扫码中间页带 `projectId` / `apiUrl` / `channel` 拉起。但平台审核员是**从主入口直接打开、不带任何参数**的——若此时报「缺少项目参数」错误页,会被判「页面无法正常展示」而拒审。

因此 `onLoad` 在**没有 `apiUrl`(即无参数冷启动)时,走 `showDemo()`**:用 `utils/mockDraft.js` 的 `getDemoDraft()`(小程序自带的 `assets/mock-draft-*.jpeg` + 一段固定「展示文案」)渲染一个可用页面,**全程不发任何网络请求**。示例模式下:

- 「换一批」仅在本地轮转示例图片(不请求后端);
- 「+ 发小红书」弹窗说明「当前为内容展示示例」,引导去扫码体验真实功能(不做存图/发布);
- 「复制」照常复制示例文案。

带参数进入(扫码流程)时 `demo` 为 `false`,行为与原来完全一致。

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

## 发布(post-note-button 原生组件)

用小红书内置的 `<post-note-button>`(官方「发小红书」按钮)实现**带图文一键跳转发布页**。组件放在 `pages/draft/index.xhsml` 的 footer,入参由 `pages/draft/index.js` 从 draft 派生(见 `utils/xhsPublish.js` 的 `buildPublishProps`):

| 属性 | 来源 | 约束 |
|------|------|------|
| `title` | 文案标题 | ≤ 20 字,超出触发 `binderror` 且不跳转(客户端截断保底,`caption.ts` 也已收紧) |
| `content` | 文案正文 | ≤ 1000 字(客户端截断保底) |
| `media-info` | 选中图片 | **必填**,JSON 串;`image_resources`(1-18 张)/ `video_resources` 二选一;url 必须 `https://` 且响应头带 `content-disposition: inline`;本项目只发图文 |
| `tags` | 话题数组 | 英文逗号分割,不带 `#` |
| `binderror` | `onPublishError` | 参数校验失败时弹窗提示 |

按钮用 `type="default"` + `size="large"` 面性按钮(外观是小红书官方固定样式,只能选 type/size/宽度)。

要求与注意:

- **基础库 ≥ 3.105.1、IDE ≥ 2.3.1、客户端 ≥ 8.53,且需开启「基础库 2.0 架构编译」**(即 `project.config.json` 的 `useNewCompiler: true`)。当前 `libVersion` 3.133.1 已达标。
- 图片走公开接口 `/api/public/projects/<id>/materials/<mid>/image`,已返回 `Content-Disposition: inline`、生产为 https,满足组件要求;图片由组件自动带走,**无需再存相册**。
- **示例模式(无参数冷启动)不渲染 `<post-note-button>`**:示例图是本地 `/assets` 资源(非 https),且不应让审核员真跳发布;改用普通按钮,点了只弹「示例内容」说明。文案生成中也用禁用占位按钮。
- **AI 笔记治理 + 剪贴板兜底(重要)**:小红书社区正在治理 AI 笔记,经发布接口(含本组件)带过去的**标题/正文会被清空**(官方工单 2026-07-27 确认,已在该账号生效、逐步全量);**图片不受影响**。诊断已坐实:小程序侧文案完整带上、跳转后只剩图片=App 侧接口层清空,**代码无法让经接口的文案留下来**。落地兜底(方案「剪贴板粘贴」):点「发小红书」时 `onPublishTap` 把文案(标题+正文+`#话题`)复制到剪贴板,并在按钮上方常驻引导「跳转后请在正文长按『粘贴』补上文案」;用户在发布页手动粘贴的文字**不走被清空的接口通道**,能留下来。顶部「复制」按钮为同一份文案的手动兜底。
- `openXhsDeeplink`(内部能力,官方明确不对外开放)已弃用并移除。

### 未来升级方向

- 若要**记录真实发布**:用组件的 `miniapp-session-info` 字段 + 服务端「笔记发布回调」端点(当前按需求「先不记录」,未接)。
- 若改用原生 App 承载 → 接小红书分享 SDK(`XhsShareSDK` / `XhsNote`)。
