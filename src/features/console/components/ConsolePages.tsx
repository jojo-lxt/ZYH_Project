"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  MenuOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  TableOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Input,
  Modal,
  Pagination,
  Progress,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import { QRCodeSVG } from "qrcode.react";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import {
  useGetMaterialUploadOptionsQuery,
  useGetMaterialsQuery,
  useGetOverviewQuery,
  useGetPropertiesQuery,
  useGetPropertyDetailQuery,
  useGetSellingPointConfigQuery,
  useGetStrategyQuery,
  useGetTagConfigQuery,
  useGetUsersQuery,
} from "@/store/consoleApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addConfigItem as addConfigItemAction,
  deleteConfigItem as deleteConfigItemAction,
  deleteMaterials as deleteMaterialsAction,
  deleteProperty as deletePropertyAction,
  deleteUser as deleteUserAction,
  resetMaterials as resetMaterialsAction,
  resetProperties as resetPropertiesAction,
  resetUsers as resetUsersAction,
  reverseProperties,
  reverseUsers,
  selectMaterialTagOverrides,
  selectMaterials,
  selectProperties,
  selectSellingConfigTree,
  selectTagConfigTree,
  selectUsers,
  setMaterialTags,
  updateConfigItem as updateConfigItemAction,
  updateMaterialCategory,
  upsertProperty,
  upsertUser,
  type ConfigKind,
} from "@/store/consoleSlice";
import {
  mockMaterialUploadData,
  mockMaterialsData,
  mockOverviewData,
  mockPropertyDetailData,
  mockSellingPointConfigData,
  mockStrategyData,
  mockTagConfigData,
  type ConfigTreeItem,
  type MaterialItem,
  type NoteRow,
  type PropertyRow,
  type QuickTagGroup,
  type UserRow,
} from "@/shared/mock/consoleData";

const { Dragger } = Upload;

function formatNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function StatCard({
  label,
  trend,
  value,
}: {
  label: string;
  trend: string;
  value: string;
}) {
  return (
    <div className="console-stat-card">
      <div className="stat-icon" />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span>{trend}</span>
    </div>
  );
}

function MiniLineChart() {
  return (
    <div className="chart-card chart-large">
      <div className="chart-legend">
        <span className="legend-green">曝光数量</span>
        <span className="legend-blue">笔记数</span>
        <span className="legend-orange">互动数</span>
      </div>
      <svg aria-label="数据趋势分析" viewBox="0 0 960 250">
        <g className="chart-grid">
          {[40, 80, 120, 160, 200].map((y) => (
            <line key={y} x1="30" x2="930" y1={y} y2={y} />
          ))}
        </g>
        <polyline
          className="line-green"
          points="40,210 160,188 280,176 400,142 520,126 640,103 760,78 900,48"
        />
        <polyline
          className="line-blue"
          points="40,96 160,94 280,89 400,90 520,87 640,84 760,83 900,82"
        />
        <polyline
          className="line-orange"
          points="40,118 160,116 280,113 400,112 520,110 640,109 760,108 900,104"
        />
      </svg>
    </div>
  );
}

function BarCard({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {[76, 38, 88, 54, 69].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

function DonutCard() {
  return (
    <div className="chart-card">
      <h3>情绪效果分析</h3>
      <div className="donut-chart">
        <span>中性 105</span>
      </div>
    </div>
  );
}

function OverviewPage({
  onModeChange,
}: {
  onModeChange: (mode: "macro" | "strategy") => void;
}) {
  const { message } = App.useApp();
  const { data = mockOverviewData } = useGetOverviewQuery();
  const [channelType, setChannelType] = useState<"wechat" | "xhs">("xhs");
  const [noteType, setNoteType] = useState<"image" | "video">("image");
  const [ownerType, setOwnerType] = useState<"agent" | "guest" | "personal">("personal");
  const columns: ColumnsType<NoteRow> = [
    { dataIndex: "title", title: "笔记标题" },
    { dataIndex: "author", title: "发送人", width: 150 },
    {
      dataIndex: "params",
      title: "生成参数",
      render: (params: string[]) => (
        <Space orientation="vertical" size={0}>
          {params.map((item) => (
            <span key={item} className="muted-line">
              {item}
            </span>
          ))}
        </Space>
      ),
    },
    { dataIndex: "publishedAt", title: "发布时间", width: 190 },
    {
      dataIndex: "likes",
      title: "互动指标",
      width: 180,
      render: (likes: number) => (
        <span className="interaction-text">点赞:{likes} ｜ 评论:0<br />收藏:0 ｜ 分享:0</span>
      ),
    },
  ];

  return (
    <section className="console-page">
      <div className="console-tabs">
        <button
          className={noteType === "image" ? "active" : ""}
          onClick={() => setNoteType("image")}
          type="button"
        >
          图文笔记
        </button>
        <button
          className={noteType === "video" ? "active" : ""}
          onClick={() => setNoteType("video")}
          type="button"
        >
          视频脚本
        </button>
      </div>
      <div className="console-tabs subtle">
        <button
          className={channelType === "xhs" ? "active" : ""}
          onClick={() => setChannelType("xhs")}
          type="button"
        >
          小红书
        </button>
        <button
          className={channelType === "wechat" ? "active" : ""}
          onClick={() => setChannelType("wechat")}
          type="button"
        >
          微信
        </button>
      </div>
      <div className="panel-switch">
        <button className="active" onClick={() => onModeChange("macro")}>
          宏观数据看板
        </button>
        <button onClick={() => onModeChange("strategy")}>策略分析看板</button>
        <Button className="export-btn" onClick={() => message.success("周报已导出")} type="primary">
          导出周报
        </Button>
      </div>

      <div className="stat-grid">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            trend={stat.trend}
            value={stat.value}
          />
        ))}
      </div>

      <div className="section-title-row">
        <h2>数据趋势分析</h2>
        <DatePicker.RangePicker />
      </div>
      <MiniLineChart />

      <div className="rank-grid">
        <div className="table-panel">
          <h2>发布之星</h2>
          <ol className="rank-list">
            {data.rankAuthors.map((item, index) => (
              <li key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <em>{item.count}</em>
              </li>
            ))}
          </ol>
        </div>
        <div className="table-panel">
          <h2>互动之星</h2>
          <ol className="rank-list green">
            {data.rankInteractions.map((item, index) => (
              <li key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <em>{item.count}</em>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-toolbar">
          <div className="console-tabs compact">
            <button
              className={ownerType === "personal" ? "active" : ""}
              onClick={() => setOwnerType("personal")}
              type="button"
            >
              个人笔记
            </button>
            <button
              className={ownerType === "guest" ? "active" : ""}
              onClick={() => setOwnerType("guest")}
              type="button"
            >
              游客笔记
            </button>
            <button
              className={ownerType === "agent" ? "active" : ""}
              onClick={() => setOwnerType("agent")}
              type="button"
            >
              中介笔记
            </button>
          </div>
          <Space>
            <DatePicker.RangePicker />
            <Select className="user-select" placeholder="请选择用户" />
            <Button onClick={() => message.success("当前笔记列表已导出")}>导出</Button>
            <Button onClick={() => message.success("查询完成")} type="primary">查询</Button>
          </Space>
        </div>
        <Table columns={columns} dataSource={data.notes} pagination={false} />
      </div>
    </section>
  );
}

function StrategyPage({
  onModeChange,
}: {
  onModeChange: (mode: "macro" | "strategy") => void;
}) {
  const { message } = App.useApp();
  const { data = mockStrategyData } = useGetStrategyQuery();

  return (
    <section className="console-page">
      <div className="panel-switch">
        <button onClick={() => onModeChange("macro")}>宏观数据看板</button>
        <button className="active" onClick={() => onModeChange("strategy")}>
          策略分析看板
        </button>
        <Button className="export-btn" onClick={() => message.success("策略周报已导出")} type="primary">
          导出周报
        </Button>
      </div>
      <div className="section-title-row right">
        <DatePicker.RangePicker />
      </div>
      <div className="analysis-grid">
        <BarCard title="人设效果分析" />
        <BarCard title="模式效果分析" />
        <DonutCard />
      </div>
      <div className="analysis-grid two">
        <BarCard title="卖点关键词热度" />
        <div className="chart-card heat-card">
          <h3>策略组合热力图</h3>
          {data.heatRows.map((row) => (
            <div className="heat-row" key={row.label}>
              <span>{row.label}</span>
              <strong style={{ width: row.leftWidth }}>{row.left}</strong>
              <em style={{ width: row.rightWidth }}>{row.right}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="table-panel">
        <h2>卖点关键词热度 Top5</h2>
        <ol className="keyword-rank">
          {data.keywords.map((item, index) => (
            <li key={item.label}>
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
              <em>{item.count} 次互动</em>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type MaterialTagKind = "attribute" | "selling";

type MaterialFilters = {
  activeGroups: string[];
  category: "all" | "inside" | "poster";
  platform: "all" | "wechat" | "xhs";
  tagStatus: "all" | "done" | "todo";
};

type MaterialTagEditorState = {
  item: MaterialItem;
  kind: MaterialTagKind;
  selectedTags: string[];
};

type MaterialTagOverride = {
  attributeTags?: string[];
  sellingTags?: string[];
};

type MaterialTagGroup = {
  name: string;
  options: string[];
};

const defaultSellingTags = [
  "泗青公园的湿地体验区",
  "泗青公园的海棠春归景观",
  "泗青公园设置了 3 公里慢行道",
  "泗青公园的北部是茂密林带",
  "泗青公园是主打江南水岸体验",
  "张江金茂府交付前口碑稳定",
];

const defaultAttributeTags = [
  "园区景观",
  "林荫步道",
  "花园景观",
  "室外泳池",
  "城市景观",
  "景观绿化",
];

const materialSellingTagGroups: MaterialTagGroup[] = [
  ...mockMaterialUploadData.sellingPointGroups,
  {
    name: "横沔和泗青公园专题笔记",
    options: [
      "泗青公园的湿地体验区",
      "泗青公园的海棠春归景观",
      "泗青公园设置了 3 公里慢行道",
      "泗青公园的北部是茂密林带",
      "泗青公园是主打江南水岸体验",
      "泗青公园的儿童游乐区更完整",
      "横沔公园全天免费开放",
      "横沔公园的湖光露营氛围",
      "来到横沔公园，居民步行可达",
      "横沔公园团建活动丰富",
    ],
  },
  {
    name: "张江金茂府品质交付",
    options: [
      "张江金茂府室内交付标准高",
      "张江金茂府交付的会所成熟",
      "张江金茂府交付现场质感稳定",
      "张江金茂府交付时园区成型",
      "张江金茂府提前交付节奏稳",
    ],
  },
];

const materialAttributeTagGroups: MaterialTagGroup[] = mockTagConfigData.tree
  .map((group) => ({
    name: group.name,
    options: group.children?.map((child) => child.name) ?? [],
  }))
  .filter((group) => group.options.length > 0);

function getMaterialFileSize(item: MaterialItem) {
  return `${Math.round(280 + item.id * 52)} KB`;
}

function getMaterialTags(
  item: MaterialItem,
  kind: MaterialTagKind,
  overrides: Record<number, MaterialTagOverride>,
) {
  const override = overrides[item.id];

  if (kind === "selling") {
    return override?.sellingTags ?? defaultSellingTags.slice(0, 2 + (item.id % 4));
  }

  return override?.attributeTags ?? defaultAttributeTags.slice(0, item.id % 3);
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
        background: `linear-gradient(145deg, ${item.color}, ${item.accent})`,
      }}
    >
      {showBadge ? <span>{item.category}</span> : null}
      <div className="thumb-sky" />
      <div className="thumb-ground" />
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
            <dd>横沔和泗青公园专题笔记</dd>
          </div>
          <div>
            <dt>平台:</dt>
            <dd>小红书、微信</dd>
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
            <dd>姜云羿</dd>
          </div>
          <div>
            <dt>上传时间:</dt>
            <dd>2026-05-22 11:28:22</dd>
          </div>
          <div>
            <dt>最后修改:</dt>
            <dd>2026-05-27 20:43:40</dd>
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

  return (
    <article className={selected ? "material-card selected" : "material-card"}>
      {batchMode ? (
        <label className="material-select">
          <Checkbox checked={selected} onChange={onToggleSelect} />
        </label>
      ) : null}
      <MaterialPreview item={item} />
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
      <div className="material-actions">
        <button onClick={onEditSelling} type="button">卖点</button>
        <button onClick={onEditAttribute} type="button">
          属性{attributeTags.length > 0 ? `(${attributeTags.length})` : ""}
        </button>
        <button onClick={onOpenDetail} type="button">详情</button>
      </div>
    </article>
  );
}

function FilterRail({
  filters,
  groups,
  onChange,
  onClear,
}: {
  filters: MaterialFilters;
  groups: string[];
  onChange: (filters: MaterialFilters) => void;
  onClear: () => void;
}) {
  function toggleGroup(group: string) {
    onChange({
      ...filters,
      activeGroups: filters.activeGroups.includes(group)
        ? filters.activeGroups.filter((item) => item !== group)
        : [...filters.activeGroups, group],
    });
  }

  return (
    <aside className="filter-rail">
      <div className="filter-head">
        <strong>筛选条件</strong>
        <button onClick={onClear} type="button">清空</button>
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
        <p>属性标签</p>
        <ul className="filter-tree">
          {groups.map((group) => (
            <li key={group}>
              <button
                className={filters.activeGroups.includes(group) ? "active" : ""}
                onClick={() => toggleGroup(group)}
                type="button"
              >
                <RightOutlined /> {group}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function MaterialsPage() {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const { data = mockMaterialsData } = useGetMaterialsQuery();
  const materials = useAppSelector(selectMaterials);
  const tagOverrides = useAppSelector(selectMaterialTagOverrides);
  const [detailItem, setDetailItem] = useState<MaterialItem | null>(null);
  const [filters, setFilters] = useState<MaterialFilters>({
    activeGroups: [],
    category: "all",
    platform: "all",
    tagStatus: "all",
  });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(() => new Set());
  const [tagEditor, setTagEditor] = useState<MaterialTagEditorState | null>(null);

  const filteredMaterials = useMemo(
    () =>
      materials.filter((item) => {
        const sellingTags = getMaterialTags(item, "selling", tagOverrides);
        const attributeTags = getMaterialTags(item, "attribute", tagOverrides);
        const allTags = [...sellingTags, ...attributeTags];
        const matchKeyword = item.title.toLowerCase().includes(keyword.trim().toLowerCase());
        const matchCategory =
          filters.category === "all" ||
          (filters.category === "inside" && item.category === "内页图") ||
          (filters.category === "poster" && item.category === "海报首图");
        const isTagged = allTags.length > 0;
        const matchTagStatus =
          filters.tagStatus === "all" ||
          (filters.tagStatus === "done" && isTagged) ||
          (filters.tagStatus === "todo" && !isTagged);
        const matchGroups =
          filters.activeGroups.length === 0 ||
          filters.activeGroups.some((group) => allTags.includes(group) || item.tone.includes(group));

        return matchKeyword && matchCategory && matchTagStatus && matchGroups;
      }),
    [filters, keyword, materials, tagOverrides],
  );

  function openTagEditor(kind: MaterialTagKind, item: MaterialItem) {
    setTagEditor({
      item,
      kind,
      selectedTags: getMaterialTags(item, kind, tagOverrides),
    });
  }

  function saveTagEditor() {
    if (!tagEditor) {
      return;
    }

    dispatch(setMaterialTags({
      id: tagEditor.item.id,
      kind: tagEditor.kind,
      tags: tagEditor.selectedTags,
    }));
    setTagEditor(null);
    message.success("标签已保存");
  }

  function clearMaterialFilters() {
    setFilters({
      activeGroups: [],
      category: "all",
      platform: "all",
      tagStatus: "all",
    });
    setKeyword("");
    message.success("筛选条件已清空");
  }

  function resetMaterials() {
    dispatch(resetMaterialsAction());
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

  function deleteMaterials(ids: number[]) {
    if (ids.length === 0) {
      message.warning("请选择要删除的素材");
      return;
    }

    dispatch(deleteMaterialsAction(ids));
    setSelectedMaterialIds(new Set());
    setDetailItem((current) => current && ids.includes(current.id) ? null : current);
    message.success(`已删除 ${ids.length} 个素材`);
  }

  function toggleMaterialCategory(item: MaterialItem) {
    const nextCategory = item.category === "内页图" ? "海报首图" : "内页图";

    dispatch(updateMaterialCategory({ category: nextCategory, id: item.id }));
    setDetailItem((current) => current?.id === item.id ? { ...current, category: nextCategory } : current);
    message.success(`已切换为${nextCategory}`);
  }

  const detailSellingTags = detailItem ? getMaterialTags(detailItem, "selling", tagOverrides) : [];
  const detailAttributeTags = detailItem ? getMaterialTags(detailItem, "attribute", tagOverrides) : [];

  return (
    <section className="console-page material-page">
      <FilterRail
        filters={filters}
        groups={data.filterGroups}
        onChange={setFilters}
        onClear={clearMaterialFilters}
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
              onClick={resetMaterials}
              type="text"
            />
          </Space>
        </div>
        <div className="material-grid">
          {filteredMaterials.map((item) => {
            const sellingTags = getMaterialTags(item, "selling", tagOverrides);
            const attributeTags = getMaterialTags(item, "attribute", tagOverrides);

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
      </div>

      <MaterialTagEditorModal
        editor={tagEditor}
        fileSize={tagEditor ? getMaterialFileSize(tagEditor.item) : ""}
        groups={tagEditor?.kind === "selling" ? materialSellingTagGroups : materialAttributeTagGroups}
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
            toggleMaterialCategory(detailItem);
          }
        }}
        onClose={() => setDetailItem(null)}
        onDelete={() => {
          if (detailItem) {
            deleteMaterials([detailItem.id]);
          }
        }}
        onDownload={() => message.success("已模拟下载原图")}
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
    </section>
  );
}

function findConfigItem(items: ConfigTreeItem[], id: string): ConfigTreeItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    const child = findConfigItem(item.children ?? [], id);

    if (child) {
      return child;
    }
  }

  return null;
}

function getParentForConfigItem(items: ConfigTreeItem[], id: string) {
  return items.find((item) => item.id === id || item.children?.some((child) => child.id === id));
}

function countConfigChildren(items: ConfigTreeItem[]) {
  return items.reduce((total, item) => total + (item.children?.length ?? 0), 0);
}

function deleteConfigItem(items: ConfigTreeItem[], id: string): ConfigTreeItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (!item.children) {
        return item;
      }

      const children = deleteConfigItem(item.children, id);

      return {
        ...item,
        children,
        count: children.length,
      };
    });
}

function getFirstConfigId(items: ConfigTreeItem[]) {
  return items[0]?.id ?? "";
}

function ConfigPage({ title }: { title: string }) {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const isSellingPoint = title.includes("卖点");
  const fallback = isSellingPoint ? mockSellingPointConfigData : mockTagConfigData;
  const initialSelectedId = isSellingPoint ? "" : fallback.tree[0]?.id ?? "";
  const initialSelected = initialSelectedId ? findConfigItem(fallback.tree, initialSelectedId) : null;
  const configKind: ConfigKind = isSellingPoint ? "selling" : "tag";
  const { data: tagApiData = mockTagConfigData } = useGetTagConfigQuery();
  const { data: sellingApiData = mockSellingPointConfigData } = useGetSellingPointConfigQuery();
  const apiData = isSellingPoint ? sellingApiData : tagApiData;
  const tree = useAppSelector((state) =>
    isSellingPoint ? selectSellingConfigTree(state) : selectTagConfigTree(state),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(isSellingPoint ? [] : [fallback.tree[0]?.id ?? ""]),
  );
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [draftName, setDraftName] = useState(initialSelected?.name ?? "");
  const [draftDescription, setDraftDescription] = useState(initialSelected?.description ?? "");
  const [draftModes, setDraftModes] = useState<string[]>(
    () => initialSelected?.modes ?? ["晒单式", "盘点式"],
  );
  const selected = selectedId ? findConfigItem(tree, selectedId) : null;
  const selectedParent = selectedId ? getParentForConfigItem(tree, selectedId) : null;
  const isChildSelected = Boolean(
    selectedParent?.children?.some((child) => child.id === selectedId),
  );
  const stats = useMemo(
    () => [
      { label: "一级分类", value: tree.length },
      { label: "二级分类", value: countConfigChildren(tree) },
      { label: "总标签数", value: tree.length + countConfigChildren(tree) },
    ],
    [tree],
  );

  function toggleExpanded(id: string) {
    const next = new Set(expandedIds);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setExpandedIds(next);
  }

  function syncConfigDraft(item: ConfigTreeItem | null) {
    setDraftName(item?.name ?? "");
    setDraftDescription(item?.description ?? "");
    setDraftModes(item?.modes ?? ["晒单式", "盘点式"]);
  }

  function selectConfigItem(id: string) {
    const item = findConfigItem(tree, id);

    setSelectedId(id);
    syncConfigDraft(item);
  }

  function openCreateModal(parentId: string | null) {
    setModalParentId(parentId);
    setModalName("");
    setModalDescription("");
    setIsModalOpen(true);
  }

  function handleCreateItem() {
    const name = modalName.trim();

    if (!name) {
      message.warning(isSellingPoint ? "请输入卖点" : "请输入标签名称");
      return;
    }

    const id = `${isSellingPoint ? "sell" : "attr"}-${Date.now()}`;
    const nextItem: ConfigTreeItem = {
      description: modalDescription.trim() || undefined,
      id,
      modes: isSellingPoint ? ["种草式"] : undefined,
      name,
    };

    dispatch(addConfigItemAction({
      item: nextItem,
      kind: configKind,
      parentId: modalParentId,
    }));
    setExpandedIds((current) => {
      const next = new Set(current);
      if (modalParentId) {
        next.add(modalParentId);
      }
      return next;
    });
    setSelectedId(id);
    syncConfigDraft(nextItem);
    setIsModalOpen(false);
    message.success("新增项已保存");
  }

  function handleDeleteItem(id: string) {
    if (!id) {
      return;
    }

    const next = deleteConfigItem(tree, id);
    const nextId = getFirstConfigId(next);

    dispatch(deleteConfigItemAction({ id, kind: configKind }));
    setSelectedId(nextId);
    syncConfigDraft(nextId ? findConfigItem(next, nextId) : null);
    message.success("已删除");
  }

  function handleSave() {
    if (!selected) {
      return;
    }

    if (!draftName.trim()) {
      message.warning(isSellingPoint ? "请输入卖点" : "请输入分类名称");
      return;
    }

    dispatch(
      updateConfigItemAction({
        id: selected.id,
        kind: configKind,
        patch: {
          description: draftDescription.trim() || undefined,
          modes: isSellingPoint ? draftModes : undefined,
          name: draftName.trim(),
        },
      }),
    );
    message.success("已保存当前配置");
  }

  return (
    <section className="console-page taxonomy-page">
      <div className="taxonomy-header">
        <h2>分类总览</h2>
        <Space>
          <Button onClick={() => message.info("已模拟导入标签")}>导入标签</Button>
          <Button onClick={() => message.success("已导出当前标签")}>导出标签</Button>
          <Button onClick={() => message.success("模板已准备下载")}>下载模板</Button>
        </Space>
      </div>

      <div className="taxonomy-stats">
        {stats.map((stat) => (
          <div className="taxonomy-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <i />
          </div>
        ))}
      </div>

      <div className="taxonomy-section-head">
        <h2>分类明细</h2>
        <Space>
          <Button onClick={() => setExpandedIds(new Set(tree.map((item) => item.id)))}>
            全部展开
          </Button>
          <Button onClick={() => setExpandedIds(new Set())}>全部折叠</Button>
          {apiData.allowPrimaryCreate ? (
            <Button onClick={() => openCreateModal(null)} type="primary">
              新增一级分类
            </Button>
          ) : null}
        </Space>
      </div>

      <div className="taxonomy-layout">
        <div className="taxonomy-list">
          {tree.map((item) => {
            const isOpen = expandedIds.has(item.id);
            const isActive = selectedId === item.id;

            return (
              <div className="taxonomy-group" key={item.id}>
                <button
                  className={isActive ? "taxonomy-node active" : "taxonomy-node"}
                  onClick={() => {
                    selectConfigItem(item.id);
                    if ((item.children?.length ?? 0) > 0) {
                      setExpandedIds(new Set(expandedIds).add(item.id));
                    }
                  }}
                  type="button"
                >
                  <span>
                    <strong>
                      {item.name}
                      {typeof item.count === "number" ? <em>({item.count})</em> : null}
                    </strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                  <span className="taxonomy-actions">
                    {(item.children?.length ?? 0) > 0 ? (
                      <i onClick={(event) => {
                        event.stopPropagation();
                        toggleExpanded(item.id);
                      }}>
                        {isOpen ? <DownOutlined /> : <RightOutlined />}
                      </i>
                    ) : null}
                    <i onClick={(event) => {
                      event.stopPropagation();
                      selectConfigItem(item.id);
                      openCreateModal(item.id);
                    }}><PlusOutlined /></i>
                    {apiData.allowPrimaryCreate ? (
                      <i onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteItem(item.id);
                      }}><DeleteOutlined /></i>
                    ) : null}
                  </span>
                </button>

                {isOpen
                  ? item.children?.map((child) => (
                      <button
                        className={
                          selectedId === child.id
                            ? "taxonomy-node taxonomy-child active"
                            : "taxonomy-node taxonomy-child"
                        }
                        key={child.id}
                        onClick={() => selectConfigItem(child.id)}
                        type="button"
                      >
                        <span>
                          <strong>{child.name}</strong>
                          {child.description ? <small>{child.description}</small> : null}
                        </span>
                        <span className="taxonomy-actions">
                          <i onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteItem(child.id);
                          }}><DeleteOutlined /></i>
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </div>

        <div className="taxonomy-editor">
          {selected ? (
            <>
              <div className="taxonomy-editor-head">
                <div>
                  <h2>
                    {isSellingPoint
                      ? "编辑二级分类"
                      : isChildSelected
                        ? "编辑二级分类"
                        : "编辑一级分类"}
                  </h2>
                  <p>点击左侧标签进行编辑，或添加新标签</p>
                </div>
                <Button danger={isSellingPoint} onClick={() => handleDeleteItem(selected.id)} type="primary">
                  {isSellingPoint ? "删除卖点" : "删除分类"}
                </Button>
              </div>

              {isSellingPoint ? (
                <>
                  <label className="taxonomy-field">
                    <span>卖点</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => setDraftName(event.target.value)}
                      value={draftName}
                    />
                  </label>
                  <div className="taxonomy-field">
                    <span>模式</span>
                    <Checkbox.Group
                      onChange={(values) => setDraftModes(values.map(String))}
                      options={apiData.modeOptions ?? []}
                      value={draftModes}
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="taxonomy-field">
                    <span>分类名称 *</span>
                    <Input
                      onChange={(event) => setDraftName(event.target.value)}
                      value={draftName}
                    />
                  </label>
                  <label className="taxonomy-field">
                    <span>描述（可选）</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => setDraftDescription(event.target.value)}
                      value={draftDescription}
                    />
                  </label>
                  {!isChildSelected ? (
                    <div className="taxonomy-field">
                      <span>子标签管理</span>
                      <div className="taxonomy-sub-list">
                        {(selected.children ?? []).map((child) => (
                          <div key={child.id}>
                            <span>{child.name}</span>
                            <Button
                              danger
                              icon={<CloseOutlined />}
                              onClick={() => handleDeleteItem(child.id)}
                              shape="circle"
                              size="small"
                              type="text"
                            />
                          </div>
                        ))}
                        <Button block onClick={() => openCreateModal(selected.id)}>
                          添加子标签
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <Button block onClick={handleSave} type="primary">
                保存
              </Button>
            </>
          ) : (
            <div className="taxonomy-empty">
              <TableOutlined />
              <p>点击左侧标签进行编辑，或添加新标签</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        centered
        footer={[
          <Button key="save" onClick={handleCreateItem} type="primary">
            保存
          </Button>,
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
        ]}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="新增"
        width={500}
      >
        <div className="taxonomy-modal-form">
          <label>
            <span>* 所属分类</span>
            <Input
              disabled
              value={modalParentId ? findConfigItem(tree, modalParentId)?.name ?? "" : "一级分类"}
            />
          </label>
          <label>
            <span>* {isSellingPoint ? "卖点" : "标签名称"}</span>
            {isSellingPoint ? (
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                onChange={(event) => setModalName(event.target.value)}
                placeholder="请输入"
                value={modalName}
              />
            ) : (
              <Input
                onChange={(event) => setModalName(event.target.value)}
                placeholder="请输入"
                value={modalName}
              />
            )}
          </label>
          {!isSellingPoint ? (
            <label>
              <span>描述（可选）</span>
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                onChange={(event) => setModalDescription(event.target.value)}
                placeholder="请输入"
                value={modalDescription}
              />
            </label>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}

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

function MaterialUploadImagePage() {
  const { message } = App.useApp();
  const { data = mockMaterialUploadData } = useGetMaterialUploadOptionsQuery();
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
                  options={[
                    { label: "交付和口碑期", value: "delivery" },
                    { label: "强销期", value: "sales" },
                  ]}
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

function PropertyPage({ onDetail }: { onDetail: () => void }) {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  useGetPropertiesQuery();
  const properties = useAppSelector(selectProperties);
  const emptyDraft: PropertyRow = {
    address: "",
    createdAt: "",
    developer: "",
    key: "",
    name: "",
    stage: "现房在售",
    type: "住宅",
  };
  const [draft, setDraft] = useState<PropertyRow>(emptyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [stageQuery, setStageQuery] = useState<string | undefined>();

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
        const matchName = property.name.includes(nameQuery.trim());
        const matchStage = !stageQuery || property.stage === stageQuery;

        return matchName && matchStage;
      }),
    [nameQuery, properties, stageQuery],
  );

  function openCreateProperty() {
    setEditingKey(null);
    setDraft({ ...emptyDraft, createdAt: formatNow(), key: `property-${Date.now()}` });
    setIsModalOpen(true);
  }

  function openEditProperty(property: PropertyRow) {
    setEditingKey(property.key);
    setDraft(property);
    setIsModalOpen(true);
  }

  function saveProperty() {
    if (!draft.developer.trim() || !draft.name.trim()) {
      message.warning("请填写开发商和项目名称");
      return;
    }

    dispatch(upsertProperty(draft));
    setIsModalOpen(false);
    message.success(editingKey ? "项目已更新" : "项目已创建");
  }

  function deleteProperty(key: string) {
    dispatch(deletePropertyAction(key));
    message.success("项目已删除");
  }

  const columns: ColumnsType<PropertyRow> = [
    { dataIndex: "developer", title: "开发商" },
    { dataIndex: "name", title: "项目名称" },
    {
      dataIndex: "type",
      title: "项目类型",
      render: (value: string) => <Tag color="green">{value}</Tag>,
    },
    {
      dataIndex: "stage",
      title: "营销阶段",
      render: (value: string) => <Tag color="orange">{value}</Tag>,
    },
    { dataIndex: "address", title: "项目地址" },
    { dataIndex: "createdAt", title: "创建时间" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button onClick={onDetail} type="link">
            详情
          </Button>
          <Button onClick={() => openEditProperty(record)} type="link">
            编辑
          </Button>
          <Button danger onClick={() => deleteProperty(record.key)} type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section className="console-page">
      <div className="search-row">
        <Input
          onChange={(event) => setNameQuery(event.target.value)}
          placeholder="项目名称"
          value={nameQuery}
        />
        <Select
          allowClear
          onChange={(value) => setStageQuery(value)}
          options={[
            { label: "现房在售", value: "现房在售" },
            { label: "交付和口碑期", value: "交付和口碑期" },
          ]}
          placeholder="请选择状态"
          value={stageQuery}
        />
        <Input disabled placeholder="当前开发商由表格创建/编辑维护" />
        <Space>
          <Button onClick={() => {
            setNameQuery("");
            setStageQuery(undefined);
          }}>
            重置
          </Button>
          <Button onClick={() => message.success("查询完成")} type="primary">查询</Button>
          <Button onClick={() => message.info("暂无更多筛选项")} type="link">展开</Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>项目</h2>
        <Space>
          <Button onClick={openCreateProperty} type="primary">创建项目</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              dispatch(resetPropertiesAction());
              message.success("项目列表已刷新");
            }}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => dispatch(reverseProperties())}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={filteredProperties} pagination={false} />

      <Modal
        centered
        onCancel={() => setIsModalOpen(false)}
        onOk={saveProperty}
        open={isModalOpen}
        title={editingKey ? "编辑项目" : "创建项目"}
        width={620}
      >
        <div className="crud-form-grid">
          <label>
            <span>开发商 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, developer: event.target.value }))}
              value={draft.developer}
            />
          </label>
          <label>
            <span>项目名称 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              value={draft.name}
            />
          </label>
          <label>
            <span>项目类型</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, type: value }))}
              options={[
                { label: "住宅", value: "住宅" },
                { label: "商办", value: "商办" },
                { label: "综合体", value: "综合体" },
              ]}
              value={draft.type}
            />
          </label>
          <label>
            <span>营销阶段</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, stage: value }))}
              options={[
                { label: "现房在售", value: "现房在售" },
                { label: "交付和口碑期", value: "交付和口碑期" },
                { label: "强销期", value: "强销期" },
              ]}
              value={draft.stage}
            />
          </label>
          <label className="crud-form-wide">
            <span>项目地址</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              value={draft.address}
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}

function PropertyDetailPage() {
  const { message } = App.useApp();
  const { data = mockPropertyDetailData } = useGetPropertyDetailQuery("1");
  const { property } = data;

  return (
    <section className="console-page">
      <p className="breadcrumb">项目管理列表 / 详情</p>
      <h2>项目详情</h2>
      <div className="detail-grid">
        <span>开发商：<strong>{property.developer}</strong></span>
        <span>项目名称：<strong>{property.name}</strong></span>
        <span>项目类型：<strong>{property.type}</strong></span>
        <span>项目地址：<strong>{property.address}</strong></span>
        <span>创建时间：<strong>{property.createdAt}</strong></span>
        <span>描述：<strong>{property.description}</strong></span>
      </div>
      <h3 className="link-title">NFC 链接 & 二维码</h3>
      <div className="qr-channel-grid">
        {data.channels.map((channel) => (
          <div className="qr-channel" key={channel.label}>
            <h3>{channel.label}</h3>
            <p>
              NFC 链接：
              <button
                onClick={async () => {
                  const copied = await copyTextToClipboard(channel.qrValue);
                  message[copied ? "success" : "error"](copied ? "已复制链接" : "复制失败");
                }}
                type="button"
              >
                复制
              </button>
            </p>
            <p>二维码：扫码查看项目详情</p>
            <div className="qr-placeholder">
              <QRCodeSVG value={channel.qrValue} size={210} />
            </div>
            <time>{channel.updatedAt}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsersPage() {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  useGetUsersQuery();
  const users = useAppSelector(selectUsers);
  const emptyDraft: UserRow = {
    createdAt: "",
    key: "",
    name: "",
    phone: "",
    property: "张江金茂府",
    role: "游客",
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<UserRow>(emptyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [propertyQuery, setPropertyQuery] = useState<string | undefined>();

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchPhone = user.phone.includes(phoneQuery.trim());
        const matchName = user.name.includes(nameQuery.trim());
        const matchProperty = !propertyQuery || user.property === propertyQuery;

        return matchPhone && matchName && matchProperty;
      }),
    [nameQuery, phoneQuery, propertyQuery, users],
  );
  const pageUsers = filteredUsers.slice((currentPage - 1) * 10, currentPage * 10);

  function openCreateUser() {
    setEditingKey(null);
    setDraft({
      ...emptyDraft,
      createdAt: formatNow(),
      key: `user-${Date.now()}`,
    });
    setIsModalOpen(true);
  }

  function openEditUser(user: UserRow) {
    setEditingKey(user.key);
    setDraft(user);
    setIsModalOpen(true);
  }

  function saveUser() {
    if (!draft.name.trim() || !draft.phone.trim()) {
      message.warning("请填写用户名和手机号");
      return;
    }

    dispatch(upsertUser(draft));
    setIsModalOpen(false);
    message.success(editingKey ? "用户已更新" : "用户已创建");
  }

  function deleteUser(key: string) {
    dispatch(deleteUserAction(key));
    message.success("用户已删除");
  }

  const columns: ColumnsType<UserRow> = [
    { dataIndex: "name", title: "用户名" },
    {
      dataIndex: "phone",
      title: "手机号",
      render: (phone: string) => (
        <span>
          {phone}{" "}
          <button
            className="copy-mini"
            onClick={async () => {
              const copied = await copyTextToClipboard(phone);
              message[copied ? "success" : "error"](copied ? "手机号已复制" : "复制失败");
            }}
            type="button"
          >
            复制
          </button>
        </span>
      ),
    },
    { dataIndex: "key", title: "小红书账号链接", render: () => "-" },
    {
      dataIndex: "role",
      title: "角色",
      render: (role: string) => (
        <Tag color={role === "管理员" ? "success" : "processing"}>{role}</Tag>
      ),
    },
    { dataIndex: "property", title: "有权限的项目" },
    { dataIndex: "createdAt", title: "创建时间" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEditUser(record)} type="link">编辑</Button>
          <Button danger onClick={() => deleteUser(record.key)} type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section className="console-page">
      <div className="search-row">
        <Input
          onChange={(event) => setPhoneQuery(event.target.value)}
          placeholder="手机号"
          value={phoneQuery}
        />
        <Input
          onChange={(event) => setNameQuery(event.target.value)}
          placeholder="用户名"
          value={nameQuery}
        />
        <Select
          allowClear
          onChange={(value) => setPropertyQuery(value)}
          options={[{ label: "张江金茂府", value: "张江金茂府" }]}
          placeholder="有权限的项目"
          value={propertyQuery}
        />
        <Space>
          <Button onClick={() => {
            setPhoneQuery("");
            setNameQuery("");
            setPropertyQuery(undefined);
            setCurrentPage(1);
          }}>
            重置
          </Button>
          <Button onClick={() => {
            setCurrentPage(1);
            message.success("查询完成");
          }} type="primary">
            查询
          </Button>
          <Button onClick={() => message.info("暂无更多筛选项")} type="link">展开</Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>用户</h2>
        <Space>
          <Button onClick={() => message.success("已模拟导入模板用户")}>模板导入</Button>
          <Button onClick={openCreateUser} type="primary">创建</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              dispatch(resetUsersAction());
              setCurrentPage(1);
              message.success("用户列表已刷新");
            }}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => dispatch(reverseUsers())}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={pageUsers} pagination={false} />
      <div className="pagination-row">
        <span>共 {filteredUsers.length} 条</span>
        <Pagination
          current={currentPage}
          onChange={setCurrentPage}
          pageSize={10}
          total={filteredUsers.length}
        />
      </div>

      <Modal
        centered
        onCancel={() => setIsModalOpen(false)}
        onOk={saveUser}
        open={isModalOpen}
        title={editingKey ? "编辑用户" : "创建用户"}
        width={580}
      >
        <div className="crud-form-grid">
          <label>
            <span>用户名 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              value={draft.name}
            />
          </label>
          <label>
            <span>手机号 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              value={draft.phone}
            />
          </label>
          <label>
            <span>角色</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, role: value }))}
              options={[
                { label: "管理员", value: "管理员" },
                { label: "游客", value: "游客" },
              ]}
              value={draft.role}
            />
          </label>
          <label>
            <span>有权限的项目</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, property: value }))}
              options={[{ label: "张江金茂府", value: "张江金茂府" }]}
              value={draft.property}
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}

function UploadVideoPage() {
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

export function OverviewDashboard() {
  const [overviewMode, setOverviewMode] = useState<"macro" | "strategy">("macro");

  return overviewMode === "macro" ? (
    <OverviewPage onModeChange={setOverviewMode} />
  ) : (
    <StrategyPage onModeChange={setOverviewMode} />
  );
}

export function PropertyManagementPage() {
  const router = useRouter();

  return <PropertyPage onDetail={() => router.push("/properties/detail")} />;
}

export {
  ConfigPage,
  MaterialUploadImagePage,
  MaterialsPage,
  PropertyDetailPage,
  UploadVideoPage,
  UsersPage,
};
