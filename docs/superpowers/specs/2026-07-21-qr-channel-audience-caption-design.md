# 二维码三渠道 + 按身份生成文案 设计

日期：2026-07-21
状态：已确认，待写实现计划

## 目标

项目二维码从「一条默认渠道」拆成**三种渠道**，每种对应一类扫码人群（身份），并把该身份贯穿到 AI 文案生成，让文案贴合读者：

- **游客渠道（visitor）**：来售楼部了解的潜在客户。
- **用户渠道（resident）**：已购住户。
- **中介渠道（agent）**：中介 / 经纪人。

每种渠道有独立二维码；扫码 → 预览 → 文案生成 全链路携带 `channel`，生成时先告诉大模型读者身份与写作目标。

## 关键决策（已与用户确认）

1. 三种身份的文案做到「**不同目标 + 不同角度**」（语气/结构相近、立场不同），不是只加一句身份提示，也不是完全不同的模板。
2. 每种身份的「目标/角度」用**全局代码常量**维护（类似 `marketingStages`），所有项目共用；每项目原有 `caption_profiles`（`style_spec`/`examples`）风格档案照常叠加在上面。角度文案后续由用户自行修改。
3. 只影响**文案**；随机取图逻辑三种渠道一致，不变。

## 三种身份的默认「角度」（CHANNEL_ANGLES 初始内容）

存为全局常量，注入 system prompt。用户后续可自行改措辞。

- **visitor（游客）**：读者是还没买、来了解项目的潜在客户。目标＝种草、激发兴趣、引导到访/留资。第一人称「我去看了这个盘」的安利口吻，主打卖点/生活方式/环境户型亮点，制造「想去看看」的冲动。（≈ 现有默认调性）
- **resident（用户）**：读者是已购住户。目标＝晒真实居住体验、增强归属、促老带新。以「住进来之后」的真实感受写，讲社区/物业/邻里/生活细节，真实可信不广告腔，可带「推荐亲友」的钩子。
- **agent（中介）**：读者是中介/经纪人。目标＝给中介带看弹药、帮转化客户。写得专业、卖点清单式、信息密度高（户型/价格区间/配套/学区/交通/客户常问点），结构清晰，附带看话术。

## 数据模型

`property_channels` 增加 `channel_type` 字段，并约束每项目每类型唯一：

```sql
channel_type text NOT NULL CHECK (channel_type IN ('visitor','resident','agent'))
UNIQUE (property_id, channel_type)
```

每个项目固定 3 条渠道（替换原「默认渠道」单条）：

| channel_type | label    | qr_value（扫码地址）              |
|--------------|----------|----------------------------------|
| visitor      | 游客渠道 | `/p/<项目id>?channel=visitor`    |
| resident     | 用户渠道 | `/p/<项目id>?channel=resident`   |
| agent        | 中介渠道 | `/p/<项目id>?channel=agent`      |

## 数据流

```
扫码 /p/<id>?channel=visitor
  → src/app/p/[projectId]/page.tsx 读 searchParams.channel
  → ProjectPreviewBridge 把 channel 拼进给小程序的 apiUrl
  → 小程序调 /api/public/projects/<id>/preview?channel=visitor
  → preview 路由 parseChannel(channel) → channel（缺失/非法 → visitor 兜底）
  → getProjectPreview(id, count, channel)
  → generateXhsCaption({ ..., channel })
  → buildMessages 注入 CHANNEL_ANGLES[channel]
```

system prompt 分层拼接（顺序固定）：**基础写手设定 + channel 角度（全局常量）+ 项目 style_spec + 项目 examples**。

## 组件与改动点

- **`src/shared/channels.ts`（新）**：`CHANNEL_TYPES`（`[{ value:'visitor', label:'游客渠道' }, …]`，前后端共用：渲染三个二维码、/p 页解析、路由校验），及 `CHANNEL_VALUES` / `DEFAULT_CHANNEL`（= `'visitor'`）。
- **`src/server/ai/caption.ts`**：新增 `Channel = 'visitor'|'resident'|'agent'`；服务端常量 `CHANNEL_ANGLES: Record<Channel,string>`；`CaptionInput.channel?: Channel`；`buildMessages` 注入 channel 角度块（缺省时行为与现在一致）。
- **`src/app/api/public/projects/[id]/preview/route.ts`**：`parseChannel(searchParams.get('channel'))` → `Channel`，非法/缺失回退 `DEFAULT_CHANNEL`；传给 `getProjectPreview`。
- **`src/server/public/publicService.ts`**：`getProjectPreview(projectId, count, channel)`；透传 `channel` 给 `generateXhsCaption`。（`ProjectPreview` 类型可选带上 `channel` 便于 devtools 观测，非必须。）
- **`src/server/console/propertyDetailUrl.ts`**：`buildProjectScanUrl(base, id, channel?)` 支持拼 `?channel=`。
- **`src/server/console/consoleRepository.ts`**：`createProperty` 建 3 条渠道（各带 channel_type + 对应 qr_value）；`getPropertyDetail` 返回 `channelType`。
- **`src/features/console/properties/PropertyPages.tsx`**：详情页渲染 3 个带标签的二维码（按 CHANNEL_TYPES 顺序）。
- **`src/app/p/[projectId]/page.tsx`**：读 `channel` searchParam，传入 `ProjectPreviewBridge`。
- **`src/features/public/ProjectPreviewBridge.tsx`**：接收 `channel`，把它拼进 `getApiUrl()` 生成的 `/preview?channel=…`（并按需带进小程序跳转链接）。
- **`database/schema.sql`**：`property_channels` 加 `channel_type` + CHECK + UNIQUE(property_id, channel_type)。

## 迁移与兜底

- **新项目**：`createProperty` 自动建 visitor/resident/agent 三条。
- **老项目（已有库升级）**：迁移 SQL —— 把现有渠道转成 visitor（补 `channel_type='visitor'`、刷新 qr_value 带 `?channel=visitor`），再为每个项目补 resident、agent 两条。SQL 写进 `SERVER_SETUP.md`。
- **兜底**：`channel` 缺失/非法 → `visitor`（等于现有行为，老二维码不受影响）。

## 不在本次范围（YAGNI）

- 随机取图不因 channel 改变（三种渠道取图规则一致）。
- `publish_records` 暂不记 channel（「哪种渠道带来发布」的分析后续再说）。
- 渠道类型固定为这 3 种，不做「可增删的渠道类型」通用化。

## 文档同步（实现时一并做）

按项目约定，代码逻辑改动同批更新 `README.md` / `PROJECT_CONTEXT.md` / `SERVER_SETUP.md`：三渠道二维码、`channel_type`、扫码 URL 带 `?channel=`、按身份生成文案、老库迁移 SQL。
