import "server-only";

// 小红书种草文案生成。走 OpenAI 兼容接口调用国内大模型(DeepSeek / 通义千问 / 混元 / 智谱 GLM / Kimi 等),
// 厂商用环境变量配置(LLM_BASE_URL / LLM_API_KEY / LLM_MODEL),换家只改 env、不改代码。
// 关键:未配置或调用失败时返回「兜底文案」,绝不把错误抛给调用方,保证预览页永远有文案。

export type XhsCaption = {
  body: string;
  title: string;
  topics: string[];
};

export type CaptionInput = {
  projectName: string;
  sellingPoints: string[];
  tags: string[];
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
  const system =
    "你是资深小红书房产种草文案写手。用口语化、有网感、带 emoji 的风格,为地产项目写一篇简短笔记。" +
    "只输出 JSON,不要额外解释或代码块围栏。JSON 字段:" +
    "title(不超过 20 字的标题)、body(正文,150 字以内,可含换行和 emoji)、" +
    "topics(3-6 个话题词字符串数组,不带 # 号)。";
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

function parseCaption(content: string, input: CaptionInput): XhsCaption {
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

    if (!title && !body) {
      return fallbackCaption(input);
    }

    const fallback = fallbackCaption(input);

    return {
      body: body || fallback.body,
      title: title || fallback.title,
      topics: topics.length ? topics.slice(0, 6) : fallback.topics,
    };
  } catch {
    return fallbackCaption(input);
  }
}

export async function generateXhsCaption(input: CaptionInput): Promise<XhsCaption> {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim();

  // 没配大模型就直接兜底(本地/未接入时也能跑通预览)。
  if (!baseUrl || !apiKey || !model) {
    return fallbackCaption(input);
  }

  const controller = new AbortController();
  const timeout = Number(process.env.LLM_TIMEOUT_MS ?? 20000);
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) ? timeout : 20000);

  try {
    const response = await fetch(`${trimTrailingSlashes(baseUrl)}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 800,
        messages: buildMessages(input),
        model,
        response_format: { type: "json_object" },
        temperature: 0.9,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackCaption(input);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    return content ? parseCaption(content, input) : fallbackCaption(input);
  } catch {
    // 超时 / 网络 / 解析异常都兜底,不影响预览接口返回。
    return fallbackCaption(input);
  } finally {
    clearTimeout(timer);
  }
}
