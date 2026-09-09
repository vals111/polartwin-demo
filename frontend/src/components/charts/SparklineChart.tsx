import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number | string;
  showArea?: boolean;
  interactive?: boolean;
  unit?: string;
  label?: string;
  timestamps?: string[];
  onHover?: (val: number | null, time: string | null) => void;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = '#06b6d4',
  height = 48,
  showArea = true,
  interactive = false,
  unit = '',
  label = 'Value',
  timestamps,
  onHover,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const timeLabels = timestamps && timestamps.length === data.length
      ? timestamps
      : data.map((_, i) => {
          const hoursAgo = data.length - 1 - i;
          return hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`;
        });

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 400,
      grid: { top: 4, bottom: interactive ? 6 : 2, left: 4, right: 4 },
      xAxis: {
        type: 'category',
        show: false,
        data: timeLabels,
      },
      yAxis: {
        type: 'value',
        show: false,
        min: (value: { min: number }) => Math.floor(value.min - (Math.abs(value.min) * 0.05 || 1)),
        max: (value: { max: number }) => Math.ceil(value.max + (Math.abs(value.max) * 0.05 || 1)),
      },
      tooltip: interactive
        ? {
            show: true,
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: color,
            borderWidth: 1.5,
            padding: [6, 10],
            textStyle: {
              color: '#f8fafc',
              fontFamily: 'monospace',
              fontSize: 11,
            },
            axisPointer: {
              type: 'line',
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.45)',
                width: 1.5,
                type: 'dashed',
              },
            },
            formatter: (params: any) => {
              if (!params || !params[0]) return '';
              const p = params[0];
              const val = typeof p.value === 'number' ? p.value.toFixed(1) : p.value;
              const time = p.name || '';
              return `<div style="font-weight:bold;color:${color};font-size:10px;text-transform:uppercase">${label} Archive</div>` +
                     `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:2px;">` +
                     `<span style="color:#94a3b8;font-size:10px">${time}</span>` +
                     `<span style="font-weight:900;color:#ffffff;font-size:12px">${val} ${unit}</span>` +
                     `</div>`;
            },
          }
        : { show: false },
      series: [
        {
          name: label,
          type: 'line',
          data,
          smooth: true,
          symbol: interactive ? 'circle' : 'none',
          showSymbol: false,
          symbolSize: 6,
          itemStyle: {
            color: '#ffffff',
            borderColor: color,
            borderWidth: 2,
          },
          lineStyle: { color, width: 2 },
          areaStyle: showArea
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${color}55` },
                  { offset: 1, color: `${color}02` },
                ]),
              }
            : undefined,
        },
      ],
    });

    if (interactive && onHover) {
      chart.on('showTip', (params: any) => {
        if (params?.dataIndexInside !== undefined && data[params.dataIndexInside] !== undefined) {
          const idx = params.dataIndexInside;
          onHover(data[idx], timeLabels[idx]);
        }
      });
      chart.on('globalout', () => {
        onHover(null, null);
      });
    }

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [data, color, height, interactive, unit, label, showArea, timestamps, onHover]);

  return <div ref={ref} style={{ width: '100%', height: height || '100%' }} />;
};
