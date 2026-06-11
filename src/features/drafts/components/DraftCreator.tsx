"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { UploadFile } from "antd/es/upload/interface";
import { App, Button, Select, Space, Upload } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import type { XhsDraft } from "@/shared/types/drafts";

type DraftResponse = {
  draft?: XhsDraft;
  draftUrl?: string;
  error?: string;
};

const { Dragger } = Upload;

const tagOptions = [
  "穿搭",
  "美食",
  "旅行",
  "家居",
  "探店",
  "好物分享",
  "生活方式",
  "氛围感",
  "拍照",
  "周末",
].map((value) => ({
  label: value,
  value,
}));

function formatFileSize(size?: number) {
  if (!size) {
    return "0KB";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export function DraftCreator() {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tags, setTags] = useState<string[]>(["好物分享", "氛围感"]);
  const [draft, setDraft] = useState<XhsDraft | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedFiles = useMemo(
    () => fileList.filter((file) => file.originFileObj),
    [fileList],
  );

  async function createDraft() {
    if (selectedFiles.length === 0) {
      message.warning("请先上传图片");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      if (file.originFileObj) {
        formData.append("images", file.originFileObj);
      }
    });

    tags.forEach((tag) => {
      formData.append("tags", tag);
    });

    setIsGenerating(true);

    try {
      const response = await fetch("/api/drafts", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as DraftResponse;

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "生成失败");
      }

      const url =
        payload.draftUrl ??
        new URL(`/drafts/${payload.draft.id}`, window.location.origin).toString();

      setDraft(payload.draft);
      setDraftUrl(url);
      message.success("二维码已生成");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyDraftUrl() {
    if (!draftUrl) {
      return;
    }

    const copied = await copyTextToClipboard(draftUrl);

    if (copied) {
      message.success("链接已复制");
      return;
    }

    message.warning("当前浏览器不支持自动复制，请手动打开草稿链接");
  }

  return (
    <div className="creator-grid">
      <section className="work-panel upload-panel">
        <div className="panel-heading">
          <p className="panel-kicker">素材</p>
          <h2>上传图片</h2>
        </div>

        <Dragger
          accept="image/*"
          beforeUpload={(file) => {
            if (!file.type.startsWith("image/")) {
              message.error("只能上传图片文件");
              return Upload.LIST_IGNORE;
            }

            return false;
          }}
          className="image-uploader"
          fileList={fileList}
          listType="picture"
          maxCount={12}
          multiple
          onChange={({ fileList: nextFileList }) => {
            setFileList(nextFileList.slice(0, 12));
          }}
        >
          <div className="upload-copy">
            <strong>拖拽图片到这里</strong>
            <span>最多 12 张，系统会自动选择 3 张生成草稿</span>
          </div>
        </Dragger>

        <div className="file-summary">
          <span>{selectedFiles.length} 张图片</span>
          <span>
            {selectedFiles
              .reduce((total, file) => total + (file.size ?? 0), 0)
              .toLocaleString()}{" "}
            bytes
          </span>
        </div>
      </section>

      <section className="work-panel settings-panel">
        <div className="panel-heading">
          <p className="panel-kicker">话题</p>
          <h2>选择标签</h2>
        </div>

        <Select
          className="tag-select"
          mode="tags"
          onChange={setTags}
          options={tagOptions}
          placeholder="输入或选择标签"
          tokenSeparators={[",", "，", " "]}
          value={tags}
        />

        <div className="tag-preview">
          {tags.length > 0 ? tags.map((tag) => <span key={tag}>#{tag}</span>) : null}
        </div>

        <Button
          block
          className="primary-action"
          loading={isGenerating}
          onClick={createDraft}
          size="large"
          type="primary"
        >
          生成二维码
        </Button>
      </section>

      <section className="work-panel result-panel">
        <div className="panel-heading">
          <p className="panel-kicker">二维码</p>
          <h2>扫码确认</h2>
        </div>

        {draft && draftUrl ? (
          <div className="qr-result">
            <div className="qr-box">
              <QRCodeSVG
                bgColor="#ffffff"
                fgColor="#111827"
                level="M"
                marginSize={2}
                size={220}
                title="小红书草稿二维码"
                value={draftUrl}
              />
            </div>

            <div className="selected-preview">
              {draft.selectedImages.map((image) => (
                <figure key={image.id}>
                  <Image
                    alt={image.originalName}
                    fill
                    sizes="(max-width: 900px) 45vw, 120px"
                    src={image.url}
                  />
                  <figcaption>{formatFileSize(image.size)}</figcaption>
                </figure>
              ))}
            </div>

            <Space wrap>
              <Button href={draftUrl} target="_blank">
                打开草稿
              </Button>
              <Button onClick={copyDraftUrl}>复制链接</Button>
            </Space>
          </div>
        ) : (
          <div className="empty-result">
            <span>等待生成</span>
          </div>
        )}
      </section>
    </div>
  );
}
