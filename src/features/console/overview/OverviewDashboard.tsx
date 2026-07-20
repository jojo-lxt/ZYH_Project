"use client";

import { useMemo, useState } from "react";
import { App, Button, DatePicker, Select, Space, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { EChartsOption } from "echarts";
import { useGetOverviewQuery, useGetStrategyQuery } from "@/store/consoleApi";
import { selectConsoleCurrentProject } from "@/store/consoleSlice";
import { useAppSelector } from "@/store/hooks";
import type {
  ConsoleContentType,
  ConsoleOverviewQuery,
  ConsoleOverviewResponse,
  ConsolePlatform,
  ConsoleStrategyQuery,
  ConsoleStrategyResponse,
  ConsoleOwnerType,
  NoteRow,
  OverviewTrendPoint,
} from "@/shared/types/console";
import { EChart } from "./EChart";

type DashboardMode = "macro" | "strategy";
type DateRange = [string, string] | undefined;

const emptyOverviewData: ConsoleOverviewResponse = {
  notes: [],
  rankAuthors: [],
  rankInteractions: [],
  stats: [],
  trend: [],
};

const emptyStrategyData: ConsoleStrategyResponse = {
  heatRows: [],
  heatmap: {
    columns: [],
    rows: [],
    values: [],
  },
  keywordHeat: [],
  keywords: [],
  modeEffect: [],
  personaEffect: [],
  sentimentEffect: [],
};

const chartAxisColor = "#71839d";
const chartLineColor = "#dbeaf5";
const chartColors = ["#006bff", "#00b8ff", "#18c964", "#ff6b4a", "#7c3aed", "#f5c542"];

function getRangeQuery(dateRange: DateRange) {
  if (!dateRange) {
    return {};
  }

  return {
    dateFrom: dateRange[0],
    dateTo: dateRange[1],
  };
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

function ScopeTabs({
  channelType,
  noteType,
  onChannelTypeChange,
  onNoteTypeChange,
}: {
  channelType: ConsolePlatform;
  noteType: ConsoleContentType;
  onChannelTypeChange: (value: ConsolePlatform) => void;
  onNoteTypeChange: (value: ConsoleContentType) => void;
}) {
  return (
    <>
      <div className="console-tabs">
        <button
          className={noteType === "image" ? "active" : ""}
          onClick={() => onNoteTypeChange("image")}
          type="button"
        >
          图文笔记
        </button>
        <button
          className={noteType === "video" ? "active" : ""}
          onClick={() => onNoteTypeChange("video")}
          type="button"
        >
          视频脚本
        </button>
      </div>
      <div className="console-tabs subtle">
        <button
          className={channelType === "xhs" ? "active" : ""}
          onClick={() => onChannelTypeChange("xhs")}
          type="button"
        >
          小红书
        </button>
        <button
          className={channelType === "wechat" ? "active" : ""}
          onClick={() => onChannelTypeChange("wechat")}
          type="button"
        >
          微信
        </button>
      </div>
    </>
  );
}

function PanelSwitch({
  mode,
  onModeChange,
  onReportExport,
}: {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  onReportExport: () => void;
}) {
  return (
    <div className="panel-switch">
      <button
        className={mode === "macro" ? "active" : ""}
        onClick={() => onModeChange("macro")}
        type="button"
      >
        宏观数据看板
      </button>
      <button
        className={mode === "strategy" ? "active" : ""}
        onClick={() => onModeChange("strategy")}
        type="button"
      >
        策略分析看板
      </button>
      <Button className="export-btn" onClick={onReportExport} type="primary">
        导出周报
      </Button>
    </div>
  );
}

function getMainTrendOption(trend: OverviewTrendPoint[]): EChartsOption {
  const dates = trend.map((item) => item.date);

  return {
    color: ["#00b8ff", "#006bff", "#ff6b4a"],
    grid: { bottom: 42, left: 56, right: 60, top: 56 },
    legend: { left: 8, top: 0 },
    tooltip: { trigger: "axis" },
    xAxis: {
      axisLine: { lineStyle: { color: chartLineColor } },
      axisTick: { show: false },
      data: dates,
      type: "category",
    },
    yAxis: [
      {
        axisLabel: { color: chartAxisColor },
        name: "曝光数量",
        splitLine: { lineStyle: { color: chartLineColor, type: "dashed" } },
        type: "value",
      },
      {
        axisLabel: { color: chartAxisColor },
        name: "笔记/互动",
        splitLine: { show: false },
        type: "value",
      },
    ],
    series: [
      {
        data: trend.map((item) => item.exposureCount),
        name: "曝光数量",
        smooth: true,
        symbolSize: 6,
        type: "line",
      },
      {
        data: trend.map((item) => item.noteCount),
        name: "笔记数",
        smooth: true,
        symbolSize: 6,
        type: "line",
        yAxisIndex: 1,
      },
      {
        data: trend.map((item) => item.interactions),
        name: "互动数",
        smooth: true,
        symbolSize: 6,
        type: "line",
        yAxisIndex: 1,
      },
    ],
  };
}

function getMetricTrendOption(
  trend: OverviewTrendPoint[],
  series: Array<{ color: string; dataKey: keyof OverviewTrendPoint; name: string }>,
): EChartsOption {
  return {
    color: series.map((item) => item.color),
    grid: { bottom: 34, left: 46, right: 24, top: 42 },
    legend: { left: 0, top: 0 },
    tooltip: { trigger: "axis" },
    xAxis: {
      axisLine: { lineStyle: { color: chartLineColor } },
      axisTick: { show: false },
      data: trend.map((item) => item.date),
      type: "category",
    },
    yAxis: {
      axisLabel: { color: chartAxisColor },
      splitLine: { lineStyle: { color: chartLineColor, type: "dashed" } },
      type: "value",
    },
    series: series.map((item) => ({
      data: trend.map((point) => Number(point[item.dataKey])),
      name: item.name,
      smooth: true,
      symbolSize: 5,
      type: "line",
    })),
  };
}

function getPersonaOption(data: ConsoleStrategyResponse["personaEffect"]): EChartsOption {
  return {
    color: ["#006bff", "#18c964"],
    grid: { bottom: 40, left: 48, right: 54, top: 44 },
    legend: { left: 0, top: 0 },
    tooltip: { trigger: "axis" },
    xAxis: {
      axisTick: { show: false },
      data: data.map((item) => item.label),
      type: "category",
    },
    yAxis: [
      {
        name: "笔记数",
        splitLine: { lineStyle: { color: chartLineColor, type: "dashed" } },
        type: "value",
      },
      {
        axisLabel: { formatter: "{value}%" },
        name: "互动率",
        splitLine: { show: false },
        type: "value",
      },
    ],
    series: [
      {
        barMaxWidth: 58,
        data: data.map((item) => item.noteCount),
        name: "笔记数",
        type: "bar",
      },
      {
        data: data.map((item) => item.interactionRate),
        name: "平均互动率",
        smooth: true,
        type: "line",
        yAxisIndex: 1,
      },
    ],
  };
}

function getModeOption(data: ConsoleStrategyResponse["modeEffect"]): EChartsOption {
  const metrics = [
    { key: "likes", name: "点赞数量" },
    { key: "collects", name: "收藏数量" },
    { key: "shares", name: "分享数量" },
    { key: "comments", name: "评论数量" },
  ] as const;

  return {
    color: chartColors,
    grid: { bottom: 40, left: 48, right: 22, top: 44 },
    legend: { left: 0, top: 0 },
    tooltip: { trigger: "axis" },
    xAxis: {
      axisTick: { show: false },
      data: data.map((item) => item.label),
      type: "category",
    },
    yAxis: {
      splitLine: { lineStyle: { color: chartLineColor, type: "dashed" } },
      type: "value",
    },
    series: metrics.map((metric) => ({
      barMaxWidth: 62,
      data: data.map((item) => item[metric.key]),
      emphasis: { focus: "series" },
      name: metric.name,
      stack: "total",
      type: "bar",
    })),
  };
}

function getSentimentOption(data: ConsoleStrategyResponse["sentimentEffect"]): EChartsOption {
  return {
    color: chartColors,
    legend: { left: 0, top: 0 },
    series: [
      {
        data: data.map((item) => ({ name: item.label, value: item.count })),
        label: { formatter: "{b}: {c}" },
        radius: ["46%", "68%"],
        type: "pie",
      },
    ],
    tooltip: { trigger: "item" },
  };
}

function getKeywordHeatOption(data: ConsoleStrategyResponse["keywordHeat"]): EChartsOption {
  const segmentNames = Array.from(new Set(data.flatMap((item) => item.segments.map((segment) => segment.label))));

  return {
    color: chartColors,
    grid: { bottom: 28, left: 180, right: 28, top: 36 },
    legend: { left: 0, top: 0 },
    tooltip: { trigger: "axis" },
    xAxis: {
      splitLine: { lineStyle: { color: chartLineColor, type: "dashed" } },
      type: "value",
    },
    yAxis: {
      axisLabel: { overflow: "truncate", width: 168 },
      axisTick: { show: false },
      data: data.map((item) => item.label),
      type: "category",
    },
    series: segmentNames.map((name) => ({
      data: data.map((item) => item.segments.find((segment) => segment.label === name)?.value ?? 0),
      name,
      stack: "keyword",
      type: "bar",
    })),
  };
}

function getHeatmapOption(heatmap: ConsoleStrategyResponse["heatmap"]): EChartsOption {
  return {
    grid: { bottom: 28, left: 120, right: 28, top: 34 },
    tooltip: {
      formatter: (params) => {
        const item = (Array.isArray(params) ? params[0] : params) as {
          name?: string;
          value?: unknown;
        };
        const value = Array.isArray(item.value) ? item.value[2] : 0;

        return `${item.name ?? ""}<br />匹配度：${value}%`;
      },
    },
    visualMap: {
      inRange: { color: ["#ecf9ff", "#7bdcff", "#006bff"] },
      max: 100,
      min: 0,
      show: false,
    },
    xAxis: {
      axisTick: { show: false },
      data: heatmap.columns,
      splitArea: { show: true },
      type: "category",
    },
    yAxis: {
      axisTick: { show: false },
      data: heatmap.rows,
      splitArea: { show: true },
      type: "category",
    },
    series: [
      {
        data: heatmap.values,
        label: {
          color: "#16456f",
          formatter: ({ value }) => {
            const amount = Array.isArray(value) ? Number(value[2]) : 0;
            return `${amount}%`;
          },
          show: true,
        },
        name: "策略组合",
        type: "heatmap",
      },
    ],
  };
}

function ChartCard({
  chartClassName = "chart-canvas",
  option,
  title,
}: {
  chartClassName?: string;
  option: EChartsOption;
  title: string;
}) {
  return (
    <div className="chart-card chart-panel">
      <h3>{title}</h3>
      <EChart className={chartClassName} option={option} />
    </div>
  );
}

function OverviewPage({
  data,
  mode,
  onDateRangeChange,
  onModeChange,
}: {
  data: ConsoleOverviewResponse;
  mode: DashboardMode;
  onDateRangeChange: (value: DateRange) => void;
  onModeChange: (mode: DashboardMode) => void;
}) {
  const { message } = App.useApp();
  const [ownerType, setOwnerType] = useState<ConsoleOwnerType>("personal");
  const mainTrendOption = useMemo(() => getMainTrendOption(data.trend), [data.trend]);
  const noteTrendOption = useMemo(
    () => getMetricTrendOption(data.trend, [{ color: "#006bff", dataKey: "noteCount", name: "笔记数" }]),
    [data.trend],
  );
  const interactionTrendOption = useMemo(
    () => getMetricTrendOption(data.trend, [
      { color: "#006bff", dataKey: "likes", name: "点赞" },
      { color: "#00b8ff", dataKey: "collects", name: "收藏" },
      { color: "#ff6b4a", dataKey: "shares", name: "分享" },
      { color: "#7c3aed", dataKey: "comments", name: "评论" },
    ]),
    [data.trend],
  );
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
      width: 190,
      render: (_likes: number, record) => (
        <span className="interaction-text">
          点赞:{record.likes} ｜ 评论:{record.comments}
          <br />
          收藏:{record.collects} ｜ 分享:{record.shares}
        </span>
      ),
    },
  ];

  return (
    <>
      <PanelSwitch
        mode={mode}
        onModeChange={onModeChange}
        onReportExport={() => message.success("周报已导出")}
      />

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
        <DatePicker.RangePicker
          onChange={(_, dateStrings) => {
            const [dateFrom, dateTo] = dateStrings;
            onDateRangeChange(dateFrom && dateTo ? [dateFrom, dateTo] : undefined);
          }}
        />
      </div>
      <div className="chart-card chart-large">
        <EChart className="chart-canvas large" option={mainTrendOption} />
      </div>

      <div className="analysis-grid two">
        <ChartCard option={noteTrendOption} title="笔记数量趋势" />
        <ChartCard option={interactionTrendOption} title="互动数量趋势" />
      </div>

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
    </>
  );
}

function StrategyPage({
  data,
  mode,
  onDateRangeChange,
  onModeChange,
}: {
  data: ConsoleStrategyResponse;
  mode: DashboardMode;
  onDateRangeChange: (value: DateRange) => void;
  onModeChange: (mode: DashboardMode) => void;
}) {
  const { message } = App.useApp();
  const personaOption = useMemo(() => getPersonaOption(data.personaEffect), [data.personaEffect]);
  const modeOption = useMemo(() => getModeOption(data.modeEffect), [data.modeEffect]);
  const sentimentOption = useMemo(() => getSentimentOption(data.sentimentEffect), [data.sentimentEffect]);
  const keywordHeatOption = useMemo(() => getKeywordHeatOption(data.keywordHeat), [data.keywordHeat]);
  const heatmapOption = useMemo(() => getHeatmapOption(data.heatmap), [data.heatmap]);
  const keywordColumns: ColumnsType<ConsoleStrategyResponse["keywords"][number]> = [
    {
      render: (_value, _record, index) => <span className="rank-index">{index + 1}</span>,
      title: "排名",
      width: 80,
    },
    { dataIndex: "label", title: "卖点关键词" },
    {
      dataIndex: "count",
      render: (count: number, record) => (
        <span>
          <strong className="blue-number">{count}</strong>
          {typeof record.rate === "number" ? `（${record.rate}%）` : ""}
        </span>
      ),
      title: "互动数量",
      width: 180,
    },
    {
      dataIndex: "noteCount",
      render: (count?: number) => (typeof count === "number" ? <strong className="orange-number">{count}篇</strong> : "-"),
      title: "笔记数量",
      width: 140,
    },
  ];

  return (
    <>
      <PanelSwitch
        mode={mode}
        onModeChange={onModeChange}
        onReportExport={() => message.success("策略周报已导出")}
      />
      <div className="section-title-row right">
        <DatePicker.RangePicker
          onChange={(_, dateStrings) => {
            const [dateFrom, dateTo] = dateStrings;
            onDateRangeChange(dateFrom && dateTo ? [dateFrom, dateTo] : undefined);
          }}
        />
      </div>
      <div className="analysis-grid">
        <ChartCard option={personaOption} title="人设效果分析" />
        <ChartCard option={modeOption} title="模式效果分析" />
        <ChartCard option={sentimentOption} title="情绪效果分析" />
      </div>
      <div className="analysis-grid two">
        <ChartCard chartClassName="chart-canvas keyword" option={keywordHeatOption} title="卖点关键词热度" />
        <ChartCard chartClassName="chart-canvas keyword" option={heatmapOption} title="策略组合热力图" />
      </div>
      <div className="table-panel">
        <h2>卖点关键词热度 Top5</h2>
        <Table
          columns={keywordColumns}
          dataSource={data.keywords.map((item) => ({ ...item, key: item.label }))}
          pagination={false}
        />
      </div>
    </>
  );
}

export function OverviewDashboard() {
  const [overviewMode, setOverviewMode] = useState<DashboardMode>("macro");
  const [channelType, setChannelType] = useState<ConsolePlatform>("xhs");
  const [noteType, setNoteType] = useState<ConsoleContentType>("image");
  const [dateRange, setDateRange] = useState<DateRange>();
  const overviewQuery = useMemo<ConsoleOverviewQuery>(() => ({
    contentType: noteType,
    platform: channelType,
    ...getRangeQuery(dateRange),
  }), [channelType, dateRange, noteType]);
  const strategyQuery = useMemo<ConsoleStrategyQuery>(() => ({
    contentType: noteType,
    platform: channelType,
    ...getRangeQuery(dateRange),
  }), [channelType, dateRange, noteType]);
  const currentProject = useAppSelector(selectConsoleCurrentProject);
  const { data: overviewData = emptyOverviewData, isFetching: isOverviewFetching } = useGetOverviewQuery(
    { ...overviewQuery, projectId: currentProject },
    { skip: !currentProject },
  );
  const { data: strategyData = emptyStrategyData, isFetching: isStrategyFetching } = useGetStrategyQuery(
    { ...strategyQuery, projectId: currentProject },
    { skip: !currentProject },
  );

  return (
    <section className="console-page">
      <ScopeTabs
        channelType={channelType}
        noteType={noteType}
        onChannelTypeChange={setChannelType}
        onNoteTypeChange={setNoteType}
      />
      <Spin spinning={overviewMode === "macro" ? isOverviewFetching : isStrategyFetching}>
        {overviewMode === "macro" ? (
          <OverviewPage
            data={overviewData}
            mode={overviewMode}
            onDateRangeChange={setDateRange}
            onModeChange={setOverviewMode}
          />
        ) : (
          <StrategyPage
            data={strategyData}
            mode={overviewMode}
            onDateRangeChange={setDateRange}
            onModeChange={setOverviewMode}
          />
        )}
      </Spin>
    </section>
  );
}
