"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

type EChartProps = {
  className?: string;
  option: EChartsOption;
};

export function EChart({ className, option }: EChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    instanceRef.current ??= echarts.init(chartRef.current);
    instanceRef.current.setOption(option, true);
  }, [option]);

  useEffect(() => {
    function resize() {
      instanceRef.current?.resize();
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div className={className} ref={chartRef} />;
}
