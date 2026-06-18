"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback } from "react";
import {
  BookOutlined,
  RightOutlined,
  VideoCameraOutlined,
  WechatOutlined,
} from "@ant-design/icons";
import { App } from "antd";

type DraftPlatformBridgeProps = {
  draftId: string;
};

type PlatformChoice =
  | {
    disabled?: false;
    icon: ReactNode;
    iconStyle: CSSProperties;
    platform: "wechat" | "xhs";
    title: string;
    type: "mini-program";
  }
  | {
    disabled: true;
    icon: ReactNode;
    iconStyle: CSSProperties;
    title: string;
    type: "disabled";
  };

function appendQuery(url: string, params: Record<string, string>) {
  const nextUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    nextUrl.searchParams.set(key, value);
  });

  return nextUrl.toString();
}

function buildMiniProgramUrl(template: string, draftId: string, apiUrl: string) {
  if (template.includes("{draftId}") || template.includes("{apiUrl}")) {
    return template
      .replaceAll("{draftId}", encodeURIComponent(draftId))
      .replaceAll("{apiUrl}", encodeURIComponent(apiUrl));
  }

  return appendQuery(template, {
    apiUrl,
    draftId,
  });
}

const iconBaseStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 14,
  color: "#fff",
  display: "grid",
  placeItems: "center",
};

const pageStyles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#eef0f4",
    color: "#111827",
    paddingBottom: 32,
  },
  hero: {
    minHeight: 312,
    background:
      "radial-gradient(circle at 50% 10%, rgba(255, 163, 91, 0.92), transparent 34%), linear-gradient(180deg, #111111 0%, #3f160e 62%, #c9673b 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    padding: "38px 24px 34px",
    textAlign: "center",
  },
  heroMark: {
    color: "#f08f55",
    fontSize: 132,
    fontWeight: 900,
    lineHeight: 0.82,
    opacity: 0.92,
  },
  heroWord: {
    fontSize: 42,
    fontWeight: 300,
    letterSpacing: 0,
    marginTop: -38,
  },
  heroSub: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 15,
    marginTop: 42,
  },
  content: {
    padding: "26px 18px 0",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 30,
    fontWeight: 700,
  },
  subtitle: {
    margin: "0 0 24px",
    color: "#374151",
    fontSize: 18,
  },
  choices: {
    display: "grid",
    gap: 18,
  },
  choice: {
    width: "100%",
    minHeight: 94,
    border: "1px solid rgba(255,255,255,0.92)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 12px 30px rgba(31, 41, 55, 0.08)",
    display: "grid",
    gridTemplateColumns: "64px minmax(0, 1fr) 28px",
    alignItems: "center",
    gap: 14,
    cursor: "pointer",
    padding: "16px 20px",
    textAlign: "left",
  },
  choiceDisabled: {
    cursor: "not-allowed",
    opacity: 0.72,
  },
  iconXhs: {
    ...iconBaseStyle,
    background: "#ef3448",
    fontSize: 28,
  },
  iconWechat: {
    ...iconBaseStyle,
    background: "#34c759",
    fontSize: 30,
  },
  choiceTitle: {
    display: "block",
    color: "#111827",
    fontSize: 25,
    fontWeight: 760,
    lineHeight: 1.22,
  },
  choiceMeta: {
    display: "block",
    color: "#6b7280",
    fontSize: 13,
    marginTop: 6,
  },
  arrow: {
    color: "#111827",
    fontSize: 24,
  },
};

function getPlatformChoices(): PlatformChoice[] {
  return [
    {
      icon: <BookOutlined />,
      iconStyle: pageStyles.iconXhs,
      platform: "xhs",
      title: "小红书笔记生成",
      type: "mini-program",
    },
    {
      icon: <WechatOutlined />,
      iconStyle: pageStyles.iconWechat,
      platform: "wechat",
      title: "微信图文笔记生成",
      type: "mini-program",
    },
    {
      disabled: true,
      icon: <VideoCameraOutlined />,
      iconStyle: pageStyles.iconWechat,
      title: "视频脚本（内测中）",
      type: "disabled",
    },
  ];
}

export function DraftPlatformBridge({ draftId }: DraftPlatformBridgeProps) {
  const { message } = App.useApp();
  const xhsMiniProgramTemplate = process.env.NEXT_PUBLIC_XHS_MINI_PROGRAM_URL ?? "";
  const wechatMiniProgramTemplate = process.env.NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL ?? "";
  const choices = getPlatformChoices();

  const getDraftApiUrl = useCallback(() => {
    return `${window.location.origin}/api/drafts/${draftId}`;
  }, [draftId]);

  const getMiniProgramUrl = useCallback((template: string) => {
    if (!template) {
      return "";
    }

    try {
      return buildMiniProgramUrl(template, draftId, getDraftApiUrl());
    } catch {
      return "";
    }
  }, [draftId, getDraftApiUrl]);

  function openMiniProgram(platform: "wechat" | "xhs") {
    const template = platform === "xhs" ? xhsMiniProgramTemplate : wechatMiniProgramTemplate;
    const miniProgramUrl = getMiniProgramUrl(template);

    if (!miniProgramUrl) {
      message.warning(platform === "xhs" ? "小红书小程序链接未配置" : "微信小程序链接未配置");
      return;
    }

    window.location.assign(miniProgramUrl);
  }

  return (
    <main style={pageStyles.page}>
      <section style={pageStyles.hero}>
        <div>
          <div style={pageStyles.heroMark}>P</div>
          <div style={pageStyles.heroWord}>POPCON</div>
          <div style={pageStyles.heroSub}>米花 AI 地产一键种草神器</div>
        </div>
      </section>

      <section style={pageStyles.content}>
        <h1 style={pageStyles.title}>内容发布助手</h1>
        <p style={pageStyles.subtitle}>请选择要生成的平台草稿</p>

        <div style={pageStyles.choices}>
          {choices.map((choice) => (
            <button
              key={choice.title}
              onClick={() => {
                if (choice.type === "disabled") {
                  message.info("视频脚本功能内测中");
                  return;
                }

                openMiniProgram(choice.platform);
              }}
              style={{
                ...pageStyles.choice,
                ...(choice.disabled ? pageStyles.choiceDisabled : {}),
              }}
              type="button"
            >
              <span style={choice.iconStyle}>{choice.icon}</span>
              <span>
                <span style={pageStyles.choiceTitle}>{choice.title}</span>
                <span style={pageStyles.choiceMeta}>
                  {choice.type === "disabled"
                    ? "短视频脚本生成能力即将开放"
                    : `进入${choice.platform === "xhs" ? "小红书" : "微信"}小程序确认内容`}
                </span>
              </span>
              <RightOutlined style={pageStyles.arrow} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
