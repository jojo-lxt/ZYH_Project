"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { App, Button, Input, Space, Tag } from "antd";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import type { XhsDraft } from "@/shared/types/drafts";

type XhsMiniProgramBridgeProps = {
  draft: XhsDraft;
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

export function XhsMiniProgramBridge({ draft }: XhsMiniProgramBridgeProps) {
  const { message } = App.useApp();
  const [autoOpened, setAutoOpened] = useState(false);
  const miniProgramTemplate = process.env.NEXT_PUBLIC_XHS_MINI_PROGRAM_URL ?? "";
  const hasMiniProgramUrl = Boolean(miniProgramTemplate);

  const getDraftApiUrl = useCallback(() => {
    return `${window.location.origin}/api/drafts/${draft.id}`;
  }, [draft.id]);

  const getMiniProgramUrl = useCallback(() => {
    if (!miniProgramTemplate) {
      return "";
    }

    try {
      return buildMiniProgramUrl(miniProgramTemplate, draft.id, getDraftApiUrl());
    } catch {
      return "";
    }
  }, [draft.id, getDraftApiUrl, miniProgramTemplate]);

  useEffect(() => {
    if (!miniProgramTemplate || autoOpened) {
      return;
    }

    const timer = window.setTimeout(() => {
      const miniProgramUrl = getMiniProgramUrl();

      if (!miniProgramUrl) {
        return;
      }

      setAutoOpened(true);
      window.location.href = miniProgramUrl;
    }, 500);

    return () => window.clearTimeout(timer);
  }, [autoOpened, getMiniProgramUrl, miniProgramTemplate]);

  async function copyDraftId() {
    const copied = await copyTextToClipboard(draft.id);

    message[copied ? "success" : "warning"](
      copied ? "草稿 ID 已复制" : "当前浏览器不支持自动复制",
    );
  }

  async function copyApiUrl() {
    const draftApiUrl = getDraftApiUrl();

    const copied = await copyTextToClipboard(draftApiUrl);

    message[copied ? "success" : "warning"](
      copied ? "草稿接口已复制" : "当前浏览器不支持自动复制",
    );
  }

  function openMiniProgram() {
    const miniProgramUrl = getMiniProgramUrl();

    if (!miniProgramUrl) {
      message.warning("小程序链接未配置");
      return;
    }

    window.location.href = miniProgramUrl;
  }

  return (
    <main className="mobile-shell xhs-mini-bridge">
      <section className="mobile-header">
        <p className="panel-kicker">小红书小程序</p>
        <h1>确认并发布</h1>
      </section>

      <section className="mini-program-status">
        <strong>{hasMiniProgramUrl ? "正在打开小程序" : "等待配置小程序链接"}</strong>
        <span>
          {hasMiniProgramUrl
            ? "如果没有自动跳转，请点击下方按钮继续。"
            : "配置 NEXT_PUBLIC_XHS_MINI_PROGRAM_URL 后，扫码会直接进入小程序确认页。"}
        </span>
      </section>

      <section className="mobile-images">
        {draft.selectedImages.map((image, index) => (
          <figure key={image.id}>
            <Image
              alt={image.originalName}
              fill
              sizes="(max-width: 560px) 31vw, 120px"
              src={image.url}
            />
            <figcaption>{index + 1}</figcaption>
          </figure>
        ))}
      </section>

      <section className="mobile-section">
        <div className="mobile-section-heading">
          <h2>文案</h2>
        </div>
        <Input.TextArea
          autoSize={{ minRows: 5, maxRows: 10 }}
          className="caption-box"
          readOnly
          value={draft.caption}
        />
      </section>

      <section className="mobile-section">
        <div className="mobile-section-heading">
          <h2>话题</h2>
        </div>
        <div className="mobile-tags">
          {draft.tags.map((tag) => (
            <Tag key={tag}>#{tag}</Tag>
          ))}
        </div>
      </section>

      <section className="mobile-section mini-program-meta">
        <span>Draft ID</span>
        <strong>{draft.id}</strong>
      </section>

      <footer className="mobile-actions">
        <Space orientation="vertical" size={10}>
          <Button block onClick={openMiniProgram} size="large" type="primary">
            打开小红书小程序
          </Button>
          <Space.Compact block>
            <Button block onClick={copyDraftId}>
              复制草稿 ID
            </Button>
            <Button block onClick={copyApiUrl}>
              复制接口
            </Button>
          </Space.Compact>
        </Space>
      </footer>
    </main>
  );
}
