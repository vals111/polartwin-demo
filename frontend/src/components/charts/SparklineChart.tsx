import React, { useEffect, useRef, useCallback } from 'react';
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

  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  const dataRef = useRef(data);
  dataRef.current = data;

  const timeLabelsRef = useRef<string[]>([]);

  // 1. One-time ECharts instance lifecycle
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    if (interactive) {
      chart.on('showTip', (params: any) => {
        const idx = params?.dataIndexInside ?? params?.dataIndex;
        if (idx !== undefined && dataRef.current[idx] !== undefined) {
          onHoverRef.current?.(dataRef.current[idx], timeLabelsRef.current[idx] || '');
        }
      });

      chart.on('globalout', () => {
        onHoverRef.current?.(null, null);
      });
    }

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      inst.current = null;
    };
  }, [interactive]);

  // 2. High-performance option update without disposing or flickering
  useEffect(() => {
    if (!inst.current) return;

    const timeLabels = timestamps && timestamps.length === data.length
      ? timestamps
      : data.map((_, i) => {
          const hoursAgo = data.length - 1 - i;
          return hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`;
        });
    timeLabelsRef.current = timeLabels;

    inst.current.setOption({
      backgroundColor: 'transparent',
      animation: false, // Prevents any flash or jitter on updates
      grid: { top: 6, bottom: 4, left: 4, right: 4 },
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
            confine: true,
            transitionDuration: 0, // Instant tooltip tracking without lagging cursor
            backgroundColor: 'rgba(5, 13, 24, 0.95)',
            borderColor: `${color}99`,
            borderWidth: 1.5,
            padding: [5, 9],
            textStyle: {
              color: '#f8fafc',
              fontFamily: 'monospace',
              fontSize: 11,
            },
            axisPointer: {
              type: 'line',
              lineStyle: {
                color: `${color}88`,
                width: 1.5,
                type: 'dashed',
              },
            },
            formatter: (params: any) => {
              if (!params || !params[0]) return '';
              const p = params[0];
              const val = typeof p.value === 'number' ? p.value.toFixed(1) : p.value;
              const time = p.name || '';
              return `<div style="font-family:monospace;font-size:10px;color:#94a3b8;font-weight:600">${time}</div>` +
                     `<div style="font-family:monospace;font-size:13px;font-weight:900;color:${color};margin-top:1px">${val} <span style="font-size:10px;font-weight:normal;color:#94a3b8">${unit}</span></div>`;
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
                  { offset: 0, color: `${color}45` },
                  { offset: 1, color: `${color}02` },
                ]),
              }
            : undefined,
        },
      ],
    });
  }, [data, color, unit, label, showArea, timestamps, interactive]);

  return <div ref={ref} style={{ width: '100%', height: height || '100%' }} />;
};
