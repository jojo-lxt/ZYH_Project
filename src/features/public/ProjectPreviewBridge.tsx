"use client";

import type { CSSProperties } from "react";
import { useCallback } from "react";
import { BookOutlined, RightOutlined, WechatOutlined } from "@ant-design/icons";
import { App } from "antd";
import type { Channel } from "@/shared/channels";

type ProjectPreviewBridgeProps = {
  channel: Channel;
  projectId: string;
};

// 把 projectId + 预览接口地址塞进小程序跳转链接。
// 模板(NEXT_PUBLIC_*_MINI_PROGRAM_URL)支持 {projectId}/{apiUrl} 占位符,否则以查询参数追加。
function buildMiniProgramUrl(template: string, projectId: string, apiUrl: string, channel: string) {
  if (
    template.includes("{projectId}") ||
    template.includes("{apiUrl}") ||
    template.includes("{channel}")
  ) {
    return template
      .replaceAll("{projectId}", encodeURIComponent(projectId))
      .replaceAll("{apiUrl}", encodeURIComponent(apiUrl))
      .replaceAll("{channel}", encodeURIComponent(channel));
  }

  const url = new URL(template);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("apiUrl", apiUrl);
  url.searchParams.set("channel", channel);

  return url.toString();
}

const styles: Record<string, CSSProperties> = {
  page: { background: "#eef0f4", color: "#111827", minHeight: "100vh", paddingBottom: 32 },
  hero: {
    background:
      "radial-gradient(circle at 50% 12%, rgba(255,163,91,0.9), transparent 36%), linear-gradient(180deg, #111 0%, #3f160e 62%, #c9673b 100%)",
    color: "#fff",
    display: "grid",
    minHeight: 260,
    padding: "40px 24px",
    placeItems: "center",
    textAlign: "center",
  },
  heroMark: { color: "#f08f55", fontSize: 110, fontWeight: 900, lineHeight: 0.85 },
  heroWord: { fontSize: 34, fontWeight: 300, marginTop: -28 },
  heroSub: { color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 28 },
  content: { padding: "26px 18px 0" },
  title: { fontSize: 26, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#374151", fontSize: 16, margin: "0 0 22px" },
  choices: { display: "grid", gap: 16 },
  choice: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.92)",
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(31,41,55,0.08)",
    cursor: "pointer",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "60px minmax(0,1fr) 24px",
    minHeight: 88,
    padding: "16px 20px",
    textAlign: "left",
    width: "100%",
  },
  iconXhs: {
    background: "#ef3448",
    borderRadius: 14,
    color: "#fff",
    display: "grid",
    fontSize: 26,
    height: 54,
    placeItems: "center",
    width: 54,
  },
  iconWechat: {
    background: "#34c759",
    borderRadius: 14,
    color: "#fff",
    display: "grid",
    fontSize: 28,
    height: 54,
    placeItems: "center",
    width: 54,
  },
  choiceTitle: { color: "#111827", display: "block", fontSize: 22, fontWeight: 700, lineHeight: 1.25 },
  choiceMeta: { color: "#6b7280", display: "block", fontSize: 13, marginTop: 6 },
  arrow: { color: "#111827", fontSize: 22 },
};

export function ProjectPreviewBridge({ channel, projectId }: ProjectPreviewBridgeProps) {
  const { message } = App.useApp();
  const xhsTemplate = process.env.NEXT_PUBLIC_XHS_MINI_PROGRAM_URL ?? "";
  const wechatTemplate = process.env.NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL ?? "";

  const getApiUrl = useCallback(
    () =>
      `${window.location.origin}/api/public/projects/${encodeURIComponent(projectId)}/preview?channel=${channel}`,
    [channel, projectId],
  );

  function openMiniProgram(platform: "wechat" | "xhs") {
    const template = platform === "xhs" ? xhsTemplate : wechatTemplate;

    if (!template) {
      message.warning(platform === "xhs" ? "小红书小程序链接未配置" : "微信小程序链接未配置");
      return;
    }

    try {
      window.location.assign(buildMiniProgramUrl(template, projectId, getApiUrl(), channel));
    } catch {
      message.error("跳转链接无效");
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.heroMark}>P</div>
          <div style={styles.heroWord}>POPCON</div>
          <div style={styles.heroSub}>米花 AI 地产一键种草神器</div>
        </div>
      </section>

      <section style={styles.content}>
        <h1 style={styles.title}>内容发布助手</h1>
        <p style={styles.subtitle}>请选择要生成的平台草稿</p>

        <div style={styles.choices}>
          <button onClick={() => openMiniProgram("xhs")} style={styles.choice} type="button">
            <span style={styles.iconXhs}>
              <BookOutlined />
            </span>
            <span>
              <span style={styles.choiceTitle}>小红书笔记生成</span>
              <span style={styles.choiceMeta}>进入小红书小程序,预览随机素材与文案</span>
            </span>
            <RightOutlined style={styles.arrow} />
          </button>

          <button onClick={() => openMiniProgram("wechat")} style={styles.choice} type="button">
            <span style={styles.iconWechat}>
              <WechatOutlined />
            </span>
            <span>
              <span style={styles.choiceTitle}>微信图文笔记生成</span>
              <span style={styles.choiceMeta}>进入微信小程序确认内容</span>
            </span>
            <RightOutlined style={styles.arrow} />
          </button>
        </div>
      </section>
    </main>
  );
}
