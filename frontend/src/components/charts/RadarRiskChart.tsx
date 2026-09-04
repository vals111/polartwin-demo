import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface RadarDimension {
  name: string;
  max: number;
  value: number;
  color?: string;
}

interface RadarRiskChartProps {
  dimensions: RadarDimension[];
  height?: number;
  accentColor?: string;
  title?: string;
}

export const RadarRiskChart: React.FC<RadarRiskChartProps> = ({
  dimensions,
  height = 300,
  accentColor = '#06b6d4',
  title,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (instanceRef.current) instanceRef.current.dispose();

    const chart = echarts.init(chartRef.current, 'dark');
    instanceRef.current = chart;

    const indicator = dimensions.map((d) => ({ name: d.name, max: d.max }));
    const values = dimensions.map((d) => d.value);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 900,
      animationEasing: 'elasticOut',
      title: title
        ? {
            text: title,
            textStyle: {
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 'bold',
            },
            top: 4,
            left: 'center',
          }
        : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      },
      radar: {
        indicator,
        shape: 'polygon',
        radius: '68%',
        center: ['50%', '55%'],
        axisName: {
          color: '#94a3b8',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fontWeight: 'bold',
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.06)', width: 1 },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'],
          },
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: 'Risk Score',
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: accentColor },
              lineStyle: { color: accentColor, width: 2 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${accentColor}55` },
                  { offset: 1, color: `${accentColor}11` },
                ]),
              },
            },
          ],
        },
      ],
    };

    chart.setOption(option);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current!);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [dimensions, accentColor, height]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
};
