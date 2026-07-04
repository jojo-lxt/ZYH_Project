"use client";

import { useState } from "react";
import { App, Button, DatePicker, Select, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useGetOverviewQuery, useGetStrategyQuery } from "@/store/consoleApi";
import type { ConsoleOverviewResponse, ConsoleStrategyResponse, NoteRow } from "@/shared/types/console";

const emptyOverviewData: ConsoleOverviewResponse = {
  notes: [],
  rankAuthors: [],
  rankInteractions: [],
  stats: [],
};

const emptyStrategyData: ConsoleStrategyResponse = {
  heatRows: [],
  keywords: [],
};

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
  const { data = emptyOverviewData } = useGetOverviewQuery();
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
  const { data = emptyStrategyData } = useGetStrategyQuery();

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


export function OverviewDashboard() {
  const [overviewMode, setOverviewMode] = useState<"macro" | "strategy">("macro");

  return overviewMode === "macro" ? (
    <OverviewPage onModeChange={setOverviewMode} />
  ) : (
    <StrategyPage onModeChange={setOverviewMode} />
  );
}
