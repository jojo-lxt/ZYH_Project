"use client";

import { useMemo, useState } from "react";
import { MenuOutlined, ReloadOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { App, Button, Card, Checkbox, Drawer, Input, Menu, Modal, Radio, Select, Space, Spin, Tag } from "antd";
import {
  useDeleteMaterialsMutation,
  useGetMaterialsQuery,
  useGetSellingPointConfigQuery,
  useGetTagConfigQuery,
  useUpdateMaterialMutation,
  useUpdateMaterialTagsMutation,
} from "@/store/consoleApi";
import { selectConsoleCurrentProject } from "@/store/consoleSlice";
import { useAppSelector } from "@/store/hooks";
import type { ConfigTreeItem, MaterialItem } from "@/shared/types/console";
import { MARKETING_STAGES } from "@/features/console/shared/marketingStages";

type MaterialTagKind = "attribute" | "selling";

type MaterialFilters = {
  attributeTags: string[];
  category: "all" | "inside" | "poster";
  sellingTags: string[];
  stage: string;
  attributeMatchMode: "all" | "any";
  sellingMatchMode: "all" | "any";
  platform: "all" | "wechat" | "xhs";
  tagStatus: "all" | "done" | "todo";
  uploadedAt: "all" | "today" | "week" | "month";
  uploader: string;
};

type MaterialTagEditorState = {
  item: MaterialItem;
  kind: MaterialTagKind;
  selectedTags: string[];
};

type MaterialTypeConfigState = {
  category: string;
  item: MaterialItem;
  platforms: string[];
  stage: string;
};

type MaterialTagGroup = {
  name: string;
  options: string[];
};

const materialCategoryOptions = ["内页图", "海报首图"];
const materialPlatformOptions = ["小红书", "微信"];
const emptyConfigTree: ConfigTreeItem[] = [];
const emptyMaterials: MaterialItem[] = [];

function getMaterialFileSize(item: MaterialItem) {
  if (item.fileSizeBytes <= 0) {
    return "-";
  }

  if (item.fileSizeBytes < 1024 * 1024) {
    return `${(item.fileSizeBytes / 1024).toFixed(2)} KB`;
  }

  return `${(item.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`;
}

function getMaterialTags(item: MaterialItem, kind: MaterialTagKind) {
  return kind === "selling" ? item.sellingTags : item.attributeTags;
}

function getMaterialTagGroupsFromTree(tree: ConfigTreeItem[]): MaterialTagGroup[] {
  return tree.map((group) => ({
    name: group.name,
    options: group.children?.map((child) => child.name) ?? [],
  }));
}

function isWithinUploadRange(uploadedAt: string, range: MaterialFilters["uploadedAt"]) {
  if (range === "all") {
    return true;
  }

  const uploadedTime = new Date(uploadedAt.replace(" ", "T")).getTime();
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(now.getDate() - (range === "week" ? 7 : 30));
  }

  return uploadedTime >= start.getTime();
}

function MaterialPreview({
  className = "",
  item,
  showBadge = true,
}: {
  className?: string;
  item: MaterialItem;
  showBadge?: boolean;
}) {
  return (
    <div
      className={`material-thumb ${className}`}
      style={{
        background: item.imageUrl
          ? `center / cover no-repeat url("${item.imageUrl}")`
          : `linear-gradient(145deg, ${item.color}, ${item.accent})`,
      }}
    >
      {showBadge ? <span>{item.category}</span> : null}
      {item.imageUrl ? null : (
        <>
          <div className="thumb-sky" />
          <div className="thumb-ground" />
        </>
      )}
    </div>
  );
}

function TagPill({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button className={active ? "tag-pill active" : "tag-pill"} onClick={onToggle} type="button">
      <i />
      <span>{label}</span>
    </button>
  );
}

function MaterialTagEditorModal({
  editor,
  fileSize,
  groups,
  onCancel,
  onSave,
  onSelectedTagsChange,
}: {
  editor: MaterialTagEditorState | null;
  fileSize: string;
  groups: MaterialTagGroup[];
  onCancel: () => void;
  onSave: () => void;
  onSelectedTagsChange: (tags: string[]) => void;
}) {
  const item = editor?.item;
  const selectedTags = editor?.selectedTags ?? [];

  return (
    <Modal
      centered
      className="material-tag-modal"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" onClick={onSave} type="primary">
          保存
        </Button>,
      ]}
      onCancel={onCancel}
      open={Boolean(editor)}
      title="编辑"
      width={820}
    >
      {item ? (
        <>
          <div className="material-edit-head">
            <MaterialPreview className="material-edit-thumb" item={item} showBadge={false} />
            <div>
              <h3>{item.title}</h3>
              <p>文件大小: {fileSize}</p>
              <p>分辨率: {item.size}</p>
              <p>当前绑定标签: {selectedTags.length} 个</p>
            </div>
          </div>

          <div className="material-tag-title">选择标签</div>
          <div className="material-tag-groups">
            {groups.map((group) => (
              <section className="material-tag-group" key={group.name}>
                <div className="material-tag-group-head">
                  <strong>{group.name}</strong>
                  <span>{group.options.length} 个标签</span>
                </div>
                <div className="tag-pill-grid">
                  {group.options.map((option) => {
                    const active = selectedTags.includes(option);

                    return (
                      <TagPill
                        active={active}
                        key={option}
                        label={option}
                        onToggle={() => {
                          onSelectedTagsChange(
                            active
                              ? selectedTags.filter((tag) => tag !== option)
                              : [...selectedTags, option],
                          );
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="selected-material-tags">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => <span key={tag}>{tag}</span>)
            ) : (
              <em>暂无选中标签</em>
            )}
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function MaterialDetailDrawer({
  attributeTags,
  item,
  onConfigureType,
  onClose,
  onDelete,
  onDownload,
  onEditAttribute,
  onEditSelling,
  onPublishDetail,
  open,
  sellingTags,
}: {
  attributeTags: string[];
  item: MaterialItem | null;
  onConfigureType: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEditAttribute: () => void;
  onEditSelling: () => void;
  onPublishDetail: () => void;
  open: boolean;
  sellingTags: string[];
}) {
  if (!item) {
    return null;
  }

  const fileSize = getMaterialFileSize(item);

  return (
    <Drawer
      className="material-detail-drawer"
      onClose={onClose}
      open={open}
      placement="right"
      title="素材详情"
      size={500}
    >
      <MaterialPreview className="material-detail-preview" item={item} showBadge={false} />

      <section className="drawer-section">
        <h3>基础信息</h3>
        <dl className="material-detail-list">
          <div>
            <dt>文件名:</dt>
            <dd>{item.title}</dd>
          </div>
          <div>
            <dt>文件大小:</dt>
            <dd>{fileSize}</dd>
          </div>
          <div>
            <dt>分辨率:</dt>
            <dd>{item.size}</dd>
          </div>
          <div>
            <dt>类型:</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt>营销阶段:</dt>
            <dd>{item.stage}</dd>
          </div>
          <div>
            <dt>平台:</dt>
            <dd>{item.platforms.join("、")}</dd>
          </div>
        </dl>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-head">
          <h3>卖点标签</h3>
          <button onClick={onEditSelling} type="button">编辑</button>
        </div>
        <div className="drawer-tags">
          {sellingTags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-head">
          <h3>属性标签</h3>
          <button onClick={onEditAttribute} type="button">编辑</button>
        </div>
        {attributeTags.length > 0 ? (
          <div className="drawer-tags secondary">
            {attributeTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        ) : (
          <p className="drawer-empty">暂无属性标签</p>
        )}
      </section>

      <section className="drawer-section">
        <h3>上传信息</h3>
        <dl className="material-detail-list">
          <div>
            <dt>上传者:</dt>
            <dd>{item.uploader}</dd>
          </div>
          <div>
            <dt>上传时间:</dt>
            <dd>{item.uploadedAt}</dd>
          </div>
          <div>
            <dt>最后修改:</dt>
            <dd>{item.updatedAt}</dd>
          </div>
        </dl>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-head">
          <h3>发布信息</h3>
          <button onClick={onPublishDetail} type="button">发布详情</button>
        </div>
        <dl className="material-detail-list">
          <div>
            <dt>发布状态:</dt>
            <dd className="publish-state">未发布</dd>
          </div>
        </dl>
      </section>

      <div className="drawer-actions">
        <Button block onClick={onDownload} type="primary">下载原图</Button>
        <Button block onClick={onConfigureType} type="primary">类型配置</Button>
        <Button block danger onClick={onDelete}>删除素材</Button>
      </div>
    </Drawer>
  );
}

function MaterialTypeConfigModal({
  config,
  onCancel,
  onChange,
  onSave,
}: {
  config: MaterialTypeConfigState | null;
  onCancel: () => void;
  onChange: (config: MaterialTypeConfigState) => void;
  onSave: () => void;
}) {
  const item = config?.item;

  return (
    <Modal
      centered
      className="material-type-modal"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" onClick={onSave} type="primary">
          保存
        </Button>,
      ]}
      onCancel={onCancel}
      open={Boolean(config)}
      title="图片类型配置"
      width={500}
    >
      {config && item ? (
        <div className="material-type-form">
          <label>
            <span><em>*</em> 素材类别</span>
            <Select
              options={materialCategoryOptions.map((value) => ({ label: value, value }))}
              value={config.category}
              onChange={(category) => onChange({ ...config, category })}
            />
          </label>
          <label>
            <span>营销阶段</span>
            <Select
              allowClear
              showSearch
              options={MARKETING_STAGES.map((value) => ({ label: value, value }))}
              placeholder="请选择营销阶段"
              value={config.stage}
              onChange={(stage) => onChange({ ...config, stage: stage ?? "" })}
            />
          </label>
          <div className="material-type-platforms">
            <span>平台</span>
            <Checkbox.Group
              options={materialPlatformOptions}
              value={config.platforms}
              onChange={(platforms) => {
                onChange({
                  ...config,
                  platforms: platforms.map(String),
                });
              }}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function MaterialCard({
  attributeTags,
  batchMode,
  item,
  onEditAttribute,
  onEditSelling,
  onOpenDetail,
  onToggleSelect,
  selected,
  sellingTags,
}: {
  attributeTags: string[];
  batchMode: boolean;
  item: MaterialItem;
  onEditAttribute: () => void;
  onEditSelling: () => void;
  onOpenDetail: () => void;
  onToggleSelect: () => void;
  selected: boolean;
  sellingTags: string[];
}) {
  const visibleTags = sellingTags.slice(0, 2);
  const hiddenCount = Math.max(0, sellingTags.length - visibleTags.length);
  const actions = [
    <Button key="selling" onClick={onEditSelling} type="link">卖点</Button>,
    <Button key="attribute" onClick={onEditAttribute} type="link">
      属性{attributeTags.length > 0 ? `(${attributeTags.length})` : ""}
    </Button>,
    <Button key="detail" onClick={onOpenDetail} type="link">详情</Button>,
  ];

  return (
    <Card
      actions={actions}
      className={selected ? "material-card selected" : "material-card"}
      cover={<MaterialPreview item={item} />}
    >
      {batchMode ? (
        <label className="material-select">
          <Checkbox checked={selected} onChange={onToggleSelect} />
        </label>
      ) : null}
      <h3>{item.title}</h3>
      <div className="material-tags">
        {visibleTags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
        {hiddenCount > 0 ? <Tag>+{hiddenCount}</Tag> : null}
      </div>
      <div className="material-meta">
        <span>{item.size}</span>
        <span>{getMaterialFileSize(item)}</span>
      </div>
    </Card>
  );
}

function FilterTagMenu({
  groups,
  selectedTags,
  onSelectedTagsChange,
}: {
  groups: MaterialTagGroup[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  function toggleTag(tag: string) {
    onSelectedTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((item) => item !== tag)
        : [...selectedTags, tag],
    );
  }

  return (
    <Menu
      className="filter-menu"
      mode="inline"
      openKeys={openKeys}
      onOpenChange={(keys) => setOpenKeys(keys)}
      selectable={false}
      items={groups.map((group) => ({
        key: group.name,
        label: (
          <span className="filter-menu-label">
            {group.name}
            {group.options.some((option) => selectedTags.includes(option)) ? (
              <em>{group.options.filter((option) => selectedTags.includes(option)).length}</em>
            ) : null}
          </span>
        ),
        children: group.options.length > 0
          ? group.options.map((option) => ({
            key: `${group.name}-${option}`,
            label: (
              <Checkbox
                checked={selectedTags.includes(option)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => toggleTag(option)}
              >
                {option}
              </Checkbox>
            ),
          }))
          : [{
            disabled: true,
            key: `${group.name}-empty`,
            label: <span className="filter-menu-empty">选项为空</span>,
          }],
      }))}
    />
  );
}

function FilterRail({
  attributeGroups,
  filters,
  onChange,
  onClear,
  sellingGroups,
  stages,
  uploaders,
}: {
  attributeGroups: MaterialTagGroup[];
  filters: MaterialFilters;
  onChange: (filters: MaterialFilters) => void;
  onClear: () => void;
  sellingGroups: MaterialTagGroup[];
  stages: string[];
  uploaders: string[];
}) {
  return (
    <aside className="filter-rail">
      <div className="filter-head">
        <strong>筛选条件</strong>
        <button onClick={onClear} type="button">清空</button>
      </div>
      <div className="filter-block">
        <p>素材类别</p>
        <Radio.Group
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          value={filters.category}
        >
          <Radio value="all">全部</Radio>
          <Radio value="inside">内页图</Radio>
          <Radio value="poster">海报首图</Radio>
        </Radio.Group>
      </div>
      <div className="filter-block">
        <div className="filter-block-head">
          <p>属性标签</p>
          <Radio.Group
            onChange={(event) => onChange({ ...filters, attributeMatchMode: event.target.value })}
            value={filters.attributeMatchMode}
          >
            <Radio value="all">且</Radio>
            <Radio value="any">或</Radio>
          </Radio.Group>
        </div>
        <FilterTagMenu
          groups={attributeGroups}
          selectedTags={filters.attributeTags}
          onSelectedTagsChange={(attributeTags) => onChange({ ...filters, attributeTags })}
        />
      </div>
      <div className="filter-block">
        <div className="filter-block-head">
          <p>卖点标签</p>
          <Radio.Group
            onChange={(event) => onChange({ ...filters, sellingMatchMode: event.target.value })}
            value={filters.sellingMatchMode}
          >
            <Radio value="all">且</Radio>
            <Radio value="any">或</Radio>
          </Radio.Group>
        </div>
        <FilterTagMenu
          groups={sellingGroups}
          selectedTags={filters.sellingTags}
          onSelectedTagsChange={(sellingTags) => onChange({ ...filters, sellingTags })}
        />
      </div>
      <div className="filter-block">
        <p>上传时间</p>
        <Radio.Group
          onChange={(event) => onChange({ ...filters, uploadedAt: event.target.value })}
          value={filters.uploadedAt}
        >
          <Radio value="all">全部</Radio>
          <Radio value="today">今天</Radio>
          <Radio value="week">最近7天</Radio>
          <Radio value="month">最近30天</Radio>
        </Radio.Group>
      </div>
      <div className="filter-block">
        <p>营销阶段</p>
        <Select
          allowClear
          className="filter-select"
          options={stages.map((value) => ({ label: value, value }))}
          placeholder="全部"
          value={filters.stage || undefined}
          onChange={(stage) => onChange({ ...filters, stage: stage ?? "" })}
        />
      </div>
      <div className="filter-block">
        <p>上传者</p>
        <Select
          allowClear
          className="filter-select"
          options={uploaders.map((value) => ({ label: value, value }))}
          placeholder="全部"
          value={filters.uploader || undefined}
          onChange={(uploader) => onChange({ ...filters, uploader: uploader ?? "" })}
        />
      </div>
      <div className="filter-block">
        <p>平台</p>
        <Radio.Group
          onChange={(event) => onChange({ ...filters, platform: event.target.value })}
          value={filters.platform}
        >
          <Radio value="all">全部</Radio>
          <Radio value="xhs">小红书</Radio>
          <Radio value="wechat">微信</Radio>
        </Radio.Group>
      </div>
      <div className="filter-block">
        <p>打标状态</p>
        <Radio.Group
          onChange={(event) => onChange({ ...filters, tagStatus: event.target.value })}
          value={filters.tagStatus}
        >
          <Radio value="all">全部</Radio>
          <Radio value="done">已打标</Radio>
          <Radio value="todo">未打标</Radio>
        </Radio.Group>
      </div>
    </aside>
  );
}

export function MaterialsPage() {
  const { message } = App.useApp();
  const currentProject = useAppSelector(selectConsoleCurrentProject);
  const { data: materialsData, refetch: refetchMaterials, isFetching: isMaterialsFetching } = useGetMaterialsQuery(currentProject, { skip: !currentProject });
  const { data: sellingConfigData } = useGetSellingPointConfigQuery(currentProject, { skip: !currentProject });
  const { data: tagConfigData } = useGetTagConfigQuery(currentProject, { skip: !currentProject });
  const [deleteMaterialsMutation] = useDeleteMaterialsMutation();
  const [updateMaterial] = useUpdateMaterialMutation();
  const [updateMaterialTags] = useUpdateMaterialTagsMutation();
  const materials = materialsData?.materials ?? emptyMaterials;
  const sellingConfigTree = sellingConfigData?.tree ?? emptyConfigTree;
  const tagConfigTree = tagConfigData?.tree ?? emptyConfigTree;
  const [detailItem, setDetailItem] = useState<MaterialItem | null>(null);
  const [filters, setFilters] = useState<MaterialFilters>({
    attributeMatchMode: "any",
    attributeTags: [],
    category: "all",
    platform: "all",
    sellingMatchMode: "any",
    sellingTags: [],
    stage: "",
    tagStatus: "all",
    uploadedAt: "all",
    uploader: "",
  });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(() => new Set());
  const [tagEditor, setTagEditor] = useState<MaterialTagEditorState | null>(null);
  const [typeConfig, setTypeConfig] = useState<MaterialTypeConfigState | null>(null);

  const attributeTagGroups = useMemo(
    () => getMaterialTagGroupsFromTree(tagConfigTree),
    [tagConfigTree],
  );
  const sellingTagGroups = useMemo(
    () => getMaterialTagGroupsFromTree(sellingConfigTree),
    [sellingConfigTree],
  );
  const uploaderOptions = useMemo(
    () => Array.from(new Set(materials.map((item) => item.uploader))),
    [materials],
  );
  const stageOptions = useMemo(
    () => Array.from(new Set([...materials.map((item) => item.stage), ...MARKETING_STAGES])),
    [materials],
  );

  const filteredMaterials = useMemo(
    () =>
      materials.filter((item) => {
        const sellingTags = getMaterialTags(item, "selling");
        const attributeTags = getMaterialTags(item, "attribute");
        const allTags = [...sellingTags, ...attributeTags];
        const matchKeyword = item.title.toLowerCase().includes(keyword.trim().toLowerCase());
        const matchCategory =
          filters.category === "all" ||
          (filters.category === "inside" && item.category === "内页图") ||
          (filters.category === "poster" && item.category === "海报首图");
        const matchPlatform =
          filters.platform === "all" ||
          (filters.platform === "xhs" && item.platforms.includes("小红书")) ||
          (filters.platform === "wechat" && item.platforms.includes("微信"));
        const matchStage = !filters.stage || item.stage === filters.stage;
        const matchUploader = !filters.uploader || item.uploader === filters.uploader;
        const matchUploadedAt = isWithinUploadRange(item.uploadedAt, filters.uploadedAt);
        const isTagged = allTags.length > 0;
        const matchTagStatus =
          filters.tagStatus === "all" ||
          (filters.tagStatus === "done" && isTagged) ||
          (filters.tagStatus === "todo" && !isTagged);
        const matchAttributeTags =
          filters.attributeTags.length === 0 ||
          (filters.attributeMatchMode === "all"
            ? filters.attributeTags.every((tag) => attributeTags.includes(tag) || item.tone.includes(tag))
            : filters.attributeTags.some((tag) => attributeTags.includes(tag) || item.tone.includes(tag)));
        const matchSellingTags =
          filters.sellingTags.length === 0 ||
          (filters.sellingMatchMode === "all"
            ? filters.sellingTags.every((tag) => sellingTags.includes(tag) || item.tone.includes(tag))
            : filters.sellingTags.some((tag) => sellingTags.includes(tag) || item.tone.includes(tag)));

        return (
          matchKeyword &&
          matchCategory &&
          matchPlatform &&
          matchStage &&
          matchUploader &&
          matchUploadedAt &&
          matchTagStatus &&
          matchAttributeTags &&
          matchSellingTags
        );
      }),
    [filters, keyword, materials],
  );

  function openTagEditor(kind: MaterialTagKind, item: MaterialItem) {
    setTagEditor({
      item,
      kind,
      selectedTags: getMaterialTags(item, kind),
    });
  }

  async function saveTagEditor() {
    if (!tagEditor) {
      return;
    }

    await updateMaterialTags({
      id: tagEditor.item.id,
      kind: tagEditor.kind,
      tags: tagEditor.selectedTags,
    }).unwrap();
    setDetailItem((current) =>
      current?.id === tagEditor.item.id
        ? {
          ...current,
          [tagEditor.kind === "selling" ? "sellingTags" : "attributeTags"]: tagEditor.selectedTags,
        }
        : current,
    );
    setTagEditor(null);
    message.success("标签已保存");
  }

  function clearMaterialFilters() {
    setFilters({
      attributeMatchMode: "any",
      attributeTags: [],
      category: "all",
      platform: "all",
      sellingMatchMode: "any",
      sellingTags: [],
      stage: "",
      tagStatus: "all",
      uploadedAt: "all",
      uploader: "",
    });
    setKeyword("");
    message.success("筛选条件已清空");
  }

  function resetMaterials() {
    refetchMaterials();
    setSelectedMaterialIds(new Set());
    setIsBatchMode(false);
    clearMaterialFilters();
    message.success("素材列表已刷新");
  }

  function toggleMaterialSelect(id: number) {
    setSelectedMaterialIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function deleteMaterials(ids: number[]) {
    if (ids.length === 0) {
      message.warning("请选择要删除的素材");
      return;
    }

    await deleteMaterialsMutation(ids).unwrap();
    setSelectedMaterialIds(new Set());
    setDetailItem((current) => current && ids.includes(current.id) ? null : current);
    message.success(`已删除 ${ids.length} 个素材`);
  }

  function openTypeConfig(item: MaterialItem) {
    setTypeConfig({
      category: item.category,
      item,
      platforms: item.platforms,
      stage: item.stage,
    });
  }

  async function saveTypeConfig() {
    if (!typeConfig) {
      return;
    }

    if (!typeConfig.category) {
      message.warning("请选择素材类别");
      return;
    }

    await updateMaterial({
      category: typeConfig.category,
      id: typeConfig.item.id,
      platforms: typeConfig.platforms,
      stage: typeConfig.stage,
    }).unwrap();
    setDetailItem((current) =>
      current?.id === typeConfig.item.id
        ? {
          ...current,
          category: typeConfig.category,
          platforms: typeConfig.platforms,
          stage: typeConfig.stage,
        }
        : current,
    );
    setTypeConfig(null);
    message.success("图片类型配置已保存");
  }

  const detailSellingTags = detailItem ? getMaterialTags(detailItem, "selling") : [];
  const detailAttributeTags = detailItem ? getMaterialTags(detailItem, "attribute") : [];

  return (
    <section className="console-page material-page">
      <FilterRail
        attributeGroups={attributeTagGroups}
        filters={filters}
        onChange={setFilters}
        onClear={clearMaterialFilters}
        sellingGroups={sellingTagGroups}
        stages={stageOptions}
        uploaders={uploaderOptions}
      />
      <div className="material-content">
        <div className="material-toolbar">
          <Space>
            <span className="view-label">视图: <UnorderedListOutlined /></span>
            <Input.Search
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={() => message.success("查询完成")}
              placeholder="搜索图片名称"
              value={keyword}
            />
            <span className="muted-line">共 {filteredMaterials.length} 条数据</span>
          </Space>
          <Space>
            {isBatchMode ? (
              <Button danger onClick={() => deleteMaterials(Array.from(selectedMaterialIds))}>
                删除选中 ({selectedMaterialIds.size})
              </Button>
            ) : null}
            <Button onClick={() => {
              setIsBatchMode((value) => !value);
              setSelectedMaterialIds(new Set());
            }}>
              {isBatchMode ? "退出批量" : "批量操作"}
            </Button>
            <Button
              icon={<MenuOutlined />}
              onClick={() => message.info("已切换列表密度")}
              type="text"
            />
            <Button
              icon={<ReloadOutlined />}
              loading={isMaterialsFetching}
              onClick={resetMaterials}
              type="text"
            />
          </Space>
        </div>
        <Spin spinning={isMaterialsFetching}>
        <div className="material-grid">
          {filteredMaterials.map((item) => {
            const sellingTags = getMaterialTags(item, "selling");
            const attributeTags = getMaterialTags(item, "attribute");

            return (
              <MaterialCard
                attributeTags={attributeTags}
                batchMode={isBatchMode}
                item={item}
                key={item.id}
                onEditAttribute={() => openTagEditor("attribute", item)}
                onEditSelling={() => openTagEditor("selling", item)}
                onOpenDetail={() => setDetailItem(item)}
                onToggleSelect={() => toggleMaterialSelect(item.id)}
                selected={selectedMaterialIds.has(item.id)}
                sellingTags={sellingTags}
              />
            );
          })}
        </div>
        </Spin>
      </div>

      <MaterialTagEditorModal
        editor={tagEditor}
        fileSize={tagEditor ? getMaterialFileSize(tagEditor.item) : ""}
        groups={tagEditor?.kind === "selling" ? sellingTagGroups : attributeTagGroups}
        onCancel={() => setTagEditor(null)}
        onSave={saveTagEditor}
        onSelectedTagsChange={(selectedTags) => {
          setTagEditor((current) => current ? { ...current, selectedTags } : current);
        }}
      />

      <MaterialDetailDrawer
        attributeTags={detailAttributeTags}
        item={detailItem}
        onConfigureType={() => {
          if (detailItem) {
            openTypeConfig(detailItem);
          }
        }}
        onClose={() => setDetailItem(null)}
        onDelete={() => {
          if (detailItem) {
            deleteMaterials([detailItem.id]);
          }
        }}
        onDownload={() => {
          if (!detailItem?.imageUrl) {
            message.warning("当前素材没有原图地址");
            return;
          }

          window.open(detailItem.imageUrl, "_blank", "noopener,noreferrer");
        }}
        onEditAttribute={() => {
          if (detailItem) {
            openTagEditor("attribute", detailItem);
          }
        }}
        onEditSelling={() => {
          if (detailItem) {
            openTagEditor("selling", detailItem);
          }
        }}
        onPublishDetail={() => message.info("当前素材暂无发布记录")}
        open={Boolean(detailItem)}
        sellingTags={detailSellingTags}
      />

      <MaterialTypeConfigModal
        config={typeConfig}
        onCancel={() => setTypeConfig(null)}
        onChange={setTypeConfig}
        onSave={saveTypeConfig}
      />
    </section>
  );
}
