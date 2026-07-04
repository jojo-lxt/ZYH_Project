import type {
  ConsoleConfigResponse,
  ConsoleMaterialsResponse,
  ConsoleOverviewResponse,
  ConsolePropertiesResponse,
  ConsolePropertyDetailResponse,
  ConsoleStrategyResponse,
  ConsoleUsersResponse,
  MaterialItem,
  MaterialUploadResponse,
  NoteRow,
  PropertyRow,
  UserRow,
} from "@/shared/types/console";

export const mockNotes: NoteRow[] = [
  {
    key: "1",
    title: "3.1 米层高，把居住尺度拉满",
    author: "陆伟峰",
    params: ["人设: 置业顾问", "模式: 种草式", "情绪: 中性"],
    publishedAt: "2026-06-09 06:46:57",
    likes: 8,
  },
  {
    key: "2",
    title: "比周边更懂改善家庭的四房",
    author: "张丽洁",
    params: ["人设: 业主视角", "模式: 对比式", "情绪: 积极"],
    publishedAt: "2026-06-08 21:18:47",
    likes: 6,
  },
  {
    key: "3",
    title: "核心洋房，15 分钟到商圈",
    author: "周天一",
    params: ["人设: 生活家", "模式: 场景式", "情绪: 中性"],
    publishedAt: "2026-06-08 13:29:04",
    likes: 11,
  },
  {
    key: "4",
    title: "看遍浦东，最后还是喜欢这里",
    author: "杜家臣",
    params: ["人设: 模拟客户", "模式: 口碑式", "情绪: 温和"],
    publishedAt: "2026-06-08 10:03:16",
    likes: 3,
  },
];

export const mockMaterials: MaterialItem[] = [
  {
    id: 1,
    title: "滨湖公园日落.jpg",
    category: "内页图",
    platforms: ["小红书", "微信"],
    size: "1080x1620",
    stage: "横沔和泗青公园专题笔记",
    tone: "湖景 / 植被 / 步道",
    updatedAt: "2026-05-27 20:43:40",
    uploadedAt: "2026-05-22 11:18:28",
    uploader: "姜云羿",
    color: "#c86f47",
    accent: "#2f766d",
  },
  {
    id: 2,
    title: "社区花园春景.jpg",
    category: "海报首图",
    platforms: ["小红书"],
    size: "1080x1440",
    stage: "诚意登记期",
    tone: "花园 / 低密 / 活力",
    updatedAt: "2026-05-28 14:12:09",
    uploadedAt: "2026-05-21 09:34:16",
    uploader: "姜云羿",
    color: "#d99b48",
    accent: "#6b8f3e",
  },
  {
    id: 3,
    title: "林荫步道晨光.jpg",
    category: "内页图",
    platforms: ["小红书", "微信"],
    size: "1080x1620",
    stage: "横沔和泗青公园专题笔记",
    tone: "林荫 / 慢生活 / 氛围",
    updatedAt: "2026-05-27 20:43:40",
    uploadedAt: "2026-05-22 11:28:22",
    uploader: "姜云羿",
    color: "#73945f",
    accent: "#234f45",
  },
  {
    id: 4,
    title: "会客厅细节.jpg",
    category: "内页图",
    platforms: ["微信"],
    size: "1080x1440",
    stage: "交付和口碑期",
    tone: "精装 / 质感 / 灯光",
    updatedAt: "2026-05-25 18:02:33",
    uploadedAt: "2026-05-20 16:45:10",
    uploader: "陈静",
    color: "#9d765d",
    accent: "#c9b496",
  },
  {
    id: 5,
    title: "亲子活动草坪.jpg",
    category: "内页图",
    platforms: ["小红书"],
    size: "1080x1620",
    stage: "现房在售期",
    tone: "儿童 / 草坪 / 社群",
    updatedAt: "2026-05-23 10:19:54",
    uploadedAt: "2026-05-18 13:21:44",
    uploader: "陆伟峰",
    color: "#a9b85f",
    accent: "#476b4a",
  },
  {
    id: 6,
    title: "示范区水景.jpg",
    category: "内页图",
    platforms: ["小红书", "微信"],
    size: "1080x1440",
    stage: "横沔和泗青公园专题笔记",
    tone: "水景 / 门庭 / 高级",
    updatedAt: "2026-05-27 20:43:40",
    uploadedAt: "2026-05-22 11:28:22",
    uploader: "姜云羿",
    color: "#6f98a0",
    accent: "#d0a86c",
  },
  {
    id: 7,
    title: "城市界面.jpg",
    category: "内页图",
    platforms: ["微信"],
    size: "1080x1579",
    stage: "区域价值",
    tone: "区位 / 配套 / 通勤",
    updatedAt: "2026-05-24 12:07:51",
    uploadedAt: "2026-05-17 08:40:39",
    uploader: "张丽洁",
    color: "#8c9fb4",
    accent: "#d58b65",
  },
  {
    id: 8,
    title: "商业街区夜景.jpg",
    category: "海报首图",
    platforms: ["小红书", "微信"],
    size: "1080x1919",
    stage: "配套价值",
    tone: "商业 / 夜景 / 烟火气",
    updatedAt: "2026-05-26 19:30:02",
    uploadedAt: "2026-05-19 20:11:17",
    uploader: "周天一",
    color: "#8a6b94",
    accent: "#d69b50",
  },
];

export const mockProperties: PropertyRow[] = [
  {
    key: "1",
    developer: "金茂",
    name: "张江金茂府",
    type: "住宅",
    stage: "现房在售",
    address: "上海市 / 浦东新区 / 科苑路",
    createdAt: "2025-10-10 11:20:14",
  },
];

export const mockUsers: UserRow[] = Array.from({ length: 10 }, (_, index) => ({
  key: String(index + 1),
  name: index === 6 ? "张江金茂府官号" : `游客-${17521241120 + index * 7319}`,
  phone: String(17521241120 + index * 7319),
  role: index === 6 ? "管理员" : "游客",
  property: "张江金茂府",
  createdAt: `2026-05-${31 - Math.min(index, 8)} ${20 - (index % 6)}:42:29`,
}));

export const mockFilterGroups = [
  "物业服务",
  "景观视野",
  "细节特写",
  "室内精装",
  "室内空间",
  "户型空间",
  "总平规划",
  "周边配套",
  "园林景观",
  "公共空间",
  "建筑设计",
  "建筑外观",
];

export const mockOverviewData: ConsoleOverviewResponse = {
  notes: mockNotes,
  rankAuthors: [
    { count: 23, name: "陆伟峰" },
    { count: 15, name: "张丽洁" },
    { count: 15, name: "周天一" },
    { count: 13, name: "杜家臣" },
    { count: 11, name: "徐龙" },
  ],
  rankInteractions: [
    { count: 26, name: "杜家臣" },
    { count: 20, name: "张丽洁" },
    { count: 20, name: "陈静" },
    { count: 19, name: "徐龙" },
    { count: 19, name: "周天一" },
  ],
  stats: [
    { label: "总笔记数量", trend: "较上周 +1.9%", value: "2,110" },
    { label: "总曝光量", trend: "较上周 +0.2%", value: "1183W" },
    { label: "总互动数", trend: "较上周 +3.1%", value: "2,303" },
  ],
};

export const mockStrategyData: ConsoleStrategyResponse = {
  heatRows: [
    {
      label: "种草式-中性",
      left: "100%",
      leftWidth: "100%",
      right: "74.2%",
      rightWidth: "74%",
    },
    {
      label: "对比式-中性",
      left: "66.7%",
      leftWidth: "66%",
      right: "100%",
      rightWidth: "100%",
    },
    {
      label: "盘点式-中性",
      left: "42%",
      leftWidth: "42%",
      right: "85%",
      rightWidth: "85%",
    },
  ],
  keywords: [
    { count: 20, label: "开车 15 分钟到达核心商圈，约 30 分钟通勤重点区域" },
    { count: 12, label: "张江改善客群的低门槛选择" },
    { count: 11, label: "英迪格酒店入驻片区，对板块价值是长期利好" },
    { count: 11, label: "900 万预算买四房，改善家庭一步到位" },
    { count: 7, label: "纯洋房小区，楼间距更舒适" },
  ],
};

export const mockMaterialsData: ConsoleMaterialsResponse = {
  filterGroups: mockFilterGroups,
  materials: mockMaterials,
  total: 852,
};

export const mockTagConfigData: ConsoleConfigResponse = {
  allowPrimaryCreate: true,
  stats: [
    { label: "一级分类", value: 12 },
    { label: "二级分类", value: 152 },
    { label: "总标签数", value: 164 },
  ],
  title: "图片标签配置",
  tree: [
    {
      children: [
        { description: "物业提供的额外高端服务", id: "attr-1-1", name: "增值服务" },
        { description: "智能化的物业管理系统", id: "attr-1-2", name: "科技物业" },
        { description: "专属物业管家提供的服务", id: "attr-1-3", name: "管家服务" },
        { description: "物业组织的邻里文化活动", id: "attr-1-4", name: "社区文化" },
        { description: "为业主提供的便捷生活服务", id: "attr-1-5", name: "便民服务" },
        { description: "社区安全与监控系统", id: "attr-1-6", name: "安防系统" },
        { description: "访客接待与服务中心", id: "attr-1-7", name: "前台/服务中心" },
      ],
      count: 7,
      description: "楼盘提供的物业管理服务",
      id: "attr-1",
      name: "物业服务",
    },
    {
      children: [
        { description: "窗外可见的景观资源", id: "attr-2-1", name: "园区景观" },
        { description: "室内外水景资源", id: "attr-2-2", name: "水景视野" },
      ],
      count: 8,
      description: "窗外可见的景观资源",
      id: "attr-2",
      name: "景观视野",
    },
    {
      children: [
        { description: "建筑装饰细节特征", id: "attr-3-1", name: "石材质感" },
        { description: "公共区域灯光效果", id: "attr-3-2", name: "灯光氛围" },
      ],
      count: 9,
      description: "建筑装饰细节特征",
      id: "attr-3",
      name: "细节特写",
    },
    {
      children: [
        { description: "房屋装修等级和配置", id: "attr-4-1", name: "精装标准" },
        { description: "交付时已包含的设备", id: "attr-4-2", name: "交付配置" },
      ],
      count: 15,
      description: "房屋装修等级和配置",
      id: "attr-4",
      name: "室内精装修",
    },
    {
      children: [
        { description: "建筑内部各功能区域", id: "attr-5-1", name: "客餐厅" },
        { description: "卧室空间尺度", id: "attr-5-2", name: "主卧套房" },
      ],
      count: 30,
      description: "建筑内部各功能区域",
      id: "attr-5",
      name: "室内空间",
    },
    {
      children: [
        { description: "房屋建筑面积的户型图", id: "attr-6-1", name: "户型图" },
        { description: "房屋的建筑面积数据", id: "attr-6-2", name: "面积大小" },
        { description: "独立的多层住宅建筑", id: "attr-6-3", name: "别墅" },
        { description: "所有功能区分于同一平面", id: "attr-6-4", name: "平层" },
        { description: "高层高、可做夹层的创意空间", id: "attr-6-5", name: "loft" },
      ],
      count: 10,
      description: "房屋空间布局特征",
      id: "attr-6",
      name: "户型空间",
    },
    {
      children: [
        { description: "社区的整体规划与布局理念", id: "attr-7-1", name: "总平面" },
      ],
      count: 13,
      description: "社区的整体规划与布局理念",
      id: "attr-7",
      name: "总平规划",
    },
  ],
};

export const mockSellingPointConfigData: ConsoleConfigResponse = {
  allowPrimaryCreate: false,
  modeOptions: ["对比式", "晒单式", "盘点式", "求助式", "种草式"],
  stats: [
    { label: "一级分类", value: 10 },
    { label: "二级分类", value: 93 },
    { label: "总标签数", value: 103 },
  ],
  title: "图片卖点配置",
  tree: [
    { children: [], id: "sell-1", name: "生活方式与氛围" },
    { children: [], id: "sell-2", name: "科技与健康" },
    { children: [], id: "sell-3", name: "物业服务" },
    {
      children: [
        {
          id: "sell-4-1",
          modes: ["晒单式", "盘点式", "求助式", "种草式"],
          name: "浦东唯一的金茂府",
        },
        { id: "sell-4-2", modes: ["种草式"], name: "张江最稀缺的四房" },
        {
          id: "sell-4-3",
          modes: ["晒单式", "种草式"],
          name: "高新技术企业密度高，高学历和高薪人口众多",
        },
        {
          id: "sell-4-4",
          modes: ["对比式", "盘点式"],
          name: "纯洋房，容积率只有 1.6，改善感更明确",
        },
        {
          id: "sell-4-5",
          modes: ["盘点式"],
          name: "上海新政后，张江不限购期房套数",
        },
        {
          id: "sell-4-6",
          modes: ["种草式"],
          name: "张江高新技术产业密度，全国前列",
        },
      ],
      count: 7,
      id: "sell-4",
      name: "品牌价值",
    },
    {
      children: [
        { id: "sell-5-1", modes: ["种草式"], name: "金茂品牌背书强" },
        { id: "sell-5-2", modes: ["对比式"], name: "纯洋房，客群更纯粹" },
        { id: "sell-5-3", modes: ["盘点式"], name: "张江高新技术资源聚集" },
      ],
      count: 8,
      id: "sell-5",
      name: "城市价值",
    },
    {
      children: [
        { id: "sell-6-1", modes: ["种草式"], name: "张江改善的低门槛选择" },
      ],
      count: 5,
      id: "sell-6",
      name: "资产价值",
    },
    {
      children: [
        { id: "sell-7-1", modes: ["盘点式"], name: "开车 15 分钟到核心商圈" },
      ],
      count: 30,
      id: "sell-7",
      name: "配套价值",
    },
    {
      children: [
        { id: "sell-8-1", modes: ["种草式"], name: "3.1 米层高提升居住尺度" },
      ],
      count: 22,
      id: "sell-8",
      name: "产品力价值",
    },
  ],
};

export const mockMaterialUploadData: MaterialUploadResponse = {
  attributeGroups: [
    { name: "物业服务", options: ["增值服务", "科技物业", "管家服务", "社区文化"] },
    { name: "室内空间", options: ["客餐厅", "主卧套房", "阳台", "收纳系统"] },
    { name: "户型空间", options: ["户型图", "面积大小", "平层", "loft"] },
    { name: "景观视野", options: ["园区景观", "水景视野", "林荫步道", "城市界面"] },
  ],
  sellingPointGroups: [
    {
      name: "品牌价值",
      options: [
        "二手房溢价能力强",
        "主打高端改善",
        "只在核心城市布局",
        "金茂府存在感强",
        "高端会所服务",
      ],
    },
    {
      name: "城市价值",
      options: [
        "金茂品牌背书",
        "纯洋房，客群更纯粹",
        "张江高新技术资源",
        "上海新政后机会窗口",
        "浦东唯一的金茂府",
      ],
    },
    {
      name: "地段价值",
      options: ["距离地铁近", "地铁 27 号线规划", "开车 15 分钟到商圈"],
    },
    {
      name: "区域价值",
      options: [
        "全国科创企业聚集",
        "1930 家高新企业",
        "100 家本土上市企业",
        "聚集全国 1/3 芯片人才",
        "中国硅谷认知强",
      ],
    },
  ],
};

export const mockPropertiesData: ConsolePropertiesResponse = {
  properties: mockProperties,
  total: mockProperties.length,
};

export const mockPropertyDetailData: ConsolePropertyDetailResponse = {
  channels: ["用户渠道", "游客渠道", "中介渠道"].map((label) => ({
    label,
    qrValue: `https://example.com/${label}`,
    updatedAt: "2026-06-09 10:46:40",
  })),
  property: {
    ...mockProperties[0],
    description: "-",
  },
};

export const mockUsersData: ConsoleUsersResponse = {
  total: 71,
  users: mockUsers,
};
