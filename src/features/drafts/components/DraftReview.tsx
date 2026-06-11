"use client";

import { App, Button, Input, Space, Tag } from "antd";
import Image from "next/image";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import type { XhsDraft } from "@/shared/types/drafts";

type DraftReviewProps = {
  draft: XhsDraft;
};

export function DraftReview({ draft }: DraftReviewProps) {
  const { message } = App.useApp();

  async function copyCaption() {
    const copied = await copyTextToClipboard(draft.caption);

    if (copied) {
      message.success("文案已复制");
      return;
    }

    message.warning("当前浏览器不支持自动复制，请长按文案手动复制");
  }

  async function shareDraft() {
    try {
      const files = await Promise.all(
        draft.selectedImages.map(async (image) => {
          const response = await fetch(image.url);
          const blob = await response.blob();

          return new File([blob], image.originalName, {
            type: image.mimeType,
          });
        }),
      );

      if (navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          text: draft.caption,
          title: "小红书推荐草稿",
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          text: draft.caption,
          title: "小红书推荐草稿",
          url: window.location.href,
        });
        return;
      }

      await copyCaption();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      message.warning("当前浏览器不支持直接分享，已保留复制入口");
    }
  }

  function openXhs() {
    window.location.href = "xhsdiscover://";

    window.setTimeout(() => {
      window.location.href = "https://www.xiaohongshu.com";
    }, 900);
  }

  return (
    <main className="mobile-shell">
      <section className="mobile-header">
        <p className="panel-kicker">小红书草稿</p>
        <h1>确认内容</h1>
      </section>

      <section className="mobile-images">
        {draft.selectedImages.map((image, index) => (
          <figure key={image.id}>
            <Image
              alt={image.originalName}
              fill
              sizes="(max-width: 560px) 48vw, 31vw"
              src={image.url}
            />
            <figcaption>{index + 1}</figcaption>
          </figure>
        ))}
      </section>

      <section className="mobile-section">
        <div className="mobile-section-heading">
          <h2>文案</h2>
          <Button onClick={copyCaption} size="small">
            复制
          </Button>
        </div>
        <Input.TextArea
          autoSize={{ minRows: 8, maxRows: 14 }}
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

      <footer className="mobile-actions">
        <Space orientation="vertical" size={10}>
          <Button block onClick={shareDraft} size="large" type="primary">
            分享图片和文案
          </Button>
          <Button block onClick={openXhs} size="large">
            打开小红书
          </Button>
        </Space>
      </footer>
    </main>
  );
}
