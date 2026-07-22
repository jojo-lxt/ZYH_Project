import "server-only";
import type { Channel } from "@/shared/channels";

// 小红书种草文案生成。走 OpenAI 兼容接口调用国内大模型(DeepSeek / 通义千问 / 混元 / 智谱 GLM / Kimi 等),
// 厂商用环境变量配置(LLM_BASE_URL / LLM_API_KEY / LLM_MODEL),换家只改 env、不改代码。
// 关键:未配置或调用失败时返回「兜底文案」,绝不把错误抛给调用方,保证预览页永远有文案。
// 返回值带 source("ai"/"fallback")和 reason(兜底原因码),随预览响应下发,线上不看日志也能自查。

export type XhsCaption = {
  body: string;
  title: string;
  topics: string[];
};

// 文案来源:ai=大模型生成,fallback=兜底(卖点/标签拼接)。
export type CaptionSource = "ai" | "fallback";

export type CaptionResult = {
  caption: XhsCaption;
  source: CaptionSource;
  // 兜底时的粗粒度原因码(不含密钥/堆栈),随响应返回,方便在前端 devtools 里自查为什么没走 AI。
  reason?: string;
};

export type CaptionInput = {
  projectName: string;
  sellingPoints: string[];
  tags: string[];
  // 每项目的文案风格档案:注入后让文案「风格稳定、内容有变化」。缺省时行为与原来一致。
  styleSpec?: string;
  examples?: XhsCaption[];
  // 渠道身份(即发布者身份):注入对应写作角度。缺省时行为与原来一致。
  channel?: Channel;
};

// 每种渠道身份的写作目标/角度,注入 system prompt。风格档案(style_spec/examples)会叠加在其上。
const CHANNEL_ANGLES: Record<Channel, string> = {
  visitor:
    "这篇笔记以「刚到售楼部看完房的准业主」第一人称口吻来写——你是还在看房、被这个盘打动的人,在小红书安利给同样在看房的姐妹。" +
    "目标:种草、激发兴趣、引导大家去看房或留资;主打卖点、生活方式、环境和户型亮点,制造「我也想去看看」的冲动。",
  resident:
    "这篇笔记以「已经买房、住进来的业主」第一人称口吻来写——你是真实住户,在小红书分享入住后的生活。" +
    "目标:晒真实居住体验、增强归属感、带动老带新;讲社区、物业、邻里和生活细节,真实可信、不要广告腔,自然带出「推荐给想买房的朋友」。",
  agent:
    "这篇笔记以「卖这个盘的置业顾问/中介」口吻来写——你是专业经纪人,在小红书给潜在客户介绍这套房。" +
    "目标:专业讲清卖点、帮客户决策、约看房;卖点清单式、信息密度高(户型、价格区间、配套、学区、交通、客户常问点),结构清晰,可带约看话术。",
};

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function dedupeNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

// 无大模型或失败时的兜底:用项目卖点/标签拼一段,保证预览页不空。
function fallbackCaption(input: CaptionInput): XhsCaption {
  const points = dedupeNonEmpty(input.sellingPoints).slice(0, 3);
  const tags = dedupeNonEmpty(input.tags).slice(0, 3);
  const bodyParts = [
    `${input.projectName || "这个项目"} 来啦～`,
    points.length ? `亮点:${points.join("、")}` : "",
    tags.length ? `关键词:${tags.join("、")}` : "",
    "更多实拍图看这里,感兴趣的姐妹评论区聊👇",
  ].filter(Boolean);

  return {
    body: bodyParts.join("\n"),
    title: `${input.projectName || "品质好房"}｜${points[0] ?? "实拍分享"}`,
    topics: dedupeNonEmpty([input.projectName, ...points, ...tags]).slice(0, 6),
  };
}

function buildMessages(input: CaptionInput) {
  // 风格档案:有则注入,约束语气/结构;few-shot 范例是稳定风格最强的杠杆。
  const styleBlock = input.styleSpec?.trim()
    ? `\n\n本项目文案风格规范(务必遵循):\n${input.styleSpec.trim()}`
    : "";
  const exampleBlock = input.examples?.length
    ? "\n\n以下是本项目已认可的范例,请严格模仿其语气/结构/话题风格,但不要照抄内容:\n" +
      input.examples
        .slice(0, 4)
        .map(
          (example, index) =>
            `范例${index + 1} 标题:${example.title}\n正文:${example.body}\n话题:${(example.topics ?? []).join("、")}`,
        )
        .join("\n---\n")
    : "";
  const channelBlock = input.channel
    ? `\n\n本篇发布者身份与写作目标(务必贴合):\n${CHANNEL_ANGLES[input.channel]}`
    : "";
  const system =
    "你是资深小红书房产种草文案写手。用口语化、有网感、带 emoji 的风格,为地产项目写一篇简短笔记。" +
    "只输出 JSON,不要额外解释或代码块围栏。JSON 字段:" +
    "title(不超过 20 字的标题)、body(可含换行和 emoji)、" +
    "topics(3-6 个话题词字符串数组,不带 # 号)。" +
    channelBlock +
    styleBlock +
    exampleBlock;
  const user = [
    `项目名称:${input.projectName || "未命名项目"}`,
    input.sellingPoints.length ? `卖点:${dedupeNonEmpty(input.sellingPoints).join("、")}` : "卖点:暂无",
    input.tags.length ? `标签:${dedupeNonEmpty(input.tags).join("、")}` : "标签:暂无",
    "请据此写一篇小红书种草笔记,严格输出上述 JSON。",
  ].join("\n");

  return [
    { content: system, role: "system" as const },
    { content: user, role: "user" as const },
  ];
}

// 解析模型输出:成功返回文案,内容不可用(空/非 JSON)返回 null,交给上层兜底并记原因。
function parseCaption(content: string, input: CaptionInput): XhsCaption | null {
  try {
    // 容错:有的模型会带代码块围栏或前后缀,截取第一个 { 到最后一个 }。
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const json = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    const parsed = JSON.parse(json) as Partial<XhsCaption>;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    const topics = Array.isArray(parsed.topics)
      ? dedupeNonEmpty(parsed.topics.map((topic) => String(topic)))
      : [];

    // 标题和正文都没有 = 模型没给出可用内容,判为解析失败。
    if (!title && !body) {
      return null;
    }

    // 单个字段缺失时用兜底内容补齐,但整体仍算「AI 生成」。
    const fallback = fallbackCaption(input);

    return {
      body: body || fallback.body,
      title: title || fallback.title,
      topics: topics.length ? topics.slice(0, 6) : fallback.topics,
    };
  } catch {
    return null;
  }
}

export async function generateXhsCaption(input: CaptionInput): Promise<CaptionResult> {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim();

  // 没配大模型就直接兜底(本地/未接入时也能跑通预览)。这是预期内的、不算失败,不打日志。
  if (!baseUrl || !apiKey || !model) {
    return { caption: fallbackCaption(input), reason: "not_configured", source: "fallback" };
  }

  const controller = new AbortController();
  const timeout = Number(process.env.LLM_TIMEOUT_MS ?? 20000);
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) ? timeout : 20000);

  // 真·失败时统一走这里:回兜底文案 + 一行 warn(不含密钥/堆栈),同时把原因码带进响应。
  function fail(reason: string): CaptionResult {
    console.warn(`[caption] LLM 调用失败(${reason}),改用兜底文案`);
    return { caption: fallbackCaption(input), reason, source: "fallback" };
  }

  try {
    const response = await fetch(`${trimTrailingSlashes(baseUrl)}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 800,
        messages: buildMessages(input),
        model,
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      return fail(`http_${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
      usage?: { completion_tokens?: number };
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    // 【诊断】空内容/解析失败时,额外打一行关键信号,帮助判定 parse_error 的真正成因:
    // finish_reason=length → 被 max_tokens 截断(JSON 不完整);completion_tokens 贴近 max_tokens 同样指向截断;
    // content 很短/为 {} → 模型退化空输出。content 是模型生成的文案(非密钥),截断脱敏后安全可打。
    function failWithDiag(reason: string): CaptionResult {
      const snippet = (content ?? "").replace(/\s+/g, " ").slice(0, 200);
      console.warn(
        `[caption] 诊断(${reason}): finish_reason=${choice?.finish_reason ?? "?"} ` +
          `completion_tokens=${data.usage?.completion_tokens ?? "?"} ` +
          `content_len=${(content ?? "").length} head="${snippet}"`,
      );
      return fail(reason);
    }

    if (!content) {
      return failWithDiag("empty_content");
    }

    const parsed = parseCaption(content, input);
    if (!parsed) {
      return failWithDiag("parse_error");
    }

    return { caption: parsed, source: "ai" };
  } catch {
    // 超时(abort)/ 网络异常都兜底,不影响预览接口返回。
    return fail(controller.signal.aborted ? "timeout" : "network_error");
  } finally {
    clearTimeout(timer);
  }
}
