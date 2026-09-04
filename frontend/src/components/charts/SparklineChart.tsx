import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  showArea?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = '#06b6d4',
  height = 48,
  showArea = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 600,
      grid: { top: 2, bottom: 2, left: 2, right: 2 },
      xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'line',
          data,
          smooth: true,
          symbol: 'none',
          lineStyle: { color, width: 1.5 },
          areaStyle: showArea
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${color}50` },
                  { offset: 1, color: `${color}05` },
                ]),
              }
            : undefined,
        },
      ],
      tooltip: { show: false },
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data, color, height]);

  return <div ref={ref} style={{ width: '100%', height }} />;
};
