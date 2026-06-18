"use client";

import { App, Button } from "antd";

export function UploadVideoPage() {
  const { message } = App.useApp();

  return (
    <section className="console-page">
      <div className="upload-placeholder">
        <h2>上传视频</h2>
        <p>后续可接入视频素材上传、脚本生成和平台发布流程。</p>
        <Button onClick={() => message.info("视频上传接口待接入，当前为前端占位流程")} type="primary">
          选择视频
        </Button>
      </div>
    </section>
  );
}

