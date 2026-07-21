# 二维码三渠道 + 按身份生成文案 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把项目二维码拆成游客/用户/中介三种渠道，每种独立二维码，并把渠道身份贯穿到 AI 文案生成，让文案贴合读者。

**Architecture:** 渠道身份编码在扫码 URL 的 `?channel=` 里，沿 `/p` 页 → ProjectPreviewBridge → `/preview` 接口 → `generateXhsCaption` 一路传递；每身份的写作角度是一份全局代码常量，注入 system prompt，叠加在每项目已有的 `caption_profiles` 风格之上。三条渠道在建项目时写进 `property_channels`（新增 `channel_type` 列）。

**Tech Stack:** Next.js 16 App Router、TypeScript、PostgreSQL（`pg`）、qrcode.react。

## Global Constraints

- **修改路由/Route Handler/next 配置前**先读 `node_modules/next/dist/docs/` 对应文档（AGENTS.md 要求，别按旧版 Next 经验改）。
- **本仓库没有测试框架**：每个任务的“测试/验证”＝`npx tsc --noEmit` +（涉及路由/页面时）`npx next build` + 必要处的 `node -e` 逻辑校验 / `curl`。不要引入测试框架。
- **不要 git commit**：直接在 `main` 改，每个任务收尾只做验证，留待用户 review 后自行提交。
- `withTransaction(cb)` 的回调拿到的是原始 `PoolClient`，只有 `.query()`（返回 `{rows}`），没有模块级的 `queryOne`/`queryRows`。
- **代码逻辑改动同批更新** `README.md`/`PROJECT_CONTEXT.md`/`SERVER_SETUP.md`（见 Task 7）。
- caption 在 `channel` 缺省时行为与现状一致；预览路由始终传一个已规整的 `Channel`（缺省 `visitor`），所以线上永远带身份。
- 渠道身份固定这三种：`visitor`(游客渠道) / `resident`(用户渠道) / `agent`(中介渠道)。

---

### Task 1: 共享渠道常量与解析

**Files:**
- Create: `src/shared/channels.ts`

**Interfaces:**
- Produces: `type Channel = "visitor"|"resident"|"agent"`；`CHANNEL_TYPES: ReadonlyArray<{value: Channel; label: string}>`；`CHANNEL_VALUES: readonly Channel[]`；`DEFAULT_CHANNEL: Channel`（=`"visitor"`）；`parseChannel(value: string|null|undefined): Channel`。

- [ ] **Step 1: 写文件**

```ts
// src/shared/channels.ts
// 项目二维码的三种渠道(扫码人群身份)。前后端共用:渲染二维码、解析扫码 URL、注入文案角度。
export type Channel = "visitor" | "resident" | "agent";

export const CHANNEL_TYPES: ReadonlyArray<{ value: Channel; label: string }> = [
  { value: "visitor", label: "游客渠道" },
  { value: "resident", label: "用户渠道" },
  { value: "agent", label: "中介渠道" },
];

export const CHANNEL_VALUES: readonly Channel[] = CHANNEL_TYPES.map((c) => c.value);

export const DEFAULT_CHANNEL: Channel = "visitor";

// 把任意查询参数值规整成合法 Channel;缺失/非法回退默认(visitor)。
export function parseChannel(value: string | null | undefined): Channel {
  return CHANNEL_VALUES.includes(value as Channel) ? (value as Channel) : DEFAULT_CHANNEL;
}
```

- [ ] **Step 2: 逻辑校验 parseChannel**

Run:
```bash
node -e '
const CHANNEL_VALUES=["visitor","resident","agent"],DEFAULT_CHANNEL="visitor";
function parseChannel(v){return CHANNEL_VALUES.includes(v)?v:DEFAULT_CHANNEL;}
for(const v of ["visitor","resident","agent",null,undefined,"x",""]) console.log(JSON.stringify(v),"->",parseChannel(v));
'
```
Expected:
```
"visitor" -> visitor
"resident" -> resident
"agent" -> agent
null -> visitor
undefined -> visitor
"x" -> visitor
"" -> visitor
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 退出码 0，无输出。

---

### Task 2: caption.ts 注入身份角度

**Files:**
- Modify: `src/server/ai/caption.ts`

**Interfaces:**
- Consumes: `Channel` from `@/shared/channels`（Task 1）。
- Produces: `CaptionInput.channel?: Channel`；`buildMessages` 在 system prompt 中注入身份角度（缺省不注入）。

- [ ] **Step 1: 引入类型与角度常量**

在 `import "server-only";` 下方加一行 import：
```ts
import type { Channel } from "@/shared/channels";
```
在 `CaptionInput` 类型定义下方新增全局常量（用户后续可自行改这三段文字）：
```ts
// 每种渠道身份的写作目标/角度,注入 system prompt。风格档案(style_spec/examples)会叠加在其上。
const CHANNEL_ANGLES: Record<Channel, string> = {
  visitor:
    "读者是还没买、来售楼部了解项目的潜在客户。目标是种草、激发兴趣、引导到访或留资。" +
    "用第一人称「我去看了这个盘」的安利口吻,主打卖点、生活方式、环境和户型亮点,制造「想去看看」的冲动。",
  resident:
    "读者是已经买了房的住户。目标是晒真实居住体验、增强归属感、促进老带新(推荐给亲友)。" +
    "以「住进来之后」的真实感受来写,讲社区、物业、邻里和生活细节,真实可信、不要广告腔,可自然带出「推荐给想买房的朋友」。",
  agent:
    "读者是中介、经纪人。目标是给中介提供带看弹药、帮他们向客户转化。" +
    "写得专业、卖点清单式、信息密度高(户型、价格区间、配套、学区、交通、客户常问点),结构清晰,可附带看话术。",
};
```

- [ ] **Step 2: `CaptionInput` 加 channel**

在 `CaptionInput` 里 `examples?: XhsCaption[];` 后面加一行：
```ts
  // 渠道身份:注入对应写作角度,让文案贴合读者。缺省时行为与原来一致。
  channel?: Channel;
```

- [ ] **Step 3: buildMessages 注入 channelBlock**

在 `buildMessages` 里，`const exampleBlock = ...` 之后、`const system =` 之前，加：
```ts
  const channelBlock = input.channel
    ? `\n\n本篇读者身份与写作目标(务必贴合):\n${CHANNEL_ANGLES[input.channel]}`
    : "";
```
并把 `const system =` 的拼接里 `styleBlock +` 改成 `channelBlock + styleBlock +`（顺序：基础设定 → 身份角度 → 项目风格 → 范例）：
```ts
  const system =
    "你是资深小红书房产种草文案写手。用口语化、有网感、带 emoji 的风格,为地产项目写一篇简短笔记。" +
    "只输出 JSON,不要额外解释或代码块围栏。JSON 字段:" +
    "title(不超过 20 字的标题)、body(正文,150 字以内,可含换行和 emoji)、" +
    "topics(3-6 个话题词字符串数组,不带 # 号)。" +
    channelBlock +
    styleBlock +
    exampleBlock;
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 退出码 0。

---

### Task 3: 预览路由与服务层透传 channel

**Files:**
- Modify: `src/app/api/public/projects/[id]/preview/route.ts`
- Modify: `src/server/public/publicService.ts`

**Interfaces:**
- Consumes: `parseChannel`（Task 1）、`CaptionInput.channel`（Task 2）。
- Produces: `getProjectPreview(projectId: string, count: number, channel: Channel)`；`ProjectPreview.captionChannel: Channel`。

- [ ] **Step 1: 路由读取并透传 channel**

在 `route.ts` 顶部 import 处加：
```ts
import { parseChannel } from "@/shared/channels";
```
把 `GET` 里读取 count 那段改为同时解析 channel 并传入：
```ts
  const { id } = await context.params;
  const url = new URL(request.url);
  const count = parseCount(url.searchParams.get("count"));
  const channel = parseChannel(url.searchParams.get("channel"));
  const preview = await getProjectPreview(id, count, channel);
```
（原本 `new URL(request.url).searchParams.get("count")` 拆成先取 `url` 再取两个参数。）

- [ ] **Step 2: 服务层加 channel 形参并透传**

在 `publicService.ts` 顶部 import 处加：
```ts
import type { Channel } from "@/shared/channels";
```
`ProjectPreview` 类型加一行（放在 `captionSource` 附近）：
```ts
  // 本次预览用的渠道身份,便于 devtools 观测。
  captionChannel: Channel;
```
`getProjectPreview` 签名加形参、并把 channel 传进生成、带进返回：
```ts
export async function getProjectPreview(
  projectId: string,
  count: number,
  channel: Channel,
): Promise<ProjectPreview | null> {
```
把 `generateXhsCaption({...})` 调用补 `channel`：
```ts
  const { caption, reason: captionReason, source: captionSource } = await generateXhsCaption({
    projectName,
    sellingPoints: config.sellingPoints,
    tags: config.tags,
    styleSpec: profile?.styleSpec,
    examples: profile?.examples,
    channel,
  });
```
返回对象加 `captionChannel: channel,`（放在 `captionSource` 附近）。

- [ ] **Step 3: 类型检查 + 构建**

Run: `npx tsc --noEmit && npx next build`
Expected: 两者退出码 0。

- [ ] **Step 4: 接口验收（在能跑通应用的环境上）**

预览接口是公开的，可直接 curl（`<项目id>` 换成真实项目）：
```bash
for c in visitor resident agent bogus; do
  echo "== channel=$c =="
  curl -s "http://127.0.0.1:3000/api/public/projects/<项目id>/preview?channel=$c" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('captionChannel=',d.get('captionChannel'),'| images=',len(d['images']))"
done
```
Expected: `visitor/resident/agent` 各回显对应 `captionChannel`；`bogus` 回退成 `visitor`；`images` 条数为该项目素材数（≤5）。

---

### Task 4: 数据库 schema 加 channel_type

**Files:**
- Modify: `database/schema.sql`（`property_channels` 定义）

**Interfaces:**
- Produces: `property_channels.channel_type text NOT NULL CHECK (...)` + `UNIQUE (property_id, channel_type)`。老库升级 SQL 在 Task 7 写进 `SERVER_SETUP.md`。

- [ ] **Step 1: 改 property_channels 定义**

把 `database/schema.sql` 里的：
```sql
CREATE TABLE IF NOT EXISTS property_channels (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  qr_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0
);
```
改成：
```sql
CREATE TABLE IF NOT EXISTS property_channels (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('visitor','resident','agent')),
  label text NOT NULL,
  qr_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (property_id, channel_type)
);
```

- [ ] **Step 2: 校验 SQL 可读性（无 psql 时人工核对）**

确认括号闭合、逗号正确。`reset-dev.sql` 已是 DROP + 重建，无需改动；开发库结构变更走 `reset-dev.sql` → `schema.sql`。

---

### Task 5: 扫码地址带 channel + 建项目生成三渠道

**Files:**
- Modify: `src/server/console/propertyDetailUrl.ts`（`buildProjectScanUrl`）
- Modify: `src/server/console/consoleRepository.ts`（`createProperty`）

**Interfaces:**
- Consumes: `CHANNEL_TYPES`（Task 1）、`channel_type` 列（Task 4）。
- Produces: `buildProjectScanUrl(baseUrl, propertyId, channel?)`；`createProperty` 建 3 条渠道。

- [ ] **Step 1: buildProjectScanUrl 支持 channel**

把 `propertyDetailUrl.ts` 的 `buildProjectScanUrl` 改成：
```ts
export function buildProjectScanUrl(baseUrl: string, propertyId: string, channel?: string) {
  const base = `${stripTrailingSlashes(baseUrl)}${SCAN_PATH}/${encodeURIComponent(propertyId)}`;
  return channel ? `${base}?channel=${encodeURIComponent(channel)}` : base;
}
```

- [ ] **Step 2: createProperty 建三条渠道**

在 `consoleRepository.ts` 顶部 import 处加：
```ts
import { CHANNEL_TYPES } from "@/shared/channels";
```
把 `createProperty` 里那段“自动生成一条默认渠道”的 `client.query(INSERT INTO property_channels ...)` 整块替换成：
```ts
    // 新建项目自动生成三条渠道(游客/用户/中介),各自二维码扫码地址带上 channel。
    for (const [index, { value, label }] of CHANNEL_TYPES.entries()) {
      await client.query(
        `
          INSERT INTO property_channels (property_id, channel_type, label, qr_value, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [id, value, label, buildProjectScanUrl(detailBaseUrl, id, value), index],
      );
    }
```
（`buildProjectScanUrl` 已在此文件导入，`detailBaseUrl` 是现有变量。`getPropertyDetail` 与 `PropertyPages` 无需改——它们已遍历渲染全部渠道。）

- [ ] **Step 3: 类型检查 + 构建**

Run: `npx tsc --noEmit && npx next build`
Expected: 退出码 0。

- [ ] **Step 4: 验收（应用+库可用的环境）**

新建一个项目后查渠道：
```bash
psql "$DATABASE_URL" -c "SELECT channel_type, label, qr_value FROM property_channels WHERE property_id='<新项目id>' ORDER BY sort_order;"
```
Expected: 三行 visitor/resident/agent，`qr_value` 分别带 `?channel=visitor|resident|agent`。项目详情页应渲染三个带标签的二维码。

---

### Task 6: 扫码页与 Bridge 把 channel 带进预览接口

**Files:**
- Modify: `src/app/p/[projectId]/page.tsx`
- Modify: `src/features/public/ProjectPreviewBridge.tsx`

**Interfaces:**
- Consumes: `parseChannel`、`Channel`（Task 1）；`/preview?channel=`（Task 3）。

- [ ] **Step 1: 扫码页读取 channel 并下传**

把 `src/app/p/[projectId]/page.tsx` 整体改为：
```tsx
import { ProjectPreviewBridge } from "@/features/public/ProjectPreviewBridge";
import { parseChannel } from "@/shared/channels";

// 公开扫码中间页(不在 (console) 登录态内):二维码/NFC 指向 /p/<项目id>?channel=<身份>,
// 用户扫码进入 → 选平台 → 跳转小程序按 projectId + channel 拉随机素材 + 贴合身份的 AI 文案。
export const dynamic = "force-dynamic";

export default async function ProjectScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const { projectId } = await params;
  const { channel } = await searchParams;

  return <ProjectPreviewBridge channel={parseChannel(channel)} projectId={projectId} />;
}
```

- [ ] **Step 2: Bridge 接收 channel 并拼进 apiUrl**

在 `ProjectPreviewBridge.tsx` 顶部 import 处加：
```tsx
import type { Channel } from "@/shared/channels";
```
`ProjectPreviewBridgeProps` 改为：
```tsx
type ProjectPreviewBridgeProps = {
  channel: Channel;
  projectId: string;
};
```
组件签名与 `getApiUrl` 改为带上 channel（channel 已是合法值，URL 安全，无需再 encode）：
```tsx
export function ProjectPreviewBridge({ channel, projectId }: ProjectPreviewBridgeProps) {
  const { message } = App.useApp();
  const xhsTemplate = process.env.NEXT_PUBLIC_XHS_MINI_PROGRAM_URL ?? "";
  const wechatTemplate = process.env.NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL ?? "";

  const getApiUrl = useCallback(
    () =>
      `${window.location.origin}/api/public/projects/${encodeURIComponent(projectId)}/preview?channel=${channel}`,
    [channel, projectId],
  );
```
（`buildMiniProgramUrl` 会 `encodeURIComponent(apiUrl)`，channel 随 apiUrl 一起传进小程序，无需另改。）

- [ ] **Step 3: 类型检查 + 构建**

Run: `npx tsc --noEmit && npx next build`
Expected: 退出码 0。

- [ ] **Step 4: 验收**

浏览器/开发工具打开 `/p/<项目id>?channel=agent`，进入选平台页后查看跳转链接里 `apiUrl` 已带 `?channel=agent`；不带 channel 打开 `/p/<项目id>` 时 apiUrl 为 `?channel=visitor`。

---

### Task 7: 迁移 SQL 与文档同步

**Files:**
- Modify: `SERVER_SETUP.md`（老库升级 SQL + 三渠道说明）
- Modify: `PROJECT_CONTEXT.md`、`README.md`

**Interfaces:**
- Consumes: 前面所有改动。

- [ ] **Step 1: SERVER_SETUP.md 加“已有库升级”迁移 SQL**

在 SERVER_SETUP 的数据库升级章节加入（假设每个项目当前恰有一条默认渠道）：
```sql
-- property_channels 拆三渠道(游客/用户/中介)升级
-- 1) 先加可空列,便于回填
ALTER TABLE property_channels ADD COLUMN IF NOT EXISTS channel_type text;

-- 2) 已有渠道转成 visitor,并给 qr_value 补 ?channel=visitor
UPDATE property_channels
SET channel_type = 'visitor', label = '游客渠道',
    qr_value = qr_value || '?channel=visitor'
WHERE channel_type IS NULL;

-- 3) 每个项目补 resident、agent 两条(qr_value 从 visitor 行推导)
INSERT INTO property_channels (property_id, channel_type, label, qr_value, sort_order)
SELECT v.property_id, 'resident', '用户渠道',
       replace(v.qr_value, '?channel=visitor', '?channel=resident'), 1
FROM property_channels v
WHERE v.channel_type = 'visitor'
  AND NOT EXISTS (SELECT 1 FROM property_channels r
                  WHERE r.property_id = v.property_id AND r.channel_type = 'resident');

INSERT INTO property_channels (property_id, channel_type, label, qr_value, sort_order)
SELECT v.property_id, 'agent', '中介渠道',
       replace(v.qr_value, '?channel=visitor', '?channel=agent'), 2
FROM property_channels v
WHERE v.channel_type = 'visitor'
  AND NOT EXISTS (SELECT 1 FROM property_channels a
                  WHERE a.property_id = v.property_id AND a.channel_type = 'agent');

-- 4) 收紧约束
ALTER TABLE property_channels ALTER COLUMN channel_type SET NOT NULL;
ALTER TABLE property_channels ADD CONSTRAINT property_channels_channel_type_check
  CHECK (channel_type IN ('visitor','resident','agent'));
ALTER TABLE property_channels ADD CONSTRAINT property_channels_property_type_uniq
  UNIQUE (property_id, channel_type);
```
并加一句说明：若某项目原本无渠道，迁移后不会自动补齐（新建项目才自动生成三条）。

- [ ] **Step 2: PROJECT_CONTEXT.md 更新**

在“扫码公开预览”相关段落补：项目二维码为三渠道（visitor/resident/agent，见 `src/shared/channels.ts`），扫码 URL 带 `?channel=`，缺省回退 visitor；预览接口 `parseChannel` 解析后经 `getProjectPreview(id,count,channel)` 传入 `generateXhsCaption`，注入 `CHANNEL_ANGLES[channel]`（全局角度，叠加在每项目 `caption_profiles` 风格之上）；响应带 `captionChannel`。`property_channels` 新增 `channel_type`。

- [ ] **Step 3: README.md 更新**

在“注意事项”里更新渠道/扫码那条：新建项目自动生成三条渠道（游客/用户/中介），各自二维码扫码地址 `/p/<项目id>?channel=<身份>`；文案按身份生成（角度常量在 `src/shared/channels.ts` + `caption.ts` 的 `CHANNEL_ANGLES`）。

- [ ] **Step 4: 全量构建收尾**

Run: `npx tsc --noEmit && npx next build`
Expected: 退出码 0。文档改动不影响构建；作为整体收尾确认。

---

## Self-Review

**Spec coverage：**
- 三渠道数据模型（channel_type + CHECK + UNIQUE）→ Task 4；建项目生成三条 → Task 5；三个二维码 → Task 5（复用现有遍历渲染）。✓
- 扫码→预览→文案 全链路带 channel → Task 1(parseChannel) + Task 3(路由/服务) + Task 6(页/Bridge)。✓
- 三身份默认角度 = 全局常量注入 → Task 2（`CHANNEL_ANGLES`）。✓
- 每项目 `caption_profiles` 叠加 → Task 2 拼接顺序(角度 → 风格 → 范例) 保留。✓
- 缺省/非法 channel 回退 visitor → Task 1 `parseChannel`。✓
- 老库迁移 → Task 7。✓ 文档同步 → Task 7。✓
- 不改随机取图、不动 publish_records → 计划中未触及，符合边界。✓

**Placeholder scan：** 无 TBD/TODO；每个改动步骤给了完整代码/SQL/命令。✓

**Type consistency：** `Channel` 贯穿 Task 1/2/3/6；`parseChannel`、`CHANNEL_TYPES`、`DEFAULT_CHANNEL`、`getProjectPreview(id,count,channel)`、`CaptionInput.channel`、`ProjectPreview.captionChannel` 命名前后一致。✓
