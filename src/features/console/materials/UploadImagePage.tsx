"use client";

import { useState } from "react";
import { AppstoreOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, CloudUploadOutlined, TagsOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Input, Progress, Radio, Select, Space, Steps, Tabs, Tag, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useGetMaterialUploadOptionsQuery, useUpdateMaterialTagsMutation } from "@/store/consoleApi";
import { selectConsoleCurrentProject } from "@/store/consoleSlice";
import { useAppSelector } from "@/store/hooks";
import type { MaterialUploadResponse, QuickTagGroup } from "@/shared/types/console";
import { MARKETING_STAGES } from "@/features/console/shared/marketingStages";

const emptyUploadOptions: MaterialUploadResponse = {
  attributeGroups: [],
  sellingPointGroups: [],
};

const { Dragger } = Upload;

type UploadedMaterialFile = {
  id: number;
  imageUrl: string;
  name: string;
  size: number;
  status: string;
  type: string;
};

type MaterialUploadResult = {
  files: UploadedMaterialFile[];
  total: number;
};

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
  attributeGroups,
  onComplete,
  onSkip,
  selectedAttributeTags,
  selectedSellingTags,
  sellingGroups,
  setSelectedAttributeTags,
  setSelectedSellingTags,
}: {
  attributeGroups: QuickTagGroup[];
  onComplete: () => void;
  onSkip: () => void;
  selectedAttributeTags: string[];
  selectedSellingTags: string[];
  sellingGroups: QuickTagGroup[];
  setSelectedAttributeTags: (tags: string[]) => void;
  setSelectedSellingTags: (tags: string[]) => void;
}) {
  function renderTagGroups(
    groups: QuickTagGroup[],
    selectedTags: string[],
    setSelectedTags: (tags: string[]) => void,
  ) {
    if (groups.length === 0) {
      return <div className="quick-tag-empty">选项为空</div>;
    }

    return (
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
    );
  }

  return (
    <aside className="quick-tag-panel">
      <h2>快速打标</h2>
      <p>选择卖点和属性标签后保存到素材库</p>
      <div className="selected-tag-row">
        <span>卖点标签：</span>
        {selectedSellingTags.slice(0, 3).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <div className="selected-tag-row">
        <span>属性标签：</span>
        {selectedAttributeTags.slice(0, 3).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <Tabs
        defaultActiveKey="selling"
        items={[
          {
            key: "selling",
            label: "卖点标签",
            children: renderTagGroups(sellingGroups, selectedSellingTags, setSelectedSellingTags),
          },
          {
            key: "attribute",
            label: "属性标签",
            children: renderTagGroups(attributeGroups, selectedAttributeTags, setSelectedAttributeTags),
          },
        ]}
      />
      <Button block onClick={onComplete} type="primary">
        保存标签 ({selectedSellingTags.length + selectedAttributeTags.length})
      </Button>
      <Button block onClick={onSkip}>暂不打标</Button>
    </aside>
  );
}

export function MaterialUploadImagePage() {
  const { message } = App.useApp();
  const currentProject = useAppSelector(selectConsoleCurrentProject);
  const { data = emptyUploadOptions } = useGetMaterialUploadOptionsQuery(currentProject, { skip: !currentProject });
  const [updateMaterialTags] = useUpdateMaterialTagsMutation();
  const [step, setStep] = useState(0);
  const [taggingMode, setTaggingMode] = useState<"choice" | "tagging">("choice");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [category, setCategory] = useState("内页图");
  const [stage, setStage] = useState("待配置");
  const [platforms, setPlatforms] = useState<string[]>(["小红书", "微信"]);
  const [selectedAttributeTags, setSelectedAttributeTags] = useState<string[]>([]);
  const [selectedSellingTags, setSelectedSellingTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedMaterialFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const selectedFiles = fileList.filter((file) => file.originFileObj);
  const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);

  async function startUpload() {
    if (selectedFiles.length === 0) {
      message.warning("请先选择图片");
      return;
    }

    if (platforms.length === 0) {
      message.warning("请至少选择一个平台");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      if (file.originFileObj) {
        formData.append("images", file.originFileObj);
        // 与 images 按相同顺序追加标题(留空则后端回退用文件名)。
        formData.append("titles", (fileNames[file.uid] ?? "").trim());
      }
    });
    formData.append("category", category);
    formData.append("stage", stage);
    platforms.forEach((platform) => formData.append("platforms", platform));

    setIsUploading(true);

    try {
      const response = await fetch("/api/console/materials/upload", {
        body: formData,
        // 上传走原生 fetch,不经过 RTK Query,需手动带上当前项目 id。
        headers: currentProject ? { "X-Project-Id": currentProject } : undefined,
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("图片上传失败");
      }

      const result = await response.json() as MaterialUploadResult;

      setUploadedFiles(result.files);
      setStep(1);
      message.success(`已上传 ${result.total} 张图片`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveUploadedTags() {
    if (uploadedFiles.length === 0) {
      message.warning("没有可打标的上传素材");
      return;
    }

    setIsSavingTags(true);

    try {
      await Promise.all(uploadedFiles.flatMap((file) => [
        updateMaterialTags({
          id: file.id,
          kind: "selling",
          tags: selectedSellingTags,
        }).unwrap(),
        updateMaterialTags({
          id: file.id,
          kind: "attribute",
          tags: selectedAttributeTags,
        }).unwrap(),
      ]));
      message.success(`已为 ${uploadedFiles.length} 张图片保存标签`);
      setStep(2);
    } catch {
      message.error("标签保存失败");
    } finally {
      setIsSavingTags(false);
    }
  }

  function resetUpload() {
    setFileList([]);
    setUploadedFiles([]);
    setSelectedAttributeTags([]);
    setSelectedSellingTags([]);
    setTaggingMode("choice");
    setStep(0);
  }

  return (
    <section className="console-page material-upload-page">
      <UploadStepper current={step} />

      {step === 0 ? (
        <div className="upload-work-card">
          <Dragger
            accept="image/jpeg,image/png"
            beforeUpload={(file) => {
              const isImage = ["image/jpeg", "image/png"].includes(file.type);
              const isUnderLimit = file.size <= 50 * 1024 * 1024;

              if (!isImage) {
                message.warning(`${file.name} 不是 JPG/PNG 图片`);
                return Upload.LIST_IGNORE;
              }

              if (!isUnderLimit) {
                message.warning(`${file.name} 超过 50MB`);
                return Upload.LIST_IGNORE;
              }

              return false;
            }}
            fileList={fileList}
            multiple
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(0, 2500))}
            showUploadList={{ showRemoveIcon: true }}
          >
            <div className="material-drop">
              <CloudUploadOutlined />
              <h2>拖拽图片文件到这里，或点击上传</h2>
              <p>支持批量上传，最多 2500 张，单张不超过 50MB</p>
              <p>支持格式：JPG、PNG(单张或多张都可,点此区域选择)</p>
            </div>
          </Dragger>

          <div className="upload-queue">
            <div className="upload-queue-head">
              <h2>上传队列</h2>
              <Space>
                <span>已选择 {selectedFiles.length} 张</span>
                <Button disabled={selectedFiles.length === 0} loading={isUploading} onClick={startUpload}>
                  开始上传
                </Button>
                <Button onClick={resetUpload}>清空队列</Button>
              </Space>
            </div>
            {selectedFiles.length > 0 ? (
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {selectedFiles.map((file) => (
                  <div key={file.uid} style={{ alignItems: "center", display: "flex", gap: 12 }}>
                    <span
                      style={{
                        color: "#6b7280",
                        flex: "0 0 38%",
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <Input
                      onChange={(event) =>
                        setFileNames((current) => ({ ...current, [file.uid]: event.target.value }))
                      }
                      placeholder="素材名称(留空则用文件名)"
                      value={fileNames[file.uid] ?? ""}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="upload-options-grid">
              <div>
                <p>类型</p>
                <Radio.Group onChange={(event) => setCategory(event.target.value)} value={category}>
                  <Radio value="内页图">内页图</Radio>
                  <Radio value="海报首图">海报首图</Radio>
                </Radio.Group>
              </div>
              <div>
                <p>营销阶段</p>
                <Select
                    options={MARKETING_STAGES.map((value) => ({ label: value, value }))}
                    placeholder="请选择"
                    value={stage === "待配置" ? undefined : stage}
                    onChange={(value) => setStage(value)}
                />
              </div>
              <div>
                <p>平台</p>
                <Checkbox.Group onChange={(values) => setPlatforms(values.map(String))} value={platforms}>
                  <Checkbox value="小红书">小红书</Checkbox>
                  <Checkbox value="微信">微信</Checkbox>
                </Checkbox.Group>
              </div>
            </div>
            <div className="upload-progress-row">
              <span>总进度</span>
              <Progress percent={uploadedFiles.length ? 100 : 0} showInfo={false} />
              <em>{uploadedFiles.length ? "100%" : "0%"}</em>
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
              <div>共 {uploadedFiles.length} 张图片待打标</div>
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
                <p>共 {uploadedFiles.length} 张，已打标 0 张，待处理 {uploadedFiles.length} 张</p>
              </div>
              <Space>
                <Button onClick={() => {
                  saveUploadedTags();
                }} loading={isSavingTags} type="primary">
                  批量打标
                </Button>
                <Button onClick={() => setStep(2)}>暂不打标</Button>
              </Space>
            </div>
            <div className="pending-image-grid">
              {uploadedFiles.map((file, index) => (
                <div className="pending-image" key={file.id}>
                  <div
                    className="pending-thumb"
                    style={{ backgroundImage: `url("${file.imageUrl}")` }}
                  >
                    <span>{index + 1}</span>
                  </div>
                  <strong>{file.name}</strong>
                  <span>待打标</span>
                </div>
              ))}
            </div>
          </div>
          <QuickTagPanel
            attributeGroups={data.attributeGroups}
            onComplete={saveUploadedTags}
            onSkip={() => setStep(2)}
            selectedAttributeTags={selectedAttributeTags}
            selectedSellingTags={selectedSellingTags}
            sellingGroups={data.sellingPointGroups}
            setSelectedAttributeTags={setSelectedAttributeTags}
            setSelectedSellingTags={setSelectedSellingTags}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="upload-done-card">
          <CheckCircleOutlined />
          <h2>上传完成!</h2>
          <p>已成功上传 {uploadedFiles.length} 张图片到素材库</p>
          <div className="done-tip">图片已入库，可随时在素材管理中进行打标和管理</div>
          <Space>
            <Button onClick={() => window.location.assign("/materials")} type="primary">
              查看素材库
            </Button>
            <Button onClick={resetUpload}>
              继续上传
            </Button>
          </Space>
          <div className="done-stats">
            <div><strong>{uploadedFiles.length}</strong><span>上传文件数</span></div>
            <div><strong>{formatUploadSize(totalSize)}</strong><span>总文件大小</span></div>
            <div><strong>{selectedSellingTags.length + selectedAttributeTags.length}</strong><span>打标总数</span></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
