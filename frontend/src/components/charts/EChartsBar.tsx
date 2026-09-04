import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartsBarProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  unit?: string;
  title?: string;
  maxValue?: number;
}

export const EChartsBar: React.FC<EChartsBarProps> = ({
  data,
  height = 240,
  horizontal = false,
  unit = '',
  title,
  maxValue,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const colors = data.map((d, i) => d.color || ['#06b6d4', '#818cf8', '#f59e0b', '#10b981', '#ef4444'][i % 5]);

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
        formatter: (p: any) => `${p[0].name}: <strong>${p[0].value}${unit}</strong>`,
      },
      grid: {
        top: title ? 36 : 12,
        bottom: horizontal ? 32 : 40,
        left: horizontal ? 100 : 48,
        right: 16,
        containLabel: false,
      },
      title: title ? {
        text: title,
        textStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 'bold' },
        top: 4, left: 4,
      } : undefined,
      xAxis: horizontal
        ? { type: 'value', max: maxValue, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#475569', fontSize: 10, fontFamily: 'monospace' } }
        : { type: 'category', data: data.map(d => d.name), axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }, axisTick: { show: false }, axisLabel: { color: '#475569', fontSize: 10, fontFamily: 'monospace', interval: 0, rotate: data.length > 5 ? 30 : 0 } },
      yAxis: horizontal
        ? { type: 'category', data: data.map(d => d.name), axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } }
        : { type: 'value', max: maxValue, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#475569', fontSize: 10, fontFamily: 'monospace', formatter: (v: number) => `${v}${unit}` } },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(
              horizontal ? 0 : 0,
              horizontal ? 0 : 1,
              horizontal ? 1 : 0,
              horizontal ? 0 : 0,
              [
                { offset: 0, color: `${colors[i]}cc` },
                { offset: 1, color: `${colors[i]}44` },
              ]
            ),
            borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
          },
        })),
        barMaxWidth: 48,
        label: {
          show: true,
          position: horizontal ? 'right' : 'top',
          color: '#94a3b8',
          fontFamily: 'monospace',
          fontSize: 10,
          formatter: (p: any) => `${p.value}${unit}`,
        },
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data, height]);

  return <div ref={ref} style={{ width: '100%', height }} />;
};
