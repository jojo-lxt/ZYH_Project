"use client";

import { useState } from "react";
import { AppstoreOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, CloudUploadOutlined, TagsOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Progress, Radio, Select, Space, Steps, Tabs, Tag, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useGetMaterialUploadOptionsQuery } from "@/store/consoleApi";
import type { MaterialUploadResponse, QuickTagGroup } from "@/shared/types/console";

const emptyUploadOptions: MaterialUploadResponse = {
  attributeGroups: [],
  sellingPointGroups: [],
};

const materialStageOptions = [
    "交付和口碑期",
    "亮相开放前",
    "现房在售期",
    "诚意登记期",
    "专项营销活动",
    "尾盘与清盘期",
    "横沔和泗青公园专题笔记",
    "张江金茂府品质交付",
    "区域价值",
    "配套价值",
    "产品力价值",
    "地段价值",
];

const { Dragger } = Upload;

function UploadStepper({ current }: { current: number }) {
  return (
    <Steps
      className="upload-steps"
      current={current}
      items={[
        { content: "批量选择文件", title: "上传图片" },
        { content: "选择打标方式", title: "打标选择" },
        { content: "保存到素材库", title: "完成入库" },
      ]}
    />
  );
}

function formatUploadSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function QuickTagPanel({
  groups,
  onComplete,
  selectedTags,
  setSelectedTags,
}: {
  groups: QuickTagGroup[];
  onComplete: () => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}) {
  return (
    <aside className="quick-tag-panel">
      <h2>快速打标</h2>
      <p>点击图片后，选择卖点标签</p>
      <div className="selected-tag-row">
        <span>卖点标签：</span>
        {selectedTags.slice(0, 3).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <Tabs
        defaultActiveKey="selling"
        items={[
          {
            key: "selling",
            label: "卖点标签",
            children: (
              <div className="quick-tag-scroll">
                {groups.map((group) => (
                  <div className="quick-tag-group" key={group.name}>
                    <h3>{group.name}</h3>
                    <div>
                      {group.options.map((option) => {
                        const active = selectedTags.includes(option);

                        return (
                          <button
                            className={active ? "active" : ""}
                            key={option}
                            onClick={() => {
                              setSelectedTags(
                                active
                                  ? selectedTags.filter((tag) => tag !== option)
                                  : [...selectedTags, option],
                              );
                            }}
                            type="button"
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "attribute",
            label: "属性标签",
            children: <div className="quick-tag-empty">选项为空</div>,
          },
        ]}
      />
      <Button block onClick={onComplete} type="primary">
        保存标签 ({selectedTags.length})
      </Button>
      <Button block onClick={onComplete}>暂不打标</Button>
    </aside>
  );
}

export function MaterialUploadImagePage() {
  const { message } = App.useApp();
  const { data = emptyUploadOptions } = useGetMaterialUploadOptionsQuery();
  const [step, setStep] = useState(0);
  const [taggingMode, setTaggingMode] = useState<"choice" | "tagging">("choice");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["二手房溢价能力强"]);
  const selectedFiles = fileList.filter((file) => file.originFileObj);
  const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);

  async function startUpload() {
    if (selectedFiles.length === 0) {
      message.warning("请先选择图片");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      if (file.originFileObj) {
        formData.append("images", file.originFileObj);
      }
    });

    await fetch("/api/console/materials/upload", {
      body: formData,
      method: "POST",
    });

    setStep(1);
    message.success("图片已上传");
  }

  return (
    <section className="console-page material-upload-page">
      <UploadStepper current={step} />

      {step === 0 ? (
        <div className="upload-work-card">
          <Dragger
            accept="image/jpeg,image/png"
            beforeUpload={() => false}
            fileList={fileList}
            multiple
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(0, 20))}
            showUploadList={{ showRemoveIcon: true }}
          >
            <div className="material-drop">
              <CloudUploadOutlined />
              <h2>拖拽图片文件到这里，或点击上传</h2>
              <p>支持批量上传，最多 2500 张，单张不超过 50MB</p>
              <p>支持格式：JPG、PNG</p>
              <Space>
                <Button onClick={() => message.info("请选择图片文件")} type="primary">
                  选择单张图片
                </Button>
                <Button onClick={() => message.info("当前演示环境按批量图片选择处理")} type="primary">
                  选择文件夹
                </Button>
              </Space>
            </div>
          </Dragger>

          <div className="upload-queue">
            <div className="upload-queue-head">
              <h2>上传队列</h2>
              <Space>
                <span>已上传 {selectedFiles.length} / {selectedFiles.length}</span>
                <Button disabled={selectedFiles.length === 0} onClick={startUpload}>
                  开始上传
                </Button>
                <Button onClick={() => setFileList([])}>清空队列</Button>
              </Space>
            </div>
            <div className="upload-options-grid">
              <div>
                <p>类型</p>
                <Radio.Group defaultValue="inside">
                  <Radio value="inside">内页图</Radio>
                  <Radio value="poster">海报首图</Radio>
                </Radio.Group>
              </div>
              <div>
                <p>营销阶段</p>
                <Select
                    options={materialStageOptions.map((value) => ({ label: value, value }))}
                    placeholder="请选择"
                />
              </div>
              <div>
                <p>平台</p>
                <Checkbox.Group defaultValue={["xhs", "wechat"]}>
                  <Checkbox value="xhs">小红书</Checkbox>
                  <Checkbox value="wechat">微信</Checkbox>
                </Checkbox.Group>
              </div>
            </div>
            <div className="upload-progress-row">
              <span>总进度</span>
              <Progress percent={selectedFiles.length ? 100 : 0} showInfo={false} />
              <em>{selectedFiles.length ? "100%" : "0%"}</em>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 && taggingMode === "choice" ? (
        <div className="tag-choice-card">
          <div className="tag-choice-title">
            <AppstoreOutlined />
            <h2>选择打标方式</h2>
            <p>您可以选择现在进行打标，或者稍后在素材管理中进行批量打标</p>
          </div>
          <div className="tag-choice-grid">
            <div className="tag-choice-option active">
              <TagsOutlined />
              <h3>立即打标</h3>
              <p>现在为上传的图片添加卖点标签，方便后续查找和使用</p>
              <div>共 {selectedFiles.length} 张图片待打标</div>
              <Button block onClick={() => setTaggingMode("tagging")} type="primary">
                开始打标
              </Button>
            </div>
            <div className="tag-choice-option">
              <ArrowRightOutlined />
              <h3>稍后打标</h3>
              <p>图片已入库，可以稍后在素材管理中进行批量打标操作</p>
              <div>可在素材管理页面进行批量操作</div>
              <Button block onClick={() => setStep(2)}>完成入库</Button>
            </div>
          </div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
            返回上传
          </Button>
        </div>
      ) : null}

      {step === 1 && taggingMode === "tagging" ? (
        <div className="tagging-workspace">
          <div className="pending-materials">
            <div className="pending-head">
              <div>
                <h2>待打标图片</h2>
                <p>共 {selectedFiles.length} 张，已打标 0 张，待处理 {selectedFiles.length} 张</p>
              </div>
              <Space>
                <Button onClick={() => {
                  message.success(`已为 ${selectedFiles.length} 张图片批量保存标签`);
                  setStep(2);
                }} type="primary">
                  批量打标
                </Button>
                <Button onClick={() => setStep(2)}>暂不打标</Button>
              </Space>
            </div>
            <div className="pending-image-grid">
              {selectedFiles.map((file, index) => (
                <div className="pending-image" key={file.uid}>
                  <div className="pending-thumb">{index + 1}</div>
                  <strong>{file.name}</strong>
                  <span>待打标</span>
                </div>
              ))}
            </div>
          </div>
          <QuickTagPanel
            groups={data.sellingPointGroups}
            onComplete={() => setStep(2)}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="upload-done-card">
          <CheckCircleOutlined />
          <h2>上传完成!</h2>
          <p>已成功上传 {selectedFiles.length} 张图片到素材库</p>
          <div className="done-tip">图片已入库，可随时在素材管理中进行打标和管理</div>
          <Space>
            <Button onClick={() => window.location.assign("/materials")} type="primary">
              查看素材库
            </Button>
            <Button onClick={() => {
              setFileList([]);
              setTaggingMode("choice");
              setStep(0);
            }}>
              继续上传
            </Button>
          </Space>
          <div className="done-stats">
            <div><strong>{selectedFiles.length}</strong><span>上传文件数</span></div>
            <div><strong>{formatUploadSize(totalSize)}</strong><span>总文件大小</span></div>
            <div><strong>{selectedTags.length}</strong><span>打标总数</span></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
